import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { deals: true } },
          },
        },
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

    return NextResponse.json({ success: true, pipeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { name, isDefault, isActive } = body;

    const existing = await prisma.pipeline.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

    if (isDefault) {
      await prisma.pipeline.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.pipeline.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { deals: true } } },
        },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'UPDATE_PIPELINE',
      entityType: 'SYSTEM',
      entityId: id,
      previousData: existing,
      newData: updated,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, pipeline: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });

    if (pipeline.isDefault) {
      return NextResponse.json({ error: 'Cannot delete the default active pipeline. Please mark another pipeline as default first.' }, { status: 400 });
    }

    if (pipeline._count.deals > 0) {
      return NextResponse.json({
        error: `Cannot delete pipeline with ${pipeline._count.deals} active commercial deals. Migrate or reassign the deals first.`,
      }, { status: 400 });
    }

    // Delete child stages first, then pipeline
    await prisma.pipelineStage.deleteMany({ where: { pipelineId: id } });
    await prisma.pipeline.delete({ where: { id } });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'DELETE_PIPELINE',
      entityType: 'SYSTEM',
      entityId: id,
      previousData: { name: pipeline.name, code: pipeline.code },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Pipeline deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
