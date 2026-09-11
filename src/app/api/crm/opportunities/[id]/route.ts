import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOpportunityLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const opportunity = await prisma.opportunity.findFirst({
      where: getOpportunityLookup(params.id),
      include: {
        client: {
          select: { id: true, clientId: true, companyName: true, contactPerson: true, email: true, mobile: true },
        },
        lead: {
          select: { id: true, leadNumber: true, companyName: true, contactPerson: true, email: true, phone: true, status: true },
        },
        primaryContact: {
          select: { id: true, contactNumber: true, fullName: true, email: true, phone: true, designation: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true, personalEmail: true },
        },
        deals: {
          include: {
            assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: opportunity });
  } catch (error: any) {
    console.error('Error fetching opportunity detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch opportunity' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const existing = await prisma.opportunity.findFirst({
      where: getOpportunityLookup(params.id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.value !== undefined) updateData.value = parseFloat(body.value) || 0;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.probability !== undefined) updateData.probability = parseInt(body.probability, 10) || 0;
    if (body.productService !== undefined) updateData.productService = body.productService?.trim() || null;
    if (body.competitor !== undefined) updateData.competitor = body.competitor?.trim() || null;
    if (body.proposalStatus !== undefined) updateData.proposalStatus = body.proposalStatus;
    if (body.wonReason !== undefined) updateData.wonReason = body.wonReason;
    if (body.lossReason !== undefined) updateData.lossReason = body.lossReason;
    if (body.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = body.expectedCloseDate ? new Date(body.expectedCloseDate) : null;
    }
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.primaryContactId !== undefined) updateData.primaryContactId = body.primaryContactId || null;

    if (body.stage === 'CLOSED_WON' || body.stage === 'CLOSED_LOST') {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.opportunity.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: existing.opportunityNumber,
      previousData: existing,
      newData: updated,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json({ error: error.message || 'Failed to update opportunity' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const existing = await prisma.opportunity.findFirst({
      where: getOpportunityLookup(params.id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    await prisma.opportunity.delete({ where: { id: existing.id } });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DELETE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: existing.opportunityNumber,
      previousData: existing,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Opportunity deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting opportunity:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete opportunity' }, { status: 500 });
  }
}
