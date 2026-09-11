import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { notifyReassignment, notifyAssignment } from '@/lib/notifications';
import { generateActivityNumber } from '@/lib/id-generator';

async function findLeadByIdentifier(id: string) {
  if (isValidObjectId(id)) {
    return prisma.lead.findFirst({
      where: { OR: [{ id }, { leadNumber: id }] },
      include: {
        assignedTo: { select: { id: true, employeeId: true, fullName: true } },
      },
    });
  }
  return prisma.lead.findFirst({
    where: { leadNumber: id },
    include: {
      assignedTo: { select: { id: true, employeeId: true, fullName: true } },
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Clients cannot assign leads' }, { status: 403 });
    }

    const { id } = await params;
    const lead = await findLeadByIdentifier(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const body = await req.json();
    const { toEmployeeId, reason } = body;

    if (!toEmployeeId) {
      return NextResponse.json({ error: 'Target assignee (toEmployeeId) is required' }, { status: 400 });
    }

    const resolvedToEmployeeId = await resolveEmployeeObjectId(toEmployeeId);
    if (!resolvedToEmployeeId) {
      return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
    }

    if (lead.assignedToId === resolvedToEmployeeId) {
      return NextResponse.json(
        { error: 'Lead is already assigned to this employee' },
        { status: 400 }
      );
    }

    const previousEmployeeId = lead.assignedToId;

    const assignerEmpId = user.employeeId
      ? await resolveEmployeeObjectId(user.employeeId)
      : (await prisma.employee.findFirst({ select: { id: true } }))?.id;

    if (!assignerEmpId) {
      return NextResponse.json({ error: 'Assigner employee profile not found' }, { status: 400 });
    }

    // Create assignment history entry
    const assignmentRecord = await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        fromEmployeeId: previousEmployeeId || null,
        toEmployeeId: resolvedToEmployeeId,
        assignedById: assignerEmpId,
        assignmentReason: reason?.trim() || 'Lead reassignment',
      },
      include: {
        fromEmployee: { select: { employeeId: true, fullName: true } },
        toEmployee: { select: { employeeId: true, fullName: true } },
      },
    });

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        assignedToId: resolvedToEmployeeId,
      },
      include: {
        assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true } },
      },
    });

    // Log Activity
    const actNumber = await generateActivityNumber();
    await prisma.activity.create({
      data: {
        activityNumber: actNumber,
        type: 'NOTE',
        subject: `Lead reassigned to ${assignmentRecord.toEmployee?.fullName || resolvedToEmployeeId}`,
        description: `Reassigned by ${user.fullName || 'Admin'}. Reason: ${reason || 'Not specified'}`,
        status: 'COMPLETED',
        leadId: lead.id,
        clientId: lead.clientId,
        performedById: assignerEmpId,
      },
    });

    // Audit log
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'LEAD_REASSIGNED',
      entityType: 'LEAD',
      entityId: lead.leadNumber,
      previousData: { assignedToId: previousEmployeeId },
      newData: {
        assignedToId: resolvedToEmployeeId,
        reason,
        assignmentId: assignmentRecord.id,
      },
      status: 'SUCCESS',
    });

    // Send notification
    await notifyReassignment({
      toEmployeeId: resolvedToEmployeeId,
      fromEmployeeId: previousEmployeeId || undefined,
      assignerName: user.fullName || 'Admin',
      itemType: 'Lead',
      itemTitle: `${lead.leadNumber} - ${lead.fullName}`,
      itemId: lead.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead reassigned successfully',
      data: {
        lead: updatedLead,
        assignment: assignmentRecord,
      },
    });
  } catch (error: any) {
    console.error('Error assigning lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to assign lead' }, { status: 500 });
  }
}
