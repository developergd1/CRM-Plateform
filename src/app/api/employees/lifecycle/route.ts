import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getLifecycleEvents, transitionLifecycleStage } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;

    const events = await getLifecycleEvents(employeeId);

    if (employeeId) {
      return NextResponse.json({ success: true, events });
    }

    // Role-based filter
    const whereClause: any = { employeeId: { not: 'GI-EMP-000001' } };
    if (user.role === 'CLIENT' && user.clientId) {
      const client = await prisma.client.findFirst({
        where: { OR: [{ id: user.clientId }, { clientId: user.clientId }] },
      });
      if (client) whereClause.clientId = client.id;
    }

    const emps = await prisma.employee.findMany({
      where: whereClause,
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const employees = emps.map((e: any) => {
      const empEvents = events.filter((ev) => ev.employeeId === e.employeeId);
      const latestEvent = empEvents[0];
      const lifecycleStage = latestEvent?.toStage || (e.status === 'ARCHIVED' ? 'ARCHIVED' : e.status === 'EXITED' ? 'EXITED' : e.status === 'INACTIVE' ? 'EXIT_INITIATED' : 'ACTIVE');

      return {
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        department: e.departmentName || 'General Operations',
        designation: e.designation,
        clientName: e.client?.companyName || 'Growth India Internal',
        lifecycleStage,
        stageChangedAt: latestEvent?.createdAt || e.updatedAt?.toISOString() || e.createdAt.toISOString(),
        lastReason: latestEvent?.reason || undefined,
      };
    });

    return NextResponse.json({ success: true, employees, events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied. Only Admins and Clients can manage lifecycle transitions.' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, toStage, reason, remarks, effectiveDate } = body;

    if (!employeeId || !toStage || !reason) {
      return NextResponse.json({ error: 'Employee ID, target stage, and business reason are required.' }, { status: 400 });
    }

    const result = await transitionLifecycleStage(
      employeeId,
      { toStage, reason, remarks, effectiveDate },
      user
    );

    return NextResponse.json({
      message: `Employee lifecycle stage transitioned to ${toStage}.`,
      ...result,
    });
  } catch (err: any) {
    console.error('Error transitioning lifecycle:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
