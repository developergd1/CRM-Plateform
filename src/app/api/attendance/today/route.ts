import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];

    // If Admin/HR/Manager, fetch summary of all employee attendance today
    if (isManagerOrAbove(user.role)) {
      const records = await prisma.attendance.findMany({
        where: { date: today },
        include: {
          employee: {
            include: {
              department: true,
              team: true,
            },
          },
          breaks: true,
        },
        orderBy: { checkInTime: 'asc' },
      });

      const totalEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
      const presentCount = records.length;
      const lateCount = records.filter((r) => r.isLate).length;
      const onBreakCount = records.filter((r) => r.breaks.some((b) => !b.breakEndTime)).length;

      return NextResponse.json({
        success: true,
        summary: {
          date: today,
          totalEmployees,
          presentCount,
          lateCount,
          onBreakCount,
          absentCount: Math.max(0, totalEmployees - presentCount),
        },
        records,
      });
    }

    // For regular employee, return their own record
    const emp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });

    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: emp.id,
          date: today,
        },
      },
      include: {
        breaks: true,
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
