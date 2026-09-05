import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Get today's attendance status
    const today = new Date().toISOString().split('T')[0];
    let attendance = null;
    
    if (user.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { employeeId: user.employeeId },
      });

      if (emp) {
        attendance = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: emp.id,
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
