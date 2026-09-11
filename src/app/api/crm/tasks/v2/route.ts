import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause } from '@/lib/tenant';
import { generateCrmTaskNumber } from '@/lib/id-generator';
import { notifyAssignment } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const priority = searchParams.get('priority')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    const where: any = {
      ...tenantWhere,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { taskNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, clientId: true, companyName: true },
        },
        lead: {
          select: { id: true, leadNumber: true, fullName: true },
        },
        contact: {
          select: { id: true, contactNumber: true, fullName: true },
        },
        opportunity: {
          select: { id: true, opportunityNumber: true, title: true },
        },
        deal: {
          select: { id: true, dealNumber: true, title: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
        createdBy: {
          select: { id: true, employeeId: true, fullName: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({ success: true, data: tasks, count: tasks.length });
  } catch (error: any) {
    console.error('Error fetching CRM tasks:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      priority = 'MEDIUM',
      status = 'PENDING',
      dueDate,
      clientId,
      leadId,
      contactId,
      opportunityId,
      dealId,
      assignedToId,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    const taskNumber = await generateCrmTaskNumber();
    const resolvedClientId = clientId ? await resolveClientObjectId(clientId) : null;

    let creatorEmployeeId: string | null = null;
    if (user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { employeeId: user.employeeId },
        select: { id: true },
      });
      creatorEmployeeId = emp?.id || null;
    }

    const newTask = await prisma.task.create({
      data: {
        taskNumber,
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        clientId: resolvedClientId,
        leadId: leadId || null,
        contactId: contactId || null,
        opportunityId: opportunityId || null,
        dealId: dealId || null,
        assignedToId: assignedToId || null,
        createdById: creatorEmployeeId,
      },
      include: {
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: newTask.taskNumber,
      newData: newTask,
      status: 'SUCCESS',
    });

    if (newTask.assignedToId) {
      await notifyAssignment({
        employeeId: newTask.assignedToId,
        assignerName: user.fullName,
        itemType: 'Task',
        itemTitle: newTask.title,
        itemId: newTask.id,
      });
    }

    return NextResponse.json({ success: true, data: newTask }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating CRM task:', error);
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
