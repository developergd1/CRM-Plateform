import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isManagerOrAbove(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Reports accessible to Managers and Admins only.' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'employee-performance'; // employee-performance, workforce-summary

    if (reportType === 'employee-performance') {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          client: { select: { companyName: true, clientId: true } },
          assignedCrmTasks: true,
          attendanceRecords: true,
        },
      });

      const report = employees.map((e) => {
        const completedTasks = e.assignedCrmTasks.filter((t) => t.status === 'COMPLETED').length;
        const presentDays = e.attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;

        return {
          employeeId: e.employeeId,
          fullName: e.fullName,
          designation: e.designation || 'N/A',
          department: e.departmentName || 'N/A',
          client: e.client?.companyName || 'Internal',
          totalTasksAssigned: e.assignedCrmTasks.length,
          tasksCompleted: completedTasks,
          attendancePresentDays: presentDays,
        };
      });

      return NextResponse.json({ success: true, reportType, report });
    }

    if (reportType === 'workforce-summary') {
      const [totalEmployees, activeEmployees, clients] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: 'ACTIVE' } }),
        prisma.client.findMany({
          select: {
            clientId: true,
            companyName: true,
            status: true,
            _count: { select: { employees: true, tasks: true } },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        reportType,
        totalEmployees,
        activeEmployees,
        clients,
      });
    }

    return NextResponse.json({ success: true, message: 'Select a valid report type' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
