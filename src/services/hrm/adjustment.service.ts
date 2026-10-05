import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export interface CreateAdjustmentInput {
  employeeId: string;
  type: string; // BONUS, COMMISSION, INCENTIVE, REIMBURSEMENT, ADVANCE, LOAN_DEDUCTION, ARREAR, ONE_TIME_DEDUCTION, OTHER_EARNING, OTHER_DEDUCTION
  category?: 'EARNING' | 'DEDUCTION';
  amount: number;
  reason: string;
  effectivePeriodCode: string; // e.g. PAY-2026-10
  appraisalId?: string | null;
  clientId?: string | null;
}

export async function createPayrollAdjustment(
  input: CreateAdjustmentInput,
  user: { id: string; fullName: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;

  // Determine category based on type if not explicitly passed
  let category = input.category;
  if (!category) {
    const deductionTypes = ['LOAN_DEDUCTION', 'ONE_TIME_DEDUCTION', 'OTHER_DEDUCTION', 'ADVANCE'];
    category = deductionTypes.includes(input.type) ? 'DEDUCTION' : 'EARNING';
  }

  const adjustment = await prisma.payrollAdjustment.create({
    data: {
      employeeId: resolvedEmpId,
      clientId: input.clientId || null,
      type: input.type,
      category,
      amount: Math.abs(input.amount),
      reason: input.reason,
      effectivePeriodCode: input.effectivePeriodCode,
      status: 'PENDING',
      createdById: user.id,
      appraisalId: input.appraisalId || null,
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
    entityType: 'PAYROLL',
    entityId: adjustment.id,
    reason: `Created ${input.type} adjustment of ₹${input.amount} for period ${input.effectivePeriodCode}`,
  });

  return adjustment;
}

export async function reviewPayrollAdjustment(
  adjustmentId: string,
  decision: 'APPROVED' | 'REJECTED',
  user: { id: string; fullName: string; role: string },
  rejectionReason?: string
) {
  const adjustment = await prisma.payrollAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) throw new Error('Payroll adjustment not found');
  if (adjustment.status === 'PROCESSED') {
    throw new Error('Cannot modify an adjustment that has already been processed in finalized payroll');
  }

  const updated = await prisma.payrollAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      approvedById: user.id,
      approvedAt: new Date(),
      rejectionReason: decision === 'REJECTED' ? rejectionReason : null,
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
    action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
    entityType: 'PAYROLL',
    entityId: adjustment.id,
    reason: `${decision} payroll adjustment: ${adjustment.type} (₹${adjustment.amount})`,
  });

  return updated;
}

export async function getPayrollAdjustments(filters?: {
  employeeId?: string;
  effectivePeriodCode?: string;
  status?: string;
  clientId?: string | null;
}) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.effectivePeriodCode) {
    where.effectivePeriodCode = filters.effectivePeriodCode;
  }
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters?.clientId) {
    where.OR = [
      { clientId: filters.clientId },
      { employee: { clientId: filters.clientId } },
    ];
  }

  const adjustments = await prisma.payrollAdjustment.findMany({
    where,
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
    orderBy: { createdAt: 'desc' },
  });

  return adjustments.map((a) => ({
    ...a,
    employeeName: a.employee?.fullName,
    employeeCode: a.employee?.employeeId,
  }));
}
