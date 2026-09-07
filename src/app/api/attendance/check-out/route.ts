import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { getEffectiveWorkPolicy } from '@/lib/work-policy';
import { getEmployeeActiveSession, endWorkSession, recordActivityEvent } from '@/lib/session-manager';
import { calculateAttendanceMetrics } from '@/lib/attendance-calculator';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
    });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      include: {
        breaks: true,
      },
    });

    if (!attendance || !attendance.checkInTime) {
      return NextResponse.json({ error: 'You have not checked in today yet.' }, { status: 400 });
    }

    if (attendance.checkOutTime) {
      return NextResponse.json({ error: 'You have already checked out today.' }, { status: 400 });
    }

    // Auto-close any open breaks if currently active
    const openBreak = attendance.breaks.find((b) => !b.breakEndTime);
    if (openBreak) {
      const breakDuration = Math.round((now.getTime() - new Date(openBreak.breakStartTime).getTime()) / 60000);
      await prisma.attendanceBreak.update({
        where: { id: openBreak.id },
        data: {
          breakEndTime: now,
          durationMinutes: Math.max(breakDuration, 1),
        },
      });
      openBreak.breakEndTime = now;
      openBreak.durationMinutes = Math.max(breakDuration, 1);
    }

    // Load policy & active session
    const policy = await getEffectiveWorkPolicy({
      employeeId: employee.id,
      clientId: employee.clientId || undefined,
    });

    const activeSession = await getEmployeeActiveSession(employee.id);

    // Calculate metrics using standardized calculator
    const metrics = calculateAttendanceMetrics({
      attendance: {
        ...attendance,
        checkOutTime: now,
      },
      activeSession,
      policy,
      now,
    });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        status: metrics.status,
        totalWorkMinutes: metrics.netWorkMinutes,
        totalBreakMinutes: metrics.totalBreakMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        isEarlyCheckout: metrics.isEarlyCheckout,
        checkOutIp: ip,
        remarks: metrics.isEarlyCheckout
          ? `Early checkout (${metrics.netWorkMinutes} mins worked)`
          : undefined,
      },
      include: {
        breaks: true,
      },
    });

    // Close active work session if one exists
    if (activeSession) {
      await endWorkSession(activeSession.sessionId);
      await recordActivityEvent({
        sessionId: activeSession.sessionId,
        employeeId: employee.id,
        eventType: 'CHECK_OUT',
        description: `Employee checked out at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        metadata: {
          netWorkMinutes: metrics.netWorkMinutes,
          totalBreakMinutes: metrics.totalBreakMinutes,
          isEarlyCheckout: metrics.isEarlyCheckout,
          overtimeMinutes: metrics.overtimeMinutes,
        },
      });
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'ATTENDANCE_CHECK_OUT',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      newData: {
        checkOutTime: now,
        netWorkMinutes: metrics.netWorkMinutes,
        totalBreakMinutes: metrics.totalBreakMinutes,
        isEarlyCheckout: metrics.isEarlyCheckout,
        overtimeMinutes: metrics.overtimeMinutes,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    const hours = Math.floor(metrics.netWorkMinutes / 60);
    const minutes = metrics.netWorkMinutes % 60;

    return NextResponse.json({
      success: true,
      message: `Checked out successfully! Total Working Time: ${hours}h ${minutes}m.`,
      attendance: updatedAttendance,
      metrics,
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
