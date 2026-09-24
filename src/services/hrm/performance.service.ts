import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateGoalNumber } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export async function ensureDefaultPerformanceCycle() {
  const currentYear = new Date().getFullYear();
  let cycle = await prisma.performanceCycle.findFirst({
    where: { status: { in: ['IN_PROGRESS', 'GOAL_SETTING'] } },
  });

  if (!cycle) {
    cycle = await prisma.performanceCycle.create({
      data: {
        cycleCode: `PERF-${currentYear}`,
        title: `FY ${currentYear} - Annual Performance & Objectives Cycle`,
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        reviewDeadline: new Date(currentYear, 11, 31),
        status: 'IN_PROGRESS',
      },
    });
  }

  return cycle;
}

export async function getPerformanceCycles() {
  await ensureDefaultPerformanceCycle();
  return prisma.performanceCycle.findMany({
    include: {
      _count: { select: { reviews: true, goals: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function createPerformanceCycle(
  input: {
    title: string;
    startDate: string;
    endDate: string;
  },
  user: { id: string; fullName: string }
) {
  const currentYear = new Date(input.startDate).getFullYear();
  const count = await prisma.performanceCycle.count();

  const cycle = await prisma.performanceCycle.create({
    data: {
      cycleCode: `PERF-${currentYear}-${count + 1}`,
      title: input.title,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      reviewDeadline: new Date(input.endDate),
      status: 'IN_PROGRESS',
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: cycle.id,
    reason: `Created performance cycle: ${input.title}`,
  });

  return cycle;
}

export async function createGoal(
  input: {
    employeeId: string;
    title: string;
    description?: string | null;
    category?: string;
    targetValue?: number;
    currentValue?: number;
    keyResults?: Array<{
      title: string;
      metric?: string;
      targetValue: number;
    }>;
  },
  user: { id: string; fullName: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const goalNumber = await generateGoalNumber();
  const defaultCycle = await ensureDefaultPerformanceCycle();

  const goal = await prisma.goal.create({
    data: {
      goalNumber,
      cycleId: defaultCycle.id,
      employeeId: resolvedEmpId,
      title: input.title,
      description: input.description,
      category: input.category || 'INDIVIDUAL',
      weightage: 25,
      progress: input.currentValue ? Math.min(100, Math.round((input.currentValue / (input.targetValue || 100)) * 100)) : 0,
      status: 'IN_PROGRESS',
      keyResults: input.keyResults && input.keyResults.length > 0 ? {
        create: input.keyResults.map((kr) => ({
          title: kr.title,
          targetValue: kr.targetValue,
          currentValue: 0,
          unit: 'PERCENT',
        })),
      } : undefined,
    },
    include: {
      keyResults: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: goal.id,
    reason: `Created Goal ${goalNumber}: ${input.title}`,
  });

  return goal;
}

export async function getEmployeeGoals(filters?: { employeeId?: string; status?: string }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status) where.status = filters.status;

  return prisma.goal.findMany({
    where,
    include: {
      keyResults: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateGoalProgress(
  goalId: string,
  progress: number,
  user: { id: string; fullName: string }
) {
  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: Math.min(100, Math.max(0, progress)),
      status: progress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
    },
    include: {
      keyResults: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
  });

  return updated;
}

export async function submitPerformanceReview(
  input: {
    cycleId: string;
    employeeId: string;
    selfRating?: number | null;
    selfComments?: string | null;
    managerRating?: number | null;
    managerComments?: string | null;
  },
  user: { id: string; fullName: string; role: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;

  let existing = await prisma.performanceReview.findFirst({
    where: {
      cycleId: input.cycleId,
      employeeId: resolvedEmpId,
    },
  });

  if (!existing) {
    existing = await prisma.performanceReview.create({
      data: {
        cycleId: input.cycleId,
        employeeId: resolvedEmpId,
        reviewerId: user.id,
        selfRating: input.selfRating,
        selfComments: input.selfComments,
        managerRating: input.managerRating,
        managerComments: input.managerComments,
        status: input.managerRating ? 'COMPLETED' : 'PENDING_MANAGER',
      },
    });
  } else {
    const updateData: any = {};
    if (input.selfRating !== undefined) {
      updateData.selfRating = input.selfRating;
      updateData.selfComments = input.selfComments;
      updateData.selfSubmittedAt = new Date();
      if (existing.status === 'PENDING_SELF') {
        updateData.status = 'PENDING_MANAGER';
      }
    }
    if (input.managerRating !== undefined) {
      updateData.managerRating = input.managerRating;
      updateData.managerComments = input.managerComments;
      updateData.managerSubmittedAt = new Date();
      updateData.reviewerId = user.id;
      updateData.finalRating = input.managerRating;
      updateData.status = 'COMPLETED';
    }

    existing = await prisma.performanceReview.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  return existing;
}

export async function getPerformanceReviews(cycleId?: string) {
  const where: any = {};
  if (cycleId) where.cycleId = cycleId;

  return prisma.performanceReview.findMany({
    where,
    include: {
      cycle: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
