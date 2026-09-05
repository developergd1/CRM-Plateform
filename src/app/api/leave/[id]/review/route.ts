import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isManagerOrAbove(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Managers and HR can approve/reject leave.' }, { status: 403 });
    }

    const { id } = params;
    const { status, reviewRemarks } = await req.json(); // status: 'APPROVED' | 'REJECTED'

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status (APPROVED or REJECTED) is required' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!leave) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: user.employeeId,
        reviewedAt: new Date(),
        reviewRemarks: reviewRemarks || null,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: status === 'APPROVED' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      entityType: 'LEAVE',
      entityId: leave.id,
      newData: { status, reviewedBy: user.employeeId, reviewRemarks },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
