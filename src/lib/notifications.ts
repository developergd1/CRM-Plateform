import { prisma, isValidObjectId } from './prisma';

export interface SendNotificationParams {
  recipientId: string; // Employee/Client/User ObjectId or String ID or 'ADMIN'
  title: string;
  message: string;
  category: 'CRM' | 'WORKFORCE' | 'SECURITY' | 'ATTENDANCE' | 'SYSTEM';
  entityType?: 'LEAD' | 'OPPORTUNITY' | 'DEAL' | 'TASK' | 'CLIENT' | 'EMPLOYEE' | 'FOLLOW_UP' | 'LEAVE' | 'REGULARIZATION' | 'AUTH';
  entityId?: string | null;
  actionUrl?: string | null;
}

/**
 * Creates in-app notifications for employees / clients / administrators.
 */
export async function sendNotification(params: SendNotificationParams) {
  try {
    if (!params.recipientId) return null;

    let targetObjectId = params.recipientId;

    if (!isValidObjectId(targetObjectId)) {
      if (targetObjectId === 'ADMIN' || targetObjectId === 'ALL_ADMINS') {
        const adminEmp = await prisma.employee.findFirst({
          where: { employeeId: 'GI-EMP-000001' },
          select: { id: true },
        });
        targetObjectId = adminEmp?.id || '';
      } else {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeId: targetObjectId },
              ...(isValidObjectId(targetObjectId) ? [{ userId: targetObjectId }] : []),
            ],
          },
          select: { id: true },
        });
        targetObjectId = emp?.id || '';
      }
    }

    if (!targetObjectId || !isValidObjectId(targetObjectId)) {
      return null;
    }

    // Ensure recipient exists in Employee collection to satisfy MongoDB foreign key relation
    const empExists = await prisma.employee.findUnique({
      where: { id: targetObjectId },
      select: { id: true },
    });

    if (!empExists) {
      const client = await prisma.client.findFirst({
        where: { id: targetObjectId },
        include: { employees: { select: { id: true }, take: 1 } },
      });
      if (client?.employees?.[0]?.id) {
        targetObjectId = client.employees[0].id;
      } else {
        const adminEmp = await prisma.employee.findFirst({
          where: { employeeId: 'GI-EMP-000001' },
          select: { id: true },
        });
        targetObjectId = adminEmp?.id || '';
      }
    }

    if (!targetObjectId || !isValidObjectId(targetObjectId)) {
      return null;
    }

    return await prisma.notification.create({
      data: {
        recipientId: targetObjectId,
        title: params.title,
        message: params.message,
        category: params.category,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        actionUrl: params.actionUrl || null,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Send notification to multiple recipient IDs (e.g. Employee + Client + Admin)
 */
export async function sendMultiNotifications(
  recipients: (string | null | undefined)[],
  params: Omit<SendNotificationParams, 'recipientId'>
) {
  const validRecipients = Array.from(new Set(recipients.filter((r): r is string => Boolean(r && r.trim()))));
  if (validRecipients.length === 0) return [];

  const promises = validRecipients.map((recipientId) =>
    sendNotification({
      ...params,
      recipientId,
    })
  );
  return Promise.all(promises);
}

/**
 * Notify when a task is assigned to an employee.
 */
export async function notifyTaskAssigned(params: {
  taskId: string;
  taskNumber: string;
  title: string;
  assignedToId: string;
  assignerName: string;
  clientId?: string | null;
}) {
  // 1. Notify Assignee Employee
  await sendNotification({
    recipientId: params.assignedToId,
    title: 'New Task Assigned',
    message: `${params.assignerName} assigned you task: ${params.taskNumber} - ${params.title}`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: `/employee/attendance?tab=tasks&taskId=${params.taskId}`,
  });

  // 2. If assigned by Admin and client exists, also notify Client
  if (params.clientId) {
    await sendNotification({
      recipientId: params.clientId,
      title: 'Task Assigned to Onboarded Staff',
      message: `${params.assignerName} assigned task ${params.taskNumber} ("${params.title}") to your team member.`,
      category: 'WORKFORCE',
      entityType: 'TASK',
      entityId: params.taskId,
      actionUrl: `/client?tab=tasks&taskId=${params.taskId}`,
    });
  }
}

/**
 * Notify when employee accepts task.
 */
export async function notifyTaskAccepted(params: {
  taskId: string;
  taskNumber: string;
  title: string;
  employeeName: string;
  clientId?: string | null;
  createdById?: string | null;
}) {
  const recipients = [params.clientId, params.createdById, 'ADMIN'].filter(Boolean);
  await sendMultiNotifications(recipients, {
    title: 'Task Accepted by Assignee',
    message: `${params.employeeName} accepted task: ${params.taskNumber} ("${params.title}").`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: params.clientId ? `/client?tab=tasks&taskId=${params.taskId}` : `/tasks?taskId=${params.taskId}`,
  });
}

/**
 * Notify when employee starts working on task.
 */
export async function notifyTaskStarted(params: {
  taskId: string;
  taskNumber: string;
  title: string;
  employeeName: string;
  clientId?: string | null;
  createdById?: string | null;
}) {
  const recipients = [params.clientId, params.createdById, 'ADMIN'].filter(Boolean);
  await sendMultiNotifications(recipients, {
    title: 'Task Work In Progress',
    message: `${params.employeeName} started work on task: ${params.taskNumber} ("${params.title}").`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: params.clientId ? `/client?tab=tasks&taskId=${params.taskId}` : `/tasks?taskId=${params.taskId}`,
  });
}

/**
 * Notify when employee submits deliverables.
 */
export async function notifyTaskSubmitted(params: {
  taskId: string;
  taskNumber: string;
  title: string;
  employeeName: string;
  clientId?: string | null;
  createdById?: string | null;
}) {
  const recipients = [params.clientId, params.createdById, 'ADMIN'].filter(Boolean);
  await sendMultiNotifications(recipients, {
    title: 'Deliverables Submitted for Review',
    message: `${params.employeeName} submitted deliverables for task: ${params.taskNumber} ("${params.title}"). Please review.`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: params.clientId ? `/client?tab=tasks&taskId=${params.taskId}` : `/tasks?taskId=${params.taskId}`,
  });
}

/**
 * Notify employee when deliverables are approved or changes requested.
 */
export async function notifyTaskReviewed(params: {
  taskId: string;
  taskNumber: string;
  title: string;
  isApproved: boolean;
  reviewerName: string;
  assignedToId: string;
}) {
  await sendNotification({
    recipientId: params.assignedToId,
    title: params.isApproved ? '🎉 Task Approved & Completed' : '⚠️ Changes Requested on Task',
    message: params.isApproved
      ? `${params.reviewerName} approved your deliverables for task: ${params.taskNumber}!`
      : `${params.reviewerName} requested revisions on task: ${params.taskNumber}. Please review feedback.`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: `/employee/attendance?tab=tasks&taskId=${params.taskId}`,
  });
}

/**
 * Notify on task comments.
 */
export async function notifyTaskComment(params: {
  taskId: string;
  taskNumber: string;
  commentContent: string;
  authorName: string;
  authorRole: string;
  assignedToId?: string | null;
  clientId?: string | null;
  createdById?: string | null;
  currentUserId?: string | null;
}) {
  // If employee commented, notify Client and Admin/Creator
  // If Client commented, notify Employee and Admin/Creator
  // If Admin commented, notify Employee and Client
  let recipients: string[] = [];

  if (params.authorRole === 'EMPLOYEE') {
    recipients = [params.clientId || '', params.createdById || '', 'ADMIN'];
  } else if (params.authorRole === 'CLIENT') {
    recipients = [params.assignedToId || '', params.createdById || '', 'ADMIN'];
  } else {
    // Admin / Manager
    recipients = [params.assignedToId || '', params.clientId || ''];
  }

  const cleanSnippet = params.commentContent.length > 60
    ? `${params.commentContent.substring(0, 57)}...`
    : params.commentContent;

  await sendMultiNotifications(recipients, {
    title: `New Comment on ${params.taskNumber}`,
    message: `${params.authorName}: "${cleanSnippet}"`,
    category: 'WORKFORCE',
    entityType: 'TASK',
    entityId: params.taskId,
    actionUrl: params.authorRole === 'EMPLOYEE'
      ? `/client?tab=tasks&taskId=${params.taskId}`
      : `/employee/attendance?tab=tasks&taskId=${params.taskId}`,
  });
}

/**
 * Helper to notify assigned employee when a Lead / Task / Deal / Follow-up is assigned to them.
 */
export async function notifyAssignment(params: {
  employeeId: string; // Employee doc ObjectId
  assignerName: string;
  itemType: 'Lead' | 'Deal' | 'Opportunity' | 'Task' | 'Follow-up';
  itemTitle: string;
  itemId: string;
}) {
  return sendNotification({
    recipientId: params.employeeId,
    title: `New ${params.itemType} Assigned`,
    message: `${params.assignerName} assigned you ${params.itemType}: "${params.itemTitle}"`,
    category: 'CRM',
    entityType: params.itemType === 'Follow-up' ? 'FOLLOW_UP' : (params.itemType.toUpperCase() as any),
    entityId: params.itemId,
    actionUrl: `/tasks?taskId=${params.itemId}`,
  });
}

export async function notifyReassignment(params: {
  toEmployeeId: string;
  fromEmployeeId?: string;
  assignerName: string;
  itemType: 'Lead' | 'Deal' | 'Opportunity' | 'Task' | 'Follow-up';
  itemTitle: string;
  itemId: string;
  reason?: string | null;
}) {
  return sendNotification({
    recipientId: params.toEmployeeId,
    title: `${params.itemType} Reassigned to You`,
    message: `${params.assignerName} reassigned ${params.itemType} "${params.itemTitle}" to you.${params.reason ? ` Reason: ${params.reason}` : ''}`,
    category: 'CRM',
    entityType: params.itemType === 'Follow-up' ? 'FOLLOW_UP' : (params.itemType.toUpperCase() as any),
    entityId: params.itemId,
    actionUrl: `/employee/attendance?tab=tasks&taskId=${params.itemId}`,
  });
}

export async function notifyStatusChange(params: {
  employeeId: string;
  changerName: string;
  itemType: 'Lead' | 'Deal' | 'Opportunity' | 'Task' | 'Follow-up';
  itemTitle: string;
  itemId: string;
  oldStatus: string;
  newStatus: string;
}) {
  return sendNotification({
    recipientId: params.employeeId,
    title: `${params.itemType} Status Changed`,
    message: `${params.changerName} updated "${params.itemTitle}" status from ${params.oldStatus} to ${params.newStatus}`,
    category: 'CRM',
    entityType: params.itemType === 'Follow-up' ? 'FOLLOW_UP' : (params.itemType.toUpperCase() as any),
    entityId: params.itemId,
  });
}

export async function notifyFollowUpDue(params: {
  employeeId: string;
  leadTitle: string;
  followUpId: string;
  dueDate: string;
  isOverdue?: boolean;
}) {
  return sendNotification({
    recipientId: params.employeeId,
    title: params.isOverdue ? `⚠️ Overdue Follow-up: ${params.leadTitle}` : `⏰ Follow-up Due: ${params.leadTitle}`,
    message: `Follow-up scheduled for ${params.dueDate} is ${params.isOverdue ? 'overdue' : 'due today'}.`,
    category: 'CRM',
    entityType: 'TASK',
    entityId: params.followUpId,
  });
}

/**
 * Leave application notifications
 */
export async function notifyLeaveApplied(params: {
  leaveId: string;
  employeeName: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  clientId?: string | null;
}) {
  const recipients = [params.clientId, 'ADMIN'].filter(Boolean);
  await sendMultiNotifications(recipients, {
    title: 'New Leave Application',
    message: `${params.employeeName} applied for ${params.leaveType} leave from ${params.startDate} to ${params.endDate}.`,
    category: 'WORKFORCE',
    entityType: 'LEAVE',
    entityId: params.leaveId,
    actionUrl: params.clientId ? `/client?tab=attendance` : `/workforce/leave`,
  });
}

export async function notifyLeaveReviewed(params: {
  leaveId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerName: string;
  employeeId: string;
}) {
  await sendNotification({
    recipientId: params.employeeId,
    title: params.status === 'APPROVED' ? '✅ Leave Request Approved' : '❌ Leave Request Rejected',
    message: `Your leave request has been ${params.status.toLowerCase()} by ${params.reviewerName}.`,
    category: 'WORKFORCE',
    entityType: 'LEAVE',
    entityId: params.leaveId,
    actionUrl: `/employee/attendance?tab=leave`,
  });
}

/**
 * Regularization notifications
 */
export async function notifyRegularizationRequested(params: {
  reqId: string;
  employeeName: string;
  employeeId: string;
  date: string;
  clientId?: string | null;
}) {
  const recipients = [params.clientId, 'ADMIN'].filter(Boolean);
  await sendMultiNotifications(recipients, {
    title: 'Attendance Regularization Request',
    message: `${params.employeeName} submitted an attendance regularization request for ${params.date}.`,
    category: 'ATTENDANCE',
    entityType: 'REGULARIZATION',
    entityId: params.reqId,
    actionUrl: params.clientId ? `/client?tab=attendance` : `/workforce/attendance`,
  });
}

export async function notifyRegularizationReviewed(params: {
  reqId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerName: string;
  employeeId: string;
  date: string;
}) {
  await sendNotification({
    recipientId: params.employeeId,
    title: params.status === 'APPROVED' ? '✅ Regularization Approved' : '❌ Regularization Rejected',
    message: `Your attendance regularization for ${params.date} was ${params.status.toLowerCase()} by ${params.reviewerName}.`,
    category: 'ATTENDANCE',
    entityType: 'REGULARIZATION',
    entityId: params.reqId,
    actionUrl: `/employee/attendance?tab=work-regularization`,
  });
}

/**
 * Password reset resolved notification
 */
export async function notifyPasswordResetResolved(params: {
  requestId: string;
  requesterName: string;
  requesterId: string;
  resolvedBy: string;
}) {
  await sendNotification({
    recipientId: params.requesterId,
    title: '🔑 Password Reset Request Resolved',
    message: `Your temporary password has been generated by ${params.resolvedBy}. Please login with your new credentials.`,
    category: 'SECURITY',
    entityType: 'AUTH',
    entityId: params.requestId,
    actionUrl: `/login`,
  });
}

