import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateSessionUserCache } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitation = await prisma.adminInvitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Admin invitation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required.' }, { status: 403 });
    }

    const invitation = await prisma.adminInvitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Admin invitation not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { action, role, designation, department, permissions, notes } = body;

    const updateData: any = {};

    if (action === 'REVOKE') {
      updateData.status = 'REVOKED';
      updateData.revokedAt = new Date();
      updateData.revokedBy = user.email;

      // If user had already accepted, suspend that user account as well
      if (invitation.acceptedUserId) {
        await prisma.user.update({
          where: { id: invitation.acceptedUserId },
          data: { isSuspended: true },
        });
        invalidateSessionUserCache();
      }
    } else if (action === 'REINSTATE') {
      updateData.status = 'PENDING';
      updateData.revokedAt = null;
      updateData.revokedBy = null;

      if (invitation.acceptedUserId) {
        await prisma.user.update({
          where: { id: invitation.acceptedUserId },
          data: { isSuspended: false },
        });
        invalidateSessionUserCache();
      }
    } else if (action === 'REGENERATE_TOKEN') {
      const newToken = `adm_inv_${crypto.randomBytes(24).toString('hex')}`;
      updateData.token = newToken;
      updateData.status = 'PENDING';
      updateData.acceptedAt = null;
      updateData.revokedAt = null;
      updateData.revokedBy = null;
    }

    if (role && ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(role)) {
      updateData.role = role;
    }
    if (designation) updateData.designation = designation.trim();
    if (department) updateData.department = department.trim();
    if (permissions && Array.isArray(permissions)) {
      updateData.permissions = JSON.stringify(permissions);
    }
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

    const updated = await prisma.adminInvitation.update({
      where: { id: params.id },
      data: updateData,
    });

    // If permissions or role were updated, sync with User record
    const targetUserId = invitation.acceptedUserId || (
      await prisma.user.findUnique({ where: { email: invitation.email.toLowerCase() }, select: { id: true } })
    )?.id;

    if (targetUserId) {
      const userUpdate: any = {};
      if (permissions && Array.isArray(permissions)) {
        userUpdate.delegatedPermissions = JSON.stringify(permissions);
      }
      if (role && ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(role)) {
        userUpdate.isDelegated = role !== 'SUPER_ADMIN';
      }
      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: userUpdate,
        });
        invalidateSessionUserCache();
      }
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.email,
      action: 'ADMIN_INVITATION_UPDATED',
      entityType: 'AUTH',
      entityId: invitation.id,
      details: { action, updateData },
      reason: `Updated admin invitation for ${invitation.email}`,
    });

    return NextResponse.json({ success: true, invitation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators can permanently delete admin invitation records.' },
        { status: 403 }
      );
    }

    const invitation = await prisma.adminInvitation.findUnique({
      where: { id: params.id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Admin invitation not found' }, { status: 404 });
    }

    await prisma.adminInvitation.delete({
      where: { id: params.id },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.email,
      action: 'ADMIN_INVITATION_DELETED',
      entityType: 'AUTH',
      entityId: params.id,
      reason: `Permanently removed admin invitation for ${invitation.email}`,
    });

    return NextResponse.json({ success: true, message: 'Admin invitation record deleted.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
