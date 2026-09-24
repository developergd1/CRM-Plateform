import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateDealNumber, generateHandoffReference } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export async function ensureDefaultPipeline() {
  let pipeline = await prisma.pipeline.findFirst({
    where: { isDefault: true },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: 'Standard B2B Commercial Pipeline',
        code: 'STANDARD_B2B',
        isDefault: true,
        isActive: true,
      },
      include: { stages: true },
    });

    const defaultStages = [
      { name: 'Discovery', order: 1, probability: 10, colorToken: 'teal', isWon: false, isLost: false },
      { name: 'Solution Qualified', order: 2, probability: 30, colorToken: 'teal', isWon: false, isLost: false },
      { name: 'Proposal / Quote', order: 3, probability: 60, colorToken: 'amber', isWon: false, isLost: false },
      { name: 'Negotiation', order: 4, probability: 80, colorToken: 'amber', isWon: false, isLost: false },
      { name: 'Closed Won', order: 5, probability: 100, colorToken: 'green', isWon: true, isLost: false },
      { name: 'Closed Lost', order: 6, probability: 0, colorToken: 'red', isWon: false, isLost: true },
    ];

    for (const s of defaultStages) {
      await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: s.name,
          order: s.order,
          probability: s.probability,
          colorToken: s.colorToken,
          isWon: s.isWon,
          isLost: s.isLost,
        },
      });
    }

    pipeline = await prisma.pipeline.findUnique({
      where: { id: pipeline.id },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  return pipeline!;
}

export interface CreateDealInput {
  title: string;
  amount?: number;
  probability?: number;
  currency?: string;
  accountId?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  primaryContactId?: string | null;
  assignedToId?: string | null;
  expectedCloseDate?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  productService?: string | null;
  terms?: string | null;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
}

export async function createDeal(input: CreateDealInput) {
  const dealNumber = await generateDealNumber();
  const pipeline = await ensureDefaultPipeline();

  let targetStageId = input.stageId;
  let targetStage = pipeline.stages.find((s) => s.id === targetStageId);
  if (!targetStage) {
    targetStage = pipeline.stages[0];
    targetStageId = targetStage?.id;
  }

  const amount = Number(input.amount) || 0;
  const probability =
    input.probability !== undefined
      ? Number(input.probability)
      : (targetStage?.probability ?? 50);
  const weightedValue = (amount * probability) / 100;

  const resolvedAssignedId = input.assignedToId
    ? await resolveEmployeeObjectId(input.assignedToId)
    : null;

  const deal = await prisma.deal.create({
    data: {
      dealNumber,
      title: input.title.trim(),
      amount,
      probability,
      weightedValue,
      currency: input.currency || 'INR',
      stage: targetStage?.name?.toUpperCase() || 'NEW',
      status: targetStage?.isWon ? 'WON' : targetStage?.isLost ? 'LOST' : 'OPEN',
      pipelineId: pipeline.id,
      stageId: targetStageId,
      accountId: input.accountId || null,
      clientId: input.clientId || null,
      leadId: input.leadId || null,
      primaryContactId: input.primaryContactId || null,
      assignedToId: resolvedAssignedId,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      productService: input.productService?.trim() || null,
      terms: input.terms?.trim() || null,
      createdBy: input.actorName || 'System',
    },
    include: {
      account: { select: { id: true, accountCode: true, companyName: true } },
      assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true } },
      pipelineStage: true,
    },
  });

  // Record initial stage history
  await prisma.dealStageHistory.create({
    data: {
      dealId: deal.id,
      fromStage: null,
      toStage: targetStage?.name || 'Discovery',
      toProbability: probability,
      changedById: resolvedAssignedId,
      reason: 'Initial deal creation',
    },
  });

  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'CREATE_DEAL',
    entityType: 'DEAL',
    entityId: deal.dealNumber,
    newData: { id: deal.id, dealNumber: deal.dealNumber, title: deal.title, amount: deal.amount },
    status: 'SUCCESS',
  });

  return deal;
}

