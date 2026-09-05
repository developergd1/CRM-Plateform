import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      include: { breaks: true },
    });

    if (!attendance) {
      return NextResponse.json({ error: 'No attendance record for today.' }, { status: 400 });
    }

    const openBreak = attendance.breaks.find((b) => !b.breakEndTime);
    if (!openBreak) {
      return NextResponse.json({ error: 'No active break to end.' }, { status: 400 });
    }

    const now = new Date();
    const duration = Math.max(1, Math.round((now.getTime() - new Date(openBreak.breakStartTime).getTime()) / 60000));

    const updatedBreak = await prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: {
        breakEndTime: now,
        durationMinutes: duration,
      },
    });

    // Update attendance totalBreakMinutes
    const allBreaks = await prisma.attendanceBreak.findMany({
      where: { attendanceId: attendance.id },
    });
    const totalBreakMinutes = allBreaks.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { totalBreakMinutes },
    });

    return NextResponse.json({ success: true, break: updatedBreak });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
