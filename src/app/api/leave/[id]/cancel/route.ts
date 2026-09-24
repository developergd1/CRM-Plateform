import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { cancelRemarks } = body;

    const currentEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
    });

    if (!currentEmp) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Strict ownership verification: Employee can only cancel their own leave
    if (leave.employeeId !== currentEmp.id) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot cancel another employee’s leave request.' },
        { status: 403 }
      );
    }

    // Only PENDING leaves can be cancelled
    if (leave.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot cancel a leave request that is already ${leave.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const previousStatus = leave.status;

    // 1. Update Leave Status to CANCELLED
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        reviewRemarks: cancelRemarks?.trim() ? `Cancelled: ${cancelRemarks.trim()}` : leave.reviewRemarks,
      },
    });

    // 2. Append to Leave Action History
    await prisma.leaveActionHistory.create({
      data: {
        leaveId: leave.id,
        action: 'CANCELLED',
        performedBy: currentEmp.fullName,
        performerRole: user.role || 'EMPLOYEE',
        performerId: currentEmp.employeeId || currentEmp.id,
        previousStatus,
        newStatus: 'CANCELLED',
        remarks: cancelRemarks?.trim() || 'Cancelled by employee prior to review',
      },
    });

    // 3. Log Audit Event
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'CANCEL_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      previousData: { status: previousStatus },
      newData: { status: 'CANCELLED' },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: 'Leave request cancelled successfully.',
      leave: updated,
    });
  } catch (error: any) {
    console.error('Leave cancel error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
