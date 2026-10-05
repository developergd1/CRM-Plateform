import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export interface AuditException {
  exceptionType: string;
  severity: 'BLOCKING' | 'WARNING';
  employeeId?: string | null;
  reason: string;
  resolution?: string;
}

/**
 * Scans a payroll period and its employee records for potential anomalies and blocking errors.
 * Generates audit exceptions in the database.
 */
export async function scanPayrollPeriodExceptions(periodId: string): Promise<number> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      payrollRecords: {
        include: {
          employee: {
            include: {
              salaryAssignments: { where: { isCurrent: true } },
            },
          },
        },
      },
    },
  });

  if (!period) return 0;

  // Clear previous OPEN exceptions for this period
  await prisma.payrollException.deleteMany({
    where: { periodId, status: 'OPEN' },
  });

  const discoveredExceptions: AuditException[] = [];

  // Check 1: Records with Negative Net Pay
  for (const record of period.payrollRecords) {
    const hasNegativeNet = record.netPay < 0 || record.status === 'HOLD' || (record.totalDeductions > (record.totalEarnings + record.reimbursements));
    if (hasNegativeNet) {
      discoveredExceptions.push({
        exceptionType: 'NEGATIVE_NET_SALARY',
        severity: 'BLOCKING',
        employeeId: record.employeeId,
        reason: `Employee ${record.employee.fullName} (${record.employee.employeeId}) has negative net pay: ₹${record.netPay.toLocaleString()}`,
        resolution: 'Review excessive LOP deductions, loan EMIs, or manual deductions before approval.',
      });
    }

    // Check 2: Missing Bank Details
    const hasBank = (record.employee.bankAccount && record.employee.bankIfsc) || (record.employee.salaryAssignments?.[0]?.bankAccount && record.employee.salaryAssignments?.[0]?.bankIfsc);
    if (!hasBank) {
      discoveredExceptions.push({
        exceptionType: 'MISSING_BANK_INFO',
        severity: 'WARNING',
        employeeId: record.employeeId,
        reason: `Employee ${record.employee.fullName} does not have registered bank account/IFSC details.`,
        resolution: 'Update bank details in Employee Profile to enable direct electronic transfer.',
      });
    }

    // Check 3: Missing Statutory PAN
    if (!record.employee.panNumber && !record.employee.panMasked) {
      discoveredExceptions.push({
        exceptionType: 'MISSING_STATUTORY_INFO',
        severity: 'WARNING',
        employeeId: record.employeeId,
        reason: `Employee ${record.employee.fullName} does not have a validated PAN on record.`,
        resolution: 'Add employee PAN to ensure correct TDS withholding report.',
      });
    }

    // Check 4: No active salary structure assignment
    if (!record.employee.salaryAssignments || record.employee.salaryAssignments.length === 0) {
      discoveredExceptions.push({
        exceptionType: 'NO_SALARY_STRUCTURE',
        severity: 'BLOCKING',
        employeeId: record.employeeId,
        reason: `Employee ${record.employee.fullName} has no active salary assignment.`,
        resolution: 'Assign a salary structure to this employee in Salary Profile.',
      });
    }
  }

  // Check 5: Pending/Unapproved adjustments for this period
  const pendingAdjustments = await prisma.payrollAdjustment.findMany({
    where: {
      effectivePeriodCode: period.periodCode,
      status: 'PENDING',
    },
    include: { employee: true },
  });

  for (const adj of pendingAdjustments) {
    discoveredExceptions.push({
      exceptionType: 'UNAPPROVED_ADJUSTMENT',
      severity: 'BLOCKING',
      employeeId: adj.employeeId,
      reason: `Pending unapproved adjustment: ${adj.type} of ₹${adj.amount} for ${adj.employee.fullName}.`,
      resolution: 'Approve or reject this adjustment in Payroll Adjustments before period approval.',
    });
  }

  // Persist discovered exceptions
  for (const exc of discoveredExceptions) {
    await prisma.payrollException.create({
      data: {
        periodId,
        employeeId: exc.employeeId || null,
        exceptionType: exc.exceptionType,
        severity: exc.severity,
        reason: exc.reason,
        resolution: exc.resolution || null,
        status: 'OPEN',
      },
    });
  }

  return discoveredExceptions.length;
}

export async function getPayrollExceptions(periodId?: string) {
  const where: any = {};
  if (periodId) where.periodId = periodId;

  const exceptions = await prisma.payrollException.findMany({
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
      period: {
        select: {
          id: true,
          periodCode: true,
          month: true,
          year: true,
        },
      },
    },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  });

  return exceptions.map((e) => ({
    ...e,
    employeeName: e.employee?.fullName,
    employeeCode: e.employee?.employeeId,
    periodCode: e.period?.periodCode,
  }));
}

export async function resolvePayrollException(
  exceptionId: string,
  resolution: string,
  user: { id: string; fullName: string }
) {
  const updated = await prisma.payrollException.update({
    where: { id: exceptionId },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedById: user.id,
      resolvedAt: new Date(),
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'UPDATE',
    entityType: 'PAYROLL',
    entityId: exceptionId,
    reason: `Resolved payroll exception: ${updated.exceptionType}`,
  });

  return updated;
}

export async function waivePayrollException(
  exceptionId: string,
  reason: string,
  user: { id: string; fullName: string }
) {
  const updated = await prisma.payrollException.update({
    where: { id: exceptionId },
    data: {
      status: 'WAIVED',
      resolution: `Waived by ${user.fullName}: ${reason}`,
      resolvedById: user.id,
      resolvedAt: new Date(),
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'UPDATE',
    entityType: 'PAYROLL',
    entityId: exceptionId,
    reason: `Waived payroll exception: ${updated.exceptionType}`,
  });

  return updated;
}
