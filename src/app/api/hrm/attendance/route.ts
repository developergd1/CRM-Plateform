import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    let clientDocId = tenantContext?.clientDocId || null;
    if (!clientDocId && tenantParam && tenantParam !== 'ten-growth-india' && !tenantParam.startsWith('ten-')) {
      clientDocId = await resolveClientObjectId(tenantParam);
    }

    const where: any = {
      ...(clientDocId ? { employee: { clientId: clientDocId } } : (tenantContext?.isAdmin ? {} : { employee: { clientId: null } })),
    };

    const dbAttendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, departmentName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (dbAttendance.length > 0) {
      const mappedAttendance: HrmAttendance[] = dbAttendance.map((a) => ({
        id: a.id,
        tenantId: clientDocId || 'ten-growth-india',
        employeeId: a.employee.employeeId,
        employeeName: a.employee.fullName,
        date: a.date,
        checkIn: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:30 AM',
        checkOut: a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        totalHours: Math.round((a.totalWorkMinutes / 60) * 10) / 10,
        breakMinutes: a.totalBreakMinutes,
        status: a.status as any,
        overtimeMinutes: a.overtimeMinutes,
      }));

      const stats = {
        totalPresent: mappedAttendance.filter((a) => a.status === 'PRESENT').length,
        totalLate: mappedAttendance.filter((a) => a.status === 'LATE').length,
        totalOnLeave: mappedAttendance.filter((a) => a.status === 'ON_LEAVE').length,
        avgWorkingHours: 9.0,
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
        stats: { totalPresent: 0, totalLate: 0, totalOnLeave: 0, avgWorkingHours: 0 },
      });
    }

    const attendance = hrmStore.attendance.filter((a) => a.tenantId === 'ten-growth-india');
    const stats = {
      totalPresent: attendance.filter((a) => a.status === 'PRESENT').length,
      totalLate: attendance.filter((a) => a.status === 'LATE').length,
      totalOnLeave: attendance.filter((a) => a.status === 'ON_LEAVE').length,
      avgWorkingHours: 9.2,
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
    const body = await req.json();
    const tenantId = body.tenantId || 'ten-growth-india';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const existing = hrmStore.attendance.find(
      (a) => a.tenantId === tenantId && a.employeeId === body.employeeId && a.date === dateStr
    );

    if (body.action === 'CHECK_OUT') {
      if (existing) {
        existing.checkOut = timeStr;
        existing.totalHours = 9.0;
        return NextResponse.json({ success: true, message: 'Checked out successfully', attendance: existing });
      }
    }

    // Default Check-In
    const newRecord: HrmAttendance = {
      id: `att-${Date.now()}`,
      tenantId,
      employeeId: body.employeeId || 'hrm-emp-101',
      employeeName: body.employeeName || 'Aarav Sharma',
      date: dateStr,
      checkIn: timeStr,
      totalHours: 0,
      breakMinutes: 0,
      status: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 45) ? 'LATE' : 'PRESENT',
      overtimeMinutes: 0,
    };

    hrmStore.attendance.unshift(newRecord);

    return NextResponse.json({
      success: true,
      attendance: newRecord,
      message: `Checked in successfully at ${timeStr}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
