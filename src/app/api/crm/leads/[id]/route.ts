import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId, resolveClientObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { verifyClientOrganizationAccess } from '@/lib/tenant';
import { isValidLeadTransition } from '@/lib/constants/crm';

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const leadBasic = await findLeadByIdentifier(id);

    if (!leadBasic) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Tenant check
    if (user.role === 'CLIENT') {
      if (!user.clientId || leadBasic.clientId !== user.clientId) {
        return NextResponse.json({ error: 'Access denied to this lead' }, { status: 403 });
      }
    }

    // Fetch full 360 details
    const lead = await prisma.lead.findUnique({
      where: { id: leadBasic.id },
      include: {
        client: {
          select: { id: true, clientId: true, companyName: true, email: true, phone: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true, phone: true },
        },
        contacts: {
          where: { isArchived: false },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { employeeId: true, fullName: true } },
          },
          take: 50,
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            assignedTo: { select: { employeeId: true, fullName: true } },
            contact: { select: { id: true, fullName: true, phone: true, designation: true } },
          },
          take: 50,
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { employeeId: true, fullName: true } },
          },
          take: 50,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { employeeId: true, fullName: true } },
          },
          take: 50,
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            fromEmployee: { select: { employeeId: true, fullName: true } },
            toEmployee: { select: { employeeId: true, fullName: true } },
            assignedBy: { select: { employeeId: true, fullName: true } },
          },
          take: 20,
        },
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    console.error('Error retrieving lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lead' }, { status: 500 });
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
    const existing = await findLeadByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId !== existing.clientId) {
      return NextResponse.json({ error: 'Access denied to this lead' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.fullName !== undefined) updateData.fullName = body.fullName.trim();
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson?.trim() || null;
    if (body.companyName !== undefined) updateData.companyName = body.companyName?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.alternatePhone !== undefined) updateData.alternatePhone = body.alternatePhone?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim()?.toLowerCase() || null;
    if (body.website !== undefined) updateData.website = body.website?.trim() || null;
    if (body.industry !== undefined) updateData.industry = body.industry?.trim() || null;
    if (body.location !== undefined) updateData.location = body.location?.trim() || null;
    if (body.city !== undefined) updateData.city = body.city?.trim() || null;
    if (body.state !== undefined) updateData.state = body.state?.trim() || null;
    if (body.country !== undefined) updateData.country = body.country?.trim() || 'India';
    if (body.source !== undefined) updateData.source = body.source;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.leadScore !== undefined) updateData.leadScore = parseInt(body.leadScore, 10) || 0;
    if (body.estimatedValue !== undefined) updateData.estimatedValue = parseFloat(body.estimatedValue) || 0;
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);
    if (body.lastContactedAt !== undefined) {
      updateData.lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt) : null;
    }
    if (body.nextFollowUpAt !== undefined) {
      updateData.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    }

    if (body.clientId !== undefined) {
      updateData.clientId = body.clientId ? await resolveClientObjectId(body.clientId) : null;
    }

    // Status change validation if attempted via PATCH
    if (body.status !== undefined && body.status !== existing.status) {
      if (!isValidLeadTransition(existing.status, body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existing.status} to ${body.status}. Allowed transitions must follow the lead state machine.`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        client: { select: { clientId: true, companyName: true } },
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_LEAD',
      entityType: 'LEAD',
      entityId: existing.leadNumber,
      previousData: { status: existing.status, priority: existing.priority, assignedToId: existing.assignedToId },
      newData: updateData,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR', 'MANAGER_TL'].includes(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Admin or Manager can delete leads.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await findLeadByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Soft delete (archive)
    const archived = await prisma.lead.update({
      where: { id: existing.id },
      data: { isArchived: true },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'ARCHIVE_LEAD',
      entityType: 'LEAD',
      entityId: existing.leadNumber,
      newData: { isArchived: true },
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Lead ${existing.leadNumber} has been archived.`,
      data: archived,
    });
  } catch (error: any) {
    console.error('Error archiving lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
