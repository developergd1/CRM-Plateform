import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId, isValidObjectId } from '@/lib/prisma';
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

    const body = await req.json();
    const {
      employeeId: requestedEmpId,
      leaveType = 'Casual Leave',
      startDate,
      endDate,
      totalDays = 1,
      reason,
      remarks,
      attachmentUrl,
      status: requestedStatus,
    } = body;

    let targetEmp = null;
    const isPrivileged = isManagerOrAbove(user.role) || user.role === 'CLIENT';

    if (requestedEmpId && isPrivileged) {
      targetEmp = await prisma.employee.findFirst({
        where: {
          OR: [
            ...(isValidObjectId(requestedEmpId) ? [{ id: requestedEmpId }] : []),
            { employeeId: requestedEmpId },
          ],
        },
      });
    }

    if (!targetEmp) {
      targetEmp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
    }

    if (!targetEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: 'Start date, end date, and reason are required' }, { status: 400 });
    }

    const parsedDays = Math.max(0.5, parseFloat(String(totalDays)) || 1);
    const finalStatus = (isPrivileged && requestedStatus) ? requestedStatus : (isPrivileged ? 'APPROVED' : 'PENDING');

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: targetEmp.id,
        leaveType,
        startDate,
        endDate,
        totalDays: parsedDays,
        reason: reason.trim(),
        remarks: remarks?.trim() || null,
        attachmentUrl: attachmentUrl?.trim() || null,
        status: finalStatus,
        reviewedById: finalStatus === 'APPROVED' ? user.id : null,
        reviewedAt: finalStatus === 'APPROVED' ? new Date() : null,
        reviewRemarks: finalStatus === 'APPROVED' ? (remarks?.trim() || 'Granted by Administrator/Client') : null,
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
        action: finalStatus === 'APPROVED' ? 'APPROVED' : 'APPLIED',
        performedBy: user.fullName || user.email || targetEmp.fullName,
        performerRole: user.role || 'EMPLOYEE',
        performerId: user.id,
        previousStatus: null,
        newStatus: finalStatus,
        remarks: remarks?.trim() || (finalStatus === 'APPROVED' ? 'Granted by Corporate Admin' : null),
      },
    });

    // If approved, sync attendance records as ON_LEAVE
    if (finalStatus === 'APPROVED') {
      try {
        const dates: string[] = [];
        const curr = new Date(startDate);
        const end = new Date(endDate);
        let iterations = 0;
        while (curr <= end && iterations < 60) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
          iterations++;
        }
        for (const dateStr of dates) {
          await prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: targetEmp.id,
                date: dateStr,
              },
            },
            create: {
              employeeId: targetEmp.id,
              date: dateStr,
              status: 'ON_LEAVE',
              remarks: `On Approved Leave: ${leaveType}`,
              totalWorkMinutes: 0,
            },
            update: {
              status: 'ON_LEAVE',
              remarks: `On Approved Leave: ${leaveType}`,
            },
          });
        }
      } catch (attErr) {
        console.error('Error syncing attendance on leave grant:', attErr);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: finalStatus === 'APPROVED' ? 'GRANT_LEAVE' : 'APPLY_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      newData: { leaveType, startDate, endDate, totalDays: parsedDays, reason, status: finalStatus },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    // Notify Client and Admin
    await notifyLeaveApplied({
      leaveId: leave.id,
      employeeName: targetEmp.fullName,
      employeeId: targetEmp.id,
      leaveType,
      startDate,
      endDate,
      clientId: targetEmp.clientId,
    });

    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error: any) {
    console.error('Leave POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
