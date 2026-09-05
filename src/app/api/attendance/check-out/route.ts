import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
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
    }

    // Calculate total work minutes and breaks
    const totalMinutesSinceCheckIn = Math.round((now.getTime() - new Date(attendance.checkInTime).getTime()) / 60000);
    const totalBreakMinutes = attendance.breaks.reduce((acc, curr) => acc + curr.durationMinutes, 0) + (openBreak ? Math.max(Math.round((now.getTime() - new Date(openBreak.breakStartTime).getTime()) / 60000), 1) : 0);
    const netWorkMinutes = Math.max(0, totalMinutesSinceCheckIn - totalBreakMinutes);

    // Standard day is 8 hours (480 mins). Overtime is beyond 480 mins. Early checkout is < 420 mins.
    const isEarly = netWorkMinutes < 420;
    const overtimeMinutes = Math.max(0, netWorkMinutes - 480);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: now,
        totalWorkMinutes: netWorkMinutes,
        totalBreakMinutes,
        overtimeMinutes,
        isEarlyCheckout: isEarly,
        checkOutIp: ip,
      },
      include: {
        breaks: true,
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'ATTENDANCE_CHECK_OUT',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      newData: {
        checkOutTime: now,
        netWorkMinutes,
        totalBreakMinutes,
        isEarlyCheckout: isEarly,
        overtimeMinutes,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Checked out successfully! Total working time: ${Math.floor(netWorkMinutes / 60)}h ${netWorkMinutes % 60}m.`,
      attendance: updatedAttendance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
