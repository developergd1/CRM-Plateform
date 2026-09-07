import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { getEffectiveWorkPolicy } from '@/lib/work-policy';
import { getEmployeeActiveSession } from '@/lib/session-manager';
import { calculateAttendanceMetrics } from '@/lib/attendance-calculator';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    const { searchParams } = new URL(req.url);
    const filterClientId = searchParams.get('clientId');

    // 1. ADMIN / HR / MANAGER VIEW
    if (isManagerOrAbove(user.role)) {
      const adminUsers = await prisma.user.findMany({
        where: {
          role: {
            name: { in: ['ADMIN', 'SUPER_ADMIN'] },
          },
        },
        select: { id: true },
      });
      const adminUserIds = adminUsers.map((u) => u.id);

      let employeeFilter: any = {
        status: { not: 'BLOCKED' },
        employeeId: { not: 'GI-EMP-000001' },
        ...(adminUserIds.length > 0 ? { userId: { notIn: adminUserIds } } : {}),
      };
      if (filterClientId) {
        const resolvedId = await resolveClientObjectId(filterClientId);
        if (resolvedId) {
          employeeFilter.clientId = resolvedId;
        } else {
          return NextResponse.json({
            success: true,
            today,
            summary: { totalEmployees: 0, presentCount: 0, lateCount: 0, halfDayCount: 0, absentCount: 0 },
            records: [],
          });
        }
      }

      const employees = await prisma.employee.findMany({
        where: employeeFilter,
        include: {
          client: true,
          department: true,
        },
      });

      const employeeIds = employees.map((e) => e.id);

      const records = await prisma.attendance.findMany({
        where: {
          date: today,
          employeeId: { in: employeeIds },
        },
        include: {
          employee: {
            include: {
              client: true,
              department: true,
            },
          },
          breaks: true,
        },
        orderBy: { checkInTime: 'asc' },
      });

      const totalEmployees = employees.length;
      const presentCount = records.filter((r) => r.checkInTime).length;
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

    // 2. CLIENT VIEW
    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      if (!clientProfile) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      }

      const employees = await prisma.employee.findMany({
        where: {
          clientId: clientProfile.id,
          status: { not: 'BLOCKED' },
        },
        include: {
          department: true,
        },
      });

      const employeeIds = employees.map((e) => e.id);

      const records = await prisma.attendance.findMany({
        where: {
          date: today,
          employeeId: { in: employeeIds },
        },
        include: {
          employee: {
            include: {
              department: true,
            },
          },
          breaks: true,
        },
        orderBy: { checkInTime: 'asc' },
      });

      const totalEmployees = employees.length;
      const presentCount = records.filter((r) => r.checkInTime).length;
      const lateCount = records.filter((r) => r.isLate).length;
      const onBreakCount = records.filter((r) => r.breaks.some((b) => !b.breakEndTime)).length;

      return NextResponse.json({
        success: true,
        summary: {
          date: today,
          clientName: clientProfile.companyName,
          totalEmployees,
          presentCount,
          lateCount,
          onBreakCount,
          absentCount: Math.max(0, totalEmployees - presentCount),
        },
        records,
      });
    }

    // 3. EMPLOYEE VIEW
    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
      include: { client: true },
    });

    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const [attendance, activeSession, policy] = await Promise.all([
      prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: today,
          },
        },
        include: {
          breaks: true,
        },
      }),
      getEmployeeActiveSession(emp.id),
      getEffectiveWorkPolicy({ employeeId: emp.id, clientId: emp.clientId || undefined }),
    ]);

    const metrics = attendance
      ? calculateAttendanceMetrics({
          attendance,
          activeSession,
          policy,
        })
      : null;

    return NextResponse.json({
      success: true,
      today,
      employee: {
        id: emp.id,
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        designation: emp.designation,
        shiftStartTime: emp.shiftStartTime,
        shiftEndTime: emp.shiftEndTime,
        client: emp.client ? { id: emp.client.id, companyName: emp.client.companyName } : null,
      },
      attendance,
      activeSession,
      metrics,
      policy,
    });
  } catch (error: any) {
    console.error('Error in /api/attendance/today:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
