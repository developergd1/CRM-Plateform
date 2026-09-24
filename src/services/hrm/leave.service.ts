import { prisma, resolveEmployeeObjectId, isValidObjectId } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function ensureDefaultLeaveTypes() {
  const count = await prisma.leaveType.count();
  if (count === 0) {
    const defaultTypes = [
      {
        code: 'CASUAL',
        name: 'Casual Leave',
        description: 'For personal matters or unforeseen emergencies',
        colorToken: 'teal',
        quota: 12,
        isUnpaid: false,
      },
      {
        code: 'SICK',
        name: 'Sick Leave',
        description: 'Medical recuperation and health appointments',
        colorToken: 'amber',
        quota: 10,
        isUnpaid: false,
      },
      {
        code: 'EARNED',
        name: 'Earned / Privilege Leave',
        description: 'Accrued annual vacation leave',
        colorToken: 'blue',
        quota: 15,
        isUnpaid: false,
      },
      {
        code: 'UNPAID',
        name: 'Loss of Pay (Unpaid Leave)',
        description: 'Authorized absence without salary entitlement',
        colorToken: 'red',
        quota: 0,
        isUnpaid: true,
      },
    ];

    for (const item of defaultTypes) {
      const lt = await prisma.leaveType.create({
        data: {
          code: item.code,
          name: item.name,
          description: item.description,
          colorToken: item.colorToken,
          isActive: true,
        },
      });

      await prisma.leavePolicy.create({
        data: {
          leaveTypeId: lt.id,
          annualQuota: item.quota,
          accrualRate: 'MONTHLY',
          carryForwardMax: item.code === 'EARNED' ? 30 : (item.code === 'SICK' ? 5 : 0),
          allowHalfDay: true,
          isUnpaid: item.isUnpaid,
          effectiveYear: 2026,
        },
      });
    }
  }

  return prisma.leaveType.findMany({
    where: { isActive: true },
    include: { policies: true },
    orderBy: { code: 'asc' },
  });
}

export async function getLeaveTypes() {
  await ensureDefaultLeaveTypes();
  return prisma.leaveType.findMany({
    where: { isActive: true },
    include: {
      policies: true,
    },
    orderBy: { code: 'asc' },
  });
}

export async function getEmployeeLeaveBalances(employeeId: string, year: number = 2026) {
  await ensureDefaultLeaveTypes();
  const resolvedEmpId = await resolveEmployeeObjectId(employeeId) || employeeId;

  let balances = await prisma.leaveBalance.findMany({
    where: {
      employeeId: resolvedEmpId,
      year,
    },
    include: {
      policy: {
        include: { leaveType: true },
      },
    },
  });

  if (balances.length === 0) {
    const policies = await prisma.leavePolicy.findMany({
      where: { effectiveYear: year },
      include: { leaveType: true },
    });

    for (const p of policies) {
      const allocated = p.annualQuota;
      await prisma.leaveBalance.create({
        data: {
          employeeId: resolvedEmpId,
          policyId: p.id,
          year,
          openingBalance: allocated,
          accrued: allocated,
          used: 0,
          adjusted: 0,
          pending: 0,
          available: allocated,
        },
      });

      if (allocated > 0) {
        await prisma.leaveLedger.create({
          data: {
            employeeId: resolvedEmpId,
            leaveTypeId: p.leaveTypeId,
            entryType: 'OPENING',
            days: allocated,
            balanceAfter: allocated,
            remarks: `Annual quota allocation for ${year}`,
          },
        });
      }
    }

    balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: resolvedEmpId,
        year,
      },
      include: {
        policy: {
          include: { leaveType: true },
        },
      },
    });
  }

  // Format balances for UI consumption
  return balances.map((b) => ({
    id: b.id,
    employeeId: b.employeeId,
    leaveTypeId: b.policy.leaveTypeId,
    year: b.year,
    allocatedDays: b.openingBalance,
    accruedDays: b.accrued,
    usedDays: b.used,
    pendingDays: b.pending,
    availableDays: b.available,
    leaveType: b.policy.leaveType,
  }));
}

export interface ApplyLeaveInput {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days?: number;
  totalDays?: number;
  reason: string;
  attachmentUrl?: string | null;
}

export async function applyLeave(input: ApplyLeaveInput, user: { id: string; email: string; fullName: string }) {
  const resolvedEmpId = await resolveEmployeeObjectId(input.employeeId) || input.employeeId;
  const numDays = Number(input.totalDays || input.days) || 1;

  // Find leave type
  let leaveTypeName = 'CASUAL';
  let leaveTypeId = input.leaveTypeId;
  const whereLt = isValidObjectId(input.leaveTypeId)
    ? { OR: [{ id: input.leaveTypeId }, { code: input.leaveTypeId }] }
    : { code: input.leaveTypeId };
  const lt = await prisma.leaveType.findFirst({
    where: whereLt,
    include: { policies: true },
  });
  if (lt) {
    leaveTypeName = lt.code;
    leaveTypeId = lt.id;
  }

  // 1. Check for overlapping pending or approved leave requests for the same employee
  const existingOverlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: resolvedEmpId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
  });

  if (existingOverlap) {
    throw new Error(`Overlapping leave request already exists from ${existingOverlap.startDate} to ${existingOverlap.endDate} (Status: ${existingOverlap.status})`);
  }

  // 2. Check balance sufficiency if not an unpaid leave type
  if (lt && !lt.policies.some(p => p.isUnpaid)) {
    const balances = await getEmployeeLeaveBalances(resolvedEmpId);
    const targetBal = balances.find(b => b.leaveTypeId === leaveTypeId || b.leaveType?.code === leaveTypeName);
    if (targetBal && targetBal.availableDays < numDays) {
      throw new Error(`Insufficient leave balance. Available: ${targetBal.availableDays} days, Requested: ${numDays} days`);
    }
  }

  const application = await prisma.leaveRequest.create({
    data: {
      employeeId: resolvedEmpId,
      leaveType: leaveTypeName,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays: numDays,
      reason: input.reason,
      attachmentUrl: input.attachmentUrl,
      status: 'PENDING',
    },
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
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'LEAVE',
    entityId: application.id,
    reason: `Applied for ${numDays} day(s) ${leaveTypeName} leave from ${input.startDate} to ${input.endDate}`,
  });

  return {
    ...application,
    applicationNumber: `LV-${application.id.slice(-6).toUpperCase()}`,
  };
}

