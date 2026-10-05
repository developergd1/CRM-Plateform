import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

function getPublicBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
  }

  const originHeader = req.headers.get('origin');
  if (originHeader && !originHeader.includes('localhost:10000') && !originHeader.includes('127.0.0.1:10000')) {
    return originHeader.replace(/\/+$/, '');
  }

  const refererHeader = req.headers.get('referer');
  if (refererHeader) {
    try {
      const parsed = new URL(refererHeader);
      if (!parsed.host.includes('localhost:10000') && !parsed.host.includes('127.0.0.1:10000')) {
        return parsed.origin;
      }
    } catch {}
  }

  const forwardedHost = req.headers.get('x-forwarded-host');
  if (forwardedHost && !forwardedHost.includes('localhost:10000') && !forwardedHost.includes('127.0.0.1:10000')) {
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${forwardedHost}`.replace(/\/+$/, '');
  }

  const host = req.headers.get('host');
  if (host && !host.includes('localhost:10000') && !host.includes('127.0.0.1:10000')) {
    const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return req.nextUrl.origin || 'http://localhost:3000';
}

/**
 * GET /api/admin/invitations
 * Fetches all platform administrator invitations from the dedicated `admin_invitations` collection.
 * Strictly restricted to SUPER_ADMIN, ADMIN, or ADMIN_HR.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSystemAdmin = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform Admin privileges required.' }, { status: 403 });
    }

    const canManageAdminTeam =
      user.role === 'SUPER_ADMIN' ||
      !user.isDelegated ||
      (user.delegatedPermissions && user.delegatedPermissions.some((p: string) =>
        ['system_settings', 'security_audit', 'admin-invites', 'all_access'].includes(p)
      ));

    if (!canManageAdminTeam) {
      return NextResponse.json({ error: 'Forbidden: Requires System Administration or Security privileges.' }, { status: 403 });
    }

    const invitations = await prisma.adminInvitation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const origin = getPublicBaseUrl(req);
    const acceptedUserIds = invitations.map((i) => i.acceptedUserId).filter(Boolean) as string[];
    const emails = invitations.map((i) => i.email.toLowerCase());

    const [users, presenceSessions] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            ...(acceptedUserIds.length > 0 ? [{ id: { in: acceptedUserIds } }] : []),
            { email: { in: emails } },
          ],
        },
        select: { id: true, email: true, lastLoginAt: true, isActive: true },
      }),
      prisma.activeUserSession.findMany({
        where: {
          sessionToken: {
            in: acceptedUserIds.map((uid) => `presence_${uid}`),
          },
        },
      }),
    ]);

    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const sessionByUserId = new Map(presenceSessions.map((s) => [s.userId, s]));

    const formatted = invitations.map((inv) => {
      let parsedPerms: string[] = [];
      try {
        parsedPerms = JSON.parse(inv.permissions);
      } catch {
        parsedPerms = [];
      }

      const linkedUser =
        (inv.acceptedUserId ? userById.get(inv.acceptedUserId) : null) ||
        userByEmail.get(inv.email.toLowerCase());
      const session = linkedUser ? sessionByUserId.get(linkedUser.id) : null;

      let isOnline = false;
      let lastActiveAt: string | null = null;
      if (session) {
        const diffMs = Date.now() - new Date(session.lastActiveAt).getTime();
        isOnline = diffMs < 55000 && session.isValid;
        lastActiveAt = session.lastActiveAt.toISOString();
      }

      return {
        id: inv.id,
        token: inv.token,
        name: inv.name,
        email: inv.email,
        phone: inv.phone || null,
        designation: inv.designation || 'System Administrator',
        department: inv.department || 'Administration & Governance',
        role: inv.role,
        permissions: parsedPerms,
        status: inv.status,
        inviterAdminId: inv.inviterAdminId,
        inviterAdminName: inv.inviterAdminName || 'System Admin',
        inviterAdminEmail: inv.inviterAdminEmail || null,
        notes: inv.notes || null,
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
        acceptedUserId: inv.acceptedUserId,
        acceptedEmployeeId: inv.acceptedEmployeeId,
        revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        invitationUrl: `${origin}/admin/accept-invite?token=${inv.token}`,
        isOnline,
        lastActiveAt,
        lastLoginAt: linkedUser?.lastLoginAt ? linkedUser.lastLoginAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      totalCount: formatted.length,
      invitations: formatted,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/invitations:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/invitations
 * Creates a new Platform Administrator invitation stored in the isolated `admin_invitations` collection.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators and Full Admins can invite new administrators.' },
        { status: 403 }
      );
    }

    const canCreateAdminInvite =
      user.role === 'SUPER_ADMIN' ||
      !user.isDelegated ||
      (user.delegatedPermissions && user.delegatedPermissions.some((p: string) =>
        ['system_settings', 'admin-invites', 'all_access'].includes(p)
      ));

    if (!canCreateAdminInvite) {
      return NextResponse.json({ error: 'Forbidden: Requires System Administration privileges.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, role, designation, department, permissions, notes } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Administrator full name is required (min 2 chars).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid administrator email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'];
    const assignedRole = validRoles.includes(role) ? role : 'ADMIN';

    // Only SUPER_ADMIN can invite another SUPER_ADMIN
    if (assignedRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only existing Super Administrators can invite another Super Administrator.' },
        { status: 403 }
      );
    }

    const finalPermissions = Array.isArray(permissions) ? permissions : ['all_access'];

    // Check if an existing admin with this email already exists
    const existingActiveUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { role: true },
    });

    if (existingActiveUser && ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(existingActiveUser.role.name)) {
      // Sync permissions and delegation status directly to existing user
      const { invalidateSessionUserCache } = await import('@/lib/auth');
      await prisma.user.update({
        where: { id: existingActiveUser.id },
        data: {
          delegatedPermissions: JSON.stringify(finalPermissions),
          isDelegated: assignedRole !== 'SUPER_ADMIN',
        },
      });
      invalidateSessionUserCache();
    }

    // Check if there is already an invite for this email in admin_invitations
    const existingInvite = await prisma.adminInvitation.findFirst({
      where: { email: cleanEmail },
      orderBy: { createdAt: 'desc' },
    });

    const token = `adm_inv_${crypto.randomBytes(24).toString('hex')}`;
    const origin = getPublicBaseUrl(req);

    let invitationRecord;
    if (existingInvite) {
      // Refresh token and update invite details
      invitationRecord = await prisma.adminInvitation.update({
        where: { id: existingInvite.id },
        data: {
          token,
          name: name.trim(),
          phone: phone?.trim() || null,
          role: assignedRole,
          designation: designation?.trim() || 'System Administrator',
          department: department?.trim() || 'Administration & Governance',
          permissions: JSON.stringify(finalPermissions),
          notes: notes?.trim() || null,
          inviterAdminId: user.id,
          inviterAdminName: user.fullName || user.email,
          inviterAdminEmail: user.email,
          status: 'PENDING',
          acceptedAt: null,
          revokedAt: null,
          revokedBy: null,
        },
      });
    } else {
      invitationRecord = await prisma.adminInvitation.create({
        data: {
          token,
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          role: assignedRole,
          designation: designation?.trim() || 'System Administrator',
          department: department?.trim() || 'Administration & Governance',
          permissions: JSON.stringify(finalPermissions),
          notes: notes?.trim() || null,
          inviterAdminId: user.id,
          inviterAdminName: user.fullName || user.email,
          inviterAdminEmail: user.email,
          status: 'PENDING',
        },
      });
    }

    const invitationUrl = `${origin}/admin/accept-invite?token=${token}`;

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.email,
      action: 'ADMIN_INVITATION_CREATED',
      entityType: 'AUTH',
      entityId: invitationRecord.id,
      details: {
        invitedName: name.trim(),
        invitedEmail: cleanEmail,
        assignedRole,
        inviterAdmin: user.email,
      },
      reason: `Invited new administrator: ${cleanEmail} with role ${assignedRole}`,
    });

    return NextResponse.json({
      success: true,
      message: `Administrator invitation successfully created for ${cleanEmail}`,
      invitation: {
        ...invitationRecord,
        permissions: finalPermissions,
        invitationUrl,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/invitations:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
