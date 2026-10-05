import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId || null;

    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || 'EMPLOYEES').toUpperCase();
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const department = searchParams.get('department') || undefined;
    const status = searchParams.get('status') || undefined;

    let rows: any[] = [];
    let summary: any = {};

    switch (category) {
      case 'EMPLOYEES': {
        const where: any = {
          employeeId: { not: 'GI-EMP-000001' },
          ...(targetClientId ? { clientId: targetClientId } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
          ...(department && department !== 'ALL' ? { departmentName: department } : {}),
        };
        const emps = await prisma.employee.findMany({
          where,
          include: { department: true, client: true },
          orderBy: { employeeId: 'asc' },
        });

        summary = {
          total: emps.length,
          active: emps.filter((e) => e.status === 'ACTIVE').length,
          blocked: emps.filter((e) => e.status === 'BLOCKED').length,
        };

        rows = emps.map((e) => ({
          employeeId: e.employeeId,
          fullName: e.fullName,
          phone: e.phone,
          personalEmail: e.personalEmail || 'N/A',
          designation: e.designation,
          department: e.departmentName || e.department?.name || 'General',
          status: e.status,
          joiningDate: e.joiningDate?.toISOString().split('T')[0],
          panNumber: e.panNumber || 'N/A',
          pfUan: e.pfUan || 'N/A',
          esiNumber: e.esiNumber || 'N/A',
          bankAccount: e.bankAccount || 'N/A',
          bankIfsc: e.bankIfsc || 'N/A',
        }));
        break;
      }

      case 'ATTENDANCE': {
        const where: any = {
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
          ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
        };
        const records = await prisma.attendance.findMany({
          where,
          include: { employee: true },
          orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
          take: 500,
        });

        summary = {
          totalPunches: records.length,
          present: records.filter((r) => r.status === 'PRESENT').length,
          late: records.filter((r) => r.isLate).length,
          totalWorkHours: Number((records.reduce((s, r) => s + (r.totalWorkMinutes || 0), 0) / 60).toFixed(1)),
        };

        rows = records.map((r) => ({
          date: r.date,
          employeeId: r.employee.employeeId,
          employeeName: r.employee.fullName,
          status: r.status,
          checkIn: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : 'N/A',
          checkOut: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : 'N/A',
          isLate: r.isLate ? 'YES' : 'NO',
          workMinutes: r.totalWorkMinutes,
          overtimeMinutes: r.overtimeMinutes,
        }));
        break;
      }

      case 'LEAVE': {
        const where: any = {
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
          ...(status && status !== 'ALL' ? { status } : {}),
        };
        const leaves = await prisma.leaveRequest.findMany({
          where,
          include: { employee: true },
          orderBy: { createdAt: 'desc' },
        });

        summary = {
          totalRequests: leaves.length,
          approved: leaves.filter((l) => l.status === 'APPROVED').length,
          pending: leaves.filter((l) => l.status === 'PENDING').length,
          rejected: leaves.filter((l) => l.status === 'REJECTED').length,
          totalDaysTaken: leaves.filter((l) => l.status === 'APPROVED').reduce((s, l) => s + l.totalDays, 0),
        };

        rows = leaves.map((l) => ({
          id: l.id,
          employeeId: l.employee.employeeId,
          employeeName: l.employee.fullName,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          days: l.totalDays,
          status: l.status,
          reason: l.reason,
          reviewedAt: l.reviewedAt ? new Date(l.reviewedAt).toISOString().split('T')[0] : 'N/A',
        }));
        break;
      }

      case 'PAYROLL': {
        const where: any = {
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        };
        const records = await prisma.payrollRecord.findMany({
          where,
          include: { employee: true, period: true },
          orderBy: [{ period: { year: 'desc' } }, { period: { month: 'desc' } }],
          take: 500,
        });

        summary = {
          recordsCount: records.length,
          grossTotal: records.reduce((s, r) => s + (r.totalEarnings || 0), 0),
          netTotal: records.reduce((s, r) => s + (r.netPay || 0), 0),
          lopTotal: records.reduce((s, r) => s + (r.lopDeduction || 0), 0),
        };

        rows = records.map((r) => ({
          periodCode: r.period.periodCode,
          employeeId: r.employee.employeeId,
          employeeName: r.employee.fullName,
          baseGross: r.baseGross,
          lopDeduction: r.lopDeduction,
          grossEarnings: r.totalEarnings,
          totalDeductions: r.totalDeductions,
          reimbursements: r.reimbursements,
          netPay: r.netPay,
          status: r.status,
        }));
        break;
      }

      case 'COMPLIANCE': {
        const where: any = {
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        };
        const records = await prisma.payrollRecord.findMany({
          where,
          include: { employee: true, period: true },
          orderBy: [{ period: { year: 'desc' } }, { period: { month: 'desc' } }],
          take: 500,
        });

        const totalPfEmp = records.reduce((s, r) => s + (r.pfEmployee || 0), 0);
        const totalPfEmpr = records.reduce((s, r) => s + (r.pfEmployer || 0), 0);
        const totalEsiEmp = records.reduce((s, r) => s + (r.esiEmployee || 0), 0);
        const totalEsiEmpr = records.reduce((s, r) => s + (r.esiEmployer || 0), 0);
        const totalTds = records.reduce((s, r) => s + (r.tds || 0), 0);
        const totalPt = records.reduce((s, r) => s + (r.pt || 0), 0);

        summary = {
          totalPf: totalPfEmp + totalPfEmpr,
          totalEsi: totalEsiEmp + totalEsiEmpr,
          totalTds,
          totalPt,
        };

        rows = records.map((r) => ({
          periodCode: r.period.periodCode,
          employeeId: r.employee.employeeId,
          employeeName: r.employee.fullName,
          panNumber: r.employee.panNumber || 'N/A',
          pfUan: r.employee.pfUan || 'N/A',
          esiNumber: r.employee.esiNumber || 'N/A',
          pfEmployee: r.pfEmployee || 0,
          pfEmployer: r.pfEmployer || 0,
          esiEmployee: r.esiEmployee || 0,
          esiEmployer: r.esiEmployer || 0,
          tds: r.tds || 0,
          professionalTax: r.pt || 0,
        }));
        break;
      }

      case 'PMS': {
        const where: any = {
          ...(targetClientId ? { employee: { clientId: targetClientId } } : {}),
        };
        const [goals, reviews, appraisals] = await Promise.all([
          prisma.goal.findMany({ where, include: { employee: true } }),
          prisma.performanceReview.findMany({ where, include: { employee: true } }),
          prisma.pmsAppraisal.findMany({ where, include: { employee: true } }),
        ]);

        summary = {
          totalGoals: goals.length,
          completedGoals: goals.filter((g) => g.status === 'COMPLETED').length,
          completedReviews: reviews.filter((r) => r.status === 'COMPLETED').length,
          approvedAppraisals: appraisals.filter((a) => a.status === 'APPROVED').length,
        };

        rows = appraisals.map((a) => ({
          appraisalId: a.id,
          employeeId: a.employee.employeeId,
          employeeName: a.employee.fullName,
          rating: a.performanceRating,
          decisionType: a.decisionType,
          incrementPercent: a.incrementPercentage ? `${a.incrementPercentage}%` : 'N/A',
          bonusAmount: a.bonusAmount ? `₹${a.bonusAmount}` : 'N/A',
          status: a.status,
          effectiveDate: a.effectiveDate.toISOString().split('T')[0],
        }));
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported report category' }, { status: 400 });
    }

    if (format === 'csv') {
      if (rows.length === 0) {
        return new Response('No data available for selected criteria\n', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename=hrm_report_${category.toLowerCase()}.csv`,
          },
        });
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const val = String(row[h] ?? '').replace(/"/g, '""');
              return `"${val}"`;
            })
            .join(',')
        ),
      ];

      return new Response(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=hrm_report_${category.toLowerCase()}.csv`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      category,
      summary,
      count: rows.length,
      rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
