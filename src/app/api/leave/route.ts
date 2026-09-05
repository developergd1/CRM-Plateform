import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: any = {};
    if (!isManagerOrAbove(user.role)) {
      const emp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
      if (emp) where.employeeId = emp.id;
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { leaveType = 'CASUAL', startDate, endDate, totalDays = 1, reason } = await req.json();

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Start date, end date, and reason are required' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: currentEmp.id,
        leaveType,
        startDate,
        endDate,
        totalDays: parseFloat(totalDays) || 1,
        reason: reason.trim(),
        status: 'PENDING',
      },
      include: {
        employee: { select: { employeeId: true, fullName: true } },
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'APPLY_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      newData: { leaveType, startDate, endDate, totalDays },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
