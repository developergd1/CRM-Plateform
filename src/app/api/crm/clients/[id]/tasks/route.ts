import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { id } = params;
    const data = await req.json();
    const {
      title,
      description,
      taskType = 'FOLLOW_UP',
      priority = 'MEDIUM',
      dueDate,
      assignedToEmployeeId,
    } = data;

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Task Title and Due Date are required' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ id }, { clientId: id }] },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    let targetAssigneeId = currentEmp.id;
    if (assignedToEmployeeId) {
      const targetEmp = await prisma.employee.findFirst({
        where: { OR: [{ id: assignedToEmployeeId }, { employeeId: assignedToEmployeeId }] },
      });
      if (targetEmp) targetAssigneeId = targetEmp.id;
    }

    const taskCount = await prisma.clientTask.count();
    const currentYear = new Date().getFullYear();
    const taskId = `TSK-${currentYear}-${(taskCount + 1).toString().padStart(4, '0')}`;

    const task = await prisma.clientTask.create({
      data: {
        taskId,
        clientId: client.id,
        assignedToId: targetAssigneeId,
        createdById: currentEmp.id,
        taskType,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority,
        dueDate: new Date(dueDate),
        status: 'PENDING',
      },
      include: {
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    // Update nextFollowUpDate on client if task is a follow-up
    if (taskType === 'FOLLOW_UP' || taskType === 'CALL_REMINDER') {
      await prisma.client.update({
        where: { id: client.id },
        data: { nextFollowUpDate: new Date(dueDate) },
      });
    }

    // Record on activity timeline
    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType: 'FOLLOW_UP_SCHEDULED',
        title: `Follow-up Scheduled: ${title}`,
        description: `Due on ${new Date(dueDate).toLocaleDateString()} | Assigned to ${task.assignedTo.fullName}`,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
