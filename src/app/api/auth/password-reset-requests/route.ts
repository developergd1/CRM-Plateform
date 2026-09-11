import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = isAdminOrHR(user.role);
    const isClient = user.role === 'CLIENT';

    if (!isAdmin && !isClient) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'PASSWORD_RESET_REQUESTS' },
    });

    let requests: any[] = [];
    if (setting?.value) {
      try {
        requests = JSON.parse(setting.value);
      } catch (e) {
        requests = [];
      }
    }

    let filtered = requests;
    if (isClient) {
      // Find client record for user
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      filtered = requests.filter(
        (r) =>
          r.targetRole === 'CLIENT' &&
          (r.targetClientId === client?.id || r.targetClientId === client?.clientId || r.targetClientId === user.clientId)
      );
    }

    return NextResponse.json({
      success: true,
      requests: filtered,
      pendingCount: filtered.filter((r) => r.status === 'PENDING').length,
    });
  } catch (error: any) {
    console.error('Error in GET password-reset-requests:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = isAdminOrHR(user.role);
    const isClient = user.role === 'CLIENT';

    if (!isAdmin && !isClient) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { requestId, newPassword, action = 'RESOLVE' } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'PASSWORD_RESET_REQUESTS' },
    });

    let requests: any[] = [];
    if (setting?.value) {
      try {
        requests = JSON.parse(setting.value);
      } catch (e) {
        requests = [];
      }
    }

    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const targetReq = requests[reqIndex];

    // Authorization check for client
    if (isClient) {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      const matchesClient =
        targetReq.targetRole === 'CLIENT' &&
        (targetReq.targetClientId === client?.id ||
          targetReq.targetClientId === client?.clientId ||
          targetReq.targetClientId === user.clientId);

      if (!matchesClient) {
        return NextResponse.json({ error: 'Permission denied to resolve this request.' }, { status: 403 });
      }
    }

    if (action === 'REJECT') {
      targetReq.status = 'REJECTED';
      targetReq.resolvedAt = new Date().toISOString();
      targetReq.resolvedBy = `${user.fullName} (${user.companyName || user.employeeId || user.role})`;

      await prisma.systemSetting.update({
        where: { key: 'PASSWORD_RESET_REQUESTS' },
        data: { value: JSON.stringify(requests), updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, message: 'Password reset request rejected.' });
    }

    // RESOLVE action
    const plainPassword = (newPassword || '').trim() || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;
    if (plainPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update target user account
    await prisma.user.update({
      where: { id: targetReq.userId },
      data: {
        passwordHash: hashedPassword,
        failedAttempts: 0,
        lockoutUntil: null,
        isSuspended: false,
      },
    });

    targetReq.status = 'RESOLVED';
    targetReq.resolvedAt = new Date().toISOString();
    targetReq.resolvedBy = `${user.fullName} (${user.companyName || user.employeeId || user.role})`;
    targetReq.newTempPassword = plainPassword;

    await prisma.systemSetting.update({
      where: { key: 'PASSWORD_RESET_REQUESTS' },
      data: { value: JSON.stringify(requests), updatedAt: new Date() },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'RESOLVE_PASSWORD_RESET_REQUEST',
      entityType: 'AUTH',
      entityId: targetReq.id,
      newData: {
        requestId: targetReq.id,
        resolvedFor: targetReq.requesterName,
        resolvedBy: targetReq.resolvedBy,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    try {
      const { notifyPasswordResetResolved } = await import('@/lib/notifications');
      await notifyPasswordResetResolved({
        requestId: targetReq.id,
        requesterName: targetReq.requesterName,
        requesterId: targetReq.requesterId || targetReq.userId,
        resolvedBy: targetReq.resolvedBy,
      });
    } catch (e) {
      console.error('Failed to send password reset notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${targetReq.requesterName}.`,
      requesterName: targetReq.requesterName,
      requesterId: targetReq.requesterId,
      newPassword: plainPassword,
    });
  } catch (error: any) {
    console.error('Error in POST password-reset-requests:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
