import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ensureDefaultLeaveTypes } from '@/services/hrm/leave.service';
import { ensureDefaultSalaryComponentsAndStructures } from '@/services/hrm/payroll.service';

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
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    const employeeWhere: any = {
      status: 'ACTIVE',
      employeeId: { not: 'GI-EMP-000001' },
      ...(targetClientId ? { clientId: targetClientId } : (tenantContext?.isAdmin ? {} : { clientId: null })),
    };

    const attendanceWhere: any = {
      date: todayStr,
      status: { in: ['PRESENT', 'LATE'] },
      ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
    };

    const leaveWhere: any = {
      status: 'PENDING',
      ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
    };

    const ticketWhere: any = {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
    };

    const jobWhere: any = {
      status: 'OPEN',
      ...(targetClientId ? { requisition: { requestedById: user.id } } : {}),
    };

    const candidateWhere: any = {
      stage: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] },
      ...(targetClientId ? { opening: { requisition: { requestedById: user.id } } } : {}),
    };

    const auditWhere: any = targetClientId
      ? { actorUserId: user.id }
      : {};

    const [
      totalEmployees,
      todayAttendanceCount,
      openJobsCount,
      activeCandidatesCount,
      pendingLeavesCount,
      openTicketsCount,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.employee.count({ where: employeeWhere }),
      prisma.attendance.count({ where: attendanceWhere }),
      prisma.jobOpening.count({ where: jobWhere }),
      prisma.candidate.count({ where: candidateWhere }),
      prisma.leaveRequest.count({ where: leaveWhere }),
      prisma.helpdeskTicket.count({ where: ticketWhere }),
      prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    let latestPayroll: any = null;

    if (targetClientId) {
      const latestClientRecord = await prisma.payrollRecord.findFirst({
        where: { employee: { clientId: targetClientId } },
        include: { period: true },
        orderBy: { createdAt: 'desc' },
      });

      if (latestClientRecord) {
        const clientRecords = await prisma.payrollRecord.findMany({
          where: {
            periodId: latestClientRecord.periodId,
            employee: { clientId: targetClientId },
          },
        });

        const totalGross = clientRecords.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
        const totalNet = clientRecords.reduce((sum, r) => sum + (r.netPay || 0), 0);

        latestPayroll = {
          ...latestClientRecord.period,
          recordsCount: clientRecords.length,
          totalGrossPay: totalGross,
          totalNetPay: totalNet,
        };
      }
    } else {
      const latestPayrollPeriod = await prisma.payrollPeriod.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
      if (latestPayrollPeriod) {
        latestPayroll = {
          ...latestPayrollPeriod,
          recordsCount: latestPayrollPeriod.totalEmployees,
          totalGrossPay: latestPayrollPeriod.totalGross,
          totalNetPay: latestPayrollPeriod.totalNet,
        };
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalHeadcount: totalEmployees,
        todayPresent: todayAttendanceCount,
        attendanceRate: totalEmployees > 0 ? Math.round((todayAttendanceCount / totalEmployees) * 100) : 0,
        openJobs: openJobsCount,
        activeCandidates: activeCandidatesCount,
        pendingLeaves: pendingLeavesCount,
        openTickets: openTicketsCount,
      },
      latestPayroll,
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
