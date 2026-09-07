import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
      include: { user: true, client: true },
    });


    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission check
    const isAdmin = isAdminOrHR(user.role);
    const isAuthorizedClient =
      user.role === 'CLIENT' &&
      (user.clientId === employee.client?.clientId || user.id === employee.client?.userId || (employee.clientId && user.clientId && employee.client?.id === user.clientId));

    if (!isAdmin && !isAuthorizedClient) {
      return NextResponse.json(
        { error: 'Permission denied. You are not authorized to unblock this employee.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason?.trim() || body.remarks?.trim() || 'Admin Unblock & Reinstatement';
    const remarks = body.remarks?.trim() || body.additionalRemarks?.trim() || null;
    const previousStatus = employee.status;

    const actorIdentifier = `${user.fullName} (${user.employeeId || user.clientId || user.role})`;

    // 1. Update Employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        status: 'ACTIVE',
        isBlocked: false,
        unblockedBy: actorIdentifier,
        unblockedAt: new Date(),
        updatedBy: actorIdentifier,
      },
    });

    // 2. Re-enable User account
    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          isActive: true,
          isSuspended: false,
        },
      });
    }

    // 3. Create immutable EmployeeBlockHistory record
    const historyEntry = await prisma.employeeBlockHistory.create({
      data: {
        employeeId: employee.id,
        actionType: 'UNBLOCK',
        reason,
        remarks,
        actionBy: actorIdentifier,
        actionDate: new Date(),
        previousStatus,
        newStatus: 'ACTIVE',
      },
    });

    // 4. Log Audit Event
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'UNBLOCK_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: employee.employeeId,
      previousData: { status: previousStatus, isBlocked: employee.isBlocked },
      newData: { status: 'ACTIVE', isBlocked: false, reason, remarks },
      reason,
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${employee.employeeId} (${employee.fullName}) has been UNBLOCKED. Access restored!`,
      employee: updatedEmployee,
      history: historyEntry,
    });
  } catch (error: any) {
    console.error('Error unblocking employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
