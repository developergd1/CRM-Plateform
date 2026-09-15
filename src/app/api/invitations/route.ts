import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

// Resolve true public URL for Render, proxies, and local development
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

  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return 'https://growth-india-crm.onrender.com';
  }

  return req.nextUrl.origin || 'http://localhost:3000';
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isClient = user.role === 'CLIENT';
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR';

    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    let clientDbId: string | undefined;
    if (isClient) {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            ...(user.parentClientId ? [{ id: user.parentClientId }] : []),
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      clientDbId = clientRecord?.id;
    }

    const invitations = await prisma.accountInvitation.findMany({
      where: isClient
        ? {
            OR: [
              { inviterUserId: user.id },
              ...(clientDbId ? [{ clientId: clientDbId }] : []),
            ],
          }
        : {
            inviterRole: 'ADMIN',
          },
      orderBy: { createdAt: 'desc' },
    });

    const origin = getPublicBaseUrl(req);

    // Gather all candidate user IDs & emails to fetch live presence
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
        select: { id: true, email: true, lastLoginAt: true },
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
      } catch (e) {
        parsedPerms = [];
      }

      const linkedUser =
        (inv.acceptedUserId ? userById.get(inv.acceptedUserId) : null) ||
        userByEmail.get(inv.email.toLowerCase());
      const session = linkedUser ? sessionByUserId.get(linkedUser.id) : null;

      let isOnline = false;
      let currentPage: string | null = null;
      let lastActiveAt: string | null = null;

      if (session) {
        const diffMs = Date.now() - new Date(session.lastActiveAt).getTime();
        isOnline = diffMs < 55000 && session.isValid;
        currentPage = session.deviceType || null;
        lastActiveAt = session.lastActiveAt.toISOString();
      }

      return {
        id: inv.id,
        token: inv.token,
        name: inv.name,
        email: inv.email,
        designation: inv.designation,
        inviterUserId: inv.inviterUserId,
        inviterRole: inv.inviterRole,
        clientId: inv.clientId,
        permissions: parsedPerms,
        status: inv.status,
        revokedAt: inv.revokedAt?.toISOString() || null,
        revokedBy: inv.revokedBy || null,
        acceptedAt: inv.acceptedAt?.toISOString() || null,
        acceptedUserId: inv.acceptedUserId || linkedUser?.id || null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        invitationUrl: `${origin}/accept-invite?token=${inv.token}`,
        presence: {
          isOnline,
          currentPage,
          lastActiveAt,
          lastLoginAt: linkedUser?.lastLoginAt?.toISOString() || null,
        },
      };
    });

    return NextResponse.json({ invitations: formatted });
  } catch (error: any) {
    console.error('Fetch invitations error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isClient = user.role === 'CLIENT';
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR';

    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to invite users' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, designation, permissions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full Name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: 'Please grant at least one permission' }, { status: 400 });
    }

    let clientDbId: string | undefined;
    if (isClient) {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            ...(user.parentClientId ? [{ id: user.parentClientId }] : []),
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      clientDbId = clientRecord?.id;
    }

    // Generate secure random crypto token (32 bytes hex)
    const token = crypto.randomBytes(32).toString('hex');

    // Create or reactivate existing invitation for this email
    const existing = await prisma.accountInvitation.findFirst({
      where: {
        email: emailClean,
        inviterRole: isClient ? 'CLIENT' : 'ADMIN',
        ...(isClient && clientDbId ? { clientId: clientDbId } : {}),
      },
    });

    let invitationRecord;
    if (existing) {
      invitationRecord = await prisma.accountInvitation.update({
        where: { id: existing.id },
        data: {
          token,
          name: name.trim(),
          designation: designation?.trim() || 'Team Member',
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE',
          revokedAt: null,
          revokedBy: null,
          updatedAt: new Date(),
        },
      });

      // If user was already created and suspended, reactivate them
      if (existing.acceptedUserId) {
        await prisma.user.update({
          where: { id: existing.acceptedUserId },
          data: {
            isActive: true,
            isSuspended: false,
            delegatedPermissions: JSON.stringify(permissions),
          },
        });
      }
    } else {
      invitationRecord = await prisma.accountInvitation.create({
        data: {
          token,
          name: name.trim(),
          email: emailClean,
          designation: designation?.trim() || (isClient ? 'Client Team Member' : 'Admin Associate'),
          inviterUserId: user.id,
          inviterRole: isClient ? 'CLIENT' : 'ADMIN',
          clientId: clientDbId || null,
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE',
        },
      });
    }

    const origin = getPublicBaseUrl(req);
    const invitationUrl = `${origin}/accept-invite?token=${token}`;

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || (isClient ? 'CLIENT' : 'ADMIN'),
      action: 'DELEGATED_ACCOUNT_INVITATION_CREATED',
      entityType: 'AUTH',
      entityId: invitationRecord.id,
      reason: `Created delegated invitation for ${emailClean} with ${permissions.length} permissions`,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Unknown',
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationRecord.id,
        token: invitationRecord.token,
        name: invitationRecord.name,
        email: invitationRecord.email,
        designation: invitationRecord.designation,
        permissions,
        status: invitationRecord.status,
        invitationUrl,
        createdAt: invitationRecord.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create invitation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
