import { NextRequest, NextResponse } from 'next/server';
import { prisma, getDealLookup, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { DEAL_STAGE_DEFAULT_PROBABILITIES, DealStage } from '@/lib/constants/crm';
import { generateActivityNumber } from '@/lib/id-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { targetStage: requestedStage, reason } = body;

    const deal = await prisma.deal.findFirst({
      where: getDealLookup(params.id),
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (deal.stage !== 'WON' && deal.stage !== 'LOST') {
      return NextResponse.json(
        { error: 'Only closed deals (WON or LOST) can be reopened.' },
        { status: 400 }
      );
    }

    const currentStage = deal.stage as DealStage;
    const targetStage: DealStage =
      requestedStage && ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'].includes(requestedStage)
        ? (requestedStage as DealStage)
        : currentStage === 'WON'
        ? 'NEGOTIATION'
        : 'QUALIFIED';

    const newProbability = DEAL_STAGE_DEFAULT_PROBABILITIES[targetStage] ?? 50;
    const newWeightedValue = ((deal.amount || 0) * newProbability) / 100;

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
          stage: targetStage,
          status: 'OPEN',
          probability: newProbability,
          weightedValue: newWeightedValue,
          closedAt: null,
          wonReason: null,
          lostReason: null,
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
          toStage: targetStage,
          fromProbability: deal.probability ?? (currentStage === 'WON' ? 100 : 0),
          toProbability: newProbability,
          reason: `Deal Reopened: ${reason || 'Deal active discussions resumed'}`,
          changedById: changerEmployeeId,
        },
      }),
      prisma.activity.create({
        data: {
          activityNumber,
          type: 'OTHER',
          status: 'COMPLETED',
          subject: `Deal Reopened: ${deal.title}`,
          description: `Stage reset from ${currentStage} to ${targetStage}. Reason: ${reason || 'Reopened'}`,
          completedAt: new Date(),
          dealId: deal.id,
          performedById: changerEmployeeId || deal.assignedToId || null,
        },
      }),
    ]);

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'DEAL_REOPENED',
      entityType: 'DEAL',
      entityId: deal.dealNumber,
      previousData: { stage: currentStage, status: deal.status },
      newData: { stage: targetStage, status: 'OPEN', reason },
      reason,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Deal reopened and moved to ${targetStage}`,
      data: updatedDeal,
    });
  } catch (error: any) {
    console.error('Error reopening deal:', error);
    return NextResponse.json({ error: error.message || 'Failed to reopen deal' }, { status: 500 });
  }
}
