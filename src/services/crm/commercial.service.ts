import { prisma } from '@/lib/prisma';
import {
  generateProductCode,
  generateQuoteNumber,
  generateContractNumber,
  generateRenewalNumber,
  generateClientId,
} from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

// ----------------------------------------------------
// 1. PRODUCTS & SERVICES
// ----------------------------------------------------

export async function ensureDefaultProducts() {
  const count = await prisma.product.count();
  if (count === 0) {
    const defaults = [
      { name: 'Enterprise Workforce Management Platform', type: 'SUBSCRIPTION', category: 'Software', unit: 'LICENSE', unitPrice: 250000, taxRate: 18.0 },
      { name: 'Biometric Telemetry Device & Sync Node', type: 'PRODUCT', category: 'Hardware', unit: 'UNIT', unitPrice: 18500, taxRate: 18.0 },
      { name: 'Dedicated On-Site Implementation & Training', type: 'SERVICE', category: 'Professional Services', unit: 'MONTH', unitPrice: 75000, taxRate: 18.0 },
      { name: 'Contractor Payroll & Statutory Compliance Suite', type: 'SUBSCRIPTION', category: 'Software', unit: 'MONTH', unitPrice: 35000, taxRate: 18.0 },
      { name: '24/7 SLA Priority Technical Support', type: 'SERVICE', category: 'Support', unit: 'MONTH', unitPrice: 20000, taxRate: 18.0 },
    ];

    for (const d of defaults) {
      const productCode = await generateProductCode();
      await prisma.product.create({
        data: {
          productCode,
          name: d.name,
          type: d.type,
          category: d.category,
          unit: d.unit,
          unitPrice: d.unitPrice,
          currency: 'INR',
          taxRate: d.taxRate,
          isActive: true,
        },
      });
    }
  }
}

export async function listProducts(params?: { search?: string; type?: string; activeOnly?: boolean }) {
  await ensureDefaultProducts();
  const where: any = {
    ...(params?.activeOnly ? { isActive: true } : {}),
    ...(params?.type ? { type: params.type } : {}),
    ...(params?.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { productCode: { contains: params.search, mode: 'insensitive' } },
            { category: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProduct(input: {
  name: string;
  type?: string;
  category?: string;
  description?: string;
  unit?: string;
  unitPrice: number;
  currency?: string;
  taxRate?: number;
  actorUserId?: string | null;
}) {
  const productCode = await generateProductCode();
  const product = await prisma.product.create({
    data: {
      productCode,
      name: input.name.trim(),
      type: input.type || 'PRODUCT',
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      unit: input.unit || 'UNIT',
      unitPrice: Number(input.unitPrice) || 0,
      currency: input.currency || 'INR',
      taxRate: input.taxRate !== undefined ? Number(input.taxRate) : 18.0,
      isActive: true,
    },
  });

  return product;
}

// ----------------------------------------------------
// 2. QUOTES & PROPOSALS
// ----------------------------------------------------

export interface CreateQuoteItemInput {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface CreateQuoteInput {
  dealId: string;
  accountId: string;
  expiryDate?: string;
  terms?: string;
  notes?: string;
  items: CreateQuoteItemInput[];
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}

export async function createQuote(input: CreateQuoteInput) {
  const quoteNumber = await generateQuoteNumber();

  // Calculate items and totals strictly on server
  let subtotal = 0;
  let totalTax = 0;

  const calculatedItems = input.items.map((item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    const taxRate = item.taxRate !== undefined ? Number(item.taxRate) : 18.0;

    const lineSubtotal = Math.max(0, qty * price - discount);
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    totalTax += lineTax;

    return {
      productId: item.productId,
      description: item.description || null,
      quantity: qty,
      unitPrice: price,
      discount,
      taxRate,
      total: lineTotal,
    };
  });

  const grandTotal = subtotal + totalTax;

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      version: 1,
      dealId: input.dealId,
      accountId: input.accountId,
      status: 'DRAFT',
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal,
      discount: 0,
      tax: totalTax,
      total: grandTotal,
      terms: input.terms || 'Standard 30-day commercial terms. GST applicable at 18%.',
      notes: input.notes || null,
      createdById: input.actorUserId || null,
      items: {
        create: calculatedItems,
      },
    },
    include: {
      items: { include: { product: true } },
      deal: { select: { dealNumber: true, title: true } },
      account: { select: { accountCode: true, companyName: true } },
    },
  });

  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'CREATE_QUOTE',
    entityType: 'QUOTE',
    entityId: quote.quoteNumber,
    newData: { id: quote.id, quoteNumber: quote.quoteNumber, total: quote.total },
    status: 'SUCCESS',
  });

  return quote;
}

