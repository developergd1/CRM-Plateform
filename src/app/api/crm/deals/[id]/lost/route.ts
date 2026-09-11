import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { notifyStatusChange } from '@/lib/notifications';
import { triggerAutomationEvent } from '@/lib/services/automation-service';
import { LOST_REASONS } from '@/lib/constants/crm';
import { generateActivityNumber } from '@/lib/id-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { lostReason, closingNotes } = body;

    if (!lostReason || !LOST_REASONS.includes(lostReason)) {
      return NextResponse.json(
        {
          error: `A valid lost reason is required. Allowed options: ${LOST_REASONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (deal.stage === 'LOST') {
      return NextResponse.json({ error: 'Deal is already marked as LOST.' }, { status: 400 });
    }

    const currentStage = deal.stage || 'NEW';
    const closedAt = new Date();

    let changerEmployeeId: string | null = null;
    if (user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(user.employeeId),
        select: { id: true },
      });
      if (emp) changerEmployeeId = emp.id;
    }

    const activityNumber = await generateActivityNumber();

    const [updatedDeal] = await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: 'LOST',
          status: 'LOST',
          probability: 0,
          weightedValue: 0,
          lostReason,
          closingNotes: closingNotes?.trim() || null,
          closedAt,
        },
        include: {
          client: { select: { id: true, clientId: true, companyName: true } },
          lead: { select: { id: true, leadNumber: true, companyName: true, status: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
        },
      }),
      prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: currentStage,
          toStage: 'LOST',
          fromProbability: deal.probability ?? 10,
          toProbability: 0,
          reason: `Deal Closed Lost: ${lostReason}${closingNotes ? ` - ${closingNotes}` : ''}`,
          changedById: changerEmployeeId,
        },
      }),
      prisma.activity.create({
        data: {
          activityNumber,
          type: 'OTHER',
          status: 'COMPLETED',
          subject: `Deal Closed LOST: ${deal.title}`,
          description: `Lost Reason: ${lostReason}. ${closingNotes ? `Notes: ${closingNotes}` : ''}`,
          completedAt: closedAt,
          dealId: deal.id,
          performedById: changerEmployeeId || deal.assignedToId || null,
        },
      }),
    ]);

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DEAL_LOST',
      entityType: 'DEAL',
      entityId: deal.dealNumber,
      previousData: { stage: currentStage, amount: deal.amount },
      newData: { stage: 'LOST', lostReason, closingNotes, amount: deal.amount },
      reason: lostReason,
      status: 'SUCCESS',
    });

    if (deal.assignedToId && deal.assignedToId !== changerEmployeeId) {
      await notifyStatusChange({
        employeeId: deal.assignedToId,
        changerName: user.fullName,
        itemType: 'Deal',
        itemTitle: deal.title,
        itemId: deal.id,
        oldStatus: currentStage,
        newStatus: 'LOST',
      });
    }

    // Trigger DEAL_LOST automation
    await triggerAutomationEvent(
      'DEAL_LOST',
      { entityType: 'Deal', entityId: deal.id, data: { lostReason, closingNotes, amount: deal.amount } },
      { id: user.id, name: user.fullName }
    ).catch((err) => console.error('DEAL_LOST automation error:', err));

    return NextResponse.json({
      success: true,
      message: 'Deal marked as LOST successfully',
      data: updatedDeal,
    });
  } catch (error: any) {
    console.error('Error marking deal as lost:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark deal as lost' }, { status: 500 });
  }
}
