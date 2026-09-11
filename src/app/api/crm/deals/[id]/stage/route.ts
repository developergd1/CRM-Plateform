import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { notifyStatusChange } from '@/lib/notifications';
import { triggerAutomationEvent } from '@/lib/services/automation-service';
import {
  DEAL_STAGE_DEFAULT_PROBABILITIES,
  DEAL_STAGES,
  DealStage,
  isValidDealStageTransition,
} from '@/lib/constants/crm';
import { generateActivityNumber } from '@/lib/id-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { toStage, reason, probability, override = false } = body;

    if (!toStage || !DEAL_STAGES.includes(toStage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${toStage}. Allowed stages: ${DEAL_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const deal = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const currentStage = deal.stage as DealStage;

    // Check transition validity
    if (!override && !isValidDealStageTransition(currentStage, toStage)) {
      return NextResponse.json(
        {
          error: `Invalid transition from "${currentStage}" to "${toStage}". Please follow the standard lifecycle or provide manager override.`,
        },
        { status: 400 }
      );
    }

    // Require reason when marking LOST
    if (toStage === 'LOST' && !reason) {
      return NextResponse.json(
        { error: 'A valid reason is required when transitioning to Closed Lost.' },
        { status: 400 }
      );
    }

    // Determine target probability
    const targetStage = toStage as DealStage;
    const newProbability =
      probability !== undefined && probability !== null
        ? parseInt(probability, 10)
        : DEAL_STAGE_DEFAULT_PROBABILITIES[targetStage];

    const newWeightedValue = ((deal.amount || 0) * newProbability) / 100;
    const newStatus = targetStage === 'WON' ? 'WON' : targetStage === 'LOST' ? 'LOST' : 'OPEN';
    const closedAt = targetStage === 'WON' || targetStage === 'LOST' ? new Date() : null;

    // Resolve employee id
    let changerEmployeeId: string | null = null;
    if (user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(user.employeeId),
        select: { id: true },
      });
      if (emp) changerEmployeeId = emp.id;
    }

    // Atomic transaction for deal update + stage history + activity creation
    const activityNumber = await generateActivityNumber();

    const [updatedDeal, stageHistoryRecord] = await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: targetStage,
          status: newStatus,
          probability: newProbability,
          weightedValue: newWeightedValue,
          closedAt,
        },
        include: {
          client: { select: { clientId: true, companyName: true } },
          lead: { select: { leadNumber: true, companyName: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
        },
      }),
      prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: currentStage,
          toStage: targetStage,
          fromProbability: deal.probability ?? 10,
          toProbability: newProbability,
          reason: reason?.trim() || `Stage moved to ${targetStage}`,
          changedById: changerEmployeeId,
        },
      }),
      prisma.activity.create({
        data: {
          activityNumber,
          type: 'OTHER',
          status: 'COMPLETED',
          subject: `Deal Stage Changed: ${currentStage} → ${targetStage}`,
          description: reason?.trim() || `Deal stage advanced to ${targetStage} (Probability: ${newProbability}%)`,
          completedAt: new Date(),
          dealId: deal.id,
          performedById: changerEmployeeId || deal.assignedToId || null,
        },
      }),
    ]);

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DEAL_STAGE_CHANGED',
      entityType: 'DEAL',
      entityId: deal.dealNumber,
      previousData: { stage: currentStage, probability: deal.probability },
      newData: { stage: targetStage, probability: newProbability, reason },
      reason,
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
        newStatus: targetStage,
      });
    }

    if (targetStage === 'WON') {
      await triggerAutomationEvent(
        'DEAL_WON',
        { entityType: 'Deal', entityId: deal.id, data: { stage: 'WON', reason } },
        { id: user.id, name: user.fullName }
      ).catch((err) => console.error('DEAL_WON automation error:', err));
    } else if (targetStage === 'LOST') {
      await triggerAutomationEvent(
        'DEAL_LOST',
        { entityType: 'Deal', entityId: deal.id, data: { stage: 'LOST', reason } },
        { id: user.id, name: user.fullName }
      ).catch((err) => console.error('DEAL_LOST automation error:', err));
    } else {
      await triggerAutomationEvent(
        'DEAL_STAGE_CHANGED',
        { entityType: 'Deal', entityId: deal.id, data: { fromStage: currentStage, toStage: targetStage, reason } },
        { id: user.id, name: user.fullName }
      ).catch((err) => console.error('DEAL_STAGE_CHANGED automation error:', err));
    }

    return NextResponse.json({
      success: true,
      data: updatedDeal,
      stageHistory: stageHistoryRecord,
    });
  } catch (error: any) {
    console.error('Error changing deal stage:', error);
    return NextResponse.json({ error: error.message || 'Failed to change deal stage' }, { status: 500 });
  }
}
