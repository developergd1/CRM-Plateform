import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';
import {
  notifyTaskAccepted,
  notifyTaskStarted,
  notifyTaskSubmitted,
  notifyTaskReviewed,
  notifyReassignment,
} from '@/lib/notifications';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body; 
    // action: 'ACCEPT', 'START', 'SUBMIT', 'REVIEW', 'REASSIGN'

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        client: true,
      },
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const isInternalAdmin = isAdminOrHR(user.role) || isManagerOrAbove(user.role);
    const isOwnerClient = user.role === 'CLIENT' && (task.clientId === user.clientId || task.client?.clientId === user.clientId || task.client?.userId === user.id);
    const isAssignee = user.employeeProfile?.id === task.assignedToId || user.employeeId === task.assignedTo?.employeeId;

    let updateData: any = {};
    let newStatus = task.status;
    let remarks = '';

    // Determine actor employee ID for TaskHistory
    const actorEmployeeId = user.employeeProfile?.id || task.assignedToId;
    const assigneeName = task.assignedTo?.fullName || user.fullName || 'Assignee';

    switch (action) {
      case 'ACCEPT':
        if (!isAssignee && !isInternalAdmin) {
          return NextResponse.json({ error: 'Only the assigned employee can accept this task.' }, { status: 403 });
        }
        newStatus = 'ACCEPTED';
        remarks = `Task accepted by assignee ${assigneeName}`;
        break;

      case 'START':
        if (!isAssignee && !isInternalAdmin) {
          return NextResponse.json({ error: 'Only the assigned employee can start this task.' }, { status: 403 });
        }
        newStatus = 'IN_PROGRESS';
        remarks = `Work started on task by ${assigneeName}`;
        break;

      case 'SUBMIT':
        if (!isAssignee && !isInternalAdmin) {
          return NextResponse.json({ error: 'Only the assigned employee can submit deliverables.' }, { status: 403 });
        }
        newStatus = 'WAITING_FOR_REVIEW';
        updateData = {
          submissionSummary: payload?.summary || '',
          submissionNotes: payload?.notes || '',
          submissionLinks: payload?.links || [],
          submissionFiles: payload?.files || [],
          submittedAt: new Date(),
        };
        remarks = `Work submitted for review by ${assigneeName}`;
        break;

      case 'REVIEW':
        if (!isInternalAdmin && !isOwnerClient) {
          return NextResponse.json({ error: 'Only the task author or client can review deliverables.' }, { status: 403 });
        }
        const { isApproved, feedback } = payload || {};
        newStatus = isApproved ? 'COMPLETED' : 'CHANGES_REQUESTED';
        updateData = {
          feedbackNotes: feedback || '',
          reviewedAt: new Date(),
          reviewedById: user.employeeProfile?.id || null,
          completedAt: isApproved ? new Date() : null,
        };
        remarks = isApproved 
          ? `Task deliverables approved and marked COMPLETED by ${user.fullName}` 
          : `Changes requested on task by ${user.fullName}`;
        break;

      case 'REASSIGN':
        if (!isInternalAdmin && !isOwnerClient) {
          return NextResponse.json({ error: 'Only the creator, admin, or client can reassign tasks.' }, { status: 403 });
        }
        newStatus = 'TODO';
        updateData = {
          assignedToId: payload?.assignedToId,
        };
        remarks = `Task reassigned to new employee by ${user.fullName}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    updateData.status = newStatus;

    // Transaction to update task and add history
    const [updatedTask] = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { id: params.id },
        data: updateData,
        include: {
           assignedTo: { select: { fullName: true, employeeId: true } }
        }
      });

      if (actorEmployeeId) {
        await tx.taskHistory.create({
          data: {
            taskId: task.id,
            actorId: actorEmployeeId,
            action: action,
            previousValue: task.status,
            newValue: newStatus,
            remarks: remarks,
          }
        });
      }

      return [t];
    });

    // Fire notifications asynchronously across relevant profiles
    if (action === 'ACCEPT') {
      await notifyTaskAccepted({
        taskId: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        employeeName: assigneeName,
        clientId: task.clientId,
        createdById: task.createdById,
      });
    } else if (action === 'START') {
      await notifyTaskStarted({
        taskId: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        employeeName: assigneeName,
        clientId: task.clientId,
        createdById: task.createdById,
      });
    } else if (action === 'SUBMIT') {
      await notifyTaskSubmitted({
        taskId: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        employeeName: assigneeName,
        clientId: task.clientId,
        createdById: task.createdById,
      });
    } else if (action === 'REVIEW') {
      const { isApproved } = payload || {};
      await notifyTaskReviewed({
        taskId: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        isApproved: !!isApproved,
        reviewerName: user.companyName || user.fullName || 'Supervisor',
        assignedToId: task.assignedToId || '',
      });
    } else if (action === 'REASSIGN') {
      await notifyReassignment({
        toEmployeeId: payload?.assignedToId,
        fromEmployeeId: task.assignedToId || undefined,
        assignerName: user.companyName || user.fullName || 'Manager',
        itemType: 'Task',
        itemTitle: task.title,
        itemId: task.id,
      });
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'USER',
      action: `TASK_WORKFLOW_${action}`,
      entityType: 'TASK',
      entityId: task.id,
      previousData: JSON.stringify({ status: task.status }),
      newData: JSON.stringify({ status: newStatus }),
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('Error processing task workflow:', error);
    return NextResponse.json({ error: error.message || 'Failed to process workflow' }, { status: 500 });
  }
}
