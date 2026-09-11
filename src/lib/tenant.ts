import { NextRequest } from 'next/server';
import { prisma, resolveClientObjectId, isValidObjectId, getEmployeeLookup } from './prisma';
import { getSessionUser } from './auth';
import { AuthUser } from '@/types';
import { isAdmin } from './rbac';

export interface TenantContext {
  user: AuthUser;
  isAdmin: boolean;
  isClient: boolean;
  isEmployee: boolean;
  clientDocId?: string | null; // MongoDB ObjectId of organization if client
}

/**
 * Resolves current user and tenant identity from incoming HTTP request.
 */
export async function getTenantContext(req: NextRequest): Promise<TenantContext | null> {
  const user = await getSessionUser(req);
  if (!user) return null;

  let clientDocId: string | null = null;
  if (user.role === 'CLIENT') {
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
        ],
      },
      select: { id: true },
    });
    clientDocId = clientRecord?.id || null;
  }

  return {
    user,
    isAdmin: isAdmin(user.role),
    isClient: user.role === 'CLIENT',
    isEmployee: user.role === 'EMPLOYEE',
    clientDocId,
  };
}

/**
 * Ensures user has access to a specific organization/client record.
 * Admins have global access. Clients only access their own organization.
 */
export async function verifyClientOrganizationAccess(
  user: AuthUser,
  targetClientId?: string | null
): Promise<{ hasAccess: boolean; resolvedClientId: string | null }> {
  if (isAdmin(user.role)) {
    if (!targetClientId) return { hasAccess: true, resolvedClientId: null };
    const resolved = await resolveClientObjectId(targetClientId);
    return { hasAccess: true, resolvedClientId: resolved };
  }

  if (user.role === 'CLIENT') {
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
        ],
      },
      select: { id: true, clientId: true },
    });

    if (!clientRecord) return { hasAccess: false, resolvedClientId: null };

    // If targetClientId was specified, verify it matches
    if (targetClientId) {
      const resolvedTarget = await resolveClientObjectId(targetClientId);
      if (resolvedTarget !== clientRecord.id) {
        return { hasAccess: false, resolvedClientId: null };
      }
    }

    return { hasAccess: true, resolvedClientId: clientRecord.id };
  }

  // Regular employee: check if employee belongs to client
  if (user.role === 'EMPLOYEE' && user.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: getEmployeeLookup(user.employeeId),
      select: { clientId: true },
    });

    if (!emp?.clientId) {
      // Internal Growth India employee
      return { hasAccess: true, resolvedClientId: null };
    }

    if (targetClientId) {
      const resolvedTarget = await resolveClientObjectId(targetClientId);
      if (resolvedTarget !== emp.clientId) {
        return { hasAccess: false, resolvedClientId: null };
      }
    }

    return { hasAccess: true, resolvedClientId: emp.clientId };
  }

  return { hasAccess: false, resolvedClientId: null };
}

/**
 * Builds Prisma `where` clause for tenant-scoped CRM entities (Lead, Contact, Opportunity, Deal, Task).
 */
export async function buildTenantWhereClause(
  user: AuthUser,
  requestedClientId?: string | null
): Promise<{ clientId?: string | { in: string[] } } | { [key: string]: any }> {
  if (isAdmin(user.role)) {
    if (requestedClientId && requestedClientId !== 'ALL') {
      const resolved = await resolveClientObjectId(requestedClientId);
      return resolved ? { clientId: resolved } : {};
    }
    return {};
  }

  if (user.role === 'CLIENT') {
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
        ],
      },
      select: { id: true },
    });
    return clientRecord ? { clientId: clientRecord.id } : { clientId: '__NONE__' };
  }

  // Employee: if client-affiliated, scope to client
  if (user.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: getEmployeeLookup(user.employeeId),
      select: { id: true, clientId: true },
    });

    if (emp?.clientId) {
      return { clientId: emp.clientId };
    }

    // Internal employee: scope to assigned entities or global
    if (emp?.id) {
      return {
        OR: [
          { assignedToId: emp.id },
          { clientId: null },
        ],
      };
    }
  }

  return {};
}
