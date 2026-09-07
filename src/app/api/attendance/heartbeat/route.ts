import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { processHeartbeat } from '@/lib/session-manager';

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

    const body = await req.json().catch(() => ({}));
    const { sessionId, isIdle, deltaActiveSeconds, deltaIdleSeconds } = body;

    const result = await processHeartbeat({
      employeeId: employee.id,
      sessionId,
      isIdle: Boolean(isIdle),
      deltaActiveSeconds: Number(deltaActiveSeconds) || 0,
      deltaIdleSeconds: Number(deltaIdleSeconds) || 0,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
