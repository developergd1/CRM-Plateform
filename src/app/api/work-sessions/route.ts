import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
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
      const emp = await prisma.employee.findFirst({ where: getEmployeeLookup(employeeId) });
      if (emp) where.employeeId = emp.id;
    } else if (user.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      if (emp) where.employeeId = emp.id;
    } else if (user.role === 'CLIENT') {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (client) {
        where.employee = { clientId: client.id };
      }
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

    // Only track work sessions for regular employees (never for ADMIN or CLIENT)
    if (user.role !== 'EMPLOYEE' || user.employeeId === 'GI-EMP-000001') {
      return NextResponse.json({ success: true, message: 'Sessions only recorded for employees' });
    }

    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
    });
    if (!emp) return NextResponse.json({ success: true, message: 'Employee record not found' });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    const latestSession = await prisma.workSession.findFirst({
      where: {
        employeeId: emp.id,
        status: 'ACTIVE',
        loginTimestamp: { gte: todayStart },
      },
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
