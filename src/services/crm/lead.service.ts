import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import {
  generateLeadNumber,
  generateAccountNumber,
  generateContactNumber,
  generateDealNumber,
} from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';
import { notifyAssignment } from '@/lib/notifications';

export interface LeadScoreResult {
  score: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown: Record<string, number>;
}

export function calculateLeadScore(lead: {
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  source?: string | null;
  description?: string | null;
  estimatedValue?: number | null;
  status?: string | null;
}): LeadScoreResult {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // Valid phone (+15)
  if (lead.phone && lead.phone.replace(/\D/g, '').length >= 10) {
    score += 15;
    breakdown['validPhone'] = 15;
  }

  // Company / Corporate email (+10)
  if (lead.email && lead.email.includes('@') && !lead.email.includes('gmail.com') && !lead.email.includes('yahoo.com')) {
    score += 10;
    breakdown['corporateEmail'] = 10;
  } else if (lead.email) {
    score += 5;
    breakdown['emailProvided'] = 5;
  }

  // Company name provided (+10)
  if (lead.companyName && lead.companyName.trim().length > 2) {
    score += 10;
    breakdown['companyName'] = 10;
  }

  // High-intent source (+15)
  const highIntentSources = ['WEBSITE', 'REFERRAL', 'INBOUND', 'CAMPAIGN'];
  if (lead.source && highIntentSources.includes(lead.source.toUpperCase())) {
    score += 15;
    breakdown['highIntentSource'] = 15;
  }

  // Target industry provided (+10)
  if (lead.industry && lead.industry.trim().length > 0) {
    score += 10;
    breakdown['targetIndustry'] = 10;
  }

  // Target city / location (+10)
  if (lead.city && lead.city.trim().length > 0) {
    score += 10;
    breakdown['targetCity'] = 10;
  }

  // Website provided (+10)
  if (lead.website && lead.website.trim().length > 4) {
    score += 10;
    breakdown['websiteProvided'] = 10;
  }

  // Requirement description provided (+10)
  if (lead.description && lead.description.trim().length > 10) {
    score += 10;
    breakdown['requirementDetail'] = 10;
  }

  // Commercial budget estimated (+10)
  if (lead.estimatedValue && lead.estimatedValue > 0) {
    score += 10;
    breakdown['budgetEstimated'] = 10;
  }

  // Qualification complete (+20)
  if (lead.status === 'QUALIFIED') {
    score += 20;
    breakdown['qualificationComplete'] = 20;
  }

  // Clamp 0 - 100
  const finalScore = Math.min(100, Math.max(0, score));
  let category: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (finalScore >= 70) category = 'HIGH';
  else if (finalScore >= 40) category = 'MEDIUM';

  return { score: finalScore, category, breakdown };
}

export async function detectLeadDuplicates(params: {
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  excludeId?: string | null;
}) {
  const orConditions: any[] = [];

  if (params.phone && params.phone.trim()) {
    const cleanPhone = params.phone.replace(/\D/g, '');
    if (cleanPhone.length >= 6) {
      orConditions.push({ phone: { contains: cleanPhone.slice(-10) } });
    }
  }

  if (params.email && params.email.trim()) {
    orConditions.push({ email: { equals: params.email.trim().toLowerCase(), mode: 'insensitive' } });
  }

  if (params.companyName && params.companyName.trim().length >= 3) {
    orConditions.push({ companyName: { equals: params.companyName.trim(), mode: 'insensitive' } });
  }

  if (orConditions.length === 0) return [];

  return await prisma.lead.findMany({
    where: {
      OR: orConditions,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      isArchived: false,
    },
    select: {
      id: true,
      leadNumber: true,
      fullName: true,
      contactPerson: true,
      companyName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      assignedTo: {
        select: {
          fullName: true,
          employeeId: true,
        },
      },
    },
    take: 5,
  });
}

export interface ConvertLeadInput {
  leadId: string;
  createAccount?: boolean;
  accountName?: string;
  createContact?: boolean;
  contactName?: string;
  decisionRole?: string;
  createDeal?: boolean;
  dealTitle?: string;
  dealAmount?: number;
  dealProbability?: number;
  expectedCloseDate?: string;
  ownerId?: string | null;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
}