export async function approveLeaveApplication(
  applicationId: string,
  user: { id: string; fullName: string; role: string },
  decision: 'APPROVED' | 'REJECTED',
  remarks?: string
) {
  const application = await prisma.leaveRequest.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error('Leave application not found');
  }

  if (application.status !== 'PENDING') {
    throw new Error(`Application is already ${application.status}`);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: applicationId },
    data: {
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewRemarks: remarks || `${decision} by supervisor`,
      rejectionReason: decision === 'REJECTED' ? (remarks || 'Declined') : null,
    },
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
  });

  if (decision === 'APPROVED') {
    // Record ledger entry & decrement leave balance
    const lt = await prisma.leaveType.findFirst({
      where: { code: application.leaveType },
      include: { policies: true },
    });

    let balanceAfter = 0;

    if (lt) {
      // Find or create employee leave balance
      const currentYear = new Date().getFullYear();
      let policy = lt.policies[0];
      if (policy) {
        let bal = await prisma.leaveBalance.findFirst({
          where: {
            employeeId: application.employeeId,
            policyId: policy.id,
            year: currentYear,
          },
        });

        if (!bal) {
          bal = await prisma.leaveBalance.create({
            data: {
              employeeId: application.employeeId,
              policyId: policy.id,
              year: currentYear,
              openingBalance: policy.annualQuota,
              accrued: policy.annualQuota,
              used: 0,
              adjusted: 0,
              pending: 0,
              available: policy.annualQuota,
            },
          });
        }

        const newUsed = bal.used + application.totalDays;
        const newAvailable = Math.max(0, bal.available - application.totalDays);
        balanceAfter = newAvailable;

        await prisma.leaveBalance.update({
          where: { id: bal.id },
          data: {
            used: newUsed,
            available: newAvailable,
          },
        });
      }

      await prisma.leaveLedger.create({
        data: {
          employeeId: application.employeeId,
          leaveTypeId: lt.id,
          requestId: application.id,
          entryType: 'USAGE',
          days: -application.totalDays,
          balanceAfter,
          remarks: `Approved leave: ${remarks || 'Supervisor approval'}`,
          createdById: user.id,
        },
      });
    }
  }

  await logAuditEvent({
    actorUserId: user.id,
    action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
    entityType: 'LEAVE',
    entityId: applicationId,
    reason: `${decision} leave request for employee ${application.employeeId}`,
  });

  return {
    ...updated,
    applicationNumber: `LV-${updated.id.slice(-6).toUpperCase()}`,
  };
}

export async function getLeaveApplications(filters?: { employeeId?: string; status?: string; tenantClientId?: string | null }) {
  const where: any = {};
  if (filters?.employeeId) {
    const resolved = await resolveEmployeeObjectId(filters.employeeId) || filters.employeeId;
    where.employeeId = resolved;
  }
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }
  if (filters?.tenantClientId) {
    where.employee = { clientId: filters.tenantClientId };
  }

  const applications = await prisma.leaveRequest.findMany({
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

  return applications.map((app) => ({
    ...app,
    applicationNumber: `LV-${app.id.slice(-6).toUpperCase()}`,
    leaveType: {
      id: app.leaveType,
      code: app.leaveType,
      name: `${app.leaveType} Leave`,
    },
  }));
}

/**
 * Calculates total Loss Of Pay (LOP / UNPAID) days for an employee within a calendar month/year
 * Direct integration with Payroll Engine
 */
export async function calculateEmployeeLopDays(employeeId: string, month: number, year: number): Promise<number> {
  const resolved = await resolveEmployeeObjectId(employeeId) || employeeId;
  const monthStr = String(month).padStart(2, '0');
  const startPrefix = `${year}-${monthStr}`;

  const approvedUnpaid = await prisma.leaveRequest.findMany({
    where: {
      employeeId: resolved,
      leaveType: { in: ['UNPAID', 'LOP'] },
      status: 'APPROVED',
      startDate: { startsWith: `${year}-` },
    },
  });

  let lopDays = 0;
  for (const app of approvedUnpaid) {
    if (app.startDate.startsWith(startPrefix) || app.endDate.startsWith(startPrefix)) {
      lopDays += app.totalDays;
    }
  }

  return lopDays;
}
