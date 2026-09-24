import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getEmsOverviewMetrics, getOffboardings, getShiftPolicies, getLifecycleEvents } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientIdParam = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);

    const metrics = await getEmsOverviewMetrics(clientIdParam);

    // Deep workforce analytics: department-wise, designation-wise, employment type
    const empWhere: any = {
      employeeId: { not: 'GI-EMP-000001' },
      status: { not: 'ARCHIVED' },
    };
    if (clientIdParam && clientIdParam !== 'ALL') {
      const client = await prisma.client.findFirst({ where: getClientLookup(clientIdParam), select: { id: true } });
      if (client) empWhere.clientId = client.id;
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        departmentName: true,
        designation: true,
        employmentType: true,
        status: true,
        joiningDate: true,
        clientId: true,
        client: { select: { companyName: true } },
      },
    });

    // Department breakdown
    const departmentMap: Record<string, number> = {};
    const designationMap: Record<string, number> = {};
    const employmentTypeMap: Record<string, number> = {};

    employees.forEach((emp) => {
      const dept = emp.departmentName || 'General Operations';
      departmentMap[dept] = (departmentMap[dept] || 0) + 1;

      const desig = emp.designation || 'Staff';
      designationMap[desig] = (designationMap[desig] || 0) + 1;

      const type = emp.employmentType || 'Full-Time';
      employmentTypeMap[type] = (employmentTypeMap[type] || 0) + 1;
    });

    // Leave breakdown
    const leaves = await prisma.leaveRequest.groupBy({
      by: ['leaveType', 'status'],
      _count: { id: true },
      _sum: { totalDays: true },
    });

    return NextResponse.json({
      success: true,
      metrics: metrics.kpis,
      clientDistribution: metrics.clientDistribution,
      departmentBreakdown: Object.entries(departmentMap).map(([name, count]) => ({ name, count })),
      designationBreakdown: Object.entries(designationMap).map(([name, count]) => ({ name, count })),
      employmentTypeBreakdown: Object.entries(employmentTypeMap).map(([name, count]) => ({ name, count })),
      leaveStats: leaves.map((l) => ({
        type: l.leaveType,
        status: l.status,
        count: l._count.id,
        totalDays: l._sum.totalDays || 0,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error compiling workforce reports:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
