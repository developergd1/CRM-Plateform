import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // e.g. "2026-09"
    const requestedEmpId = searchParams.get('employeeId');
    const requestedClientId = searchParams.get('clientId');

    let targetEmployeeIds: string[] = [];

    // 1. Employee Role
    if (user.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      targetEmployeeIds = [emp.id];
    }
    // 2. Client Role
    else if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientProfile) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

      const clientEmployees = await prisma.employee.findMany({
        where: { clientId: clientProfile.id },
        select: { id: true },
      });
      const allowedIds = clientEmployees.map((e) => e.id);

      if (requestedEmpId) {
        if (!allowedIds.includes(requestedEmpId)) {
          return NextResponse.json({ error: 'Forbidden: Employee not assigned to you' }, { status: 403 });
        }
        targetEmployeeIds = [requestedEmpId];
      } else {
        targetEmployeeIds = allowedIds;
      }
    }
    // 3. Admin / HR / Manager
    else if (isManagerOrAbove(user.role)) {
      if (requestedEmpId) {
        targetEmployeeIds = [requestedEmpId];
      } else if (requestedClientId) {
        const { resolveClientObjectId } = await import('@/lib/prisma');
        const resolvedId = await resolveClientObjectId(requestedClientId);
        if (resolvedId) {
          const clientEmployees = await prisma.employee.findMany({
            where: { clientId: resolvedId },
            select: { id: true },
          });
          targetEmployeeIds = clientEmployees.map((e) => e.id);
        } else {
          targetEmployeeIds = [];
        }
      } else {
        const adminUsers = await prisma.user.findMany({
          where: {
            role: {
              name: { in: ['ADMIN', 'SUPER_ADMIN'] },
            },
          },
          select: { id: true },
        });
        const adminUserIds = adminUsers.map((u) => u.id);

        const allEmps = await prisma.employee.findMany({
          where: {
            status: { not: 'BLOCKED' },
            employeeId: { not: 'GI-EMP-000001' },
            ...(adminUserIds.length > 0 ? { userId: { notIn: adminUserIds } } : {}),
          },
          select: { id: true },
        });
        targetEmployeeIds = allEmps.map((e) => e.id);
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (targetEmployeeIds.length === 0) {
      return NextResponse.json({
        success: true,
        records: [],
        summary: {
          totalWorkingDays: 0,
          presentCount: 0,
          lateCount: 0,
          halfDayCount: 0,
          totalWorkMinutes: 0,
          totalBreakMinutes: 0,
          totalOvertimeMinutes: 0,
        },
      });
    }

    // Query records starting with month prefix "YYYY-MM"
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: { in: targetEmployeeIds },
        date: { startsWith: month },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            shiftStartTime: true,
            shiftEndTime: true,
            client: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        breaks: true,
      },
      orderBy: { date: 'asc' },
    });

    // Compute month summary
    const presentRecords = records.filter((r) => r.checkInTime);
    const presentCount = presentRecords.length;
    const lateCount = records.filter((r) => r.isLate).length;
    const halfDayCount = records.filter((r) => r.status === 'HALF_DAY').length;
    const totalWorkMinutes = records.reduce((acc, curr) => acc + (curr.totalWorkMinutes || 0), 0);
    const totalBreakMinutes = records.reduce((acc, curr) => acc + (curr.totalBreakMinutes || 0), 0);
    const totalOvertimeMinutes = records.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);

    return NextResponse.json({
      success: true,
      month,
      summary: {
        totalRecords: records.length,
        presentCount,
        lateCount,
        halfDayCount,
        totalWorkMinutes,
        totalWorkHours: Number((totalWorkMinutes / 60).toFixed(1)),
        totalBreakMinutes,
        totalOvertimeMinutes,
        totalOvertimeHours: Number((totalOvertimeMinutes / 60).toFixed(1)),
        avgDailyMinutes: presentCount > 0 ? Math.round(totalWorkMinutes / presentCount) : 0,
      },
      records,
    });
  } catch (error: any) {
    console.error('Attendance history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
