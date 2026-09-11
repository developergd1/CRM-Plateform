import { prisma } from './prisma';

interface LogAuditParams {
  actorUserId?: string | null;
  actorEmployeeId?: string | null;
  action: string;
  entityType:
    | 'EMPLOYEE'
    | 'CLIENT'
    | 'DOCUMENT'
    | 'ATTENDANCE'
    | 'SYSTEM'
    | 'TASK'
    | 'LEAVE'
    | 'ASSET'
    | 'AUTH'
    | 'LEAD'
    | 'CONTACT'
    | 'OPPORTUNITY'
    | 'DEAL'
    | 'ACTIVITY'
    | 'NOTE'
    | 'FOLLOW_UP'
    | 'PERMISSION';
  entityId?: string | null;
  previousData?: any;
  newData?: any;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: 'SUCCESS' | 'DENIED' | 'FAILED';
}

/**
 * Append-only immutable audit logging helper.
 */
export async function logAuditEvent(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorEmployeeId: params.actorEmployeeId || 'SYSTEM',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        previousData: params.previousData ? JSON.stringify(params.previousData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        reason: params.reason || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        status: params.status || 'SUCCESS',
      },
    });
  } catch (error) {
    console.error('⚠️ Critical: Failed to record audit log:', error);
    return null;
  }
}

/**
 * Mask Aadhaar number: shows only last 4 digits (e.g. XXXX XXXX 1234)
 */
export function maskAadhaar(raw?: string | null): string {
  if (!raw) return 'XXXX XXXX XXXX';
  const clean = raw.replace(/\D/g, '');
  if (clean.length < 4) return 'XXXX XXXX XXXX';
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

/**
 * Mask PAN number: shows first 5 and last character (e.g. ABCDE****F)
 */
export function maskPAN(raw?: string | null): string {
  if (!raw) return 'XXXXXXXXXX';
  const clean = raw.trim().toUpperCase();
  if (clean.length < 10) return 'XXXXXXXXXX';
  return `${clean.slice(0, 5)}****${clean.slice(-1)}`;
}
