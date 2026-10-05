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
import { getEffectiveStatutoryRule } from './statutory.service';
import { getHrmConfiguration } from './config.service';
import { scanPayrollPeriodExceptions } from './exception.service';

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
    bankName?: string;
    bankAccount?: string;
    bankIfsc?: string;
    panNumber?: string;
    customConfig?: any;
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
      bankAccount: input.bankAccount?.trim() || null,
      bankIfsc: input.bankIfsc?.trim().toUpperCase() || null,
      panNumber: input.panNumber?.trim().toUpperCase() || null,
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

  // Persist custom manual configurations (PF, PT, TDS, component splits)
  if (input.customConfig) {
    try {
      await prisma.$runCommandRaw({
        update: 'EmployeeSalaryAssignment',
        updates: [
          {
            q: { _id: { $oid: assignment.id } },
            u: {
              $set: {
                customConfig:
                  typeof input.customConfig === 'string'
                    ? input.customConfig
                    : JSON.stringify(input.customConfig),
              },
            },
          },
        ],
      });
    } catch (err) {
      console.error('Failed to persist customConfig on EmployeeSalaryAssignment:', err);
    }
  }

  // Synchronize banking details with Employee Master record
  if (input.bankAccount || input.bankIfsc || input.bankName || input.panNumber) {
    const { maskPAN } = await import('@/lib/audit');
    await prisma.employee.update({
      where: { id: resolvedEmpId },
      data: {
        ...(input.bankName ? { bankName: input.bankName.trim() } : {}),
        ...(input.bankAccount ? { bankAccount: input.bankAccount.trim() } : {}),
        ...(input.bankIfsc ? { bankIfsc: input.bankIfsc.trim().toUpperCase() } : {}),
        ...(input.panNumber ? {
          panNumber: input.panNumber.trim().toUpperCase(),
          panMasked: maskPAN(input.panNumber.trim().toUpperCase()),
        } : {}),
      },
    });
  }

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'PAYROLL',
    entityId: assignment.id,
    reason: `Assigned salary structure ${input.structureId} (CTC: ₹${input.baseCtcAnnual}) to employee ${resolvedEmpId}`,
  });

  return assignment;
}

export async function getEmployeeSalaryAssignments(clientId?: string | null) {
  await ensureDefaultSalaryComponentsAndStructures();
  const where: any = { isCurrent: true };
  if (clientId) {
    where.employee = { clientId };
  }

  const assignments = await prisma.employeeSalaryAssignment.findMany({
    where,
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
          bankAccount: true,
          bankIfsc: true,
          bankName: true,
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
      bankAccountNumber: a.employee.bankAccount || a.bankAccount,
      bankIfscCode: a.employee.bankIfsc || a.bankIfsc,
    },
  }));
}

