import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

async function findFollowUpByIdentifier(id: string) {
  if (isValidObjectId(id)) {
    return prisma.followUp.findFirst({
      where: { OR: [{ id }, { followUpNumber: id }] },
    });
  }
  return prisma.followUp.findFirst({
    where: { followUpNumber: id },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const basic = await findFollowUpByIdentifier(id);

    if (!basic) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId && basic.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Access denied to this follow-up' }, { status: 403 });
    }

    const followUp = await prisma.followUp.findUnique({
      where: { id: basic.id },
      include: {
        lead: {
          select: { id: true, leadNumber: true, fullName: true, companyName: true, phone: true, email: true },
        },
        contact: {
          select: { id: true, contactNumber: true, fullName: true, phone: true, designation: true },
        },
        client: {
          select: { id: true, clientId: true, companyName: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: followUp });
  } catch (error: any) {
    console.error('Error fetching follow-up:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch follow-up' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findFollowUpByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId && existing.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.remarks !== undefined) updateData.remarks = body.remarks?.trim() || null;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt);

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (body.status === 'PENDING') {
        updateData.completedAt = null;
      }
    }

    if (body.assignedToId !== undefined) {
      updateData.assignedToId = body.assignedToId ? await resolveEmployeeObjectId(body.assignedToId) : null;
    }

    const updated = await prisma.followUp.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        lead: { select: { id: true, leadNumber: true, fullName: true } },
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    // Re-calculate lead's nextFollowUpAt if lead is attached
    if (existing.leadId) {
      const nextPending = await prisma.followUp.findFirst({
        where: {
          leadId: existing.leadId,
          status: 'PENDING',
          scheduledAt: { gte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });

      await prisma.lead.update({
        where: { id: existing.leadId },
        data: { nextFollowUpAt: nextPending?.scheduledAt || null },
      });
    }

    // Audit log
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_FOLLOWUP',
      entityType: 'FOLLOW_UP',
      entityId: existing.followUpNumber,
      previousData: { status: existing.status, scheduledAt: existing.scheduledAt },
      newData: updateData,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json({ error: error.message || 'Failed to update follow-up' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findFollowUpByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    await prisma.followUp.delete({
      where: { id: existing.id },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DELETE_FOLLOWUP',
      entityType: 'FOLLOW_UP',
      entityId: existing.followUpNumber,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Follow-up ${existing.followUpNumber} removed`,
    });
  } catch (error: any) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete follow-up' }, { status: 500 });
  }
}
