import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { id } = params;
    const { status, completionNotes } = await req.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const task = await prisma.clientTask.findFirst({
      where: { OR: [{ id }, { taskId: id }] },
      include: { client: true },
    });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const updatedTask = await prisma.clientTask.update({
      where: { id: task.id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        completionNotes: completionNotes || task.completionNotes,
      },
    });

    // Record on activity timeline if completed
    if (status === 'COMPLETED') {
      const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await prisma.clientActivity.create({
        data: {
          activityId,
          clientId: task.clientId,
          actorEmployeeId: currentEmp.id,
          activityType: 'TASK_COMPLETED',
          title: `Task Completed: ${task.title}`,
          description: completionNotes || `Marked completed by ${user.fullName}`,
        },
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
