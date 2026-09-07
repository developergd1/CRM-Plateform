import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
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
    const { stage, remarks, dealValue } = await req.json();

    if (!stage) return NextResponse.json({ error: 'Target stage is required' }, { status: 400 });

    const client = await prisma.client.findFirst({
      where: getClientLookup(id),
      include: { assignedEmployee: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const fromStage = client.stage;
    const toStage = stage;

    // Update Client stage
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        stage: toStage,
        estimatedValue: dealValue !== undefined ? parseFloat(dealValue) : client.estimatedValue,
        lastContactedAt: new Date(),
      },
    });

    // Record Pipeline Transition History
    await prisma.clientPipelineHistory.create({
      data: {
        clientId: client.id,
        fromStage,
        toStage,
        changedById: currentEmp.employeeId,
        remarks: remarks || `Moved from ${fromStage} to ${toStage}`,
      },
    });

    // Record in Client Activity Timeline
    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType: 'STAGE_CHANGED',
        title: `Pipeline Stage Moved: ${fromStage} ➔ ${toStage}`,
        description: remarks || `Stage advanced by ${user.fullName} (${user.employeeId})`,
        previousValue: fromStage,
        newValue: toStage,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'CHANGE_CLIENT_STAGE',
      entityType: 'CLIENT',
      entityId: client.clientId,
      previousData: { stage: fromStage },
      newData: { stage: toStage, remarks },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
