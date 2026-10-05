import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function getHrmConfiguration(clientId?: string | null) {
  let config = await prisma.hrmConfiguration.findFirst({
    where: clientId ? { clientId } : { clientId: null },
  });

  if (!config) {
    config = await prisma.hrmConfiguration.create({
      data: {
        clientId: clientId || null,
        workingDaysPerMonth: 26,
        lopPolicy: 'WORKING_DAYS', // 'WORKING_DAYS' | 'CALENDAR_DAYS' | 'PAYABLE_DAYS'
        payCycle: 'MONTHLY',
        overtimeRatePerHour: 200,
        overtimeMultiplier: 1.5,
        overtimeRequiresApproval: true,
        pmsReviewFrequency: 'QUARTERLY',
        pmsRatingScale: 5,
        autoAppraisalToPayroll: false, // Strictly false: "Only an approved appraisal decision can affect payroll"
        requireHrApprovalForLeave: true,
        requireAdminSignoffForPayroll: true,
      },
    });
  }

  return config;
}

export async function updateHrmConfiguration(
  input: {
    workingDaysPerMonth?: number;
    lopPolicy?: 'WORKING_DAYS' | 'CALENDAR_DAYS' | 'PAYABLE_DAYS';
    payCycle?: string;
    overtimeRatePerHour?: number;
    overtimeMultiplier?: number;
    overtimeRequiresApproval?: boolean;
    pmsReviewFrequency?: string;
    pmsRatingScale?: number;
    requireHrApprovalForLeave?: boolean;
    requireAdminSignoffForPayroll?: boolean;
  },
  clientId: string | null | undefined,
  user: { id: string; fullName: string }
) {
  let config = await prisma.hrmConfiguration.findFirst({
    where: clientId ? { clientId } : { clientId: null },
  });

  if (!config) {
    config = await getHrmConfiguration(clientId);
  }

  const updated = await prisma.hrmConfiguration.update({
    where: { id: config.id },
    data: {
      ...(input.workingDaysPerMonth !== undefined && { workingDaysPerMonth: input.workingDaysPerMonth }),
      ...(input.lopPolicy !== undefined && { lopPolicy: input.lopPolicy }),
      ...(input.payCycle !== undefined && { payCycle: input.payCycle }),
      ...(input.overtimeRatePerHour !== undefined && { overtimeRatePerHour: input.overtimeRatePerHour }),
      ...(input.overtimeMultiplier !== undefined && { overtimeMultiplier: input.overtimeMultiplier }),
      ...(input.overtimeRequiresApproval !== undefined && { overtimeRequiresApproval: input.overtimeRequiresApproval }),
      ...(input.pmsReviewFrequency !== undefined && { pmsReviewFrequency: input.pmsReviewFrequency }),
      ...(input.pmsRatingScale !== undefined && { pmsRatingScale: input.pmsRatingScale }),
      ...(input.requireHrApprovalForLeave !== undefined && { requireHrApprovalForLeave: input.requireHrApprovalForLeave }),
      ...(input.requireAdminSignoffForPayroll !== undefined && { requireAdminSignoffForPayroll: input.requireAdminSignoffForPayroll }),
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'UPDATE',
    entityType: 'CONFIGURATION',
    entityId: updated.id,
    reason: `Updated HRM/Payroll/PMS configuration policies`,
  });

  return updated;
}
