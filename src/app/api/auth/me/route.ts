import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Only fetch today's attendance for employees (Admins/Clients don't need attendance punches)
    let attendance = null;
    if (user.role === 'EMPLOYEE' && (user.employeeProfileId || user.employeeId)) {
      const today = new Date().toISOString().split('T')[0];
      const targetEmpId = user.employeeProfileId || (
        await prisma.employee.findUnique({
          where: { employeeId: user.employeeId },
          select: { id: true },
        })
      )?.id;

      if (targetEmpId) {
        attendance = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: targetEmpId,
              date: today,
            },
          },
          include: {
            breaks: true,
          },
        });
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      todayAttendance: attendance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching user' }, { status: 500 });
  }
}