export async function approveQuote(quoteId: string, actor: { userId?: string; employeeId?: string }) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error('Quote not found');

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: 'APPROVED',
      approvedById: actor.userId || null,
      approvedAt: new Date(),
    },
  });

  await logAuditEvent({
    actorUserId: actor.userId || null,
    actorEmployeeId: actor.employeeId || 'SYSTEM',
    action: 'APPROVE_QUOTE',
    entityType: 'QUOTE',
    entityId: quote.quoteNumber,
    previousData: { status: quote.status },
    newData: { status: 'APPROVED' },
    status: 'SUCCESS',
  });

  return updated;
}

// ----------------------------------------------------
// 3. CONTRACTS & RENEWALS
// ----------------------------------------------------

export async function createContract(input: {
  accountId: string;
  dealId: string;
  quoteId?: string | null;
  contractType?: string;
  startDate: string;
  endDate: string;
  value: number;
  currency?: string;
  notes?: string;
  ownerId?: string | null;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}) {
  const contractNumber = await generateContractNumber();
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const renewalDate = new Date(endDate.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days before expiry

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      accountId: input.accountId,
      dealId: input.dealId,
      quoteId: input.quoteId || null,
      contractType: input.contractType || 'STANDARD',
      status: 'ACTIVE',
      startDate,
      endDate,
      renewalDate,
      value: Number(input.value) || 0,
      currency: input.currency || 'INR',
      ownerId: input.ownerId || null,
      notes: input.notes || null,
    },
    include: {
      account: { select: { accountCode: true, companyName: true } },
      deal: { select: { dealNumber: true, title: true } },
    },
  });

  // Automatically create upcoming Renewal record
  const renewalNumber = await generateRenewalNumber();
  await prisma.renewal.create({
    data: {
      renewalNumber,
      accountId: input.accountId,
      contractId: contract.id,
      previousDealId: input.dealId,
      renewalDate,
      expectedValue: Number(input.value) * 1.1, // 10% expected expansion default
      ownerId: input.ownerId || null,
      status: 'UPCOMING',
    },
  });

  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'CREATE_CONTRACT',
    entityType: 'CONTRACT',
    entityId: contract.contractNumber,
    newData: { id: contract.id, contractNumber: contract.contractNumber, value: contract.value },
    status: 'SUCCESS',
  });

  return contract;
}

// ----------------------------------------------------
// 4. CLIENT HANDOFF PROCESSOR
// ----------------------------------------------------

export async function processClientHandoff(params: {
  handoffId: string;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}) {
  const handoff = await prisma.clientHandoff.findUnique({
    where: { id: params.handoffId },
    include: {
      account: true,
      deal: true,
    },
  });

  if (!handoff) throw new Error('Client handoff record not found');
  if (handoff.status === 'COMPLETED') throw new Error('Handoff has already been processed');

  // Generate official Client ID in Client Management (CLI-XXXXX)
  const clientId = await generateClientId(handoff.account.companyName);

  // Create Client Management record
  const newClient = await prisma.client.create({
    data: {
      clientId,
      companyName: handoff.account.companyName,
      contactPerson: handoff.account.legalName || handoff.account.companyName,
      mobile: handoff.account.phone,
      email: handoff.account.email,
      address: handoff.account.address,
      city: handoff.account.city,
      state: handoff.account.state,
      country: handoff.account.country,
      industry: handoff.account.industry,
      status: 'ACTIVE',
      estimatedValue: handoff.dealValue,
      salesOwnerId: handoff.deal.assignedToId,
      onboardingDate: new Date(),
    },
  });

  // Link Account to newly provisioned Client
  await prisma.account.update({
    where: { id: handoff.accountId },
    data: {
      clientId: newClient.id,
      status: 'CUSTOMER',
    },
  });

  // Mark handoff as completed
  const updatedHandoff = await prisma.clientHandoff.update({
    where: { id: handoff.id },
    data: {
      status: 'COMPLETED',
      createdClientId: newClient.id,
      processedById: params.actorUserId || null,
      processedAt: new Date(),
    },
  });

  // Create auto Contract for the won deal
  await createContract({
    accountId: handoff.accountId,
    dealId: handoff.dealId,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    value: handoff.dealValue,
    currency: 'INR',
    notes: `Contract created automatically via completed Client Handoff (${handoff.handoffReference} -> ${clientId})`,
    ownerId: handoff.deal.assignedToId,
    actorUserId: params.actorUserId,
    actorEmployeeId: params.actorEmployeeId,
  });

  await logAuditEvent({
    actorUserId: params.actorUserId || null,
    actorEmployeeId: params.actorEmployeeId || 'SYSTEM',
    action: 'CLIENT_HANDOFF_COMPLETED',
    entityType: 'CLIENT_HANDOFF',
    entityId: handoff.handoffReference,
    previousData: { status: handoff.status },
    newData: { status: 'COMPLETED', createdClientId: clientId },
    reason: `Client handoff processed, Client record ${clientId} created in Client Management`,
    status: 'SUCCESS',
  });

  return {
    handoff: updatedHandoff,
    client: newClient,
  };
}
