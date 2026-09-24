import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: pipelineId } = await params;
    const body = await req.json();
    const { name, probability, colorToken, requiredFields, isWon, isLost } = body;

    if (!name) return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });

    const count = await prisma.pipelineStage.count({ where: { pipelineId } });

    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId,
        name: name.trim(),
        order: count + 1,
        probability: typeof probability === 'number' ? probability : 20,
        colorToken: colorToken || 'blue',
        requiredFields: Array.isArray(requiredFields) ? requiredFields : [],
        isWon: Boolean(isWon),
        isLost: Boolean(isLost),
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'CREATE_PIPELINE_STAGE',
      entityType: 'SYSTEM',
      entityId: stage.id,
      newData: { stageName: stage.name, pipelineId },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, stage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk reorder or update stages
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: pipelineId } = await params;
    const body = await req.json();

    // If payload contains 'stages' array, execute reorder/bulk update
    if (Array.isArray(body.stages)) {
      for (const item of body.stages) {
        if (!item.id) continue;
        await prisma.pipelineStage.update({
          where: { id: item.id },
          data: {
            name: item.name,
            order: item.order,
            probability: typeof item.probability === 'number' ? item.probability : undefined,
            colorToken: item.colorToken,
            requiredFields: Array.isArray(item.requiredFields) ? item.requiredFields : undefined,
            isWon: typeof item.isWon === 'boolean' ? item.isWon : undefined,
            isLost: typeof item.isLost === 'boolean' ? item.isLost : undefined,
          },
        });
      }

      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'REORDER_PIPELINE_STAGES',
        entityType: 'SYSTEM',
        entityId: pipelineId,
        newData: { stageCount: body.stages.length },
        status: 'SUCCESS',
      });

      const updatedStages = await prisma.pipelineStage.findMany({
        where: { pipelineId },
        orderBy: { order: 'asc' },
        include: { _count: { select: { deals: true } } },
      });

      return NextResponse.json({ success: true, stages: updatedStages });
    }

    return NextResponse.json({ error: 'Payload must contain stages array' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
