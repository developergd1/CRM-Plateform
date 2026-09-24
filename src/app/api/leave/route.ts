import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { notifyLeaveApplied } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedStatus = searchParams.get('status');
    const requestedEmpId = searchParams.get('employeeId');
    const requestedClientId = searchParams.get('clientId');

    const where: any = {};

    // 1. Role-based scoping
    if (user.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      where.employeeId = emp.id;
    } else if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientProfile) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

      const clientEmployees = await prisma.employee.findMany({
        where: { clientId: clientProfile.id },
        select: { id: true, employeeId: true },
      });
      const allowedIds = clientEmployees.map((e) => e.id);

      if (requestedEmpId) {
        const target = clientEmployees.find(
          (e) => e.id === requestedEmpId || e.employeeId === requestedEmpId
        );
        if (!target) {
          return NextResponse.json({ error: 'Forbidden: Employee not assigned to you' }, { status: 403 });
        }
        where.employeeId = target.id;
      } else {
        where.employeeId = { in: allowedIds };
      }
    } else if (isManagerOrAbove(user.role)) {
      if (requestedEmpId) {
        const target = await prisma.employee.findFirst({
          where: {
            OR: [
              { id: requestedEmpId },
              { employeeId: requestedEmpId },
            ],
          },
          select: { id: true },
        });
        if (target) {
          where.employeeId = target.id;
        } else {
          where.employeeId = requestedEmpId;
        }
      } else if (requestedClientId) {
        const resolvedClientId = await resolveClientObjectId(requestedClientId);
        if (resolvedClientId) {
          const clientEmps = await prisma.employee.findMany({
            where: { clientId: resolvedClientId },
            select: { id: true },
          });
          where.employeeId = { in: clientEmps.map((e) => e.id) };
        } else {
          where.employeeId = { in: [] };
        }
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Status filter
    if (requestedStatus && requestedStatus !== 'ALL') {
      where.status = requestedStatus.toUpperCase();
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            departmentName: true,
            department: { select: { name: true } },
            client: {
              select: {
                id: true,
                clientId: true,
                companyName: true,
              },
            },
          },
        },
        auditTrail: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    console.error('Leave GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const {
      leaveType = 'Casual Leave',
      startDate,
      endDate,
      totalDays = 1,
      reason,
      remarks,
      attachmentUrl,
    } = await req.json();

    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: 'Start date, end date, and reason are required' }, { status: 400 });
    }

    const parsedDays = Math.max(0.5, parseFloat(String(totalDays)) || 1);

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: currentEmp.id,
        leaveType,
        startDate,
        endDate,
        totalDays: parsedDays,
        reason: reason.trim(),
        remarks: remarks?.trim() || null,
        attachmentUrl: attachmentUrl?.trim() || null,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            clientId: true,
          },
        },
      },
    });

    // Record Immutable Leave Action History
    await prisma.leaveActionHistory.create({
      data: {
        leaveId: leave.id,
        action: 'APPLIED',
        performedBy: currentEmp.fullName,
        performerRole: user.role || 'EMPLOYEE',
        performerId: currentEmp.employeeId || currentEmp.id,
        previousStatus: null,
        newStatus: 'PENDING',
        remarks: remarks?.trim() || null,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'APPLY_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      newData: { leaveType, startDate, endDate, totalDays: parsedDays, reason },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    // Notify Client and Admin
    await notifyLeaveApplied({
      leaveId: leave.id,
      employeeName: currentEmp.fullName,
      employeeId: currentEmp.id,
      leaveType,
      startDate,
      endDate,
      clientId: currentEmp.clientId,
    });

    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error: any) {
    console.error('Leave POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
