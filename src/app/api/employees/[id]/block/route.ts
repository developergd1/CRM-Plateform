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
      include: { user: { include: { role: true } }, client: true },
    });


    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission check
    const isAdmin = isAdminOrHR(user.role);
    const isAuthorizedClient =
      user.role === 'CLIENT' &&
      user.canBlockEmployees &&
      user.clientId === employee.client?.clientId;

    if (!isAdmin && !isAuthorizedClient) {
      return NextResponse.json(
        { error: 'Permission denied. You are not authorized to block this employee.' },
        { status: 403 }
      );
    }

    // Safety guard: Prevent blocking the primary Super Admin or own active session
    if (employee.employeeId === 'GI-EMP-000001' || employee.user?.role?.name === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Security Restriction: Primary Super Administrator (GI-EMP-000001) cannot be blocked.' },
        { status: 400 }
      );
    }

    if (employee.userId === user.id || employee.employeeId === user.employeeId) {
      return NextResponse.json(
        { error: 'Security Restriction: You cannot block your own active account.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason?.trim() || 'Administrative Disciplinary Block';
    const remarks = body.remarks?.trim() || body.additionalRemarks?.trim() || null;
    const previousStatus = employee.status;

    const actorIdentifier = `${user.fullName} (${user.employeeId || user.clientId || user.role})`;

    // 1. Update Employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        status: 'BLOCKED',
        isBlocked: true,
        blockedReason: reason,
        blockedRemarks: remarks,
        blockedBy: actorIdentifier,
        blockedAt: new Date(),
        updatedBy: actorIdentifier,
      },
    });

    // 2. Disable User account immediately
    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          isActive: false,
          isSuspended: true,
        },
      });

      // Revoke all active web sessions
      await prisma.activeUserSession.updateMany({
        where: { userId: employee.userId },
        data: { isValid: false },
      });
    }

    // 3. Create immutable EmployeeBlockHistory record
    const historyEntry = await prisma.employeeBlockHistory.create({
      data: {
        employeeId: employee.id,
        actionType: 'BLOCK',
        reason,
        remarks,
        actionBy: actorIdentifier,
        actionDate: new Date(),
        previousStatus,
        newStatus: 'BLOCKED',
      },
    });

    // 4. Log Audit Event
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'BLOCK_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: employee.employeeId,
      previousData: { status: previousStatus, isBlocked: employee.isBlocked },
      newData: { status: 'BLOCKED', isBlocked: true, reason, remarks },
      reason,
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${employee.employeeId} (${employee.fullName}) has been BLOCKED. All login access and active sessions revoked.`,
      employee: updatedEmployee,
      history: historyEntry,
    });
  } catch (error: any) {
    console.error('Error blocking employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
