import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { calculateTimesheets } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'EMPLOYEES';
    const clientIdParam = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);

    let csvContent = '';
    let filename = `GrowthIndia_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'EMPLOYEES') {
      const empWhere: any = { employeeId: { not: 'GI-EMP-000001' } };
      if (clientIdParam && clientIdParam !== 'ALL') {
        const client = await prisma.client.findFirst({ where: getClientLookup(clientIdParam), select: { id: true } });
        if (client) empWhere.clientId = client.id;
      }

      const employees = await prisma.employee.findMany({
        where: empWhere,
        include: { client: true, user: true },
        orderBy: { employeeId: 'asc' },
      });

      const headers = ['Employee ID', 'Full Name', 'Company / Client', 'Department', 'Designation', 'Employment Type', 'Mobile', 'Email', 'Shift Start', 'Shift End', 'Joining Date', 'Status', 'Account Status', 'Created At'];
      const rows = employees.map((e) => [
        e.employeeId,
        `"${e.fullName.replace(/"/g, '""')}"`,
        `"${(e.client?.companyName || 'Internal').replace(/"/g, '""')}"`,
        `"${(e.departmentName || 'General').replace(/"/g, '""')}"`,
        `"${e.designation.replace(/"/g, '""')}"`,
        e.employmentType,
        e.phone,
        e.personalEmail || e.user?.email || '',
        e.shiftStartTime,
        e.shiftEndTime,
        new Date(e.joiningDate).toISOString().split('T')[0],
        e.status,
        e.user?.isSuspended ? 'SUSPENDED' : e.isBlocked ? 'BLOCKED' : e.user?.isActive === false ? 'DEACTIVATED' : 'ACTIVE',
        new Date(e.createdAt).toISOString().split('T')[0],
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'ATTENDANCE') {
      const attendances = await prisma.attendance.findMany({
        where: { date: { startsWith: month } },
        include: {
          employee: {
            select: { employeeId: true, fullName: true, designation: true, client: { select: { companyName: true } } },
          },
        },
        orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
        take: 2000,
      });

      const headers = ['Date', 'Employee ID', 'Name', 'Client', 'Designation', 'Status', 'Late', 'Work Minutes', 'Break Minutes', 'Overtime Minutes', 'Remarks'];
      const rows = attendances.map((a) => [
        a.date,
        a.employee.employeeId,
        `"${a.employee.fullName.replace(/"/g, '""')}"`,
        `"${(a.employee.client?.companyName || 'Internal').replace(/"/g, '""')}"`,
        `"${a.employee.designation.replace(/"/g, '""')}"`,
        a.status,
        a.isLate ? 'YES' : 'NO',
        a.totalWorkMinutes,
        a.totalBreakMinutes,
        a.overtimeMinutes,
        `"${(a.remarks || '').replace(/"/g, '""')}"`,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'TIMESHEETS') {
      const timesheets = await calculateTimesheets({
        periodType: 'MONTHLY',
        periodIdentifier: month,
        clientId: clientIdParam,
      });

      const headers = ['Timesheet ID', 'Employee ID', 'Name', 'Client', 'Department', 'Period', 'Scheduled Hours', 'Worked Hours', 'Break Hours', 'Overtime Hours', 'Approved Hours', 'Missing Punches', 'Status'];
      const rows = timesheets.map((t) => [
        t.timesheetId,
        t.employeeDisplayId,
        `"${t.employeeName.replace(/"/g, '""')}"`,
        `"${(t.clientName || '').replace(/"/g, '""')}"`,
        `"${t.department.replace(/"/g, '""')}"`,
        t.periodIdentifier,
        t.scheduledHours,
        t.workedHours,
        t.breakHours,
        t.overtimeHours,
        t.approvedHours,
        t.missingPunchesCount,
        t.status,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'LEAVES') {
      const leaves = await prisma.leaveRequest.findMany({
        include: {
          employee: {
            select: { employeeId: true, fullName: true, client: { select: { companyName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      const headers = ['Leave ID', 'Employee ID', 'Name', 'Client', 'Leave Type', 'Start Date', 'End Date', 'Total Days', 'Status', 'Reason', 'Applied Date'];
      const rows = leaves.map((l) => [
        l.id,
        l.employee.employeeId,
        `"${l.employee.fullName.replace(/"/g, '""')}"`,
        `"${(l.employee.client?.companyName || 'Internal').replace(/"/g, '""')}"`,
        l.leaveType,
        l.startDate,
        l.endDate,
        l.totalDays,
        l.status,
        `"${l.reason.replace(/"/g, '""')}"`,
        new Date(l.createdAt).toISOString().split('T')[0],
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (type === 'AUDIT') {
      const audits = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1000,
      });

      const headers = ['Timestamp', 'Actor ID', 'Action', 'Entity Type', 'Entity ID', 'Status', 'IP Address', 'Reason'];
      const rows = audits.map((a) => [
        new Date(a.timestamp).toISOString(),
        a.actorEmployeeId || a.actorUserId || 'SYSTEM',
        a.action,
        a.entityType,
        a.entityId || '',
        a.status,
        a.ipAddress || '',
        `"${(a.reason || '').replace(/"/g, '""')}"`,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Error generating export:', err);
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
