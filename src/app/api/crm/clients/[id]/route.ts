import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const client = await prisma.client.findFirst({
      where: getClientLookup(id),
      include: {
        createdBy: { select: { employeeId: true, fullName: true, designation: true } },
        assignedEmployee: { select: { employeeId: true, fullName: true, designation: true } },
        activities: {
          include: {
            actorEmployee: { select: { employeeId: true, fullName: true } },
          },
          orderBy: { timestamp: 'desc' },
        },
        notes: {
          include: {
            author: { select: { employeeId: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignedTo: { select: { employeeId: true, fullName: true } },
            createdBy: { select: { employeeId: true, fullName: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        assignments: {
          include: {
            toEmployee: { select: { employeeId: true, fullName: true } },
            assignedBy: { select: { employeeId: true, fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        pipelineHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        tags: typeof client.tags === 'string' ? JSON.parse(client.tags || '[]') : client.tags,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const data = await req.json();

    const existing = await prisma.client.findFirst({
      where: getClientLookup(id),
    });
    if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        email: data.email !== undefined ? data.email : existing.email,
        company: data.company !== undefined ? data.company : existing.company,
        location: data.location !== undefined ? data.location : existing.location,
        requirement: data.requirement !== undefined ? data.requirement : existing.requirement,
        estimatedValue: data.estimatedValue !== undefined ? parseFloat(data.estimatedValue) : existing.estimatedValue,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        source: data.source !== undefined ? data.source : existing.source,
        tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
      },
      include: {
        assignedEmployee: { select: { employeeId: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'UPDATE_CLIENT_INFO',
      entityType: 'CLIENT',
      entityId: existing.clientId,
      previousData: existing,
      newData: updated,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      client: {
        ...updated,
        tags: typeof updated.tags === 'string' ? JSON.parse(updated.tags || '[]') : updated.tags,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
