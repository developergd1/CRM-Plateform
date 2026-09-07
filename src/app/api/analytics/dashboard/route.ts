import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let totalClients = 0;
    let totalEmployees = 0;
    let activeEmployees = 0;
    let blockedEmployees = 0;
    let recentOnboardings: any[] = [];
    let recentBlockHistories: any[] = [];
    let clientsList: any[] = [];

    if (user.role === 'CLIENT') {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      if (clientRecord) {
        totalClients = 1;
        clientsList = [clientRecord];

        // Fetch client employee IDs first for blazing fast indexed queries
        const clientEmployees = await prisma.employee.findMany({
          where: { clientId: clientRecord.id },
          select: { id: true },
        });
        const clientEmpIds = clientEmployees.map((e) => e.id);

        [
          totalEmployees,
          activeEmployees,
          blockedEmployees,
          recentOnboardings,
          recentBlockHistories,
        ] = await Promise.all([
          prisma.employee.count({ where: { clientId: clientRecord.id } }),
          prisma.employee.count({ where: { clientId: clientRecord.id, status: 'ACTIVE', isBlocked: false } }),
          prisma.employee.count({ where: { clientId: clientRecord.id, OR: [{ status: 'BLOCKED' }, { isBlocked: true }] } }),
          prisma.employee.findMany({
            where: { clientId: clientRecord.id },
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
              client: {
                select: {
                  clientId: true,
                  companyName: true,
                },
              },
            },
          }),
          clientEmpIds.length > 0
            ? prisma.employeeBlockHistory.findMany({
                where: { employeeId: { in: clientEmpIds } },
                take: 6,
                orderBy: { actionDate: 'desc' },
                include: {
                  employee: {
                    select: {
                      employeeId: true,
                      fullName: true,
                      designation: true,
                      client: {
                        select: {
                          clientId: true,
                          companyName: true,
                        },
                      },
                    },
                  },
                },
              })
            : Promise.resolve([]),
        ]);
      }
    } else {
      // Find admin user IDs once to avoid slow 2-stage multi-collection lookup pipelines in MongoDB
      const adminUsers = await prisma.user.findMany({
        where: {
          role: {
            name: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        },
        select: { id: true },
      });
      const adminUserIds = adminUsers.map((u) => u.id);

      const employeeBaseWhere = {
        employeeId: { not: 'GI-EMP-000001' },
        ...(adminUserIds.length > 0 ? { userId: { notIn: adminUserIds } } : {}),
      };

      [
        totalClients,
        totalEmployees,
        activeEmployees,
        blockedEmployees,
        recentOnboardings,
        recentBlockHistories,
        clientsList,
      ] = await Promise.all([
        prisma.client.count(),
        prisma.employee.count({ where: employeeBaseWhere }),
        prisma.employee.count({ where: { ...employeeBaseWhere, status: 'ACTIVE', isBlocked: false } }),
        prisma.employee.count({ where: { ...employeeBaseWhere, OR: [{ status: 'BLOCKED' }, { isBlocked: true }] } }),
        prisma.employee.findMany({
          where: employeeBaseWhere,
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                clientId: true,
                companyName: true,
              },
            },
          },
        }),
        prisma.employeeBlockHistory.findMany({
          take: 6,
          orderBy: { actionDate: 'desc' },
          include: {
            employee: {
              select: {
                employeeId: true,
                fullName: true,
                designation: true,
                client: {
                  select: {
                    clientId: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.client.findMany({
          take: 6,
          orderBy: { dateAdded: 'desc' },
          include: {
            _count: {
              select: { employees: true },
            },
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalClients,
        totalEmployees,
        activeEmployees,
        blockedEmployees,
        inactiveEmployees: Math.max(0, totalEmployees - (activeEmployees + blockedEmployees)),
        recentOnboardings,
        recentBlockHistories,
        clientsList,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
