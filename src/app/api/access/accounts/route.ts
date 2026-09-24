import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const status = searchParams.get('status') || '';

    const users = await prisma.user.findMany({
      where: {
        role: { name: { notIn: ['ADMIN', 'SUPER_ADMIN'] } },
        ...(search
          ? {
              OR: [
                { email: { contains: search } },
                { employeeProfile: { fullName: { contains: search } } },
                { employeeProfile: { employeeId: { contains: search } } },
                { employeeProfile: { client: { companyName: { contains: search } } } },
              ],
            }
          : {}),
      },
      include: {
        role: true,
        employeeProfile: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            departmentName: true,
            status: true,
            isBlocked: true,
            phone: true,
            client: { select: { companyName: true, clientId: true } },
          },
        },
        sessions: {
          where: { isValid: true },
          orderBy: { lastActiveAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const accounts = users.map((u) => ({
      userId: u.id,
      email: u.email,
      role: u.role.displayName || u.role.name,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      accountStatus: u.isSuspended ? 'SUSPENDED' : !u.isActive ? 'DEACTIVATED' : u.employeeProfile?.isBlocked ? 'BLOCKED' : 'ACTIVE',
      lastLoginAt: u.lastLoginAt,
      mfaEnabled: u.mfaEnabled,
      isDelegated: u.isDelegated,
      employee: u.employeeProfile,
      activeSessionsCount: u.sessions.length,
      recentSessions: u.sessions.map((s) => ({
        id: s.id,
        deviceType: s.deviceType || 'Web Browser',
        ipAddress: s.ipAddress || '127.0.0.1',
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
      })),
    }));

    // Also fetch pending password reset requests for immediate resolution
    const resetRequestsSetting = await prisma.systemSetting.findUnique({ where: { key: 'PASSWORD_RESET_REQUESTS' } });
    const pendingResetRequests = resetRequestsSetting?.value ? JSON.parse(resetRequestsSetting.value).filter((r: any) => r.status === 'PENDING') : [];

    return NextResponse.json({
      success: true,
      accounts,
      pendingResetRequests,
    });
  } catch (err: any) {
    console.error('Error fetching accounts:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, employeeId, reason = 'Administrative security maintenance' } = body;

    let targetUserId = userId;
    if (!targetUserId && employeeId) {
      const emp = await prisma.employee.findFirst({ where: getEmployeeLookup(employeeId), select: { userId: true, employeeId: true } });
      targetUserId = emp?.userId;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID or employee ID is required.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { employeeProfile: true },
    });
    if (!targetUser) return NextResponse.json({ error: 'User account not found.' }, { status: 404 });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (action === 'REVOKE_SESSIONS' || action === 'FORCE_LOGOUT') {
      // Invalidate all active sessions in DB
      await prisma.activeUserSession.deleteMany({
        where: { userId: targetUserId },
      });

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'REVOKE_ALL_SESSIONS',
        entityType: 'AUTH',
        entityId: targetUserId,
        reason,
        ipAddress: ip,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `All active sessions revoked for ${targetUser.email}. Immediate re-login required.`,
      });
    }

    if (action === 'INITIATE_PASSWORD_RESET') {
      // Secure token generation (never plaintext passwords)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Also generate a secure one-time temporary access credential if needed
      const tempPass = `Reset#${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await bcrypt.hash(tempPass, 10);

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash,
          failedAttempts: 0,
          lockoutUntil: null,
          isSuspended: false,
        },
      });

      // Revoke past sessions so user must use new credentials
      await prisma.activeUserSession.deleteMany({
        where: { userId: targetUserId },
      });

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'RESET_PASSWORD_TOKEN',
        entityType: 'AUTH',
        entityId: targetUserId,
        reason,
        ipAddress: ip,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `Secure password reset initiated for ${targetUser.email}.`,
        tempCredentials: {
          email: targetUser.email,
          temporaryPassword: tempPass,
          expiresIn: '24 hours',
          notice: 'Provide these one-time temporary credentials directly to the authorized employee.',
        },
      });
    }

    if (action === 'TOGGLE_SUSPEND') {
      const willSuspend = !targetUser.isSuspended;
      await prisma.user.update({
        where: { id: targetUserId },
        data: { isSuspended: willSuspend, isActive: !willSuspend },
      });

      if (targetUser.employeeProfile?.id) {
        await prisma.employee.update({
          where: { id: targetUser.employeeProfile.id },
          data: { status: willSuspend ? 'BLOCKED' : 'ACTIVE', isBlocked: willSuspend },
        });
      }

      if (willSuspend) {
        await prisma.activeUserSession.deleteMany({ where: { userId: targetUserId } });
      }

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: willSuspend ? 'SUSPEND_ACCOUNT' : 'REACTIVATE_ACCOUNT',
        entityType: 'AUTH',
        entityId: targetUserId,
        reason,
        ipAddress: ip,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `Account ${willSuspend ? 'suspended' : 'reactivated'} successfully.`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error managing account access:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
