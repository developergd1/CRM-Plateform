import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Returns true if the string is a valid 24-character hexadecimal MongoDB ObjectId.
 */
export function isValidObjectId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Safe lookup filter for Employee that prevents MongoDB ObjectId casting crashes
 * when searching by custom string employeeId (e.g. GI-EMP-000001).
 */
export function getEmployeeLookup(identifier?: string | null) {
  if (!identifier) return { employeeId: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { employeeId: identifier }] };
  }
  return { employeeId: identifier };
}

/**
 * Safe lookup filter for Client that prevents MongoDB ObjectId casting crashes
 * when searching by custom string clientId (e.g. CLI-00001).
 */
export function getClientLookup(identifier?: string | null) {
  if (!identifier) return { clientId: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { clientId: identifier }] };
  }
  return { clientId: identifier };
}

/**
 * Safe lookup filter for Deal that prevents MongoDB ObjectId casting crashes
 * when searching by custom string dealNumber (e.g. DEAL-00001).
 */
export function getDealLookup(identifier?: string | null) {
  if (!identifier) return { dealNumber: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { dealNumber: identifier }] };
  }
  return { dealNumber: identifier };
}

/**
 * Safe lookup filter for Opportunity that prevents MongoDB ObjectId casting crashes
 * when searching by custom string opportunityNumber (e.g. OPP-00001).
 */
export function getOpportunityLookup(identifier?: string | null) {
  if (!identifier) return { opportunityNumber: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { opportunityNumber: identifier }] };
  }
  return { opportunityNumber: identifier };
}

/**
 * Safe lookup filter for EmployeeDocument that prevents MongoDB ObjectId casting crashes
 * when searching by custom string documentId.
 */
export function getDocumentLookup(identifier?: string | null) {
  if (!identifier) return { documentId: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { documentId: identifier }] };
  }
  return { documentId: identifier };
}

/**
 * Safe lookup filter for Lead that prevents MongoDB ObjectId casting crashes
 * when searching by custom string leadNumber.
 */
export function getLeadLookup(identifier?: string | null) {
  if (!identifier) return { leadNumber: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { leadNumber: identifier }] };
  }
  return { leadNumber: identifier };
}

/**
 * Safe lookup filter for Contact that prevents MongoDB ObjectId casting crashes
 * when searching by custom string contactNumber.
 */
export function getContactLookup(identifier?: string | null) {
  if (!identifier) return { contactNumber: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { contactNumber: identifier }] };
  }
  return { contactNumber: identifier };
}

/**
 * Safe lookup filter for CRM Task that prevents MongoDB ObjectId casting crashes
 * when searching by custom string taskId.
 */
export function getTaskLookup(identifier?: string | null) {
  if (!identifier) return { taskId: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { taskId: identifier }] };
  }
  return { taskId: identifier };
}

/**
 * Safe lookup filter for FollowUp that prevents MongoDB ObjectId casting crashes
 * when searching by custom string followUpNumber.
 */
export function getFollowUpLookup(identifier?: string | null) {
  if (!identifier) return { followUpNumber: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { followUpNumber: identifier }] };
  }
  return { followUpNumber: identifier };
}

/**
 * Resolves any client identifier (ObjectId or custom string CLI-XXXXX) to the actual MongoDB ObjectId.
 */
export async function resolveClientObjectId(identifier?: string | null): Promise<string | null> {
  if (!identifier) return null;
  if (isValidObjectId(identifier)) {
    return identifier;
  }
  const client = await prisma.client.findFirst({
    where: { clientId: identifier },
    select: { id: true },
  });
  return client?.id || null;
}

/**
 * Resolves any employee identifier (ObjectId or custom string GI-EMP-XXXXX) to the actual MongoDB ObjectId.
 */
export async function resolveEmployeeObjectId(identifier?: string | null): Promise<string | null> {
  if (!identifier) return null;
  if (isValidObjectId(identifier)) {
    return identifier;
  }
  const emp = await prisma.employee.findFirst({
    where: { employeeId: identifier },
    select: { id: true },
  });
  return emp?.id || null;
}


