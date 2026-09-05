import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isManagerOrAbove(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Reports accessible to Managers and Admins only.' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'crm-conversions'; // crm-conversions, employee-performance, attendance-monthly

    if (reportType === 'crm-conversions') {
      const clients = await prisma.client.findMany({
        include: {
          createdBy: { select: { employeeId: true, fullName: true } },
          assignedEmployee: { select: { employeeId: true, fullName: true } },
        },
      });

      const sourcePerformance: Record<string, { total: number; won: number; value: number }> = {};
      clients.forEach((c) => {
        const src = c.source || 'Direct';
        if (!sourcePerformance[src]) {
          sourcePerformance[src] = { total: 0, won: 0, value: 0 };
        }
        sourcePerformance[src].total += 1;
        if (c.stage === 'WON') {
          sourcePerformance[src].won += 1;
          sourcePerformance[src].value += c.estimatedValue || 0;
        }
      });

      return NextResponse.json({
        success: true,
        reportType,
        sourcePerformance: Object.entries(sourcePerformance).map(([source, data]) => ({
          source,
          totalLeads: data.total,
          wonDeals: data.won,
          conversionRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
          totalRevenueWon: data.value,
        })),
        clients,
      });
    }

    if (reportType === 'employee-performance') {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          assignedClients: true,
          activitiesPerformed: true,
          tasksAssigned: true,
          attendanceRecords: true,
        },
      });

      const report = employees.map((e) => {
        const won = e.assignedClients.filter((c) => c.stage === 'WON');
        const lost = e.assignedClients.filter((c) => c.stage === 'LOST');
        const closed = won.length + lost.length;
        const revenue = won.reduce((acc, c) => acc + (c.estimatedValue || 0), 0);

        return {
          employeeId: e.employeeId,
          fullName: e.fullName,
          designation: e.designation,
          totalClientsAssigned: e.assignedClients.length,
          dealsWon: won.length,
          dealsLost: lost.length,
          conversionRate: closed > 0 ? `${Math.round((won.length / closed) * 100)}%` : 'N/A',
          totalRevenueGenerated: revenue,
          activitiesLogged: e.activitiesPerformed.length,
          tasksCompleted: e.tasksAssigned.filter((t) => t.status === 'COMPLETED').length,
          attendancePresentDays: e.attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length,
        };
      });

      return NextResponse.json({ success: true, reportType, report });
    }

    return NextResponse.json({ success: true, message: 'Select a valid report type' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
