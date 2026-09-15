import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'growth-india-crm-secret-2026';
export const AUTH_COOKIE_NAME = 'growth_session_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  employeeId: string;
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

const sessionUserCache = new Map<string, { user: AuthUser; expiresAt: number }>();
const SESSION_CACHE_TTL_MS = 10_000; // 10 seconds cache for rapid consecutive requests

export function invalidateSessionUserCache(token?: string) {
  if (token) {
    sessionUserCache.delete(token);
  } else {
    sessionUserCache.clear();
  }
}

/**
 * Server-side authentication guard.
 * Validates session and checks immediate revocation / suspension / block in the database.
 */
export async function getSessionUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    let token: string | undefined;

    if (req) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
      }
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const cached = sessionUserCache.get(token);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.user;
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      sessionUserCache.delete(token);
      return null;
    }

    // Fetch user, employee and client status from DB for real-time suspension / block enforcement
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        employeeProfile: {
          include: {
            department: true,
            client: true,
          },
        },
      },
    });

    if (!user) return null;

    // Strict security rule: If user or employee is blocked or suspended, immediately revoke access
    const isBlocked =
      user.isSuspended ||
      !user.isActive ||
      user.employeeProfile?.status === 'BLOCKED' ||
      user.employeeProfile?.isBlocked ||
      user.employeeProfile?.status === 'SUSPENDED';

    if (isBlocked) {
      return null;
    }

    // Strict security rule for Delegated Accounts:
    // If account was created via invitation, verify invitation is not revoked
    if (user.isDelegated) {
      if (user.invitationId) {
        const inv = await prisma.accountInvitation.findUnique({
          where: { id: user.invitationId },
          select: { status: true },
        });
        if (!inv || inv.status === 'REVOKED') {
          return null;
        }
      }

      if (user.parentUserId) {
        const parentUser = await prisma.user.findUnique({
          where: { id: user.parentUserId },
          select: { isActive: true, isSuspended: true },
        });
        if (!parentUser || !parentUser.isActive || parentUser.isSuspended) {
          return null;
        }
      }
    }

    let delegatedPerms: string[] = [];
    if (user.delegatedPermissions) {
      try {
        delegatedPerms = JSON.parse(user.delegatedPermissions);
      } catch (e) {
        delegatedPerms = [];
      }
    }

    if (user.role.name === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            ...(user.parentClientId ? [{ id: user.parentClientId }] : []),
            { userId: user.id },
            ...(user.parentUserId ? [{ userId: user.parentUserId }] : []),
          ],
        },
      });

      if (clientProfile) {
        const clientUser: AuthUser = {
          id: user.id,
          email: user.email,
          role: 'CLIENT',
          roleDisplayName: user.isDelegated ? 'Shared Team Member' : 'Corporate Client',
          clientId: clientProfile.clientId,
          companyName: clientProfile.companyName,
          canBlockEmployees: user.isDelegated
            ? delegatedPerms.includes('canBlockEmployees')
            : clientProfile.canBlockEmployees,
          canDeleteEmployees: user.isDelegated
            ? delegatedPerms.includes('canDeleteEmployees')
            : clientProfile.canDeleteEmployees,
          fullName: user.employeeProfile?.fullName || clientProfile.contactPerson || clientProfile.companyName,
          designation: user.employeeProfile?.designation || (user.isDelegated ? 'Delegated Team Member' : 'Client Administrator'),
          departmentName: clientProfile.industry || 'Corporate Client Operations',
          isSuspended: user.isSuspended,
          isDelegated: user.isDelegated,
          parentUserId: user.parentUserId || undefined,
          parentClientId: user.parentClientId || clientProfile.id,
          delegatedPermissions: delegatedPerms,
          invitationId: user.invitationId || undefined,
        };
        sessionUserCache.set(token, { user: clientUser, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
        return clientUser;
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role.name as any,
      roleDisplayName: user.isDelegated ? 'Delegated Administrator' : user.role.displayName,
      employeeId: user.employeeProfile?.employeeId || (user.role.name === 'SUPER_ADMIN' ? 'GI-EMP-000001' : 'ADMIN'),
      employeeProfileId: user.employeeProfile?.id,
      employeeProfile: user.employeeProfile ? {
        id: user.employeeProfile.id,
        employeeId: user.employeeProfile.employeeId,
        fullName: user.employeeProfile.fullName,
        designation: user.employeeProfile.designation,
      } : undefined,
      clientId: user.employeeProfile?.clientId || undefined,
      companyName: user.employeeProfile?.client?.companyName || undefined,
      fullName: user.employeeProfile?.fullName || (user.role.name === 'SUPER_ADMIN' ? 'Aarav Sharma' : 'Administrator'),
      designation: user.employeeProfile?.designation || (user.isDelegated ? 'Delegated Admin Associate' : user.role.name === 'SUPER_ADMIN' ? 'Managing Director & Platform Head' : 'Administrator'),
      departmentName:
        user.employeeProfile?.departmentName ||
        user.employeeProfile?.department?.name ||
        'Executive Leadership',
      isSuspended: user.isSuspended,
      isDelegated: user.isDelegated,
      parentUserId: user.parentUserId || undefined,
      parentClientId: user.parentClientId || undefined,
      delegatedPermissions: delegatedPerms,
      invitationId: user.invitationId || undefined,
    };
    sessionUserCache.set(token, { user: authUser, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
    return authUser;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Auto-initializes official Admin account and roles if the database is newly connected and empty.
 */
export async function ensureDefaultAdmin() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
          name: 'ADMIN',
          displayName: 'Administrator',
          description: 'Platform Administrator with full governance control',
          isSystem: true,
        },
      });

      await prisma.role.upsert({
        where: { name: 'CLIENT' },
        update: {},
        create: {
          name: 'CLIENT',
          displayName: 'Client',
          description: 'Corporate Client portal',
          isSystem: true,
        },
      });

      await prisma.role.upsert({
        where: { name: 'EMPLOYEE' },
        update: {},
        create: {
          name: 'EMPLOYEE',
          displayName: 'Employee',
          description: 'Employee workspace',
          isSystem: true,
        },
      });

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash('Admin@123', 10);

      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@growthindia.co',
          passwordHash,
          roleId: adminRole.id,
          isActive: true,
          isSuspended: false,
        },
      });

      await prisma.employee.create({
        data: {
          employeeId: 'GI-EMP-000001',
          userId: adminUser.id,
          fullName: 'System Administrator',
          phone: '+91 98000 00000',
          personalEmail: 'admin@growthindia.co',
          departmentName: 'General Operations',
          designation: 'Platform Head',
          jobLocation: 'Headquarters',
          employmentType: 'Full-Time',
          status: 'ACTIVE',
          isBlocked: false,
          createdBy: 'SYSTEM',
        },
      });
    }
  } catch (err) {
    console.error('ensureDefaultAdmin error:', err);
  }
}

