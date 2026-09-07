import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { getEffectiveWorkPolicy } from '@/lib/work-policy';
import {
  evaluateWorkforceStatus,
  getActivityEventsForSession,
} from '@/lib/session-manager';
import { calculateAttendanceMetrics } from '@/lib/attendance-calculator';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filterEmployeeId = searchParams.get('employeeId');
    const filterClientId = searchParams.get('clientId');
    const today = new Date().toISOString().split('T')[0];

    // Find admin user IDs once to avoid slow 2-stage multi-collection lookup pipelines in MongoDB
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          name: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      },
      select: { id: true },
    });
    const adminUserIds = adminUsers.map((u) => u.id);

    let employeeWhere: any = {
      status: { not: 'BLOCKED' },
      employeeId: { not: 'GI-EMP-000001' },
      ...(adminUserIds.length > 0 ? { userId: { notIn: adminUserIds } } : {}),
    };

    // RBAC:
    // Client sees only their employees
    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientProfile) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      employeeWhere.clientId = clientProfile.id;
    } else if (isManagerOrAbove(user.role)) {
      if (filterClientId) {
        const resolvedId = await resolveClientObjectId(filterClientId);
        if (resolvedId) {
          employeeWhere.clientId = resolvedId;
        } else {
          return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
              totalEmployees: 0,
              workingCount: 0,
              idleCount: 0,
              onBreakCount: 0,
              missingCheckinCount: 0,
              offlineCount: 0,
            },
            workforce: [],
            timelineEvents: [],
          });
        }
      }
    } else {
      // Employee role cannot inspect entire workforce
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (filterEmployeeId) {
      employeeWhere.id = filterEmployeeId;
    }

    // Fetch matching employees with client and department
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const employeeIds = employees.map((e) => e.id);

    // Fetch today's attendance records for these employees
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: today,
        employeeId: { in: employeeIds },
      },
      include: {
        breaks: true,
      },
    });
    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((att) => attendanceMap.set(att.employeeId, att));

    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    // Auto-close any stale sessions from previous days in background without blocking response
    prisma.workSession.updateMany({
      where: {
        employeeId: { in: employeeIds },
        loginTimestamp: { lt: todayStart },
        status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
      },
      data: {
        status: 'COMPLETED',
      },
    }).catch(() => {});

    // Fetch active work sessions strictly for TODAY
    const activeSessions = await prisma.workSession.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
        loginTimestamp: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
    });
    const sessionMap = new Map<string, any>();
    activeSessions.forEach((sess) => {
      // Keep only newest active session per employee
      if (!sessionMap.has(sess.employeeId)) {
        sessionMap.set(sess.employeeId, sess);
      }
    });

    // Compute live status & metrics for each employee
    const globalPolicy = await getEffectiveWorkPolicy({});
    const workforce = await Promise.all(
      employees.map(async (emp) => {
        const attendance = attendanceMap.get(emp.id) || null;
        const session = sessionMap.get(emp.id) || null;
        const liveStatus = evaluateWorkforceStatus({
          attendance,
          activeSession: session,
          staleThresholdMinutes: globalPolicy.idleThresholdMinutes || 5,
        });

        const isOffline = liveStatus === 'OFFLINE';

        const metrics = attendance
          ? calculateAttendanceMetrics({
              attendance,
              activeSession: isOffline ? null : session,
              policy: globalPolicy,
            })
          : null;

        return {
          employee: {
            id: emp.id,
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            designation: emp.designation,
            phone: emp.phone,
            personalEmail: emp.personalEmail,
            workMode: emp.workMode,
            shiftStartTime: emp.shiftStartTime,
            shiftEndTime: emp.shiftEndTime,
            client: emp.client,
            department: emp.department,
          },
          liveStatus, // 'WORKING' | 'IDLE' | 'ON_BREAK' | 'OFFLINE' | 'MISSING_CHECKIN'
          loginTime: !isOffline && session ? session.loginTimestamp : null,
          checkInTime: attendance?.checkInTime || null,
          checkOutTime: attendance?.checkOutTime || null,
          isLate: attendance?.isLate || false,
          activeSeconds: !isOffline && session ? (session.activeSeconds || 0) : 0,
          idleSeconds: !isOffline && metrics ? (metrics.idleSeconds || 0) : 0,
          totalBreakMinutes: attendance?.totalBreakMinutes || 0,
          attendanceMinutes: metrics?.attendanceMinutes || 0,
          netWorkMinutes: metrics?.netWorkMinutes || 0,
          activeBreak: attendance?.breaks?.find((b: any) => !b.breakEndTime) || null,
          sessionId: !isOffline && session ? session.sessionId : null,
        };
      })
    );

    // Workforce KPI Summary
    const totalCount = workforce.length;
    const workingCount = workforce.filter((w) => w.liveStatus === 'WORKING').length;
    const idleCount = workforce.filter((w) => w.liveStatus === 'IDLE').length;
    const onBreakCount = workforce.filter((w) => w.liveStatus === 'ON_BREAK').length;
    const missingCheckinCount = workforce.filter((w) => w.liveStatus === 'MISSING_CHECKIN').length;
    const offlineCount = workforce.filter((w) => w.liveStatus === 'OFFLINE').length;

    // If a single employee timeline was requested, fetch activity events
    let timelineEvents: any[] = [];
    if (filterEmployeeId && workforce.length === 1 && workforce[0].sessionId) {
      timelineEvents = await getActivityEventsForSession(workforce[0].sessionId);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalEmployees: totalCount,
        workingCount,
        idleCount,
        onBreakCount,
        missingCheckinCount,
        offlineCount,
      },
      workforce,
      timelineEvents,
    });
  } catch (error: any) {
    console.error('Workforce live query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
