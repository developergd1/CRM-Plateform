import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateHrRequestNumber, generateHelpdeskTicketNumber, generatePolicyCode } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export async function ensureDefaultPoliciesAndRequestTypes() {
  const policyCount = await prisma.hrPolicy.count();
  if (policyCount === 0) {
    const policies = [
      {
        policyCode: 'POL-00001',
        title: 'Information Security & Data Protection Standard',
        category: 'IT_SECURITY',
        content: 'All employees and contractors must strictly safeguard client and proprietary platform assets, enforce multi-factor authentication, and adhere to clean desk standards.',
        version: '1.0',
        isActive: true,
        requiresAck: true,
        effectiveDate: new Date('2026-01-01'),
      },
      {
        policyCode: 'POL-00002',
        title: 'Workplace Conduct, Anti-Harassment & POSH Policy',
        category: 'CODE_OF_CONDUCT',
        content: 'Growth India enforces zero tolerance against discriminatory conduct, harassment, or workplace misconduct.',
        version: '1.0',
        isActive: true,
        requiresAck: true,
        effectiveDate: new Date('2026-01-01'),
      },
      {
        policyCode: 'POL-00003',
        title: 'Attendance, Remote Working & Leave Guidelines',
        category: 'ATTENDANCE',
        content: 'Prescribed standard shift hours are 9:30 AM to 6:30 PM. Core working hours require mandatory availability.',
        version: '1.0',
        isActive: true,
        requiresAck: true,
        effectiveDate: new Date('2026-01-01'),
      },
    ];

    for (const p of policies) {
      await prisma.hrPolicy.create({ data: p });
    }
  }

  const reqTypeCount = await prisma.hrRequestType.count();
  if (reqTypeCount === 0) {
    const types = [
      { code: 'LETTER', name: 'Bonafide / Employment Certificate', isActive: true },
      { code: 'ADDRESS_CHANGE', name: 'Company Address Proof for Bank / Passport', isActive: true },
      { code: 'BANK_CHANGE', name: 'Update Bank Account Details', isActive: true },
      { code: 'SHIFT_CHANGE', name: 'Shift Schedule Reassignment', isActive: true },
      { code: 'GENERAL', name: 'General HR Request', isActive: true },
    ];

    for (const t of types) {
      await prisma.hrRequestType.create({ data: t });
    }
  }
}

export async function getHrPolicies() {
  await ensureDefaultPoliciesAndRequestTypes();
  return prisma.hrPolicy.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { acknowledgments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createHrPolicy(
  input: {
    title: string;
    category: string;
    content: string;
    fileUrl?: string | null;
    requiresAck?: boolean;
    effectiveDate?: string;
  },
  user: { id: string; fullName: string }
) {
  const policyCode = await generatePolicyCode();
  const policy = await prisma.hrPolicy.create({
    data: {
      policyCode,
      title: input.title,
      category: input.category,
      content: input.content,
      fileUrl: input.fileUrl,
      requiresAck: input.requiresAck ?? true,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : new Date(),
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: policy.id,
    reason: `Created policy ${policyCode}: ${input.title}`,
  });

  return policy;
}

export async function acknowledgeHrPolicy(
  policyId: string,
  employeeId: string,
  metadata?: { ipAddress?: string }
) {
  const resolved = await resolveEmployeeObjectId(employeeId) || employeeId;

  const ack = await prisma.hrPolicyAcknowledgment.upsert({
    where: {
      policyId_employeeId: {
        policyId,
        employeeId: resolved,
      },
    },
    create: {
      policyId,
      employeeId: resolved,
      ipAddress: metadata?.ipAddress,
    },
    update: {
      acknowledgedAt: new Date(),
      ipAddress: metadata?.ipAddress,
    },
  });

  return ack;
}

export async function getHrRequestTypes() {
  await ensureDefaultPoliciesAndRequestTypes();
  return prisma.hrRequestType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createHrRequest(
  input: {
    employeeId: string;
    requestTypeId: string;
    title: string;
    description: string;
  },
  user: { id: string; fullName: string }
) {
  const resolved = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const reqNumber = await generateHrRequestNumber();

  const request = await prisma.hrRequest.create({
    data: {
      reqNumber,
      typeId: input.requestTypeId,
      employeeId: resolved,
      subject: input.title,
      details: input.description,
      status: 'SUBMITTED',
    },
    include: {
      type: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
  });

  return request;
}

export async function getHrRequests(filters?: { employeeId?: string; status?: string }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status) where.status = filters.status;

  return prisma.hrRequest.findMany({
    where,
    include: {
      type: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateHrRequestStatus(
  requestId: string,
  status: string,
  remarks: string | undefined,
  user: { id: string; fullName: string }
) {
  const request = await prisma.hrRequest.update({
    where: { id: requestId },
    data: {
      status,
      resolutionNotes: remarks,
      completedAt: status === 'APPROVED' || status === 'COMPLETED' ? new Date() : undefined,
    },
  });

  return request;
}

export async function createHelpdeskTicket(
  input: {
    employeeId: string;
    category?: string;
    subject: string;
    description: string;
    priority?: string;
  },
  user: { id: string; fullName: string }
) {
  const resolved = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const ticketNumber = await generateHelpdeskTicketNumber();

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      ticketNumber,
      employeeId: resolved,
      category: input.category || 'WORKPLACE',
      subject: input.subject,
      description: input.description,
      priority: input.priority || 'MEDIUM',
      status: 'OPEN',
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
  });

  return ticket;
}

export async function getHelpdeskTickets(filters?: { employeeId?: string; status?: string; tenantClientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status) where.status = filters.status;
  if (filters?.tenantClientId) {
    where.employee = { clientId: filters.tenantClientId };
  }

  return prisma.helpdeskTicket.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addHelpdeskComment(
  ticketId: string,
  comment: string,
  user: { id: string; fullName: string; role: string }
) {
  const ticketComment = await prisma.helpdeskComment.create({
    data: {
      ticketId,
      authorId: user.id,
      authorName: user.fullName,
      authorRole: user.role,
      message: comment,
    },
  });

  return ticketComment;
}

export async function updateHelpdeskStatus(
  ticketId: string,
  status: string,
  user: { id: string; fullName: string }
) {
  const ticket = await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
    },
  });

  return ticket;
}
