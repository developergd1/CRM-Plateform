import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

import { isValidObjectId } from '@/lib/prisma';

async function resolveUserRecipientIds(user: any): Promise<string[]> {
  const ids = new Set<string>();

  if (!user) return [];

  // 1. Direct Employee Profile
  if (user.employeeProfile?.id && isValidObjectId(user.employeeProfile.id)) {
    ids.add(user.employeeProfile.id);
  }

  const emp = await prisma.employee.findFirst({
    where: {
      OR: [
        ...(isValidObjectId(user.id) ? [{ userId: user.id }] : []),
        ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
      ],
    },
    select: { id: true },
  });
  if (emp?.id && isValidObjectId(emp.id)) {
    ids.add(emp.id);
  }

  // 2. If user is Client
  if (user.role === 'CLIENT' || user.clientId) {
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          ...(isValidObjectId(user.id) ? [{ userId: user.id }] : []),
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
        ],
      },
      select: { id: true, employees: { select: { id: true } } },
    });
    if (client) {
      if (isValidObjectId(client.id)) ids.add(client.id);
      // Also include client's team employees so client can view workforce notifications
      for (const e of client.employees || []) {
        if (isValidObjectId(e.id)) ids.add(e.id);
      }
    }
  }

  // 3. If user is Admin / HR / Manager
  if (isAdminOrHR(user.role) || isManagerOrAbove(user.role)) {
    const adminEmployees = await prisma.employee.findMany({
      where: {
        status: { in: ['ACTIVE', 'ON_LEAVE', 'PROBATION'] },
      },
      select: { id: true },
      take: 20,
    });
    for (const ae of adminEmployees) {
      if (isValidObjectId(ae.id)) ids.add(ae.id);
    }
  }

  return Array.from(ids).filter((id) => isValidObjectId(id));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipientIds = await resolveUserRecipientIds(user);

    if (recipientIds.length === 0) {
      return NextResponse.json({
        success: true,
        unreadCount: 0,
        notifications: [],
      });
    }

    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({
        where: {
          recipientId: { in: recipientIds },
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where: {
          recipientId: { in: recipientIds },
        },
        take: 40,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, markAllRead } = body;

    const recipientIds = await resolveUserRecipientIds(user);

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipient records found for user' }, { status: 404 });
    }

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: {
          recipientId: { in: recipientIds },
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await prisma.notification.updateMany({
        where: {
          id,
          recipientId: { in: recipientIds },
        },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Provide notification id or markAllRead flag' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
