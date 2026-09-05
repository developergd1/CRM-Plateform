import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (employeeId) {
      const emp = await prisma.employee.findFirst({ where: { OR: [{ id: employeeId }, { employeeId }] } });
      if (emp) where.employeeId = emp.id;
    } else if (!isManagerOrAbove(user.role)) {
      const emp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
      if (emp) where.employeeId = emp.id;
    }

    const sessions = await prisma.workSession.findMany({
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
      },
      orderBy: { loginTimestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Heartbeat ping from frontend tracking active platform interaction.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const emp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const latestSession = await prisma.workSession.findFirst({
      where: { employeeId: emp.id, status: 'ACTIVE' },
      orderBy: { loginTimestamp: 'desc' },
    });

    if (latestSession) {
      const now = new Date();
      const sessionDurationSec = Math.round((now.getTime() - new Date(latestSession.loginTimestamp).getTime()) / 1000);
      
      await prisma.workSession.update({
        where: { id: latestSession.id },
        data: {
          sessionDurationSec,
          activeSeconds: latestSession.activeSeconds + 30, // 30 sec increment per heartbeat
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
