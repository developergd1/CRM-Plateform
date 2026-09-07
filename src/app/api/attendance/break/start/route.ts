import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getEmployeeActiveSession, recordActivityEvent } from '@/lib/session-manager';

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
    const body = await req.json().catch(() => ({}));
    const breakType = body.breakType || 'TEA';

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      include: { breaks: true },
    });

    if (!attendance || !attendance.checkInTime) {
      return NextResponse.json({ error: 'Must check in before starting a break.' }, { status: 400 });
    }

    if (attendance.checkOutTime) {
      return NextResponse.json({ error: 'Already checked out for the day.' }, { status: 400 });
    }

    // Check if there is already an active break
    const activeBreak = attendance.breaks.find((b) => !b.breakEndTime);
    if (activeBreak) {
      return NextResponse.json({ error: 'You already have an ongoing break.', activeBreak }, { status: 400 });
    }

    const newBreak = await prisma.attendanceBreak.create({
      data: {
        attendanceId: attendance.id,
        breakStartTime: new Date(),
        breakType,
      },
    });

    // Activity log in active session
    const activeSession = await getEmployeeActiveSession(employee.id);
    if (activeSession) {
      await recordActivityEvent({
        sessionId: activeSession.sessionId,
        employeeId: employee.id,
        eventType: 'BREAK_START',
        description: `Break started (${breakType})`,
        metadata: { breakType, breakId: newBreak.id },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${breakType} break started`,
      break: newBreak,
    });
  } catch (error: any) {
    console.error('Break start error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
