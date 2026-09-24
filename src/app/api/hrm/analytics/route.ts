import { NextRequest, NextResponse } from 'next/server';
import { hrmStore } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'ten-growth-india';

    const tenant = hrmStore.tenants.find((t) => t.id === tenantId) || hrmStore.tenants[0];
    const employees = hrmStore.employees.filter((e) => e.tenantId === tenantId);
    const attendance = hrmStore.attendance.filter((a) => a.tenantId === tenantId);
    const leaves = hrmStore.leaveApplications.filter((l) => l.tenantId === tenantId);
    const jobs = hrmStore.jobs.filter((j) => j.tenantId === tenantId);
    const candidates = hrmStore.candidates.filter((c) => c.tenantId === tenantId);
    const goals = hrmStore.goals.filter((g) => g.tenantId === tenantId);
    const tickets = hrmStore.tickets.filter((t) => t.tenantId === tenantId);

    // Department Distribution
    const deptDistribution: Record<string, number> = {};
    employees.forEach((e) => {
      deptDistribution[e.department] = (deptDistribution[e.department] || 0) + 1;
    });

    // Recruitment Funnel
    const funnel = {
      applied: candidates.length,
      screening: candidates.filter((c) => c.stage === 'SCREENING').length,
      interview: candidates.filter((c) => c.stage === 'TECHNICAL_INTERVIEW' || c.stage === 'MANAGEMENT_ROUND').length,
      offered: candidates.filter((c) => c.stage === 'OFFER_MADE').length,
      hired: candidates.filter((c) => c.stage === 'HIRED').length,
    };

    return NextResponse.json({
      success: true,
      tenantName: tenant.name,
      metrics: {
        totalHeadcount: employees.length || tenant.employeeCount,
        departmentsCount: tenant.departments.length,
        openPositions: jobs.reduce((acc, j) => acc + j.openings, 0),
        activeCandidates: candidates.length,
        attendancePunctuality: '96.4%',
        avgDailyHours: '9.2 hrs',
        pendingLeaves: leaves.filter((l) => l.status.startsWith('PENDING')).length,
        resolvedTickets: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        openTickets: tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length,
        deptDistribution: Object.entries(deptDistribution).map(([name, value]) => ({ name, value })),
        recruitmentFunnel: funnel,
        goalsAverageScore: 4.8,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
