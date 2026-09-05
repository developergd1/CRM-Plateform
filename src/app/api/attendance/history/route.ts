import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // YYYY-MM

    const where: any = {};

    if (employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ id: employeeId }, { employeeId }] },
      });
      if (emp) where.employeeId = emp.id;
    } else if (!isAdminOrHR(user.role)) {
      // Normal employee can only see own history
      const emp = await prisma.employee.findUnique({
        where: { employeeId: user.employeeId },
      });
      if (emp) where.employeeId = emp.id;
    }

    if (month) {
      where.date = { startsWith: month };
    }

    const history = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        breaks: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
