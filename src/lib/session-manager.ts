import { prisma } from './prisma';
import { getEffectiveWorkPolicy } from './work-policy';

export interface HeartbeatPayload {
  activeDeltaSeconds?: number;
  idleDeltaSeconds?: number;
  isIdle?: boolean;
  currentRoute?: string;
  actionContext?: string;
  sessionId?: string;
  deltaActiveSeconds?: number;
  deltaIdleSeconds?: number;
}

export interface ActivityEventData {
  employeeId: string;
  clientId?: string;
  eventType: string; // 'PAGE_VIEW' | 'CRM_ACTION' | 'ATTENDANCE_ACTION' | 'IDLE_TRANSITION' | 'WORK_TRANSITION' | 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END'
  module?: string;    // 'CRM' | 'ATTENDANCE' | 'DOCS' | 'DASHBOARD'
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  sessionId?: string;
}

export function getTodayStart(): Date {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  return new Date(`${todayStr}T00:00:00.000Z`);
}

/**
 * Creates or retrieves the active session when user logs in today
 */
export async function getOrCreateActiveSession(userId: string, employeeId: string, ipAddress?: string, userAgent?: string) {
  const todayStart = getTodayStart();

  // Auto-close any unclosed sessions from previous days for this employee
  await prisma.workSession.updateMany({
    where: {
      employeeId,
      loginTimestamp: { lt: todayStart },
      status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
    },
    data: {
      status: 'COMPLETED',
    },
  });

  const existing = await prisma.workSession.findFirst({
    where: {
      employeeId,
      loginTimestamp: { gte: todayStart },
      status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const sessionId = `WS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newSession = await prisma.workSession.create({
    data: {
      sessionId,
      userId,
      employeeId,
      loginTimestamp: new Date(),
      status: 'ACTIVE',
      ipAddress: ipAddress || '127.0.0.1',
      userAgent: userAgent || 'Browser',
      deviceInfo: JSON.stringify({
        lastHeartbeatAt: new Date().toISOString(),
        idleSeconds: 0,
        breakSeconds: 0,
        activeSeconds: 0,
      }),
    },
  });

  return newSession;
}

export async function startOrResumeWorkSession(params: {
  userId: string;
  employeeId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return getOrCreateActiveSession(params.userId, params.employeeId, params.ipAddress, params.userAgent);
}

export async function getEmployeeActiveSession(employeeId: string) {
  const todayStart = getTodayStart();
  return prisma.workSession.findFirst({
    where: {
      employeeId,
      loginTimestamp: { gte: todayStart },
      status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function endWorkSession(sessionId: string) {
  const session = await prisma.workSession.findUnique({
    where: { sessionId },
  });
  if (!session) return null;

  const now = new Date();
  const duration = Math.max(0, Math.floor((now.getTime() - new Date(session.loginTimestamp).getTime()) / 1000));

  return prisma.workSession.update({
    where: { id: session.id },
    data: {
      logoutTimestamp: now,
      status: 'COMPLETED',
      sessionDurationSec: duration,
    },
  });
}

/**
 * Process client heartbeat every 30-60 seconds.
 * Accumulates active & idle seconds, updates lastHeartbeatAt.
 */
export async function processHeartbeat(
  arg1: string | { employeeId: string; userId?: string; sessionId?: string; isIdle?: boolean; deltaActiveSeconds?: number; deltaIdleSeconds?: number },
  arg2?: string,
  arg3?: HeartbeatPayload
) {
  let employeeId: string;
  let userId: string | undefined;
  let payload: HeartbeatPayload;

  if (typeof arg1 === 'object') {
    employeeId = arg1.employeeId;
    userId = arg1.userId;
    payload = {
      isIdle: arg1.isIdle,
      activeDeltaSeconds: arg1.deltaActiveSeconds,
      idleDeltaSeconds: arg1.deltaIdleSeconds,
      sessionId: arg1.sessionId,
    };
  } else {
    userId = arg1;
    employeeId = arg2!;
    payload = arg3 || {};
  }

  const session = await prisma.workSession.findFirst({
    where: payload.sessionId
      ? { sessionId: payload.sessionId }
      : {
          employeeId,
          status: { in: ['ACTIVE', 'IDLE', 'ON_BREAK'] },
        },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Check today's attendance record
  const attendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: today,
      },
    },
    include: { breaks: true },
  });

  const hasOpenBreak = attendance?.breaks?.some((b) => !b.breakEndTime);
  const isCheckedIn = Boolean(attendance?.checkInTime && !attendance?.checkOutTime);

  let meta: any = {};
  try {
    if (session?.deviceInfo && session.deviceInfo.startsWith('{')) {
      meta = JSON.parse(session.deviceInfo);
    }
  } catch (e) {}

  const activeDelta = Math.min(Math.max(0, payload.activeDeltaSeconds ?? payload.deltaActiveSeconds ?? 0), 120);
  const idleDelta = Math.min(Math.max(0, payload.idleDeltaSeconds ?? payload.deltaIdleSeconds ?? 0), 120);

  const prevActive = meta.activeSeconds || session?.activeSeconds || 0;
  const prevIdle = meta.idleSeconds || 0;

  const newActiveSec = prevActive + activeDelta;
  const newIdleSec = prevIdle + idleDelta;

  let sessionStatus = 'ACTIVE';
  if (!isCheckedIn) {
    sessionStatus = 'ACTIVE';
  } else if (hasOpenBreak) {
    sessionStatus = 'ON_BREAK';
  } else if (payload.isIdle) {
    sessionStatus = 'IDLE';
  } else {
    sessionStatus = 'ACTIVE';
  }

  const updatedMeta = {
    ...meta,
    lastHeartbeatAt: now.toISOString(),
    idleSeconds: newIdleSec,
    activeSeconds: newActiveSec,
    currentRoute: payload.currentRoute || meta.currentRoute,
    actionContext: payload.actionContext || meta.actionContext,
    status: sessionStatus,
  };

  if (session) {
    await prisma.workSession.update({
      where: { id: session.id },
      data: {
        activeSeconds: newActiveSec,
        status: sessionStatus,
        deviceInfo: JSON.stringify(updatedMeta),
      },
    });
  }

  return {
    success: true,
    status: sessionStatus,
    activeSeconds: newActiveSec,
    idleSeconds: newIdleSec,
    isCheckedIn,
    hasOpenBreak,
    serverTime: now.toISOString(),
  };
}

/**
 * Log a high-level platform activity event
 */
export async function logActivityEvent(event: ActivityEventData) {
  try {
    const rawKey = 'ACTIVITY_EVENTS_BUFFER';
    const setting = await prisma.systemSetting.findUnique({
      where: { key: rawKey },
    });

    let events: any[] = [];
    if (setting?.value) {
      try {
        events = JSON.parse(setting.value);
      } catch (e) {
        events = [];
      }
    }

    const newEvent = {
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      module: event.module || 'ATTENDANCE',
      ...event,
      timestamp: new Date().toISOString(),
    };

    events.unshift(newEvent);
    if (events.length > 500) events = events.slice(0, 500);

    await prisma.systemSetting.upsert({
      where: { key: rawKey },
      update: { value: JSON.stringify(events), updatedAt: new Date() },
      create: {
        key: rawKey,
        value: JSON.stringify(events),
        category: 'ACTIVITY_LOGS',
        description: 'Aggregated high-level activity events',
      },
    });
  } catch (error) {
    console.error('Failed to log activity event:', error);
  }
}

export const recordActivityEvent = logActivityEvent;

export async function getActivityEventsForSession(sessionIdOrEmployeeId: string) {
  try {
    const rawKey = 'ACTIVITY_EVENTS_BUFFER';
    const setting = await prisma.systemSetting.findUnique({
      where: { key: rawKey },
    });
    if (!setting?.value) return [];
    const allEvents: any[] = JSON.parse(setting.value);
    return allEvents.filter(
      (e) =>
        e.sessionId === sessionIdOrEmployeeId ||
        e.employeeId === sessionIdOrEmployeeId ||
        e.metadata?.sessionId === sessionIdOrEmployeeId
    );
  } catch (e) {
    return [];
  }
}

export function evaluateWorkforceStatus(params: {
  attendance: any;
  activeSession: any;
  staleThresholdMinutes?: number;
}): 'WORKING' | 'IDLE' | 'ON_BREAK' | 'OFFLINE' | 'MISSING_CHECKIN' {
  const { attendance, activeSession, staleThresholdMinutes = 5 } = params;

  if (!activeSession || activeSession.status === 'COMPLETED') {
    return 'OFFLINE';
  }

  // If session is from a previous day, always offline
  const todayStart = getTodayStart();
  if (new Date(activeSession.loginTimestamp) < todayStart) {
    return 'OFFLINE';
  }

  // Check heartbeat or session age
  let lastHeartbeat: Date | null = null;
  try {
    if (activeSession.deviceInfo?.startsWith('{')) {
      const meta = JSON.parse(activeSession.deviceInfo);
      if (meta.lastHeartbeatAt) lastHeartbeat = new Date(meta.lastHeartbeatAt);
    }
  } catch (e) {}

  const now = new Date();
  const sessionAgeMs = now.getTime() - new Date(activeSession.loginTimestamp).getTime();
  const heartbeatAgeMs = lastHeartbeat ? now.getTime() - lastHeartbeat.getTime() : sessionAgeMs;

  // If no heartbeat for > 15m, user is offline
  if (heartbeatAgeMs > 15 * 60 * 1000) {
    return 'OFFLINE';
  }

  // Check-out done
  if (attendance?.checkOutTime) {
    return 'OFFLINE';
  }

  // Has active session but hasn't checked in for today
  if (!attendance || !attendance.checkInTime) {
    // Only show MISSING_CHECKIN if the heartbeat is within 10 minutes, otherwise OFFLINE
    if (heartbeatAgeMs <= 10 * 60 * 1000) {
      return 'MISSING_CHECKIN';
    }
    return 'OFFLINE';
  }

  // Active break in progress
  const activeBreak = attendance.breaks?.find((b: any) => !b.breakEndTime);
  if (activeBreak || activeSession.status === 'ON_BREAK') {
    return 'ON_BREAK';
  }

  if (activeSession.status === 'IDLE' || heartbeatAgeMs > staleThresholdMinutes * 60 * 1000) {
    return 'IDLE';
  }

  return 'WORKING';
}
