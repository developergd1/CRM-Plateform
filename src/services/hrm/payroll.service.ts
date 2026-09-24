import crypto from 'crypto';
import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import {
  generatePayrollPeriodCode,
  generateReimbursementNumber,
  generateLoanNumber,
  generatePayslipNumber,
} from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';
import { calculateEmployeeLopDays } from './leave.service';

/**
 * Utility to convert numbers to Indian Rupee Words for official payslips
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(Math.abs(amount));
  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? 'and ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? 'and ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? 'and ' + inWords(n % 10000000) : '');
  }

  return `${inWords(num).trim()} Rupees Only`;
}

export async function ensureDefaultSalaryComponentsAndStructures() {
  const componentCount = await prisma.salaryComponent.count();
  if (componentCount === 0) {
    const components = [
      { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calculationType: 'PERCENTAGE', percentageValue: 50, isTaxable: true, isStatutory: false, calculationPriority: 1 },
      { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', calculationType: 'PERCENTAGE', percentageValue: 40, isTaxable: true, isStatutory: false, calculationPriority: 2 },
      { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', calculationType: 'FIXED', isTaxable: false, isStatutory: false, calculationPriority: 3 },
      { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'EARNING', calculationType: 'FORMULA', isTaxable: true, isStatutory: false, calculationPriority: 4 },
      { code: 'PF_EMP', name: 'Provident Fund (Employee)', type: 'DEDUCTION', calculationType: 'PERCENTAGE', percentageValue: 12, isTaxable: false, isStatutory: true, calculationPriority: 5 },
      { code: 'PT', name: 'Professional Tax (PT)', type: 'DEDUCTION', calculationType: 'FIXED', isTaxable: false, isStatutory: true, calculationPriority: 6 },
      { code: 'TDS', name: 'Tax Deducted at Source (TDS)', type: 'DEDUCTION', calculationType: 'FORMULA', isTaxable: false, isStatutory: true, calculationPriority: 7 },
    ];

    for (const c of components) {
      await prisma.salaryComponent.create({ data: { ...c, isActive: true } });
    }
  }

  let structure = await prisma.salaryStructure.findFirst({
    where: { isActive: true },
    include: { components: true },
  });

  if (!structure) {
    structure = await prisma.salaryStructure.create({
      data: {
        code: 'STR-EXECUTIVE',
        name: 'Standard Executive Grade Structure',
        description: 'Standard corporate Indian payroll structure with statutory PF, PT, and HRA allowances',
        isActive: true,
      },
      include: { components: true },
    });

    const allComponents = await prisma.salaryComponent.findMany();
    for (const comp of allComponents) {
      await prisma.salaryStructureComponent.create({
        data: {
          structureId: structure.id,
          componentId: comp.id,
          defaultAmount: comp.calculationType === 'FIXED' ? (comp.code === 'PT' ? 200 : 1600) : 0,
        },
      });
    }
  }

  return structure;
}

export async function getSalaryComponents() {
  await ensureDefaultSalaryComponentsAndStructures();
  return prisma.salaryComponent.findMany({
    where: { isActive: true },
    orderBy: { calculationPriority: 'asc' },
  });
}

export async function getSalaryStructures() {
  await ensureDefaultSalaryComponentsAndStructures();
  return prisma.salaryStructure.findMany({
    where: { isActive: true },
    include: {
      components: {
        include: { component: true },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function assignSalaryStructure(
  input: {
    employeeId: string;
    structureId: string;
    baseCtcAnnual: number;
    effectiveFrom?: string;
  },
  user: { id: string; fullName: string }
) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const grossMonthly = Math.round(input.baseCtcAnnual / 12);

  // Deactivate prior assignments
  await prisma.employeeSalaryAssignment.updateMany({
    where: { employeeId: resolvedEmpId, isCurrent: true },
    data: { isCurrent: false, effectiveTo: new Date() },
  });

  const assignment = await prisma.employeeSalaryAssignment.create({
    data: {
      employeeId: resolvedEmpId,
      structureId: input.structureId,
      annualCtc: input.baseCtcAnnual,
      monthlyCtc: grossMonthly,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      isCurrent: true,
      assignedById: user.id,
    },
    include: {
      structure: true,
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

  return assignment;
}

export async function getEmployeeSalaryAssignments() {
  await ensureDefaultSalaryComponentsAndStructures();
  const assignments = await prisma.employeeSalaryAssignment.findMany({
    where: { isCurrent: true },
    include: {
      structure: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
          departmentName: true,
          panNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return assignments.map((a) => ({
    ...a,
    baseCtcAnnual: a.annualCtc,
    grossSalaryMonthly: a.monthlyCtc,
    employee: {
      ...a.employee,
      bankAccountNumber: a.bankAccount,
      bankIfscCode: a.bankIfsc,
    },
  }));
}

export async function getPayrollPeriods(tenantClientId?: string | null) {
  if (tenantClientId) {
    const periods = await prisma.payrollPeriod.findMany({
      where: {
        payrollRecords: {
          some: {
            employee: { clientId: tenantClientId },
          },
        },
      },
      include: {
        payrollRecords: {
          where: { employee: { clientId: tenantClientId } },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return periods.map((p) => {
      const recordsCount = p.payrollRecords.length;
      const totalGrossPay = p.payrollRecords.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
      const totalNetPay = p.payrollRecords.reduce((sum, r) => sum + (r.netPay || 0), 0);
      return {
        ...p,
        payrollRecords: undefined,
        recordsCount,
        totalGrossPay,
        totalNetPay,
        workingDays: 26,
      };
    });
  }

  const periods = await prisma.payrollPeriod.findMany({
    include: {
      _count: { select: { payrollRecords: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return periods.map((p) => ({
    ...p,
    recordsCount: p.totalEmployees,
    totalGrossPay: p.totalGross,
    totalNetPay: p.totalNet,
    workingDays: 26,
  }));
}

export async function getPayrollPeriodDetail(periodId: string, tenantClientId?: string | null) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      payrollRecords: {
        where: tenantClientId ? { employee: { clientId: tenantClientId } } : {},
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              fullName: true,
              designation: true,
              departmentName: true,
              panNumber: true,
            },
          },
          earningsItems: true,
          deductionItems: true,
          adjustmentItems: true,
          payslip: true,
        },
      },
      approvals: {
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!period) return null;

  const recordsCount = period.payrollRecords.length;
  const totalGrossPay = tenantClientId ? period.payrollRecords.reduce((s, r) => s + (r.totalEarnings || 0), 0) : period.totalGross;
  const totalNetPay = tenantClientId ? period.payrollRecords.reduce((s, r) => s + (r.netPay || 0), 0) : period.totalNet;

  return {
    ...period,
    recordsCount,
    totalGrossPay,
    totalNetPay,
    workingDays: 26,
    records: period.payrollRecords.map((r) => ({
      ...r,
      baseSalary: r.baseGross,
      grossPay: r.totalEarnings,
      netPay: r.netPay,
      lopDays: r.unpaidDays,
      hasExceptions: r.status === 'HOLD',
      exceptionRemarks: r.calculationTrace,
      earnings: r.earningsItems.map((e) => ({
        id: e.id,
        componentCode: e.componentCode,
        componentName: e.componentName,
        amount: e.actualAmount,
      })),
      deductions: r.deductionItems.map((d) => ({
        id: d.id,
        componentCode: d.componentCode,
        componentName: d.componentName,
        amount: d.amount,
      })),
    })),
    approvalLogs: period.approvals.map((a) => ({
      id: a.id,
      action: a.action,
      actionBy: a.actorName,
      remarks: a.remarks,
      timestamp: a.timestamp,
    })),
  };
}

export async function createPayrollPeriod(
  month: number,
  year: number,
  user: { id: string; fullName: string }
) {
  const periodCode = await generatePayrollPeriodCode(year, month);

  let period = await prisma.payrollPeriod.findUnique({
    where: { periodCode },
  });

  if (period) {
    return {
      ...period,
      recordsCount: period.totalEmployees,
      totalGrossPay: period.totalGross,
      totalNetPay: period.totalNet,
      workingDays: 26,
    };
  }

  period = await prisma.payrollPeriod.create({
    data: {
      periodCode,
      month,
      year,
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0, 23, 59, 59),
      payDate: new Date(year, month, 1),
      status: 'DRAFT',
      totalEmployees: 0,
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
    },
  });

  return {
    ...period,
    recordsCount: 0,
    totalGrossPay: 0,
    totalNetPay: 0,
    workingDays: 26,
  };
}

export async function processPayrollPeriod(
  periodId: string,
  user: { id: string; fullName: string; role: string }
) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'FINALIZED') throw new Error('Cannot re-process a finalized period');

  // Ensure active salary assignments exist
  let assignments = await prisma.employeeSalaryAssignment.findMany({
    where: { isCurrent: true },
    include: { employee: true },
  });

  if (assignments.length === 0) {
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', employeeId: { not: 'GI-EMP-000001' } },
    });

    const structure = await ensureDefaultSalaryComponentsAndStructures();
    for (const emp of activeEmployees) {
      await prisma.employeeSalaryAssignment.create({
        data: {
          employeeId: emp.id,
          structureId: structure.id,
          annualCtc: 600000,
          monthlyCtc: 50000,
          effectiveFrom: new Date(),
          isCurrent: true,
          assignedById: user.id,
        },
      });
    }

    assignments = await prisma.employeeSalaryAssignment.findMany({
      where: { isCurrent: true },
      include: { employee: true },
    });
  }

  // Clear existing records for this period
  await prisma.payrollRecord.deleteMany({
    where: { periodId },
  });

  let periodTotalGross = 0;
  let periodTotalDeductions = 0;
  let periodTotalNet = 0;
  let count = 0;

  for (const assign of assignments) {
    const emp = assign.employee;
    if (!emp || emp.status !== 'ACTIVE') continue;

    const baseMonthly = assign.monthlyCtc;
    const workingDays = 26;

    // Attendance & LOP
    const lopDays = await calculateEmployeeLopDays(emp.id, period.month, period.year);
    const perDayRate = baseMonthly / workingDays;
    const lopDeduction = Math.round(perDayRate * lopDays);
    const adjustedGross = Math.max(0, baseMonthly - lopDeduction);

    // Earnings
    const basicAmount = Math.round(adjustedGross * 0.5);
    const hraAmount = Math.round(basicAmount * 0.4);
    const specialAllowance = Math.max(0, adjustedGross - (basicAmount + hraAmount));

    const earnings = [
      { code: 'BASIC', name: 'Basic Salary', amount: basicAmount },
      { code: 'HRA', name: 'House Rent Allowance', amount: hraAmount },
      { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', amount: specialAllowance },
    ];

    // Deductions
    const pfAmount = Math.min(1800, Math.round(basicAmount * 0.12));
    const ptAmount = adjustedGross > 15000 ? 200 : 0;
    const tdsAmount = adjustedGross > 50000 ? Math.round(adjustedGross * 0.05) : 0;

    const deductions = [
      { code: 'PF_EMP', name: 'Provident Fund (Employee)', amount: pfAmount },
      { code: 'PT', name: 'Professional Tax (PT)', amount: ptAmount },
      { code: 'TDS', name: 'Tax Deducted at Source', amount: tdsAmount },
    ];

    // Loans deduction check
    const activeLoans = await prisma.employeeLoan.findMany({
      where: { employeeId: emp.id, status: 'ACTIVE' },
    });

    for (const loan of activeLoans) {
      if (loan.remainingBalance > 0) {
        deductions.push({
          code: `LOAN_${loan.loanNumber}`,
          name: `Loan Repayment (${loan.loanNumber})`,
          amount: loan.monthlyEmi,
        });
      }
    }

    const totalDeds = deductions.reduce((sum, d) => sum + d.amount, 0);

    // Reimbursements
    const approvedReimbursements = await prisma.reimbursementClaim.findMany({
      where: {
        employeeId: emp.id,
        status: 'APPROVED',
      },
    });
    const totalReimb = approvedReimbursements.reduce((sum, r) => sum + r.amount, 0);

    const netPay = Math.max(0, adjustedGross - totalDeds + totalReimb);

    // Create record
    await prisma.payrollRecord.create({
      data: {
        periodId,
        employeeId: emp.id,
        totalDaysInMonth: 30,
        payableDays: workingDays - lopDays,
        presentDays: workingDays - lopDays,
        unpaidDays: lopDays,
        baseGross: baseMonthly,
        lopDeduction,
        totalEarnings: adjustedGross,
        totalDeductions: totalDeds,
        reimbursements: totalReimb,
        netPay,
        status: 'PROCESSED',
        earningsItems: {
          create: earnings.map((e) => ({
            componentCode: e.code,
            componentName: e.name,
            standardAmount: e.amount,
            actualAmount: e.amount,
          })),
        },
        deductionItems: {
          create: deductions.map((d) => ({
            componentCode: d.code,
            componentName: d.name,
            amount: d.amount,
          })),
        },
      },
    });

    periodTotalGross += adjustedGross;
    periodTotalDeductions += totalDeds;
    periodTotalNet += netPay;
    count++;
  }

  const updatedPeriod = await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: 'PENDING_REVIEW',
      processedAt: new Date(),
      totalEmployees: count,
      totalGross: periodTotalGross,
      totalDeductions: periodTotalDeductions,
      totalNet: periodTotalNet,
    },
  });

  await prisma.payrollApprovalLog.create({
    data: {
      periodId,
      action: 'PROCESSED',
      actorId: user.id,
      actorName: user.fullName || 'Payroll Specialist',
      remarks: `Processed ${count} staff records. Net: ₹${periodTotalNet.toLocaleString()}`,
    },
  });

  return {
    ...updatedPeriod,
    recordsCount: count,
    totalGrossPay: periodTotalGross,
    totalNetPay: periodTotalNet,
    workingDays: 26,
  };
}

export async function approvePayrollPeriod(
  periodId: string,
  user: { id: string; fullName: string; role: string },
  remarks?: string
) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'FINALIZED') throw new Error('Period is already finalized');

  const updated = await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  await prisma.payrollApprovalLog.create({
    data: {
      periodId,
      action: 'APPROVED',
      actorId: user.id,
      actorName: user.fullName || 'Administrator',
      remarks: remarks || 'Payroll period approved by authorized administrator',
    },
  });

  return {
    ...updated,
    recordsCount: updated.totalEmployees,
    totalGrossPay: updated.totalGross,
    totalNetPay: updated.totalNet,
  };
}

export async function finalizePayrollPeriod(
  periodId: string,
  user: { id: string; fullName: string; role: string }
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      payrollRecords: {
        include: { employee: true },
      },
    },
  });

  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'FINALIZED') throw new Error('Period is already finalized');

  // Generate payslips
  for (const record of period.payrollRecords) {
    const payslipNumber = await generatePayslipNumber(period.year, period.month);
    const token = crypto.randomBytes(24).toString('hex');
    const words = numberToWordsINR(record.netPay);

    await prisma.payslip.upsert({
      where: { payrollRecordId: record.id },
      create: {
        payslipNumber,
        payrollRecordId: record.id,
        employeeId: record.employeeId,
        periodCode: period.periodCode,
        grossEarnings: record.totalEarnings,
        totalDeductions: record.totalDeductions,
        netSalary: record.netPay,
        netSalaryWords: words,
        isPublished: true,
        downloadToken: token,
      },
      update: {
        grossEarnings: record.totalEarnings,
        totalDeductions: record.totalDeductions,
        netSalary: record.netPay,
        netSalaryWords: words,
        isPublished: true,
      },
    });

    // Mark reimbursements as PAID
    await prisma.reimbursementClaim.updateMany({
      where: { employeeId: record.employeeId, status: 'APPROVED' },
      data: { status: 'PAID' },
    });
  }

  const finalized = await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: 'FINALIZED',
      finalizedAt: new Date(),
      finalizedById: user.id,
    },
  });

  await prisma.payrollApprovalLog.create({
    data: {
      periodId,
      action: 'FINALIZED',
      actorId: user.id,
      actorName: user.fullName || 'Super Administrator',
      remarks: 'Permanently locked and finalized payroll. Payslips published.',
    },
  });

  return {
    ...finalized,
    recordsCount: finalized.totalEmployees,
    totalGrossPay: finalized.totalGross,
    totalNetPay: finalized.totalNet,
  };
}

export async function getPayslips(filters?: { employeeId?: string; periodCode?: string; tenantClientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.periodCode) {
    where.periodCode = filters.periodCode;
  }
  if (filters?.tenantClientId) {
    where.employee = { clientId: filters.tenantClientId };
  }

  const payslips = await prisma.payslip.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          designation: true,
          departmentName: true,
          panNumber: true,
        },
      },
      payrollRecord: {
        include: {
          earningsItems: true,
          deductionItems: true,
          adjustmentItems: true,
        },
      },
    },
    orderBy: { generatedAt: 'desc' },
  });

  return payslips.map((p) => ({
    ...p,
    grossPay: p.grossEarnings,
    netPay: p.netSalary,
    netPayInWords: p.netSalaryWords,
  }));
}

export async function submitReimbursementClaim(
  input: {
    employeeId: string;
    category: string;
    title: string;
    amount: number;
    receiptUrl?: string | null;
    claimDate: string;
  },
  user: { id: string; fullName: string }
) {
  const resolved = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const claimNumber = await generateReimbursementNumber();

  const claim = await prisma.reimbursementClaim.create({
    data: {
      claimNumber,
      employeeId: resolved,
      category: input.category,
      amount: input.amount,
      description: input.title,
      receiptUrl: input.receiptUrl,
      claimDate: new Date(input.claimDate),
      status: 'SUBMITTED',
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

  return claim;
}

export async function approveReimbursementClaim(
  claimId: string,
  user: { id: string; fullName: string },
  decision: 'APPROVED' | 'REJECTED'
) {
  const claim = await prisma.reimbursementClaim.update({
    where: { id: claimId },
    data: {
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  return claim;
}

export async function getReimbursementClaims(filters?: { employeeId?: string; status?: string }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status) where.status = filters.status;

  const claims = await prisma.reimbursementClaim.findMany({
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

  return claims.map((c) => ({
    ...c,
    title: c.description,
  }));
}

export async function createEmployeeLoan(
  input: {
    employeeId: string;
    principalAmount: number;
    monthlyInstallment: number;
    totalInstallments: number;
    purpose?: string | null;
  },
  user: { id: string; fullName: string }
) {
  const resolved = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const loanNumber = await generateLoanNumber();

  const loan = await prisma.employeeLoan.create({
    data: {
      loanNumber,
      employeeId: resolved,
      loanType: 'PERSONAL_LOAN',
      principalAmount: input.principalAmount,
      monthlyEmi: input.monthlyInstallment,
      totalTenureMonths: input.totalInstallments,
      remainingBalance: input.principalAmount,
      repaidAmount: 0,
      disbursedDate: new Date(),
      status: 'ACTIVE',
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

  return loan;
}

export async function getEmployeeLoans(employeeId?: string) {
  const where: any = {};
  if (employeeId) {
    where.employeeId = await resolveEmployeeObjectId(employeeId) || employeeId;
  }

  const loans = await prisma.employeeLoan.findMany({
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
      schedules: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return loans.map((l) => ({
    ...l,
    monthlyInstallment: l.monthlyEmi,
    totalInstallments: l.totalTenureMonths,
    remainingInstallments: Math.ceil(l.remainingBalance / (l.monthlyEmi || 1)),
    totalBalanceRemaining: l.remainingBalance,
  }));
}