export async function convertLeadToCommercialEntities(input: ConvertLeadInput) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { contacts: true, activities: true, tasks: true, notes: true },
  });

  if (!lead) {
    throw new Error(`Lead not found with ID ${input.leadId}`);
  }

  if (lead.status === 'CONVERTED') {
    throw new Error(`Lead ${lead.leadNumber} has already been converted.`);
  }

  const resolvedOwnerId = input.ownerId
    ? await resolveEmployeeObjectId(input.ownerId)
    : lead.assignedToId;

  let createdAccount: any = null;
  let createdContact: any = null;
  let createdDeal: any = null;

  // 1. Create or resolve Account
  if (input.createAccount !== false) {
    const accountCode = await generateAccountNumber();
    const companyName = input.accountName?.trim() || lead.companyName || lead.fullName || 'Untitled Account';

    createdAccount = await prisma.account.create({
      data: {
        accountCode,
        companyName,
        industry: lead.industry,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        state: lead.state,
        country: lead.country || 'India',
        address: lead.location,
        status: 'CUSTOMER',
        accountType: 'COMMERCIAL',
        source: lead.source || 'LEAD_CONVERSION',
        ownerId: resolvedOwnerId,
        createdById: input.actorUserId || undefined,
      },
    });
  }

  // 2. Create Contact
  if (input.createContact !== false) {
    const contactNumber = await generateContactNumber();
    const contactName = input.contactName?.trim() || lead.contactPerson || lead.fullName || 'Primary Contact';

    createdContact = await prisma.contact.create({
      data: {
        contactNumber,
        fullName: contactName,
        email: lead.email,
        phone: lead.phone,
        alternatePhone: lead.alternatePhone,
        decisionRole: input.decisionRole || 'DECISION_MAKER',
        isPrimary: true,
        accountId: createdAccount?.id || undefined,
        leadId: lead.id,
      },
    });
  }

  // 3. Create Deal
  if (input.createDeal !== false) {
    const dealNumber = await generateDealNumber();
    const dealTitle =
      input.dealTitle?.trim() ||
      `${createdAccount?.companyName || lead.companyName || 'B2B'} Commercial Contract`;
    const amount = Number(input.dealAmount) || lead.estimatedValue || 0;
    const probability = input.dealProbability !== undefined ? Number(input.dealProbability) : 50;
    const weightedValue = (amount * probability) / 100;

    createdDeal = await prisma.deal.create({
      data: {
        dealNumber,
        title: dealTitle,
        amount,
        probability,
        weightedValue,
        currency: 'INR',
        stage: 'NEW',
        status: 'OPEN',
        accountId: createdAccount?.id || undefined,
        leadId: lead.id,
        primaryContactId: createdContact?.id || undefined,
        assignedToId: resolvedOwnerId,
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
        createdBy: input.actorName || 'System',
      },
    });

    // Record initial deal stage history
    await prisma.dealStageHistory.create({
      data: {
        dealId: createdDeal.id,
        fromStage: null,
        toStage: 'NEW',
        toProbability: probability,
        changedById: resolvedOwnerId,
        reason: `Initial creation upon conversion from ${lead.leadNumber}`,
      },
    });
  }

  // 4. Update the Lead record - preserve without deleting!
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'CONVERTED',
      convertedAt: new Date(),
      convertedById: input.actorUserId || null,
      convertedAccountId: createdAccount?.id || null,
      convertedToContactId: createdContact?.id || null,
      convertedToDealId: createdDeal?.id || null,
    },
  });

  // 5. Relink existing activities and tasks to the new Account/Contact/Deal
  if (createdAccount || createdDeal) {
    await prisma.activity.updateMany({
      where: { leadId: lead.id },
      data: {
        ...(createdAccount ? { accountId: createdAccount.id } : {}),
        ...(createdDeal ? { dealId: createdDeal.id } : {}),
      },
    });

    await prisma.task.updateMany({
      where: { leadId: lead.id },
      data: {
        ...(createdDeal ? { dealId: createdDeal.id } : {}),
      },
    });
  }

  // 6. Record Immutable Audit Log
  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'LEAD_CONVERTED',
    entityType: 'LEAD',
    entityId: lead.leadNumber,
    previousData: { status: lead.status },
    newData: {
      status: 'CONVERTED',
      accountId: createdAccount?.id,
      accountCode: createdAccount?.accountCode,
      contactId: createdContact?.id,
      dealId: createdDeal?.id,
      dealNumber: createdDeal?.dealNumber,
    },
    reason: 'Controlled commercial lead conversion',
    status: 'SUCCESS',
  });

  return {
    lead: updatedLead,
    account: createdAccount,
    contact: createdContact,
    deal: createdDeal,
  };
}

