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
 * when searching by custom string employeeId (e.g. GI-EMP-000002).
 */
export function getEmployeeLookup(identifier: string) {
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
export function getClientLookup(identifier: string) {
  if (!identifier) return { clientId: '__none__' };
  if (isValidObjectId(identifier)) {
    return { OR: [{ id: identifier }, { clientId: identifier }] };
  }
  return { clientId: identifier };
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