export async function transitionDealStage(params: {
  dealId: string;
  stageId?: string;
  stageName?: string;
  reason?: string;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
}) {
  const deal = await prisma.deal.findUnique({
    where: { id: params.dealId },
    include: {
      account: true,
      pipelineStage: true,
      pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
    },
  });

  if (!deal) throw new Error('Deal not found');

  const pipeline = deal.pipeline || (await ensureDefaultPipeline());
  let targetStage = pipeline.stages.find((s) => s.id === params.stageId || s.name.toLowerCase() === params.stageName?.toLowerCase());

  if (!targetStage) {
    throw new Error(`Target stage not found in pipeline`);
  }

  const prevStageName = deal.pipelineStage?.name || deal.stage;
  const newProbability = targetStage.probability;
  const newWeightedValue = ((deal.amount || 0) * newProbability) / 100;

  const isWon = targetStage.isWon;
  const isLost = targetStage.isLost;
  const newStatus = isWon ? 'WON' : isLost ? 'LOST' : 'OPEN';

  const updatedDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: targetStage.id,
      stage: targetStage.name.toUpperCase(),
      status: newStatus,
      probability: newProbability,
      weightedValue: newWeightedValue,
      wonAt: isWon ? new Date() : deal.wonAt,
      lostAt: isLost ? new Date() : deal.lostAt,
      lostReason: isLost ? params.reason || 'Not specified' : deal.lostReason,
      closedAt: isWon || isLost ? new Date() : null,
    },
    include: {
      pipelineStage: true,
      account: true,
      assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true } },
    },
  });

  // Stage transition audit history
  const changerEmployeeId = params.actorEmployeeId
    ? await resolveEmployeeObjectId(params.actorEmployeeId)
    : deal.assignedToId;

  await prisma.dealStageHistory.create({
    data: {
      dealId: deal.id,
      fromStage: prevStageName,
      toStage: targetStage.name,
      fromProbability: deal.probability,
      toProbability: newProbability,
      changedById: changerEmployeeId,
      reason: params.reason || `Advanced to ${targetStage.name}`,
    },
  });

  // CRITICAL CLIENT HANDOFF TRIGGER (Section 3 & 33)
  // When a deal becomes Won, trigger a CLIENT HANDOFF event
  let handoffRecord = null;
  if (isWon && deal.accountId) {
    const handoffReference = await generateHandoffReference();
    handoffRecord = await prisma.clientHandoff.create({
      data: {
        handoffReference,
        dealId: deal.id,
        accountId: deal.accountId,
        status: 'PENDING',
        dealValue: deal.amount || 0,
        notes: `Automated handoff triggered by Deal Won: ${deal.dealNumber} - ${deal.title}`,
        submittedById: changerEmployeeId,
      },
    });

    // Also update account status to ACTIVE CUSTOMER
    await prisma.account.update({
      where: { id: deal.accountId },
      data: { status: 'CUSTOMER' },
    });
  }

  // Immutable audit log
  await logAuditEvent({
    actorUserId: params.actorUserId || null,
    actorEmployeeId: params.actorEmployeeId || 'SYSTEM',
    action: isWon ? 'DEAL_WON' : isLost ? 'DEAL_LOST' : 'DEAL_STAGE_CHANGED',
    entityType: 'DEAL',
    entityId: deal.dealNumber,
    previousData: { stage: prevStageName, status: deal.status },
    newData: {
      stage: targetStage.name,
      status: newStatus,
      handoffReference: handoffRecord?.handoffReference,
    },
    reason: params.reason,
    status: 'SUCCESS',
  });

  return {
    deal: updatedDeal,
    handoff: handoffRecord,
  };
}

export async function getDeal360(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      account: {
        include: {
          contacts: true,
          client: { select: { id: true, clientId: true, status: true } },
        },
      },
      lead: {
        select: { id: true, leadNumber: true, companyName: true, contactPerson: true, phone: true, email: true },
      },
      primaryContact: true,
      assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true, phone: true } },
      pipelineStage: true,
      pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
      stageHistory: {
        orderBy: { changedAt: 'desc' },
        include: {
          changedBy: { select: { fullName: true, employeeId: true } },
        },
      },
      lineItems: {
        include: { product: true },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } },
      },
      contracts: {
        orderBy: { createdAt: 'desc' },
      },
      handoffs: {
        orderBy: { createdAt: 'desc' },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: { select: { fullName: true, employeeId: true } },
        },
      },
      tasks: {
        orderBy: { dueDate: 'asc' },
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

  return deal;
}
