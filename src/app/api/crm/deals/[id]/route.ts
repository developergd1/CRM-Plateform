import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deal = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
            contactPerson: true,
            email: true,
            mobile: true,
            industry: true,
            status: true,
          },
        },
        lead: {
          select: {
            id: true,
            leadNumber: true,
            companyName: true,
            contactPerson: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            source: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            opportunityNumber: true,
            title: true,
            value: true,
            stage: true,
          },
        },
        primaryContact: {
          select: {
            id: true,
            contactNumber: true,
            fullName: true,
            email: true,
            phone: true,
            designation: true,
            department: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            personalEmail: true,
          },
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedBy: { select: { fullName: true, employeeId: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: { select: { fullName: true, employeeId: true } },
          },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { fullName: true, employeeId: true } },
          },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            assignedTo: { select: { fullName: true, employeeId: true } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { fullName: true, employeeId: true } },
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deal });
  } catch (error: any) {
    console.error('Error fetching deal detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch deal' }, { status: 500 });
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
    const existing = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.productService !== undefined) updateData.productService = body.productService?.trim() || null;
    if (body.competitor !== undefined) updateData.competitor = body.competitor?.trim() || null;
    if (body.competitorNotes !== undefined) updateData.competitorNotes = body.competitorNotes?.trim() || null;
    if (body.terms !== undefined) updateData.terms = body.terms?.trim() || null;
    if (body.proposalStatus !== undefined) updateData.proposalStatus = body.proposalStatus;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.primaryContactId !== undefined) updateData.primaryContactId = body.primaryContactId || null;

    if (body.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = body.expectedCloseDate ? new Date(body.expectedCloseDate) : null;
    }
    if (body.closingDate !== undefined) {
      updateData.closingDate = body.closingDate ? new Date(body.closingDate) : null;
    }

    // Handle amount & probability recalculation
    const targetAmount = body.amount !== undefined ? parseFloat(body.amount) || 0 : existing.amount;
    const targetProbability =
      body.probability !== undefined ? parseInt(body.probability, 10) || 0 : existing.probability ?? 10;

    if (body.amount !== undefined) updateData.amount = targetAmount;
    if (body.probability !== undefined) updateData.probability = targetProbability;

    updateData.weightedValue = (targetAmount * targetProbability) / 100;

    const updated = await prisma.deal.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_DEAL',
      entityType: 'DEAL',
      entityId: existing.dealNumber,
      previousData: existing,
      newData: updated,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: error.message || 'Failed to update deal' }, { status: 500 });
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

    const existing = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    await prisma.deal.delete({ where: { id: existing.id } });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DELETE_DEAL',
      entityType: 'DEAL',
      entityId: existing.dealNumber,
      previousData: existing,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Deal deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete deal' }, { status: 500 });
  }
}
