import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { verifyClientOrganizationAccess } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Client users cannot view internal system audit logs
    if (user.role === 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await prisma.client.findFirst({
      where: getClientLookup(params.id),
      select: { id: true, clientId: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: client.clientId },
          { entityId: client.id },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, data: auditLogs });
  } catch (error: any) {
    console.error('Error fetching client audit logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
