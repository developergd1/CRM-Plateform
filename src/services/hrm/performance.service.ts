import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateGoalNumber, generatePayrollPeriodCode } from '@/lib/id-generator';
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
    weightage?: number;
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
      weightage: input.weightage || 25,
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

export async function getEmployeeGoals(filters?: { employeeId?: string; status?: string; clientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters?.clientId) {
    where.employee = { clientId: filters.clientId };
  }

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
          departmentName: true,
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
    cycleId?: string;
    employeeId: string;
    selfRating?: number | null;
    selfComments?: string | null;
    managerRating?: number | null;
    managerComments?: string | null;
  },
  user: { id: string; fullName: string; role: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const cycle = input.cycleId ? { id: input.cycleId } : await ensureDefaultPerformanceCycle();

  let existing = await prisma.performanceReview.findFirst({
    where: {
      cycleId: cycle.id,
      employeeId: resolvedEmpId,
    },
  });

  if (!existing) {
    existing = await prisma.performanceReview.create({
      data: {
        cycleId: cycle.id,
        employeeId: resolvedEmpId,
        reviewerId: user.id,
        selfRating: input.selfRating,
        selfComments: input.selfComments,
        selfSubmittedAt: input.selfRating !== undefined ? new Date() : null,
        managerRating: input.managerRating,
        managerComments: input.managerComments,
        managerSubmittedAt: input.managerRating !== undefined ? new Date() : null,
        finalRating: input.managerRating ?? null,
        status: input.managerRating ? 'COMPLETED' : (input.selfRating ? 'PENDING_MANAGER' : 'PENDING_SELF'),
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

  await logAuditEvent({
    actorUserId: user.id,
    action: 'UPDATE',
    entityType: 'PERFORMANCE',
    entityId: existing.id,
    reason: `Updated review score for employee ${input.employeeId}`,
  });

  return existing;
}

export async function getPerformanceReviews(filters?: { cycleId?: string; clientId?: string | null }) {
  const where: any = {};
  if (filters?.cycleId) where.cycleId = filters.cycleId;
  if (filters?.clientId) where.employee = { clientId: filters.clientId };

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
          departmentName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ====================================================
// PMS APPRAISAL DECISIONS & PMS -> PAYROLL INTEGRATION
// ====================================================

export interface CreateAppraisalInput {
  employeeId: string;
  reviewId?: string | null;
  cycleId?: string | null;
  performanceRating: number;
  decisionType: 'INCREMENT' | 'BONUS' | 'PROMOTION' | 'PIP' | 'NONE';
  incrementPercentage?: number | null; // e.g. 10 for 10%
  bonusAmount?: number | null; // e.g. 20000
  effectiveDate: string | Date;
  remarks?: string | null;
  clientId?: string | null;
}

/**
 * Creates an Appraisal Outcome proposal based on performance review.
 * IMPORTANT: In adherence to business rules, score DOES NOT automatically modify salary!
 * An appraisal decision must first be explicitly approved by HR/Executive governance.
 */
export async function createAppraisalDecision(
  input: CreateAppraisalInput,
  user: { id: string; fullName: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;

  const appraisal = await prisma.pmsAppraisal.create({
    data: {
      employeeId: resolvedEmpId,
      reviewId: input.reviewId || null,
      cycleId: input.cycleId || null,
      performanceRating: input.performanceRating,
      decisionType: input.decisionType,
      incrementPercentage: input.incrementPercentage ?? null,
      bonusAmount: input.bonusAmount ?? null,
      effectiveDate: new Date(input.effectiveDate),
      status: 'PENDING',
      remarks: input.remarks || null,
      clientId: input.clientId || null,
    },
    include: {
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
    entityType: 'PERFORMANCE',
    entityId: appraisal.id,
    reason: `Created PMS appraisal proposal: ${input.decisionType} for ${appraisal.employee.fullName}`,
  });

  return appraisal;
}

/**
 * Approves an appraisal decision and bridges into Payroll:
 * 1. If Bonus: creates an approved PayrollAdjustment for the target payroll period.
 * 2. If Increment: creates a revised EmployeeSalaryAssignment preserving historical CTC records.
 */
export async function approveAppraisalDecision(
  appraisalId: string,
  user: { id: string; fullName: string; role: string },
  decision: 'APPROVED' | 'REJECTED'
) {
  const appraisal = await prisma.pmsAppraisal.findUnique({
    where: { id: appraisalId },
    include: { employee: true },
  });

  if (!appraisal) throw new Error('Appraisal decision not found');
  if (appraisal.status !== 'PENDING') {
    throw new Error(`Appraisal decision is already ${appraisal.status}`);
  }

  if (decision === 'REJECTED') {
    return prisma.pmsAppraisal.update({
      where: { id: appraisalId },
      data: {
        status: 'REJECTED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });
  }

  let payrollAdjustmentId: string | null = null;
  let newSalaryAssignmentId: string | null = null;

  // 1. Bridge Bonus -> Controlled Payroll Adjustment
  if (appraisal.decisionType === 'BONUS' && appraisal.bonusAmount && appraisal.bonusAmount > 0) {
    const effDate = new Date(appraisal.effectiveDate);
    const targetPeriodCode = await generatePayrollPeriodCode(effDate.getFullYear(), effDate.getMonth() + 1);

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        employeeId: appraisal.employeeId,
        clientId: appraisal.clientId || null,
        type: 'BONUS',
        category: 'EARNING',
        amount: appraisal.bonusAmount,
        reason: `Approved PMS Performance Bonus (Rating: ${appraisal.performanceRating}/5): ${appraisal.remarks || 'Merit bonus'}`,
        effectivePeriodCode: targetPeriodCode,
        status: 'APPROVED', // Pre-approved via executive appraisal sign-off
        createdById: user.id,
        approvedById: user.id,
        approvedAt: new Date(),
        appraisalId: appraisal.id,
      },
    });
    payrollAdjustmentId = adjustment.id;
  }

  // 2. Bridge Increment -> Salary Revision (Preserving Historical Salary Assignment)
  if (appraisal.decisionType === 'INCREMENT' && appraisal.incrementPercentage && appraisal.incrementPercentage > 0) {
    const currentAssignment = await prisma.employeeSalaryAssignment.findFirst({
      where: { employeeId: appraisal.employeeId, isCurrent: true },
    });

    if (currentAssignment) {
      const multiplier = 1 + appraisal.incrementPercentage / 100;
      const newAnnualCtc = Math.round(currentAssignment.annualCtc * multiplier);
      const newMonthlyCtc = Math.round(newAnnualCtc / 12);

      // Deactivate previous assignment with effectiveTo
      await prisma.employeeSalaryAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          isCurrent: false,
          effectiveTo: new Date(appraisal.effectiveDate),
        },
      });

      // Create revised assignment with increment version
      const newAssignment = await prisma.employeeSalaryAssignment.create({
        data: {
          employeeId: appraisal.employeeId,
          structureId: currentAssignment.structureId,
          annualCtc: newAnnualCtc,
          monthlyCtc: newMonthlyCtc,
          effectiveFrom: new Date(appraisal.effectiveDate),
          version: currentAssignment.version + 1,
          isCurrent: true,
          bankAccount: currentAssignment.bankAccount,
          bankIfsc: currentAssignment.bankIfsc,
          panNumber: currentAssignment.panNumber,
          assignedById: user.id,
        },
      });
      newSalaryAssignmentId = newAssignment.id;
    }
  }

  const updated = await prisma.pmsAppraisal.update({
    where: { id: appraisalId },
    data: {
      status: 'APPROVED',
      approvedById: user.id,
      approvedAt: new Date(),
      payrollAdjustmentId,
      newSalaryAssignmentId,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'APPROVE',
    entityType: 'PERFORMANCE',
    entityId: appraisal.id,
    reason: `Approved PMS appraisal ${appraisal.decisionType} for ${appraisal.employee.fullName}. Integrated into payroll.`,
  });

  return updated;
}

export async function getPmsAppraisals(filters?: { employeeId?: string; clientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.clientId) {
    where.OR = [
      { clientId: filters.clientId },
      { employee: { clientId: filters.clientId } },
    ];
  }

  const appraisals = await prisma.pmsAppraisal.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
          departmentName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return appraisals.map((a) => ({
    ...a,
    employeeName: a.employee?.fullName,
    employeeCode: a.employee?.employeeId,
  }));
}