export async function getPayrollPeriods(tenantClientId?: string | null) {
  const where: any = {};
  if (tenantClientId) {
    where.OR = [
      { clientId: tenantClientId },
      { payrollRecords: { some: { employee: { clientId: tenantClientId } } } },
    ];
  }

  const periods = await prisma.payrollPeriod.findMany({
    where,
    include: {
      _count: { select: { payrollRecords: true, exceptions: true } },
      payrollRecords: tenantClientId
        ? { where: { employee: { clientId: tenantClientId } } }
        : false,
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return periods.map((p) => {
    let recordsCount = p.totalEmployees;
    let totalGrossPay = p.totalGross;
    let totalNetPay = p.totalNet;

    if (tenantClientId && Array.isArray(p.payrollRecords)) {
      recordsCount = p.payrollRecords.length;
      totalGrossPay = p.payrollRecords.reduce((s, r) => s + (r.totalEarnings || 0), 0);
      totalNetPay = p.payrollRecords.reduce((s, r) => s + (r.netPay || 0), 0);
    }

    return {
      ...p,
      recordsCount,
      totalGrossPay,
      totalNetPay,
      pendingExceptions: p._count?.exceptions || 0,
      workingDays: 26,
    };
  });
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
              bankAccount: true,
              bankIfsc: true,
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
      exceptions: {
        include: {
          employee: {
            select: { id: true, employeeId: true, fullName: true },
          },
        },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
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
    pendingExceptions: period.exceptions.filter((e) => e.status === 'OPEN').length,
    blockingExceptions: period.exceptions.filter((e) => e.status === 'OPEN' && e.severity === 'BLOCKING').length,
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
    exceptionsList: period.exceptions.map((e) => ({
      id: e.id,
      exceptionType: e.exceptionType,
      severity: e.severity,
      reason: e.reason,
      resolution: e.resolution,
      status: e.status,
      employeeName: e.employee?.fullName,
      employeeCode: e.employee?.employeeId,
    })),
  };
}

export async function createPayrollPeriod(
  month: number,
  year: number,
  user: { id: string; fullName: string },
  clientId?: string | null
) {
  const m = String(month).padStart(2, '0');
  const periodCode = clientId
    ? `PAY-${clientId.slice(-6).toUpperCase()}-${year}-${m}`
    : `PAY-${year}-${m}`;

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
      clientId: clientId || null,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'PAYROLL',
    entityId: period.id,
    reason: `Created payroll period ${periodCode}`,
  });

  return {
    ...period,
    recordsCount: 0,
    totalGrossPay: 0,
    totalNetPay: 0,
    workingDays: 26,
  };
}

/**
 * 5-Step Deterministic Payroll Calculation Engine:
 * Ingests Employee salary assignment, EMS live attendance, approved leaves, LOP policy,
 * overtime hours, versioned statutory compliance rules (PF/ESI/TDS/PT), approved adjustments,
 * loan EMIs, and reimbursements.
 */
export async function processPayrollPeriod(
  periodId: string,
  user: { id: string; fullName: string; role: string },
  tenantClientId?: string | null
) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'FINALIZED') throw new Error('Cannot re-process a finalized payroll period');

  // Load tenant configuration policies
  const config = await getHrmConfiguration(period.clientId || tenantClientId);
  const workingDays = config.workingDaysPerMonth || 26;
  const calendarDays = new Date(period.year, period.month, 0).getDate();

  // Scope employees to tenant organization if applicable
  const employeeWhere: any = {
    status: 'ACTIVE',
    ...(tenantClientId || period.clientId ? { clientId: tenantClientId || period.clientId } : {}),
  };

  // Ensure active salary assignments exist
  let assignments = await prisma.employeeSalaryAssignment.findMany({
    where: {
      isCurrent: true,
      employee: employeeWhere,
    },
    include: { employee: true },
  });

  if (assignments.length === 0) {
    const activeEmployees = await prisma.employee.findMany({
      where: employeeWhere,
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
      where: {
        isCurrent: true,
        employee: employeeWhere,
      },
      include: { employee: true },
    });
  }

  // Clear existing payroll records for this period (scoped to tenant if applicable)
  await prisma.payrollRecord.deleteMany({
    where: {
      periodId,
      ...(tenantClientId ? { employee: { clientId: tenantClientId } } : {}),
    },
  });

  let periodTotalGross = 0;
  let periodTotalDeductions = 0;
  let periodTotalNet = 0;
  let count = 0;

  const monthStr = String(period.month).padStart(2, '0');
  const periodPrefix = `${period.year}-${monthStr}`;

  for (const assign of assignments) {
    const emp = assign.employee;
    if (!emp || emp.status !== 'ACTIVE') continue;

    // Resolve salary assignment effective for this period
    const effectiveAssignment = await prisma.employeeSalaryAssignment.findFirst({
      where: {
        employeeId: emp.id,
        effectiveFrom: { lte: period.endDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: period.startDate } },
        ],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    }) || assign;

    // Check for Admin/Client manual salary overrides (PF, PT, TDS, ESIC, Earnings)
    let customCfg: any = null;
    try {
      const rawAssign = (await prisma.$runCommandRaw({
        find: 'EmployeeSalaryAssignment',
        filter: { _id: { $oid: effectiveAssignment.id } },
        limit: 1,
      })) as any;
      const rawDoc = rawAssign?.cursor?.firstBatch?.[0];
      if (rawDoc?.customConfig) {
        customCfg =
          typeof rawDoc.customConfig === 'string'
            ? JSON.parse(rawDoc.customConfig)
            : rawDoc.customConfig;
      }
    } catch (e) {
      // Fallback to standard automated calculation
    }

    const baseMonthly = effectiveAssignment.monthlyCtc;

    // 1. Loss of Pay (LOP) based on configured LOP policy
    const lopDays = await calculateEmployeeLopDays(emp.id, period.month, period.year);
    let perDayRate = baseMonthly / workingDays;
    let lopDeduction = 0;

    if (config.lopPolicy === 'CALENDAR_DAYS') {
      perDayRate = baseMonthly / calendarDays;
      lopDeduction = Math.round(perDayRate * lopDays);
    } else if (config.lopPolicy === 'PAYABLE_DAYS') {
      const scheduledPayableDays = Math.max(1, calendarDays - 4); // accounting for weekends
      perDayRate = baseMonthly / scheduledPayableDays;
      lopDeduction = Math.round(perDayRate * lopDays);
    } else {
      lopDeduction = Math.round(perDayRate * lopDays);
    }

    const adjustedGross = Math.max(0, baseMonthly - lopDeduction);

    // 2. Base Earnings components (Basic, HRA, Special Allowance - Auto or Custom)
    let basicAmount: number;
    let hraAmount: number;
    let specialAllowance: number;

    if (customCfg?.earningsMode === 'CUSTOM' && customCfg.basicAmount !== undefined) {
      const scaleFactor = baseMonthly > 0 ? adjustedGross / baseMonthly : 1;
      basicAmount = Math.round((Number(customCfg.basicAmount) || 0) * scaleFactor);
      hraAmount = Math.round((Number(customCfg.hraAmount) || 0) * scaleFactor);
      specialAllowance = Math.max(0, adjustedGross - (basicAmount + hraAmount));
    } else {
      basicAmount = Math.round(adjustedGross * 0.5);
      hraAmount = Math.round(basicAmount * 0.4);
      specialAllowance = Math.max(0, adjustedGross - (basicAmount + hraAmount));
    }

    const earningsList: Array<{ code: string; name: string; amount: number }> = [
      { code: 'BASIC', name: 'Basic Salary', amount: basicAmount },
      { code: 'HRA', name: 'House Rent Allowance', amount: hraAmount },
      { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', amount: specialAllowance },
    ];

    // 3. Overtime computation from EMS Attendance
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: emp.id,
        date: { startsWith: periodPrefix },
      },
    });

    const totalOvertimeMinutes = attendanceRecords.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);
    const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(1));
    const overtimePay = Math.round(overtimeHours * config.overtimeRatePerHour * config.overtimeMultiplier);

    if (overtimePay > 0) {
      earningsList.push({
        code: 'OVERTIME',
        name: `Overtime Pay (${overtimeHours} hrs @ ${config.overtimeMultiplier}x)`,
        amount: overtimePay,
      });
    }

    // 4. Approved Adjustments (Bonus, Incentive, Arrears, etc.)
    const approvedAdjustments = await prisma.payrollAdjustment.findMany({
      where: {
        employeeId: emp.id,
        effectivePeriodCode: period.periodCode,
        status: 'APPROVED',
      },
    });

    let totalAdjustmentEarnings = 0;
    let totalAdjustmentDeductions = 0;

    for (const adj of approvedAdjustments) {
      if (adj.category === 'EARNING') {
        totalAdjustmentEarnings += adj.amount;
        earningsList.push({
          code: adj.type,
          name: `${adj.type} (${adj.reason})`,
          amount: adj.amount,
        });
      } else {
        totalAdjustmentDeductions += adj.amount;
      }
    }

    const totalGrossEarnings = adjustedGross + overtimePay + totalAdjustmentEarnings;

    // 5. Statutory Compliance Deductions (Manual Overrides & Versioned Rule Engine)
    const empState = emp.ptState || 'Maharashtra';
    const [pfRule, esiRule, tdsRule, ptRule] = await Promise.all([
      getEffectiveStatutoryRule('PF', period.startDate, empState, emp.clientId),
      getEffectiveStatutoryRule('ESI', period.startDate, empState, emp.clientId),
      getEffectiveStatutoryRule('TDS', period.startDate, empState, emp.clientId),
      getEffectiveStatutoryRule('PT', period.startDate, empState, emp.clientId),
    ]);

    // PF Deduction (Manual override vs Automatic)
    let pfEmployee = 0;
    let pfEmployer = 0;
    if (customCfg?.pfOption === 'EXEMPT') {
      pfEmployee = 0;
      pfEmployer = 0;
    } else if (customCfg?.pfOption === 'CUSTOM' && customCfg.pfAmount !== undefined) {
      pfEmployee = Number(customCfg.pfAmount) || 0;
      pfEmployer = Number(customCfg.pfEmployerAmount ?? pfEmployee);
    } else if (pfRule && pfRule.isActive) {
      const pfRate = pfRule.employeeRate / 100;
      const employerPfRate = (pfRule.employerRate || 12) / 100;
      if (pfRule.ceiling && pfRule.ceiling > 0) {
        pfEmployee = Math.min(Math.round(pfRule.ceiling * pfRate), Math.round(basicAmount * pfRate));
        pfEmployer = Math.min(Math.round(pfRule.ceiling * employerPfRate), Math.round(basicAmount * employerPfRate));
      } else {
        pfEmployee = Math.round(basicAmount * pfRate);
        pfEmployer = Math.round(basicAmount * employerPfRate);
      }
    }

    // ESI Deduction (Manual override vs Automatic)
    let esiEmployee = 0;
    let esiEmployer = 0;
    if (customCfg?.esiOption === 'EXEMPT') {
      esiEmployee = 0;
      esiEmployer = 0;
    } else if (customCfg?.esiOption === 'CUSTOM' && customCfg.esiAmount !== undefined) {
      esiEmployee = Number(customCfg.esiAmount) || 0;
      esiEmployer = Number(customCfg.esiEmployerAmount ?? Math.round(esiEmployee * 4.33));
    } else if (esiRule && esiRule.isActive && totalGrossEarnings <= (esiRule.threshold || 21000)) {
      esiEmployee = Math.round(totalGrossEarnings * (esiRule.employeeRate / 100));
      esiEmployer = Math.round(totalGrossEarnings * ((esiRule.employerRate || 3.25) / 100));
    }

    // TDS Deduction (Manual override vs Automatic)
    let tdsAmount = 0;
    if (customCfg?.tdsOption === 'EXEMPT') {
      tdsAmount = 0;
    } else if (customCfg?.tdsOption === 'CUSTOM' && customCfg.tdsAmount !== undefined) {
      tdsAmount = Number(customCfg.tdsAmount) || 0;
    } else if (tdsRule && tdsRule.isActive && totalGrossEarnings >= (tdsRule.threshold || 50000)) {
      tdsAmount = Math.round(totalGrossEarnings * (tdsRule.employeeRate / 100));
    }

    // PT Deduction (Manual override vs Automatic)
    let ptAmount = 0;
    if (customCfg?.ptOption === 'EXEMPT') {
      ptAmount = 0;
    } else if (customCfg?.ptOption === 'CUSTOM' && customCfg.ptAmount !== undefined) {
      ptAmount = Number(customCfg.ptAmount) || 0;
    } else if (ptRule && ptRule.isActive) {
      if (ptRule.rateType === 'SLAB' && ptRule.slabConfigJson) {
        try {
          const slabs = JSON.parse(ptRule.slabConfigJson);
          for (const s of slabs) {
            const minW = s.min ?? s.minWage ?? 0;
            const maxW = s.max ?? s.maxWage ?? 999999999;
            if (totalGrossEarnings >= minW && totalGrossEarnings <= maxW) {
              const standardPt = s.pt ?? s.deduction ?? 200;
              const febDeduct = s.febPt ?? s.februaryDeduction ?? standardPt;
              ptAmount = period.month === 2 ? febDeduct : standardPt;
              break;
            }
          }
        } catch {
          ptAmount = totalGrossEarnings > 15000 ? 200 : 0;
        }
      } else {
        ptAmount = totalGrossEarnings > (ptRule.threshold || 15000) ? ptRule.employeeRate : 0;
      }
    }

    const deductionsList: Array<{ code: string; name: string; amount: number }> = [
      { code: 'PF_EMP', name: `Provident Fund (${pfRule?.employeeRate || 12}%)`, amount: pfEmployee },
      { code: 'PT', name: `Professional Tax (${empState})`, amount: ptAmount },
      { code: 'TDS', name: 'Tax Deducted at Source', amount: tdsAmount },
    ];

    if (esiEmployee > 0) {
      deductionsList.push({
        code: 'ESI_EMP',
        name: `ESI Contribution (${esiRule?.employeeRate || 0.75}%)`,
        amount: esiEmployee,
      });
    }

    // Active Loans Deduction
    const activeLoans = await prisma.employeeLoan.findMany({
      where: { employeeId: emp.id, status: 'ACTIVE' },
    });

    for (const loan of activeLoans) {
      if (loan.remainingBalance > 0) {
        deductionsList.push({
          code: `LOAN_${loan.loanNumber}`,
          name: `Loan Repayment (${loan.loanNumber})`,
          amount: loan.monthlyEmi,
        });
      }
    }

    // Deduction Adjustments
    for (const adj of approvedAdjustments) {
      if (adj.category === 'DEDUCTION') {
        deductionsList.push({
          code: adj.type,
          name: `${adj.type} (${adj.reason})`,
          amount: adj.amount,
        });
      }
    }

    const totalDeductions = deductionsList.reduce((sum, d) => sum + d.amount, 0);

    // 6. Approved Expense Reimbursements
    const approvedReimbursements = await prisma.reimbursementClaim.findMany({
      where: {
        employeeId: emp.id,
        status: 'APPROVED',
      },
    });
    const totalReimb = approvedReimbursements.reduce((sum, r) => sum + r.amount, 0);

    // 7. Final Net Pay Calculation
    const rawNetPay = totalGrossEarnings - totalDeductions + totalReimb;
    const isNegativeNet = rawNetPay < 0 || totalDeductions > (totalGrossEarnings + totalReimb);
    const netPay = Math.max(0, rawNetPay);
    const employerContributions = pfEmployer + esiEmployer;

    // Mathematical Step Trace
    const calculationTrace = JSON.stringify({
      steps: [
        `Base Monthly CTC: ₹${baseMonthly.toLocaleString()}`,
        `LOP Deductions: ${lopDays} days @ ₹${Math.round(perDayRate)}/day = ₹${lopDeduction.toLocaleString()}`,
        `Adjusted Gross: ₹${adjustedGross.toLocaleString()}`,
        `Overtime Hours: ${overtimeHours} hrs -> ₹${overtimePay.toLocaleString()}`,
        `Statutory PF: Employee ₹${pfEmployee.toLocaleString()}, Employer ₹${pfEmployer.toLocaleString()}`,
        `Statutory PT (${empState}): ₹${ptAmount.toLocaleString()}`,
        `Statutory TDS: ₹${tdsAmount.toLocaleString()}`,
        `Statutory ESI: Employee ₹${esiEmployee.toLocaleString()}, Employer ₹${esiEmployer.toLocaleString()}`,
        `Approved Reimbursements: ₹${totalReimb.toLocaleString()}`,
        `Raw Net Pay: ₹${rawNetPay.toLocaleString()}`,
        `Final Net Pay: ₹${netPay.toLocaleString()}`,
      ],
      rawNetPay,
      statutoryRulesUsed: {
        pfVersion: pfRule?.version,
        esiVersion: esiRule?.version,
        tdsVersion: tdsRule?.version,
        ptVersion: ptRule?.version,
      },
    });

    // Create Payroll Record
    await prisma.payrollRecord.create({
      data: {
        periodId,
        employeeId: emp.id,
        totalDaysInMonth: calendarDays,
        payableDays: Math.max(0, workingDays - lopDays),
        presentDays: Math.max(0, workingDays - lopDays),
        unpaidDays: lopDays,
        overtimeHours,
        baseGross: baseMonthly,
        lopDeduction,
        totalEarnings: totalGrossEarnings,
        totalDeductions,
        reimbursements: totalReimb,
        netPay,
        basic: basicAmount,
        hra: hraAmount,
        allowances: specialAllowance,
        overtimePay,
        bonus: totalAdjustmentEarnings,
        pfEmployee,
        pfEmployer,
        esiEmployee,
        esiEmployer,
        tds: tdsAmount,
        pt: ptAmount,
        otherDeductions: totalDeductions - (pfEmployee + ptAmount + tdsAmount + esiEmployee),
        employerContributions,
        status: isNegativeNet ? 'HOLD' : 'PROCESSED',
        calculationTrace,
        earningsItems: {
          create: earningsList.map((e) => ({
            componentCode: e.code,
            componentName: e.name,
            standardAmount: e.amount,
            actualAmount: e.amount,
          })),
        },
        deductionItems: {
          create: deductionsList.map((d) => ({
            componentCode: d.code,
            componentName: d.name,
            amount: d.amount,
          })),
        },
      },
    });

    periodTotalGross += totalGrossEarnings;
    periodTotalDeductions += totalDeductions;
    periodTotalNet += netPay;
    count++;
  }

  // Scan for audit exceptions
  const exceptionCount = await scanPayrollPeriodExceptions(periodId);

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
      remarks: `Processed ${count} staff records. Net: ₹${periodTotalNet.toLocaleString()}. Found ${exceptionCount} exception(s).`,
    },
  });

  return {
    ...updatedPeriod,
    recordsCount: count,
    totalGrossPay: periodTotalGross,
    totalNetPay: periodTotalNet,
    exceptionCount,
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
  if (period.status === 'FINALIZED') throw new Error('Period is already finalized and locked');

  // Enforce exception gate: Cannot approve if blocking exceptions remain unresolved
  const blockingExceptions = await prisma.payrollException.count({
    where: {
      periodId,
      severity: 'BLOCKING',
      status: 'OPEN',
    },
  });

  if (blockingExceptions > 0) {
    throw new Error(
      `Cannot approve payroll: ${blockingExceptions} blocking audit exception(s) remain unresolved. Please review exceptions.`
    );
  }

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
  if (period.status === 'FINALIZED') throw new Error('Period is already finalized and permanently locked');

  // Finalization Exception gate
  const blockingExceptions = await prisma.payrollException.count({
    where: {
      periodId,
      severity: 'BLOCKING',
      status: 'OPEN',
    },
  });

  if (blockingExceptions > 0) {
    throw new Error(
      `Cannot finalize payroll: ${blockingExceptions} blocking audit exception(s) must be resolved before financial locking.`
    );
  }

  // Generate payslips & lock reimbursements/adjustments
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

    // Mark approved reimbursements as PAID
    await prisma.reimbursementClaim.updateMany({
      where: { employeeId: record.employeeId, status: 'APPROVED' },
      data: { status: 'PAID' },
    });

    // Mark adjustments as PROCESSED
    await prisma.payrollAdjustment.updateMany({
      where: {
        employeeId: record.employeeId,
        effectivePeriodCode: period.periodCode,
        status: 'APPROVED',
      },
      data: { status: 'PROCESSED' },
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
      remarks: 'Permanently locked and finalized payroll. Payslips published and disbursements recorded.',
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
          bankAccount: true,
          bankIfsc: true,
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

export async function getReimbursementClaims(filters?: { employeeId?: string; status?: string; clientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    where.employeeId = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
  }
  if (filters?.status) where.status = filters.status;
  if (filters?.clientId) where.employee = { clientId: filters.clientId };

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

export async function getEmployeeLoans(employeeId?: string, clientId?: string | null) {
  const where: any = {};
  if (employeeId) {
    where.employeeId = await resolveEmployeeObjectId(employeeId) || employeeId;
  }
  if (clientId) {
    where.employee = { clientId };
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
