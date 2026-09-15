import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateSessionUserCache } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { action } = body; // 'REVOKE' | 'REACTIVATE'

    const invitation = await prisma.accountInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check authority: user must be admin or the client who invited
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR';
    const isOwnerClient = invitation.inviterUserId === user.id || (user.clientId && invitation.clientId === user.clientId);

    if (!isAdmin && !isOwnerClient) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify this invitation' }, { status: 403 });
    }

    if (action === 'REVOKE') {
      const updated = await prisma.accountInvitation.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedBy: user.email,
        },
      });

      // Instantly suspend and deactivate the accepted user account
      if (invitation.acceptedUserId) {
        await prisma.user.update({
          where: { id: invitation.acceptedUserId },
          data: {
            isActive: false,
            isSuspended: true,
          },
        });
      }

      invalidateSessionUserCache();

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'DELEGATED_ACCOUNT_ACCESS_REVOKED',
        entityType: 'AUTH',
        entityId: id,
        reason: `Revoked access for invited person: ${invitation.email}`,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, invitation: updated, message: 'Access has been revoked and disabled immediately.' });
    } else if (action === 'REACTIVATE') {
      const updated = await prisma.accountInvitation.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          revokedAt: null,
          revokedBy: null,
        },
      });

      if (invitation.acceptedUserId) {
        await prisma.user.update({
          where: { id: invitation.acceptedUserId },
          data: {
            isActive: true,
            isSuspended: false,
          },
        });
      }

      invalidateSessionUserCache();

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'DELEGATED_ACCOUNT_ACCESS_REACTIVATED',
        entityType: 'AUTH',
        entityId: id,
        reason: `Reactivated access for invited person: ${invitation.email}`,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown',
        status: 'SUCCESS',
      });

      return NextResponse.json({ success: true, invitation: updated, message: 'Access has been restored successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Update invitation status error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { permissions, designation, name } = body;

    const invitation = await prisma.accountInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR';
    const isOwnerClient = invitation.inviterUserId === user.id || (user.clientId && invitation.clientId === user.clientId);

    if (!isAdmin && !isOwnerClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.accountInvitation.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(designation ? { designation: designation.trim() } : {}),
        ...(permissions ? { permissions: JSON.stringify(permissions) } : {}),
      },
    });

    // Synchronize permissions to linked User if already registered
    if (invitation.acceptedUserId && permissions) {
      await prisma.user.update({
        where: { id: invitation.acceptedUserId },
        data: {
          delegatedPermissions: JSON.stringify(permissions),
        },
      });
    }

    invalidateSessionUserCache();

    return NextResponse.json({ success: true, invitation: updated });
  } catch (error: any) {
    console.error('Update invitation details error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const invitation = await prisma.accountInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR';
    const isOwnerClient = invitation.inviterUserId === user.id || (user.clientId && invitation.clientId === user.clientId);

    if (!isAdmin && !isOwnerClient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If accepted user exists, suspend their account
    if (invitation.acceptedUserId) {
      await prisma.user.update({
        where: { id: invitation.acceptedUserId },
        data: {
          isActive: false,
          isSuspended: true,
        },
      });
    }

    await prisma.accountInvitation.delete({
      where: { id },
    });

    invalidateSessionUserCache();

    return NextResponse.json({ success: true, message: 'Invitation deleted and access disabled.' });
  } catch (error: any) {
    console.error('Delete invitation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
