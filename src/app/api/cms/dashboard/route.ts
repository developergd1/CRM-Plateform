import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden. CMS Dashboard is restricted to Admin & HR.' }, { status: 403 });
    }

    // 1. Client Statistics
    const [totalClients, activeClients, inactiveClients] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'INACTIVE' } }),
    ]);

    // 2. Employee Statistics (across all authorized clients, excluding root platform admin)
    const [totalEmployees, activeEmployees, inactiveEmployees, blockedEmployees] = await Promise.all([
      prisma.employee.count({ where: { employeeId: { not: 'GI-EMP-000001' } } }),
      prisma.employee.count({ where: { employeeId: { not: 'GI-EMP-000001' }, status: 'ACTIVE', isBlocked: false } }),
      prisma.employee.count({ where: { employeeId: { not: 'GI-EMP-000001' }, status: 'INACTIVE' } }),
      prisma.employee.count({
        where: {
          employeeId: { not: 'GI-EMP-000001' },
          OR: [{ status: 'BLOCKED' }, { isBlocked: true }],
        },
      }),
    ]);

    // 3. Recently Onboarded Clients (last 8)
    const recentClients = await prisma.client.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        companyName: true,
        contactPerson: true,
        mobile: true,
        email: true,
        industry: true,
        status: true,
        dateAdded: true,
        createdAt: true,
        assignedModules: true,
        _count: {
          select: {
            employees: true,
            tasks: true,
          },
        },
      },
    });

    // 4. Client-wise Employee Counts (top 10 by employee count)
    const allClientsWithCounts = await prisma.client.findMany({
      select: {
        id: true,
        clientId: true,
        companyName: true,
        status: true,
        industry: true,
        assignedModules: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Module Distribution Computation
    let emsCount = 0;
    let crmCount = 0;
    let hrmCount = 0;

    for (const c of allClientsWithCounts) {
      const modules: string[] = Array.isArray(c.assignedModules) && c.assignedModules.length > 0
        ? c.assignedModules
        : ['EMS'];
      if (modules.includes('EMS')) emsCount++;
      if (modules.includes('CRM')) crmCount++;
      if (modules.includes('HRM')) hrmCount++;
    }

    // 6. Recent Client & Workforce Activity (from AuditLog)
    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      where: {
        entityType: { in: ['CLIENT', 'EMPLOYEE', 'ORGANIZATION', 'MEMBERSHIP'] },
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        status: true,
        reason: true,
        timestamp: true,
        actorUserId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalClients,
          activeClients,
          inactiveClients,
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          blockedEmployees,
        },
        moduleDistribution: {
          EMS: emsCount,
          CRM: crmCount,
          HRM: hrmCount,
          totalSubscribedClients: allClientsWithCounts.length,
        },
        recentClients,
        clientWiseSummary: allClientsWithCounts.slice(0, 10).map((c) => ({
          id: c.id,
          clientId: c.clientId,
          companyName: c.companyName,
          status: c.status,
          industry: c.industry || 'General',
          employeeCount: c._count.employees,
          assignedModules: Array.isArray(c.assignedModules) && c.assignedModules.length > 0 ? c.assignedModules : ['EMS'],
        })),
        recentActivity: recentAuditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching CMS dashboard metrics:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
