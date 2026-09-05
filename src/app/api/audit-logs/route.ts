import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canViewAuditLogs } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || !canViewAuditLogs(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Audit logs are restricted to Super Admin and HR.' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const actor = searchParams.get('actor')?.trim() || '';
    const action = searchParams.get('action')?.trim() || '';
    const entityType = searchParams.get('entityType')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};

    if (actor) where.actorEmployeeId = { contains: actor };
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;

    if (search) {
      where.OR = [
        { actorEmployeeId: { contains: search } },
        { action: { contains: search } },
        { entityId: { contains: search } },
        { reason: { contains: search } },
        { ipAddress: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
