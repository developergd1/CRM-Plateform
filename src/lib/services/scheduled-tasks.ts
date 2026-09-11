import { prisma } from '@/lib/prisma';
import { triggerAutomationEvent } from './automation-service';

/**
 * Returns boundaries of "Today" in the specified timezone (default: Asia/Kolkata).
 */
export function getTimezoneDayBounds(timezone = 'Asia/Kolkata') {
  const now = new Date();
  
  // Format string in target timezone: 'YYYY-MM-DD'
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now); // e.g. "2026-09-08"

  const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  return { dateStr, startOfDay, endOfDay };
}

export interface ScheduledRunResult {
  dueFollowUpsChecked: number;
  dueFollowUpsTriggered: number;
  overdueFollowUpsChecked: number;
  overdueFollowUpsTriggered: number;
  lateAttendancesChecked: number;
  lateAttendancesTriggered: number;
  staleDealsChecked: number;
  timestamp: string;
}

/**
 * Executes scheduled operations across CRM and Workforce.
 * Idempotent, timezone-aware, and safe to run on cron or on-demand.
 */
export async function runScheduledAutomation(timezone = 'Asia/Kolkata'): Promise<ScheduledRunResult> {
  const { dateStr, startOfDay, endOfDay } = getTimezoneDayBounds(timezone);

  // 1. Process Due Follow-ups (Scheduled for Today)
  const dueFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true },
  });

  let dueTriggered = 0;
  for (const item of dueFollowUps) {
    await triggerAutomationEvent('FOLLOW_UP_DUE', {
      entityType: 'FollowUp',
      entityId: item.id,
    });
    dueTriggered++;
  }

  // 2. Process Overdue Follow-ups (Scheduled before Start of Today)
  const overdueFollowUps = await prisma.followUp.findMany({
    where: {
      status: 'PENDING',
      scheduledAt: { lt: startOfDay },
    },
    select: { id: true },
  });

  let overdueTriggered = 0;
  for (const item of overdueFollowUps) {
    await triggerAutomationEvent('FOLLOW_UP_OVERDUE', {
      entityType: 'FollowUp',
      entityId: item.id,
    });
    overdueTriggered++;
  }

  // 3. Process Late Attendances Today
  const lateAttendances = await prisma.attendance.findMany({
    where: {
      date: dateStr,
      isLate: true,
    },
    select: { id: true },
  });

  let lateTriggered = 0;
  for (const att of lateAttendances) {
    await triggerAutomationEvent('ATTENDANCE_LATE', {
      entityType: 'Attendance',
      entityId: att.id,
    });
    lateTriggered++;
  }

  // 4. Stale Deals Check (> 21 days with no updates)
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 3600 * 1000);
  const staleDeals = await prisma.deal.findMany({
    where: {
      status: 'OPEN',
      updatedAt: { lt: twentyOneDaysAgo },
    },
    select: { id: true, title: true, assignedToId: true },
  });

  return {
    dueFollowUpsChecked: dueFollowUps.length,
    dueFollowUpsTriggered: dueTriggered,
    overdueFollowUpsChecked: overdueFollowUps.length,
    overdueFollowUpsTriggered: overdueTriggered,
    lateAttendancesChecked: lateAttendances.length,
    lateAttendancesTriggered: lateTriggered,
    staleDealsChecked: staleDeals.length,
    timestamp: new Date().toISOString(),
  };
}
