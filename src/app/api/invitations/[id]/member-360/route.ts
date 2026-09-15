import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getSessionUser(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const isClient = caller.role === 'CLIENT';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(caller.role);

    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const invitation = await prisma.accountInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation record not found' }, { status: 404 });
    }

    // Tenant check if caller is Client
    if (isClient) {
      let clientDbId: string | undefined;
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            ...(caller.parentClientId ? [{ id: caller.parentClientId }] : []),
            { userId: caller.id },
            ...(caller.clientId ? [{ clientId: caller.clientId }] : []),
          ],
        },
      });
      clientDbId = clientRecord?.id;

      const isOwn = invitation.inviterUserId === caller.id || (clientDbId && invitation.clientId === clientDbId);
      if (!isOwn) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this invited member' }, { status: 403 });
      }
    }

    // Find accepted user
    let acceptedUser: any = null;
    if (invitation.acceptedUserId) {
      acceptedUser = await prisma.user.findUnique({
        where: { id: invitation.acceptedUserId },
        include: {
          role: true,
          employeeProfile: true,
        },
      });
    }

    if (!acceptedUser && invitation.email) {
      acceptedUser = await prisma.user.findFirst({
        where: { email: invitation.email.toLowerCase() },
        include: {
          role: true,
          employeeProfile: true,
        },
      });
    }

    // Fetch presence record
    let presenceData: {
      isOnline: boolean;
      currentPage: string | null;
      lastActiveAt: string | null;
      lastLoginAt: string | null;
      ipAddress: string | null;
      userAgent: string | null;
    } = {
      isOnline: false,
      currentPage: null,
      lastActiveAt: null,
      lastLoginAt: acceptedUser?.lastLoginAt?.toISOString() || null,
      ipAddress: null,
      userAgent: null,
    };

    if (acceptedUser) {
      const presenceSession = await prisma.activeUserSession.findUnique({
        where: { sessionToken: `presence_${acceptedUser.id}` },
      });

      if (presenceSession) {
        const lastActiveTime = new Date(presenceSession.lastActiveAt).getTime();
        const diffMs = Date.now() - lastActiveTime;
        // Consider online if heartbeat was within last 55 seconds
        const isOnline = diffMs < 55000 && presenceSession.isValid;

        presenceData = {
          isOnline,
          currentPage: presenceSession.deviceType || 'Platform Workspace',
          lastActiveAt: presenceSession.lastActiveAt.toISOString(),
          lastLoginAt: acceptedUser.lastLoginAt?.toISOString() || null,
          ipAddress: presenceSession.ipAddress,
          userAgent: presenceSession.userAgent,
        };
      }
    }

    // Fetch audit logs & activities performed by this member specifically during this invitation's lifecycle
    const userIdsToMatch: string[] = [];
    const emailsToMatch: string[] = [invitation.email.toLowerCase()];

    if (acceptedUser) {
      userIdsToMatch.push(acceptedUser.id);
      if (acceptedUser.email) emailsToMatch.push(acceptedUser.email.toLowerCase());
    }

    // Strict time scoping: only show activities that occurred since this specific invitation was created
    const invitationStartTime = invitation.createdAt;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: invitationStartTime },
        OR: [
          ...(userIdsToMatch.length > 0 ? [{ actorUserId: { in: userIdsToMatch } }] : []),
          ...(emailsToMatch.length > 0 ? [{ actorEmployeeId: { in: emailsToMatch } }] : []),
          { entityId: invitation.id },
          { entityId: invitation.token },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 250,
    });

    // Compute activity metrics
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let authCount = 0;

    const formattedLogs = auditLogs.map((log) => {
      const actionUpper = (log.action || '').toUpperCase();
      if (actionUpper.includes('CREATE') || actionUpper.includes('ADD') || actionUpper.includes('INVITE')) {
        createdCount++;
      } else if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE') || actionUpper.includes('ARCHIVE') || actionUpper.includes('REVOKE')) {
        deletedCount++;
      } else if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT') || actionUpper.includes('STATUS') || actionUpper.includes('ASSIGN')) {
        updatedCount++;
      } else if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH') || log.entityType === 'AUTH') {
        authCount++;
      }

      let parsedPrev: any = null;
      let parsedNext: any = null;
      try {
        if (log.previousData) parsedPrev = JSON.parse(log.previousData);
      } catch (e) {
        parsedPrev = log.previousData;
      }
      try {
        if (log.newData) parsedNext = JSON.parse(log.newData);
      } catch (e) {
        parsedNext = log.newData;
      }

      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        previousData: parsedPrev,
        newData: parsedNext,
        reason: log.reason,
        status: log.status,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp.toISOString(),
      };
    });

    let parsedPerms: string[] = [];
    try {
      parsedPerms = JSON.parse(invitation.permissions);
    } catch (e) {
      parsedPerms = [];
    }

    return NextResponse.json({
      success: true,
      member360: {
        invitation: {
          id: invitation.id,
          token: invitation.token,
          name: invitation.name,
          email: invitation.email,
          designation: invitation.designation,
          inviterRole: invitation.inviterRole,
          status: invitation.status,
          permissions: parsedPerms,
          acceptedAt: invitation.acceptedAt?.toISOString() || null,
          createdAt: invitation.createdAt.toISOString(),
        },
        user: acceptedUser
          ? {
              id: acceptedUser.id,
              email: acceptedUser.email,
              role: acceptedUser.role?.displayName || acceptedUser.role?.name,
              isSuspended: acceptedUser.isSuspended,
              isActive: acceptedUser.isActive,
              lastLoginAt: acceptedUser.lastLoginAt?.toISOString() || null,
              createdAt: acceptedUser.createdAt.toISOString(),
            }
          : null,
        presence: presenceData,
        stats: {
          totalActions: auditLogs.length,
          createdCount,
          updatedCount,
          deletedCount,
          authCount,
        },
        auditLogs: formattedLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching member 360 view:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
