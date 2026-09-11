import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getExecutiveDashboardMetrics, DateFilterPreset } from '@/lib/services/analytics-service';

// Simple in-memory cache for dashboard metrics to avoid 27 DB queries on every tab click
const dashboardCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 20 * 1000; // 20 seconds

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const preset = (searchParams.get('preset') || 'THIS_MONTH') as DateFilterPreset;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const timezone = searchParams.get('timezone') || 'Asia/Kolkata';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = `${user.id}_${user.role}_${preset}_${startDate || ''}_${endDate || ''}`;
    if (!forceRefresh) {
      const cached = dashboardCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    // Fetch recent activity records & unified dashboard analytics concurrently
    const isClient = user.role === 'CLIENT';
    let clientWhere: any = {};
    if (isClient) {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
        select: { id: true },
      });
      if (clientRecord) {
        clientWhere = { clientId: clientRecord.id };
      }
    }

    const [metrics, recentOnboardings, recentBlockHistories, recentLeads, clientsList] = await Promise.all([
      getExecutiveDashboardMetrics(
        { preset, startDate, endDate, timezone },
        user
      ),
      prisma.employee.findMany({
        where: {
          ...clientWhere,
          employeeId: { not: 'GI-EMP-000001' },
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { clientId: true, companyName: true },
          },
        },
      }),
      prisma.employeeBlockHistory.findMany({
        where: clientWhere.clientId ? { employee: { clientId: clientWhere.clientId } } : {},
        take: 6,
        orderBy: { actionDate: 'desc' },
        include: {
          employee: {
            select: {
              employeeId: true,
              fullName: true,
              designation: true,
              client: { select: { clientId: true, companyName: true } },
            },
          },
        },
      }),
      !isClient
        ? prisma.lead.findMany({
            where: { isArchived: false },
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: {
              client: { select: { companyName: true } },
              assignedTo: { select: { fullName: true } },
            },
          })
        : Promise.resolve([]),
      prisma.client.findMany({
        where: clientWhere.clientId ? { id: clientWhere.clientId } : {},
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { employees: true, deals: true } },
        },
      }),
    ]);

    const responsePayload = {
      success: true,
      stats: {
        ...metrics,
        totalClients: metrics.workforce.totalClients,
        totalEmployees: metrics.workforce.totalEmployees,
        activeEmployees: metrics.workforce.workingNow + metrics.workforce.onBreak,
        blockedEmployees: metrics.workforce.blockedEmployees,
        inactiveEmployees: Math.max(0, metrics.workforce.totalEmployees - metrics.workforce.presentToday),
        workingNow: metrics.workforce.workingNow,
        onBreak: metrics.workforce.onBreak,
        absentToday: metrics.workforce.absentToday,
        presentToday: metrics.workforce.presentToday,
        lateToday: metrics.workforce.lateToday,
        attendancePercentage: metrics.workforce.attendancePercentage,
        activeSessions: metrics.workforce.activeSessions,
        employeesCurrentlyOnline: metrics.workforce.employeesCurrentlyOnline,
        dateRange: metrics.dateRange,
        recentOnboardings,
        recentBlockHistories,
        clientsList,
        crm: metrics.crm,
        recentLeads,
      },
    };

    dashboardCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error in Executive Dashboard API:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
