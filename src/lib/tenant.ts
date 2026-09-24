import { NextRequest, NextResponse } from 'next/server';
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
          ...(user.parentClientId ? [{ id: user.parentClientId }, { clientId: user.parentClientId }] : []),
        ],
      },
      select: { id: true },
    });
    clientDocId = clientRecord?.id || null;
    if (!clientDocId && user.parentClientId) {
      clientDocId = await resolveClientObjectId(user.parentClientId);
    }
    if (!clientDocId && user.clientId) {
      clientDocId = await resolveClientObjectId(user.clientId);
    }
  } else if (user.role === 'EMPLOYEE') {
    // Check if employee belongs to client organization
    if (user.parentClientId) {
      clientDocId = await resolveClientObjectId(user.parentClientId);
    }
    if (!clientDocId && user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(user.employeeId),
        select: { clientId: true },
      });
      if (emp?.clientId) {
        clientDocId = emp.clientId;
      }
    }
    if (!clientDocId && user.clientId) {
      clientDocId = await resolveClientObjectId(user.clientId);
    }
  } else if (isAdmin(user.role)) {
    // If admin explicitly specifies ?clientId=... or ?tenantId=... in URL, scope to that client
    try {
      const { searchParams } = new URL(req.url);
      const qClientId = searchParams.get('clientId') || searchParams.get('tenantId');
      if (qClientId && qClientId !== 'ALL' && qClientId !== 'ten-growth-india' && !qClientId.startsWith('ten-')) {
        clientDocId = await resolveClientObjectId(qClientId);
      }
    } catch {
      // URL parsing fallback
    }
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
 * Verifies whether a user has permission to access a specific module (e.g. 'CRM', 'HRM', 'EMS').
 * Returns null if allowed, or a 403 NextResponse if forbidden.
 */
export function checkModuleAccess(user: AuthUser, moduleName: string): NextResponse | null {
  if (isAdmin(user.role)) return null;

  if (user.role === 'CLIENT') {
    const assigned = (user.assignedModules || []).map((m) => m.toUpperCase());
    const normalizedMod = moduleName.toUpperCase();
    if (!assigned.includes(normalizedMod) && !assigned.includes('ALL')) {
      return NextResponse.json(
        {
          error: `Module '${moduleName}' is not assigned to your organization. Access Forbidden.`,
          code: 'MODULE_ACCESS_DENIED',
        },
        { status: 403 }
      );
    }
  }

  return null;
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
    const assigned = (user.assignedModules || []).map((m) => m.toUpperCase());
    if (!assigned.includes('CRM') && !assigned.includes('ALL')) {
      return { clientId: '000000000000000000000000' };
    }

    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
          ...(user.parentClientId ? [{ id: user.parentClientId }, { clientId: user.parentClientId }] : []),
        ],
      },
      select: { id: true },
    });
    let cId = clientRecord?.id || null;
    if (!cId && user.parentClientId) {
      cId = await resolveClientObjectId(user.parentClientId);
    }
    if (!cId && user.clientId) {
      cId = await resolveClientObjectId(user.clientId);
    }
    return cId ? { clientId: cId } : { clientId: '000000000000000000000000' };
  }

  // Employee: if client-affiliated, scope to client
  if (user.employeeId) {
    let clientDocId: string | null = null;
    if (user.parentClientId) {
      clientDocId = await resolveClientObjectId(user.parentClientId);
    }
    if (!clientDocId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(user.employeeId),
        select: { id: true, clientId: true },
      });
      if (emp?.clientId) {
        clientDocId = emp.clientId;
      }
    }
    if (!clientDocId && user.clientId) {
      clientDocId = await resolveClientObjectId(user.clientId);
    }

    if (clientDocId) {
      return { clientId: clientDocId };
    }

    // Internal employee: scope to assigned entities or global
    const emp = await prisma.employee.findFirst({
      where: getEmployeeLookup(user.employeeId),
      select: { id: true, clientId: true },
    });
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
