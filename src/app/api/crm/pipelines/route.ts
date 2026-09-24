import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const DEFAULT_STAGES = [
  { name: 'Lead Qualified', order: 1, probability: 10, colorToken: 'blue', isWon: false, isLost: false },
  { name: 'Discovery / Demo', order: 2, probability: 30, colorToken: 'purple', isWon: false, isLost: false },
  { name: 'Proposal Sent', order: 3, probability: 60, colorToken: 'amber', isWon: false, isLost: false },
  { name: 'Negotiation', order: 4, probability: 80, colorToken: 'indigo', isWon: false, isLost: false },
  { name: 'Closed Won', order: 5, probability: 100, colorToken: 'emerald', isWon: true, isLost: false },
  { name: 'Closed Lost', order: 6, probability: 0, colorToken: 'rose', isWon: false, isLost: true },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let pipelines = await prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { deals: true },
            },
          },
        },
        _count: {
          select: { deals: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed default pipeline if none exists yet
    if (pipelines.length === 0) {
      const defaultPipeline = await prisma.pipeline.create({
        data: {
          name: 'Direct Enterprise Sales',
          code: 'STANDARD',
          isDefault: true,
          isActive: true,
          stages: {
            create: DEFAULT_STAGES,
          },
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              _count: { select: { deals: true } },
            },
          },
          _count: {
            select: { deals: true },
          },
        },
      });
      pipelines = [defaultPipeline];
    }

    return NextResponse.json({ success: true, pipelines });
  } catch (error: any) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch pipelines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, code, isDefault, stages } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Pipeline Name and unique Code are required' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

    // Check code collision
    const existing = await prisma.pipeline.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json({ error: `Pipeline with code "${cleanCode}" already exists.` }, { status: 409 });
    }

    // If marked default, unset previous default
    if (isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const stageDefinitions = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGES;

    const pipeline = await prisma.pipeline.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        isDefault: Boolean(isDefault),
        isActive: true,
        stages: {
          create: stageDefinitions.map((s: any, idx: number) => ({
            name: s.name || `Stage ${idx + 1}`,
            order: s.order ?? idx + 1,
            probability: typeof s.probability === 'number' ? s.probability : 20,
            colorToken: s.colorToken || 'blue',
            requiredFields: Array.isArray(s.requiredFields) ? s.requiredFields : [],
            isWon: Boolean(s.isWon),
            isLost: Boolean(s.isLost),
          })),
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { deals: true } } },
        },
        _count: { select: { deals: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'CREATE_PIPELINE',
      entityType: 'SYSTEM',
      entityId: pipeline.id,
      newData: { name: pipeline.name, code: pipeline.code, stagesCount: pipeline.stages.length },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, pipeline });
  } catch (error: any) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json({ error: error.message || 'Failed to create pipeline' }, { status: 500 });
  }
}
