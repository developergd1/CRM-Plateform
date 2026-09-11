import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, fullName: true, employeeId: true, phone: true } },
        createdBy: { select: { id: true, fullName: true, employeeId: true } },
        reviewedBy: { select: { id: true, fullName: true, employeeId: true } },
        client: { select: { id: true, companyName: true, clientId: true } },
        lead: { select: { id: true, companyName: true, contactPerson: true } },
        deal: { select: { id: true, title: true, dealNumber: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, fullName: true } }
          }
        },
        history: {
          orderBy: { timestamp: 'desc' },
          include: {
            actor: { select: { id: true, fullName: true } }
          }
        }
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const enrichedComments = task.comments?.map((c: any) => {
      const metaStr = c.attachments?.find((a: string) => a.startsWith('__meta__:'));
      let meta: any = null;
      if (metaStr) {
        try {
          meta = JSON.parse(metaStr.replace('__meta__:', ''));
        } catch {}
      }
      return {
        ...c,
        authorName: meta?.authorName || c.author?.fullName || 'User',
        authorRole: meta?.authorRole || (c.author?.employeeId === 'GI-EMP-000001' ? 'ADMIN' : 'EMPLOYEE'),
        isClientAuthor: Boolean(meta?.isClient || meta?.authorRole === 'CLIENT'),
        clientCompany: meta?.companyName,
      };
    });

    return NextResponse.json({
      ...task,
      comments: enrichedComments,
    });
  } catch (error: any) {
    console.error('Error fetching task details:', error);
    return NextResponse.json({ error: 'Failed to fetch task details' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check
    const isInternalAdmin = isAdminOrHR(user.role) || isManagerOrAbove(user.role);
    const isOwnerClient = user.role === 'CLIENT' && (task.clientId === user.clientId || task.client?.clientId === user.clientId || task.client?.userId === user.id);
    const isAssignee = user.employeeProfile?.id === task.assignedToId;

    if (!isInternalAdmin && !isOwnerClient && !isAssignee) {
      return NextResponse.json({ error: 'Permission denied to modify this task.' }, { status: 403 });
    }

    const body = await req.json();
    
    // Disallow status updates through normal PATCH, must use workflow API
    if (body.status) {
       delete body.status;
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: body,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'USER',
      action: 'UPDATE_TASK',
      entityType: 'TASK',
      entityId: task.id,
      newData: JSON.stringify(body),
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { client: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isInternalAdmin = isAdminOrHR(user.role) || isManagerOrAbove(user.role);
    const isOwnerClient = user.role === 'CLIENT' && (task.clientId === user.clientId || task.client?.clientId === user.clientId || task.client?.userId === user.id);

    if (!isInternalAdmin && !isOwnerClient) {
      return NextResponse.json({ error: 'Permission denied to delete this task.' }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id: params.id },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'USER',
      action: 'DELETE_TASK',
      entityType: 'TASK',
      entityId: task.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
