import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateActivityNumber } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export interface CreateActivityInput {
  type: 'TASK' | 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'FOLLOW_UP';
  subject: string;
  description?: string;
  durationMinutes?: number;
  scheduledAt?: string;
  completedAt?: string;
  status?: string;
  leadId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  performedById?: string | null;
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
}

export async function createActivity(input: CreateActivityInput) {
  const activityNumber = await generateActivityNumber();
  const resolvedPerformerId = input.performedById
    ? await resolveEmployeeObjectId(input.performedById)
    : null;

  const activity = await prisma.activity.create({
    data: {
      activityNumber,
      type: input.type,
      subject: input.subject.trim(),
      description: input.description?.trim() || null,
      durationMinutes: input.durationMinutes || 0,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
      completedAt: input.completedAt ? new Date(input.completedAt) : input.status === 'COMPLETED' ? new Date() : null,
      status: input.status || 'COMPLETED',
      leadId: input.leadId || null,
      accountId: input.accountId || null,
      contactId: input.contactId || null,
      dealId: input.dealId || null,
      performedById: resolvedPerformerId,
    },
    include: {
      performedBy: { select: { id: true, employeeId: true, fullName: true, designation: true } },
    },
  });

  await logAuditEvent({
    actorUserId: input.actorUserId || null,
    actorEmployeeId: input.actorEmployeeId || 'SYSTEM',
    action: 'CREATE_ACTIVITY',
    entityType: 'ACTIVITY',
    entityId: activity.activityNumber,
    newData: { type: activity.type, subject: activity.subject },
    status: 'SUCCESS',
  });

  return activity;
}

export async function getCalendarActivities(params: {
  start?: string;
  end?: string;
  ownerId?: string;
}) {
  const startDate = params.start ? new Date(params.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = params.end ? new Date(params.end) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const activities = await prisma.activity.findMany({
    where: {
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(params.ownerId ? { performedById: params.ownerId } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      performedBy: { select: { fullName: true, employeeId: true } },
      lead: { select: { leadNumber: true, companyName: true, contactPerson: true } },
      contact: { select: { contactNumber: true, fullName: true, phone: true } },
      deal: { select: { dealNumber: true, title: true } },
    },
  });

  // Also include scheduled tasks with due dates
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
      ...(params.ownerId ? { assignedToId: params.ownerId } : {}),
    },
    orderBy: { dueDate: 'asc' },
    include: {
      assignedTo: { select: { fullName: true, employeeId: true } },
      deal: { select: { dealNumber: true, title: true } },
    },
  });

  return {
    activities,
    tasks,
  };
}
