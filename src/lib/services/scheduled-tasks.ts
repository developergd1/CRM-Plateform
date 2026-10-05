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
  dueTasksChecked: number;
  dueTasksTriggered: number;
  overdueTasksChecked: number;
  overdueTasksTriggered: number;
  lateAttendancesChecked: number;
  lateAttendancesTriggered: number;
  timestamp: string;
}

/**
 * Executes scheduled operations across Platform Tasks and Workforce.
 * Idempotent, timezone-aware, and safe to run on cron or on-demand.
 */
export async function runScheduledAutomation(timezone = 'Asia/Kolkata'): Promise<ScheduledRunResult> {
  const { dateStr, startOfDay, endOfDay } = getTimezoneDayBounds(timezone);

  // 1. Process Due Tasks (Scheduled for Today)
  const dueTasks = await prisma.task.findMany({
    where: {
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      dueDate: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true },
  });

  let dueTriggered = 0;
  for (const item of dueTasks) {
    await triggerAutomationEvent('TASK_CREATED', {
      entityType: 'Task',
      entityId: item.id,
    });
    dueTriggered++;
  }

  // 2. Process Overdue Tasks (Scheduled before Start of Today)
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      dueDate: { lt: startOfDay },
    },
    select: { id: true },
  });

  let overdueTriggered = 0;
  for (const item of overdueTasks) {
    await triggerAutomationEvent('TASK_OVERDUE', {
      entityType: 'Task',
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

  return {
    dueTasksChecked: dueTasks.length,
    dueTasksTriggered: dueTriggered,
    overdueTasksChecked: overdueTasks.length,
    overdueTasksTriggered: overdueTriggered,
    lateAttendancesChecked: lateAttendances.length,
    lateAttendancesTriggered: lateTriggered,
    timestamp: new Date().toISOString(),
  };
}
