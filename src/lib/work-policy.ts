import { prisma } from './prisma';

export interface WorkPolicyConfig {
  shiftStartTime: string; // e.g. "09:30"
  shiftEndTime: string;   // e.g. "18:30"
  requiredDailyHours: number; // e.g. 8.0
  minFullDayHours?: number; // e.g. 8.0
  gracePeriodMinutes: number; // e.g. 15 mins (late after 09:45)
  lateThresholdMinutes: number; // e.g. 15 mins
  halfDayThresholdHours: number; // e.g. 4.5 hours
  idleThresholdSeconds: number; // e.g. 300 seconds (5 minutes)
  idleThresholdMinutes?: number; // e.g. 5 minutes
  breakLimitMinutes: number; // e.g. 60 minutes
  autoCheckoutHours: number; // e.g. 12 hours
  regularizationWindowDays: number; // e.g. 7 days
  autoCheckoutEnabled?: boolean;
  autoCheckoutTime?: string;
}

export const DEFAULT_WORK_POLICY: WorkPolicyConfig = {
  shiftStartTime: '09:30',
  shiftEndTime: '18:30',
  requiredDailyHours: 8.0,
  minFullDayHours: 8.0,
  gracePeriodMinutes: 15,
  lateThresholdMinutes: 15,
  halfDayThresholdHours: 4.5,
  idleThresholdSeconds: 300, // 5 minutes
  idleThresholdMinutes: 5,
  breakLimitMinutes: 60,
  autoCheckoutHours: 12,
  regularizationWindowDays: 7,
  autoCheckoutEnabled: true,
  autoCheckoutTime: '23:59',
};

/**
 * Resolves the effective policy following hierarchy:
 * Employee Override -> Client Policy -> Global Policy -> Default Fallback
 */
export async function getEffectiveWorkPolicy(options?: {
  employeeId?: string;
  clientId?: string;
}): Promise<WorkPolicyConfig> {
  try {
    // 1. Employee Override
    let empShiftStart: string | undefined;
    let empShiftEnd: string | undefined;

    if (options?.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: options.employeeId },
        select: { shiftStartTime: true, shiftEndTime: true, clientId: true },
      });

      if (emp) {
        if (!options.clientId && emp.clientId) {
          options.clientId = emp.clientId;
        }
        if (emp.shiftStartTime) empShiftStart = emp.shiftStartTime;
        if (emp.shiftEndTime) empShiftEnd = emp.shiftEndTime;
      }

      const empSetting = await prisma.systemSetting.findUnique({
        where: { key: `WORK_POLICY_EMP_${options.employeeId}` },
      });
      if (empSetting?.value) {
        const parsed = JSON.parse(empSetting.value);
        return {
          ...DEFAULT_WORK_POLICY,
          ...parsed,
          shiftStartTime: empShiftStart || parsed.shiftStartTime || DEFAULT_WORK_POLICY.shiftStartTime,
          shiftEndTime: empShiftEnd || parsed.shiftEndTime || DEFAULT_WORK_POLICY.shiftEndTime,
          idleThresholdMinutes: parsed.idleThresholdMinutes || Math.floor((parsed.idleThresholdSeconds || 300) / 60),
        };
      }

      if (empShiftStart || empShiftEnd) {
        let basePolicy = DEFAULT_WORK_POLICY;
        if (options?.clientId) {
          const clientSetting = await prisma.systemSetting.findUnique({
            where: { key: `WORK_POLICY_CLIENT_${options.clientId}` },
          });
          if (clientSetting?.value) {
            basePolicy = { ...DEFAULT_WORK_POLICY, ...JSON.parse(clientSetting.value) };
          }
        }
        return {
          ...basePolicy,
          shiftStartTime: empShiftStart || basePolicy.shiftStartTime,
          shiftEndTime: empShiftEnd || basePolicy.shiftEndTime,
        };
      }
    }

    // 2. Client Policy
    if (options?.clientId) {
      const clientSetting = await prisma.systemSetting.findUnique({
        where: { key: `WORK_POLICY_CLIENT_${options.clientId}` },
      });
      if (clientSetting?.value) {
        const parsed = JSON.parse(clientSetting.value);
        return {
          ...DEFAULT_WORK_POLICY,
          ...parsed,
          idleThresholdMinutes: parsed.idleThresholdMinutes || Math.floor((parsed.idleThresholdSeconds || 300) / 60),
        };
      }
    }

    // 3. Global Platform Policy
    const globalSetting = await prisma.systemSetting.findUnique({
      where: { key: 'WORK_POLICY_GLOBAL' },
    });
    if (globalSetting?.value) {
      const parsed = JSON.parse(globalSetting.value);
      return {
        ...DEFAULT_WORK_POLICY,
        ...parsed,
        idleThresholdMinutes: parsed.idleThresholdMinutes || Math.floor((parsed.idleThresholdSeconds || 300) / 60),
      };
    }
  } catch (error) {
    console.error('Error fetching effective work policy:', error);
  }

  return DEFAULT_WORK_POLICY;
}

export async function saveWorkPolicy(
  level: 'GLOBAL' | 'CLIENT' | 'EMPLOYEE',
  targetId: string | null | undefined,
  policy: Partial<WorkPolicyConfig>,
  updatedBy: string = 'SYSTEM'
) {
  let key = 'WORK_POLICY_GLOBAL';
  if (level === 'CLIENT' && targetId) key = `WORK_POLICY_CLIENT_${targetId}`;
  if (level === 'EMPLOYEE' && targetId) key = `WORK_POLICY_EMP_${targetId}`;

  const current = await getEffectiveWorkPolicy(
    level === 'CLIENT'
      ? { clientId: targetId || undefined }
      : level === 'EMPLOYEE'
      ? { employeeId: targetId || undefined }
      : undefined
  );

  const merged = {
    ...current,
    ...policy,
    idleThresholdSeconds: policy.idleThresholdMinutes ? policy.idleThresholdMinutes * 60 : (policy.idleThresholdSeconds || current.idleThresholdSeconds),
  };

  await prisma.systemSetting.upsert({
    where: { key },
    update: {
      value: JSON.stringify(merged),
      updatedByEmployeeId: updatedBy,
      updatedAt: new Date(),
    },
    create: {
      key,
      value: JSON.stringify(merged),
      category: 'WORK_POLICY',
      description: `${level} Work Policy Configuration`,
      updatedByEmployeeId: updatedBy,
    },
  });

  return merged;
}

export const saveWorkPolicyOverride = saveWorkPolicy;
