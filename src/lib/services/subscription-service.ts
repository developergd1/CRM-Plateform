import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export interface PlanDefinition {
  name: string;
  description: string;
  monthlyPriceInr: number;
  yearlyPriceInr: number;
  maxEmployees: number;
  maxUsers: number;
  maxAdminUsers: number;
  storageLimitGb: number;
  allowedModules: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export const SAAS_PLANS: Record<string, PlanDefinition> = {
  TRIAL: {
    name: 'Evaluation Trial',
    description: 'Trial environment with strict employee limit for testing',
    monthlyPriceInr: 0,
    yearlyPriceInr: 0,
    maxEmployees: 2,
    maxUsers: 2,
    maxAdminUsers: 1,
    storageLimitGb: 1,
    allowedModules: ['EMS', 'Attendance', 'Leave'],
    status: 'ACTIVE',
  },
  STARTER: {
    name: 'Starter Plan',
    description: 'Essential core workforce and client operations for small teams',
    monthlyPriceInr: 4999,
    yearlyPriceInr: 49990,
    maxEmployees: 25,
    maxUsers: 5,
    maxAdminUsers: 2,
    storageLimitGb: 5,
    allowedModules: ['EMS', 'Attendance', 'Leave', 'Documents'],
    status: 'ACTIVE',
  },
  STANDARD: {
    name: 'Growth Standard',
    description: 'Comprehensive business administration with client workforce and attendance automation',
    monthlyPriceInr: 12999,
    yearlyPriceInr: 129990,
    maxEmployees: 100,
    maxUsers: 25,
    maxAdminUsers: 5,
    storageLimitGb: 25,
    allowedModules: ['EMS', 'Attendance', 'Leave', 'Documents', 'Tasks', 'Reports'],
    status: 'ACTIVE',
  },
  ENTERPRISE: {
    name: 'Enterprise HRM Suite',
    description: 'Full-stack enterprise HRM, recruitment ATS, payroll disbursement, and advanced analytics',
    monthlyPriceInr: 29999,
    yearlyPriceInr: 299990,
    maxEmployees: 1000,
    maxUsers: 250,
    maxAdminUsers: 25,
    storageLimitGb: 100,
    allowedModules: [
      'EMS',
      'HRM',
      'Attendance',
      'Leave',
      'Documents',
      'Tasks',
      'Payroll',
      'Payslip',
      'Recruitment',
      'Performance',
      'Expense',
      'Asset',
      'Shift',
      'Reports',
    ],
    status: 'ACTIVE',
  },
  CUSTOM: {
    name: 'Custom Enterprise Quota',
    description: 'Customized workforce onboarding capacity configured by Platform Administrator',
    monthlyPriceInr: 0,
    yearlyPriceInr: 0,
    maxEmployees: 100,
    maxUsers: 50,
    maxAdminUsers: 10,
    storageLimitGb: 50,
    allowedModules: ['EMS', 'HRM'],
    status: 'ACTIVE',
  },
};

/**
 * Validates whether a client organization is authorized to onboard another employee under their subscription.
 */
export async function canAddEmployee(clientId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number;
  planName: string;
}> {
  const client = await prisma.client.findFirst({
    where: { OR: [{ id: clientId }, { clientId }] },
    select: {
      id: true,
      companyName: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      assignedModules: true,
      tags: true,
    },
  });

  if (!client) {
    return { allowed: true, currentCount: 0, maxAllowed: 9999, planName: 'INTERNAL' };
  }

  const subStatus = (client.subscriptionStatus || 'ACTIVE').toUpperCase();
  if (subStatus === 'EXPIRED' || subStatus === 'SUSPENDED' || subStatus === 'CANCELLED') {
    return {
      allowed: false,
      reason: `Client organization "${client.companyName}" subscription is currently ${subStatus}. New employee additions are restricted.`,
      currentCount: 0,
      maxAllowed: 0,
      planName: client.subscriptionPlan || 'STANDARD',
    };
  }

  const planKey = (client.subscriptionPlan || 'STANDARD').toUpperCase();
  const plan = SAAS_PLANS[planKey] || SAAS_PLANS.STANDARD;

  // Check for admin-configured custom employee limit in client tags
  let effectiveMax = plan.maxEmployees;
  if (client.tags && client.tags.startsWith('{')) {
    try {
      const parsed = JSON.parse(client.tags);
      if (parsed.maxEmployees !== undefined && parsed.maxEmployees !== null && Number(parsed.maxEmployees) > 0) {
        effectiveMax = Number(parsed.maxEmployees);
      }
    } catch {}
  }

  const currentCount = await prisma.employee.count({
    where: {
      clientId: client.id,
      status: { notIn: ['ARCHIVED', 'EXITED'] },
    },
  });

  if (currentCount >= effectiveMax) {
    return {
      allowed: false,
      reason: `Quota limit reached: Client "${client.companyName}" is set to a limit of ${effectiveMax} active employees. Currently utilizing ${currentCount}/${effectiveMax}. Please contact Platform Administrator to increase your onboarding quota.`,
      currentCount,
      maxAllowed: effectiveMax,
      planName: plan.name,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: effectiveMax,
    planName: plan.name,
  };
}

/**
 * Validates whether a client organization has module permission and active subscription.
 */
export async function canAccessModule(
  clientId: string,
  moduleName: string
): Promise<{ allowed: boolean; reason?: string }> {
  const client = await prisma.client.findFirst({
    where: { OR: [{ id: clientId }, { clientId }] },
    select: {
      id: true,
      companyName: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      assignedModules: true,
    },
  });

  if (!client) return { allowed: true };

  const subStatus = (client.subscriptionStatus || 'ACTIVE').toUpperCase();
  if (subStatus === 'EXPIRED' || subStatus === 'SUSPENDED' || subStatus === 'CANCELLED') {
    return {
      allowed: false,
      reason: `Subscription ${subStatus}: Access to ${moduleName} is currently disabled for ${client.companyName}.`,
    };
  }

  const normalizedMod = moduleName.toUpperCase();
  const assigned = (client.assignedModules || []).map((m) => m.toUpperCase());

  if (!assigned.includes(normalizedMod) && !assigned.includes('ALL')) {
    return {
      allowed: false,
      reason: `Module ${moduleName} is not assigned to ${client.companyName}.`,
    };
  }

  return { allowed: true };
}

/**
 * Gets real-time subscription telemetry and usage quotas.
 */
export async function getClientSubscriptionUsage(clientId: string) {
  const client = await prisma.client.findFirst({
    where: { OR: [{ id: clientId }, { clientId }] },
    select: {
      id: true,
      clientId: true,
      companyName: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      assignedModules: true,
      tags: true,
      dateAdded: true,
    },
  });

  if (!client) return null;

  const planKey = (client.subscriptionPlan || 'STANDARD').toUpperCase();
  const plan = SAAS_PLANS[planKey] || SAAS_PLANS.STANDARD;

  let effectiveMax = plan.maxEmployees;
  if (client.tags && client.tags.startsWith('{')) {
    try {
      const parsed = JSON.parse(client.tags);
      if (parsed.maxEmployees !== undefined && parsed.maxEmployees !== null && Number(parsed.maxEmployees) > 0) {
        effectiveMax = Number(parsed.maxEmployees);
      }
    } catch {}
  }

  const employeeCount = await prisma.employee.count({
    where: { clientId: client.id, status: { notIn: ['ARCHIVED', 'EXITED'] } },
  });

  const userCount = await prisma.user.count({
    where: { parentClientId: client.id, isActive: true },
  });

  return {
    clientId: client.clientId,
    companyName: client.companyName,
    plan: plan.name,
    planKey,
    status: client.subscriptionStatus || 'ACTIVE',
    startDate: client.dateAdded,
    usage: {
      employees: {
        current: employeeCount,
        max: effectiveMax,
        percentage: Math.min(100, Math.round((employeeCount / effectiveMax) * 100)),
        isNearLimit: employeeCount >= effectiveMax * 0.85,
        isLimitReached: employeeCount >= effectiveMax,
      },
      users: {
        current: userCount,
        max: plan.maxUsers,
        percentage: Math.min(100, Math.round((userCount / plan.maxUsers) * 100)),
        isNearLimit: userCount >= plan.maxUsers * 0.85,
        isLimitReached: userCount >= plan.maxUsers,
      },
      storageGb: {
        limit: plan.storageLimitGb,
      },
    },
    assignedModules: client.assignedModules || [],
    allowedModules: plan.allowedModules,
  };
}
