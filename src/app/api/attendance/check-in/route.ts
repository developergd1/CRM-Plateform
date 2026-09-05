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
    if (!employee) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if already checked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
    });

    if (existing && existing.checkInTime) {
      return NextResponse.json({ error: 'You have already checked in today.', attendance: existing }, { status: 400 });
    }

    // Determine late check-in (after 09:45 AM grace period for 09:30 shift)
    const shiftHours = 9;
    const shiftMinutes = 45;
    const isLate = now.getHours() > shiftHours || (now.getHours() === shiftHours && now.getMinutes() > shiftMinutes);

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today,
        },
      },
      update: {
        checkInTime: now,
        status: isLate ? 'LATE' : 'PRESENT',
        isLate,
        checkInIp: ip,
      },
      create: {
        employeeId: employee.id,
        date: today,
        checkInTime: now,
        status: isLate ? 'LATE' : 'PRESENT',
        isLate,
        checkInIp: ip,
      },
      include: {
        breaks: true,
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'ATTENDANCE_CHECK_IN',
      entityType: 'ATTENDANCE',
      entityId: attendance.id,
      newData: { checkInTime: now, status: attendance.status, isLate },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: isLate ? 'Checked in (Marked Late as per shift policy)' : 'Checked in successfully!',
      attendance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
