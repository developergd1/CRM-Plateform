import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { hrmStore, HrmAttendance } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { resolveClientObjectId } = await import('@/lib/prisma');
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month'); // YYYY-MM
    let clientDocId = tenantContext?.clientDocId || null;
    if (!clientDocId && tenantParam && tenantParam !== 'ten-growth-india' && !tenantParam.startsWith('ten-')) {
      clientDocId = await resolveClientObjectId(tenantParam);
    }

    const where: any = {
      ...(clientDocId ? { employee: { clientId: clientDocId } } : (tenantContext?.isAdmin ? {} : { employee: { clientId: null } })),
      ...(dateParam ? { date: dateParam } : {}),
      ...(monthParam ? { date: { startsWith: monthParam } } : {}),
    };

    const dbAttendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, departmentName: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    if (dbAttendance.length > 0) {
      const mappedAttendance: HrmAttendance[] = dbAttendance.map((a) => ({
        id: a.id,
        tenantId: clientDocId || 'ten-growth-india',
        employeeId: a.employee.employeeId,
        employeeName: a.employee.fullName,
        date: a.date,
        checkIn: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        checkOut: a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        totalHours: Math.round((a.totalWorkMinutes / 60) * 10) / 10,
        breakMinutes: a.totalBreakMinutes,
        status: a.status as any,
        overtimeMinutes: a.overtimeMinutes,
      }));

      const stats = {
        totalPresent: mappedAttendance.filter((a) => a.status === 'PRESENT').length,
        totalLate: mappedAttendance.filter((a) => a.status === 'LATE').length,
        totalOnLeave: mappedAttendance.filter((a) => a.status === 'ON_LEAVE' || a.status === 'HALF_DAY').length,
        totalAbsent: mappedAttendance.filter((a) => a.status === 'ABSENT').length,
        avgWorkingHours: 8.5,
      };

      return NextResponse.json({
        success: true,
        attendance: mappedAttendance,
        stats,
      });
    }

    // Never leak mock attendance to client tenant
    if (clientDocId) {
      return NextResponse.json({
        success: true,
        attendance: [],
        stats: { totalPresent: 0, totalLate: 0, totalOnLeave: 0, totalAbsent: 0, avgWorkingHours: 0 },
      });
    }

    const attendance = hrmStore.attendance.filter((a) => a.tenantId === 'ten-growth-india');
    const stats = {
      totalPresent: attendance.filter((a) => a.status === 'PRESENT').length,
      totalLate: attendance.filter((a) => a.status === 'LATE').length,
      totalOnLeave: attendance.filter((a) => a.status === 'ON_LEAVE').length,
      totalAbsent: attendance.filter((a) => a.status === 'ABSENT').length,
      avgWorkingHours: 9.0,
    };

    return NextResponse.json({
      success: true,
      attendance,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const dateStr = body.date || new Date().toISOString().split('T')[0];

    // Resolve employee in database
    const targetEmpIdentifier = body.employeeId || user.employeeProfile?.id || user.employeeId;
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(isValidObjectId(targetEmpIdentifier) ? [{ id: targetEmpIdentifier }] : []),
          { employeeId: targetEmpIdentifier },
          { userId: user.id },
        ],
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found in organization master' }, { status: 404 });
    }

    const now = new Date();
    const action = body.action || (body.checkOutTime ? 'CHECK_OUT' : 'CHECK_IN');

    // Check existing attendance record in DB
    let attendanceRecord = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateStr,
        },
      },
    });

    if (action === 'CHECK_OUT') {
      const checkIn = attendanceRecord?.checkInTime || new Date(now.getTime() - 8 * 3600 * 1000);
      const checkOut = body.checkOutTime ? new Date(body.checkOutTime) : now;
      const totalMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)));
      const overtimeMinutes = Math.max(0, totalMinutes - 480);

      attendanceRecord = await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: dateStr } },
        create: {
          employeeId: employee.id,
          date: dateStr,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          status: body.status || 'PRESENT',
          totalWorkMinutes: totalMinutes,
          overtimeMinutes: body.overtimeMinutes ?? overtimeMinutes,
          remarks: body.remarks,
        },
        update: {
          checkOutTime: checkOut,
          totalWorkMinutes: totalMinutes,
          overtimeMinutes: body.overtimeMinutes ?? overtimeMinutes,
          status: body.status || attendanceRecord?.status || 'PRESENT',
          remarks: body.remarks || attendanceRecord?.remarks,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Checked out successfully and persisted to database',
        attendance: attendanceRecord,
      });
    }

    // Direct Status Update / Check In (PRESENT, ABSENT, HALF_DAY, LATE, etc.)
    const checkIn = body.checkInTime ? new Date(body.checkInTime) : now;
    const isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 45);
    const status = body.status || (isLate ? 'LATE' : 'PRESENT');
    const workMinutes = body.totalWorkMinutes ?? (status === 'PRESENT' || status === 'LATE' ? 480 : (status === 'HALF_DAY' ? 240 : 0));

    attendanceRecord = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: dateStr } },
      create: {
        employeeId: employee.id,
        date: dateStr,
        checkInTime: status === 'ABSENT' ? null : checkIn,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : null,
        status,
        isLate,
        totalWorkMinutes: workMinutes,
        overtimeMinutes: body.overtimeMinutes ?? 0,
        remarks: body.remarks,
      },
      update: {
        checkInTime: status === 'ABSENT' ? null : checkIn,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : attendanceRecord?.checkOutTime,
        status,
        isLate,
        totalWorkMinutes: workMinutes,
        overtimeMinutes: body.overtimeMinutes ?? attendanceRecord?.overtimeMinutes ?? 0,
        remarks: body.remarks || attendanceRecord?.remarks,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Attendance recorded (${status}) successfully in database`,
      attendance: attendanceRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
