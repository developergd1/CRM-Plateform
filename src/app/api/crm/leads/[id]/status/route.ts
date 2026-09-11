import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { isValidLeadTransition, LEAD_STATUS_TRANSITIONS, LeadStatus } from '@/lib/constants/crm';
import { notifyStatusChange } from '@/lib/notifications';
import { generateActivityNumber } from '@/lib/id-generator';

async function findLeadByIdentifier(id: string) {
  if (isValidObjectId(id)) {
    return prisma.lead.findFirst({
      where: { OR: [{ id }, { leadNumber: id }] },
    });
  }
  return prisma.lead.findFirst({
    where: { leadNumber: id },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findLeadByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId !== existing.clientId) {
      return NextResponse.json({ error: 'Access denied to this lead' }, { status: 403 });
    }

    const body = await req.json();
    const { status: targetStatus, reason } = body;

    if (!targetStatus) {
      return NextResponse.json({ error: 'Target status is required' }, { status: 400 });
    }

    if (!isValidLeadTransition(existing.status, targetStatus)) {
      const allowed = LEAD_STATUS_TRANSITIONS[existing.status as LeadStatus] || [];
      return NextResponse.json(
        {
          error: `Invalid status transition from '${existing.status}' to '${targetStatus}'. Allowed transitions from '${existing.status}': [${allowed.join(', ')}]`,
          currentStatus: existing.status,
          targetStatus,
          allowedTransitions: allowed,
        },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === 'CONTACTED' && !existing.lastContactedAt) {
      updateData.lastContactedAt = new Date();
    }

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, employeeId: true, fullName: true } },
      },
    });

    // Create an activity entry documenting the status change
    const actNumber = await generateActivityNumber();
    const performedById = user.employeeId
      ? (await prisma.employee.findFirst({ where: { employeeId: user.employeeId }, select: { id: true } }))?.id || null
      : null;

    await prisma.activity.create({
      data: {
        activityNumber: actNumber,
        type: 'NOTE',
        subject: `Lead status changed to ${targetStatus}`,
        description: reason ? `Reason: ${reason}` : `Status transitioned from ${existing.status} to ${targetStatus}`,
        status: 'COMPLETED',
        leadId: existing.id,
        clientId: existing.clientId,
        performedById,
      },
    });

    // Audit log
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'LEAD_STATUS_CHANGED',
      entityType: 'LEAD',
      entityId: existing.leadNumber,
      previousData: { status: existing.status },
      newData: { status: targetStatus, reason },
      status: 'SUCCESS',
    });

    // Send notification to assignee
    if (existing.assignedToId) {
      await notifyStatusChange({
        employeeId: existing.assignedToId,
        changerName: user.fullName || 'Admin',
        itemType: 'Lead',
        itemTitle: `${existing.leadNumber} - ${existing.fullName}`,
        oldStatus: existing.status,
        newStatus: targetStatus,
        itemId: existing.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Status updated from ${existing.status} to ${targetStatus}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error changing lead status:', error);
    return NextResponse.json({ error: error.message || 'Failed to change status' }, { status: 500 });
  }
}
