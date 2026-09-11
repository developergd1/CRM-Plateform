import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { getEffectiveWorkPolicy } from '@/lib/work-policy';
import { startOrResumeWorkSession, recordActivityEvent } from '@/lib/session-manager';

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
    if (!employee) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    // 1. Ensure or link active work session (Login Time)
    const workSession = await startOrResumeWorkSession({
      userId: user.id,
      employeeId: employee.id,
      ipAddress: ip,
      userAgent,
    });

    // 2. Check if already checked in and active today
    const existing = await prisma.attendance.findUnique({
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

    if (existing && existing.checkInTime && !existing.checkOutTime) {
      return NextResponse.json({
        error: 'You are already checked in and currently on duty.',
        attendance: existing,
        workSession,
      }, { status: 400 });
    }

    if (existing && existing.checkInTime && existing.checkOutTime) {
      // Resume working session
      const resumedAttendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: null,
          status: 'PRESENT',
        },
        include: {
          breaks: true,
        },
      });

      await recordActivityEvent({
        sessionId: workSession.sessionId,
        employeeId: employee.id,
        eventType: 'CHECK_IN',
        description: `Employee resumed work session at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        metadata: { ipAddress: ip },
      });

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId,
        action: 'ATTENDANCE_RESUME_WORK',
        entityType: 'ATTENDANCE',
        entityId: resumedAttendance.id,
        newData: { checkOutTime: null, status: 'PRESENT' },
        ipAddress: ip,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: 'Work session resumed! Activity tracking is active.',
        attendance: resumedAttendance,
        workSession,
      });
    }

    // 3. Determine late status from effective policy & employee shift
    const policy = await getEffectiveWorkPolicy({
      employeeId: employee.id,
      clientId: employee.clientId || undefined,
    });

    const shiftTime = employee.shiftStartTime || policy.shiftStartTime;
    const isFlexible = shiftTime === 'FLEXIBLE' || shiftTime === 'NONE' || !shiftTime;

    let isLate = false;
    let lateMinutes = 0;

    if (!isFlexible) {
      const [startHour, startMin] = shiftTime.split(':').map(Number);
      if (!isNaN(startHour) && !isNaN(startMin)) {
        const shiftStartToday = new Date(now);
        shiftStartToday.setHours(startHour, startMin, 0, 0);
        const graceCutoff = new Date(shiftStartToday.getTime() + (policy.gracePeriodMinutes || 15) * 60 * 1000);

        // Only consider late if checking in after grace period within normal working window (< 8 hours after start)
        if (now > graceCutoff && (now.getTime() - shiftStartToday.getTime()) < 8 * 3600 * 1000) {
          isLate = true;
          lateMinutes = Math.max(0, Math.round((now.getTime() - shiftStartToday.getTime()) / 60000));
        }
      }
    }

    const initialStatus = isLate ? 'LATE' : 'PRESENT';

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      update: {
        checkInTime: now,
        status: initialStatus,
        isLate,
        checkInIp: ip,
        remarks: isLate ? `Late check-in by ${lateMinutes}m` : undefined,
      },
      create: {
        employeeId: employee.id,
        date: today,
        checkInTime: now,
        status: initialStatus,
        isLate,
        checkInIp: ip,
        remarks: isLate ? `Late check-in by ${lateMinutes}m` : undefined,
      },
      include: {
        breaks: true,
      },
    });

    // Log Activity Event
    await recordActivityEvent({
      sessionId: workSession.sessionId,
      employeeId: employee.id,
      eventType: 'CHECK_IN',
      description: `Employee checked in at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      metadata: { isLate, lateMinutes, ipAddress: ip },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'ATTENDANCE_CHECK_IN',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      newData: { checkInTime: now, status: attendance.status, isLate, lateMinutes },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: isLate
        ? `Checked in (Marked Late: ${lateMinutes} mins past shift start)`
        : 'Checked in successfully! Work tracking active.',
      attendance,
      workSession,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
