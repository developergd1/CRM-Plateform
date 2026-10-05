import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ensureDefaultLeaveTypes } from '@/services/hrm/leave.service';
import { ensureDefaultSalaryComponentsAndStructures } from '@/services/hrm/payroll.service';
import { ensureDefaultStatutoryRules } from '@/services/hrm/statutory.service';
import { ensureDefaultPerformanceCycle } from '@/services/hrm/performance.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId || null;

    await Promise.all([
      ensureDefaultLeaveTypes(),
      ensureDefaultSalaryComponentsAndStructures(),
      ensureDefaultStatutoryRules(),
      ensureDefaultPerformanceCycle(),
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    const baseEmployeeFilter: any = {
      employeeId: { not: 'GI-EMP-000001' },
      ...(targetClientId ? { clientId: targetClientId } : (tenantContext?.isAdmin ? {} : { clientId: null })),
    };

    const activeEmployeeFilter: any = {
      ...baseEmployeeFilter,
      status: 'ACTIVE',
    };

    const attendanceFilter: any = {
      date: todayStr,
      ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
    };

    const [
      totalEmployees,
      activeEmployees,
      todayPresent,
      todayLate,
      todayOnLeave,
      pendingLeaveRequests,
      activeGoals,
      pendingReviews,
      pendingAdjustments,
      pendingAppraisals,
      openJobs,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.employee.count({ where: baseEmployeeFilter }),
      prisma.employee.count({ where: activeEmployeeFilter }),
      prisma.attendance.count({ where: { ...attendanceFilter, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...attendanceFilter, status: 'LATE' } }),
      prisma.attendance.count({ where: { ...attendanceFilter, status: { in: ['ON_LEAVE', 'HALF_DAY'] } } }),
      prisma.leaveRequest.count({
        where: {
          status: 'PENDING',
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        },
      }),
      prisma.goal.count({
        where: {
          status: 'IN_PROGRESS',
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        },
      }),
      prisma.performanceReview.count({
        where: {
          status: { in: ['PENDING_SELF', 'PENDING_MANAGER'] },
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        },
      }),
      prisma.payrollAdjustment.count({
        where: {
          status: 'PENDING',
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        },
      }),
      prisma.pmsAppraisal.count({
        where: {
          status: 'PENDING',
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        },
      }),
      prisma.jobOpening.count({ where: { status: 'OPEN' } }),
      prisma.auditLog.findMany({
        where: targetClientId ? { actorUserId: user.id } : {},
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    // Payroll telemetry
    const latestPeriod = await prisma.payrollPeriod.findFirst({
      where: targetClientId ? { clientId: targetClientId } : {},
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: { select: { payrollRecords: true, exceptions: true } },
      },
    });

    const pendingExceptionsCount = latestPeriod
      ? await prisma.payrollException.count({
          where: { periodId: latestPeriod.id, status: 'OPEN' },
        })
      : 0;

    const pendingApprovalsCount = pendingLeaveRequests + pendingAdjustments + pendingAppraisals;

    return NextResponse.json({
      success: true,
      metrics: {
        totalEmployees,
        totalHeadcount: totalEmployees,
        activeEmployees,
        presentToday: todayPresent + todayLate,
        lateToday: todayLate,
        onLeave: todayOnLeave,
        pendingLeaveRequests,
        pendingLeaves: pendingLeaveRequests,
        openJobs,
        payrollStatus: latestPeriod?.status || 'NO_PERIOD',
        currentPayrollPeriod: latestPeriod?.periodCode || 'N/A',
        pendingPayrollExceptions: pendingExceptionsCount,
        pendingApprovals: pendingApprovalsCount,
        activeGoals,
        pendingPerformanceReviews: pendingReviews,
        attendanceRate: activeEmployees > 0 ? Math.round(((todayPresent + todayLate) / activeEmployees) * 100) : 0,
      },
      latestPayroll: latestPeriod ? {
        ...latestPeriod,
        recordsCount: latestPeriod.totalEmployees,
        totalGrossPay: latestPeriod.totalGross,
        totalNetPay: latestPeriod.totalNet,
        pendingExceptions: pendingExceptionsCount,
      } : null,
      recentActivities: recentAuditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.entityType,
        details: l.reason || `${l.action} on ${l.entityType}`,
        createdAt: l.timestamp,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