export async function assignLead(params: {
  leadId: string;
  toEmployeeId: string;
  assignedById: string;
  assignmentReason?: string;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  actorName?: string | null;
}) {
  const resolvedToEmpId = await resolveEmployeeObjectId(params.toEmployeeId);
  if (!resolvedToEmpId) throw new Error('Target employee not found');

  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    select: { id: true, leadNumber: true, fullName: true, assignedToId: true },
  });

  if (!lead) throw new Error('Lead not found');

  const fromEmpId = lead.assignedToId;

  // Update lead
  const updatedLead = await prisma.lead.update({
    where: { id: lead.id },
    data: { assignedToId: resolvedToEmpId },
    include: {
      assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true } },
    },
  });

  // Record assignment history
  const assignerEmpId = params.actorEmployeeId
    ? await resolveEmployeeObjectId(params.actorEmployeeId)
    : resolvedToEmpId;

  if (assignerEmpId) {
    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        fromEmployeeId: fromEmpId,
        toEmployeeId: resolvedToEmpId,
        assignedById: assignerEmpId,
        assignmentReason: params.assignmentReason || 'Reassigned by sales administrator',
      },
    });
  }

  // Send assignment notification
  await notifyAssignment({
    employeeId: resolvedToEmpId,
    assignerName: params.actorName || 'Admin',
    itemType: 'Lead',
    itemTitle: `${lead.leadNumber} - ${lead.fullName}`,
    itemId: lead.id,
  });

  // Immutable audit log
  await logAuditEvent({
    actorUserId: params.actorUserId || null,
    actorEmployeeId: params.actorEmployeeId || 'SYSTEM',
    action: 'LEAD_ASSIGNED',
    entityType: 'LEAD',
    entityId: lead.leadNumber,
    previousData: { assignedToId: fromEmpId },
    newData: { assignedToId: resolvedToEmpId, reason: params.assignmentReason },
    status: 'SUCCESS',
  });

  return updatedLead;
}

export async function mergeLeads(params: {
  primaryLeadId: string;
  secondaryLeadId: string;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}) {
  const [primary, secondary] = await Promise.all([
    prisma.lead.findUnique({ where: { id: params.primaryLeadId } }),
    prisma.lead.findUnique({ where: { id: params.secondaryLeadId } }),
  ]);

  if (!primary || !secondary) throw new Error('Both leads must exist to perform merge.');

  // Re-link secondary lead's activities, tasks, and notes to primary lead
  await Promise.all([
    prisma.activity.updateMany({
      where: { leadId: secondary.id },
      data: { leadId: primary.id },
    }),
    prisma.task.updateMany({
      where: { leadId: secondary.id },
      data: { leadId: primary.id },
    }),
    prisma.note.updateMany({
      where: { leadId: secondary.id },
      data: { leadId: primary.id },
    }),
    prisma.followUp.updateMany({
      where: { leadId: secondary.id },
      data: { leadId: primary.id },
    }),
  ]);

  // Archive secondary lead
  await prisma.lead.update({
    where: { id: secondary.id },
    data: {
      isArchived: true,
      status: 'LOST',
      description: `${secondary.description || ''}\n[Merged into ${primary.leadNumber}]`,
    },
  });

  // Log audit
  await logAuditEvent({
    actorUserId: params.actorUserId || null,
    actorEmployeeId: params.actorEmployeeId || 'SYSTEM',
    action: 'LEAD_MERGED',
    entityType: 'LEAD',
    entityId: primary.leadNumber,
    previousData: { secondaryLeadId: secondary.id, secondaryLeadNumber: secondary.leadNumber },
    newData: { status: 'MERGED_ACTIVE' },
    reason: `Merged duplicate lead ${secondary.leadNumber} into ${primary.leadNumber}`,
    status: 'SUCCESS',
  });

  return primary;
}
