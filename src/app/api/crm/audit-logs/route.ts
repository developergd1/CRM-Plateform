import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const query = searchParams.get('query');
    const format = searchParams.get('format'); // 'csv' or json

    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    if (query && query.trim()) {
      where.OR = [
        { actorEmployeeId: { contains: query.trim(), mode: 'insensitive' } },
        { action: { contains: query.trim(), mode: 'insensitive' } },
        { entityType: { contains: query.trim(), mode: 'insensitive' } },
        { entityId: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    // CSV Export Mode
    if (format === 'csv') {
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });

      const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Actor ID', 'Status', 'IP Address'];
      const rows = logs.map((l) => [
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.action}"`,
        `"${l.entityType}"`,
        `"${l.entityId || ''}"`,
        `"${l.actorEmployeeId || l.actorUserId || ''}"`,
        `"${l.status}"`,
        `"${l.ipAddress || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="crm-audit-logs-${Date.now()}.csv"`,
        },
      });
    }

    // JSON Paginated List
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
