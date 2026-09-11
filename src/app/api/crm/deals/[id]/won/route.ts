import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { notifyStatusChange } from '@/lib/notifications';
import { triggerAutomationEvent } from '@/lib/services/automation-service';
import { WON_REASONS } from '@/lib/constants/crm';
import { generateActivityNumber } from '@/lib/id-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { wonReason, closingNotes } = body;

    if (!wonReason || !WON_REASONS.includes(wonReason)) {
      return NextResponse.json(
        {
          error: `A valid won reason is required. Allowed options: ${WON_REASONS.join(', ')}`,
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

    if (deal.stage === 'WON') {
      return NextResponse.json({ error: 'Deal is already marked as WON.' }, { status: 400 });
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
          stage: 'WON',
          status: 'WON',
          probability: 100,
          weightedValue: deal.amount,
          wonReason,
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
          toStage: 'WON',
          fromProbability: deal.probability ?? 80,
          toProbability: 100,
          reason: `Deal Closed Won: ${wonReason}${closingNotes ? ` - ${closingNotes}` : ''}`,
          changedById: changerEmployeeId,
        },
      }),
      prisma.activity.create({
        data: {
          activityNumber,
          type: 'OTHER',
          status: 'COMPLETED',
          subject: `🎉 Deal Closed WON: ${deal.title}`,
          description: `Won Reason: ${wonReason}. ${closingNotes ? `Notes: ${closingNotes}` : ''}`,
          completedAt: closedAt,
          dealId: deal.id,
          performedById: changerEmployeeId || deal.assignedToId || null,
        },
      }),
    ]);

    // If linked to Opportunity, update Opportunity as CLOSED_WON
    if (deal.opportunityId) {
      await prisma.opportunity.update({
        where: { id: deal.opportunityId },
        data: {
          stage: 'CLOSED_WON',
          probability: 100,
          wonReason,
          closedAt,
        },
      }).catch((e) => console.error('Failed to sync opportunity stage:', e));
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DEAL_WON',
      entityType: 'DEAL',
      entityId: deal.dealNumber,
      previousData: { stage: currentStage, amount: deal.amount },
      newData: { stage: 'WON', wonReason, closingNotes, amount: deal.amount },
      reason: wonReason,
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
        newStatus: 'WON',
      });
    }

    // Trigger DEAL_WON automation (auto-converts deal to client and notifies owner)
    await triggerAutomationEvent(
      'DEAL_WON',
      { entityType: 'Deal', entityId: deal.id, data: { wonReason, closingNotes, amount: deal.amount } },
      { id: user.id, name: user.fullName }
    ).catch((err) => console.error('DEAL_WON automation error:', err));

    return NextResponse.json({
      success: true,
      message: 'Deal marked as WON successfully',
      data: updatedDeal,
    });
  } catch (error: any) {
    console.error('Error marking deal as won:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark deal as won' }, { status: 500 });
  }
}
