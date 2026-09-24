import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateAccountNumber } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export interface CreateAccountInput {
  companyName: string;
  legalName?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  email?: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  status?: string;
  accountType?: string;
  source?: string;
  annualRevenue?: number;
  ownerId?: string | null;
  clientId?: string | null;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}

export async function createAccount(input: CreateAccountInput) {
  const accountCode = await generateAccountNumber();
  const resolvedOwnerId = input.ownerId ? await resolveEmployeeObjectId(input.ownerId) : null;

  const account = await prisma.account.create({
    data: {
      accountCode,
      companyName: input.companyName.trim(),
      legalName: input.legalName?.trim() || null,
      industry: input.industry?.trim() || null,
      companySize: input.companySize || null,
      website: input.website?.trim() || null,
      email: input.email?.trim()?.toLowerCase() || null,
      phone: input.phone.trim(),
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      country: input.country || 'India',
      address: input.address?.trim() || null,
      status: input.status || 'PROSPECT',
      accountType: input.accountType || 'COMMERCIAL',
      source: input.source || 'DIRECT',
      annualRevenue: input.annualRevenue || 0,
      ownerId: resolvedOwnerId,
      clientId: input.clientId || null,
      createdById: input.actorUserId || null,
    },
    include: {
      owner: { select: { id: true, employeeId: true, fullName: true, designation: true } },
    },
  });

  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'CREATE_ACCOUNT',
    entityType: 'ACCOUNT',
    entityId: account.accountCode,
    newData: { id: account.id, accountCode: account.accountCode, companyName: account.companyName },
    status: 'SUCCESS',
  });

  return account;
}

export async function getAccount360(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      owner: { select: { id: true, employeeId: true, fullName: true, designation: true, phone: true } },
      client: { select: { id: true, clientId: true, status: true, onboardingDate: true } },
      contacts: {
        orderBy: { isPrimary: 'desc' },
        select: {
          id: true,
          contactNumber: true,
          fullName: true,
          designation: true,
          email: true,
          phone: true,
          decisionRole: true,
          isPrimary: true,
          status: true,
        },
      },
      deals: {
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { fullName: true, employeeId: true } },
          pipelineStage: { select: { name: true, colorToken: true } },
        },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
        },
      },
      contracts: {
        orderBy: { createdAt: 'desc' },
        include: {
          renewals: true,
        },
      },
      renewals: {
        orderBy: { renewalDate: 'asc' },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          performedBy: { select: { fullName: true, employeeId: true } },
        },
      },
      handoffs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!account) return null;

  // Calculate commercial metrics
  const totalDeals = account.deals.length;
  const wonDeals = account.deals.filter((d) => d.status === 'WON');
  const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const openDeals = account.deals.filter((d) => d.status === 'OPEN');
  const openPipeline = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.weightedValue || 0), 0);

  return {
    ...account,
    metrics: {
      totalDeals,
      wonDealsCount: wonDeals.length,
      wonRevenue,
      openPipeline,
      weightedPipeline,
      activeContractsCount: account.contracts.filter((c) => c.status === 'ACTIVE').length,
    },
  };
}

export async function listAccounts(params: {
  search?: string;
  status?: string;
  industry?: string;
  ownerId?: string;
  clientId?: string | null;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const skip = (page - 1) * limit;

  const where: any = {
    ...(params.clientId ? { clientId: params.clientId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.industry ? { industry: params.industry } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.search
      ? {
          OR: [
            { companyName: { contains: params.search, mode: 'insensitive' } },
            { accountCode: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, accounts] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, employeeId: true, fullName: true, designation: true } },
        client: { select: { id: true, clientId: true, status: true } },
        _count: {
          select: {
            contacts: true,
            deals: true,
            quotes: true,
            contracts: true,
            activities: true,
          },
        },
      },
      skip,
      take: limit,
    }),
  ]);

  return {
    accounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
