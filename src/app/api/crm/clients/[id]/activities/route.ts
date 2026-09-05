import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { id } = params;
    const { activityType = 'CALL_MADE', title, description, metadata } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Activity title is required' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ id }, { clientId: id }] },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const activity = await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType,
        title,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        actorEmployee: { select: { employeeId: true, fullName: true } },
      },
    });

    // Update lastContactedAt on client
    await prisma.client.update({
      where: { id: client.id },
      data: { lastContactedAt: new Date() },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'LOG_CLIENT_ACTIVITY',
      entityType: 'CLIENT',
      entityId: client.clientId,
      newData: { activityType, title, actor: user.employeeId },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, activity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
