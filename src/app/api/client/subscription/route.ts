import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClientSubscriptionUsage } from '@/lib/services/subscription-service';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { isAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetClientId: string | null = null;

    if (user.role === 'CLIENT') {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.parentClientId ? [{ id: user.parentClientId }] : []),
            ...(user.parentUserId ? [{ userId: user.parentUserId }] : []),
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
        select: { id: true, clientId: true },
      });
      if (!client) {
        return NextResponse.json({ error: 'Client organization not found' }, { status: 404 });
      }
      targetClientId = client.id;
    } else if (isAdmin(user.role)) {
      const { searchParams } = new URL(req.url);
      const queryClientId = searchParams.get('clientId');
      if (queryClientId) {
        targetClientId = await resolveClientObjectId(queryClientId);
      } else {
        return NextResponse.json({ error: 'Client ID parameter required for administrator queries' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!targetClientId) {
      return NextResponse.json({ error: 'Client organization not identified' }, { status: 404 });
    }

    const usage = await getClientSubscriptionUsage(targetClientId);
    if (!usage) {
      return NextResponse.json({ error: 'Subscription usage record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: usage,
    });
  } catch (error: any) {
    console.error('Error fetching client subscription usage:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
