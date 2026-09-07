import { WorkPolicyConfig } from './work-policy';

export interface AttendanceMetrics {
  scheduledHours: number;
  sessionDurationSeconds: number;
  attendanceDurationSeconds: number;
  attendanceMinutes: number;
  netWorkSeconds: number;
  netWorkMinutes: number;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  totalBreakMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  isEarlyCheckout: boolean;
  overtimeMinutes: number;
  status: string;
}

export interface CalculateMetricsParams {
  attendance?: any;
  activeSession?: any;
  policy: WorkPolicyConfig;
  now?: Date;
}

export function calculateAttendanceMetrics(
  arg1: Date | string | null | CalculateMetricsParams,
  arg2?: Date | string | null,
  arg3?: Array<{ breakStartTime: Date | string; breakEndTime?: Date | string | null; durationMinutes?: number }>,
  arg4?: Date | string | null,
  arg5: number = 0,
  arg6: number = 0,
  arg7?: WorkPolicyConfig,
  arg8: string = 'PRESENT'
): AttendanceMetrics {
  let checkInTime: Date | string | null = null;
  let checkOutTime: Date | string | null = null;
  let breaks: Array<{ breakStartTime: Date | string; breakEndTime?: Date | string | null; durationMinutes?: number }> = [];
  let loginTime: Date | string | null = null;
  let sessionActiveSeconds: number = 0;
  let sessionIdleSeconds: number = 0;
  let policy: WorkPolicyConfig;
  let currentStatus: string = 'PRESENT';

  if (arg1 && typeof arg1 === 'object' && ('policy' in arg1 || 'attendance' in arg1)) {
    const params = arg1 as CalculateMetricsParams;
    policy = params.policy;
    const att = params.attendance;
    if (att) {
      checkInTime = att.checkInTime || null;
      checkOutTime = att.checkOutTime || null;
      breaks = att.breaks || [];
      currentStatus = att.status || 'PRESENT';
    }
    const sess = params.activeSession;
    if (sess) {
      loginTime = sess.loginTimestamp || null;
      sessionActiveSeconds = sess.activeSeconds || 0;
      try {
        if (sess.deviceInfo?.startsWith('{')) {
          const meta = JSON.parse(sess.deviceInfo);
          sessionIdleSeconds = meta.idleSeconds || 0;
        }
      } catch (e) {}
    }
  } else {
    checkInTime = arg1 as Date | string | null;
    checkOutTime = arg2 || null;
    breaks = arg3 || [];
    loginTime = arg4 || null;
    sessionActiveSeconds = arg5;
    sessionIdleSeconds = arg6;
    policy = arg7!;
    currentStatus = arg8;
  }

  const now = new Date();
  const checkIn = checkInTime ? new Date(checkInTime) : null;
  const checkOut = checkOutTime ? new Date(checkOutTime) : null;
  const login = loginTime ? new Date(loginTime) : null;

  // 1. Session Duration (Login time until logout or now)
  const sessionDurationSeconds = login
    ? Math.max(0, Math.floor(((checkOut || now).getTime() - login.getTime()) / 1000))
    : 0;

  // 2. Attendance Duration (Check-in until Check-out or now)
  const attendanceDurationSeconds = checkIn
    ? Math.max(0, Math.floor(((checkOut || now).getTime() - checkIn.getTime()) / 1000))
    : 0;
  const attendanceMinutes = Math.floor(attendanceDurationSeconds / 60);

  // 3. Break Duration
  let totalBreakSeconds = 0;
  breaks.forEach((b) => {
    if (b.breakEndTime) {
      totalBreakSeconds += Math.max(0, Math.floor((new Date(b.breakEndTime).getTime() - new Date(b.breakStartTime).getTime()) / 1000));
    } else {
      totalBreakSeconds += Math.max(0, Math.floor((now.getTime() - new Date(b.breakStartTime).getTime()) / 1000));
    }
  });
  const totalBreakMinutes = Math.floor(totalBreakSeconds / 60);

  // 4. Net Working Seconds (Attendance time minus break time)
  const netWorkSeconds = Math.max(0, attendanceDurationSeconds - totalBreakSeconds);
  const netWorkMinutes = Math.floor(netWorkSeconds / 60);

  // 5. Active & Idle Time
  const idleSeconds = Math.max(0, sessionIdleSeconds);
  const activeSeconds = Math.max(0, sessionActiveSeconds > 0 ? sessionActiveSeconds : netWorkSeconds - idleSeconds);

  // 6. Shift and Late check
  let lateMinutes = 0;
  let isLate = false;
  if (checkIn && policy?.shiftStartTime) {
    const [shiftH, shiftM] = policy.shiftStartTime.split(':').map(Number);
    const graceTime = new Date(checkIn);
    graceTime.setHours(shiftH, shiftM + (policy.gracePeriodMinutes || 15), 0, 0);

    if (checkIn > graceTime) {
      isLate = true;
      const shiftStartTime = new Date(checkIn);
      shiftStartTime.setHours(shiftH, shiftM, 0, 0);
      lateMinutes = Math.max(0, Math.floor((checkIn.getTime() - shiftStartTime.getTime()) / 60000));
    }
  }

  // 7. Early Exit and Overtime
  const requiredSeconds = (policy?.requiredDailyHours || 8) * 3600;
  const halfDaySeconds = (policy?.halfDayThresholdHours || 4.5) * 3600;

  const isEarlyCheckout = checkOut !== null && netWorkSeconds < requiredSeconds - 1800; // 30m buffer
  const overtimeMinutes = checkOut !== null && netWorkSeconds > requiredSeconds
    ? Math.floor((netWorkSeconds - requiredSeconds) / 60)
    : 0;

  // 8. Resolved Status
  let resolvedStatus = currentStatus || 'PRESENT';
  if (!checkIn) {
    resolvedStatus = 'ABSENT';
  } else if (checkOut) {
    if (netWorkSeconds >= requiredSeconds) {
      resolvedStatus = isLate ? 'LATE' : (currentStatus === 'WFH' ? 'WFH' : 'PRESENT');
    } else if (netWorkSeconds >= halfDaySeconds) {
      resolvedStatus = 'HALF_DAY';
    } else if (netWorkSeconds < 3600) {
      resolvedStatus = 'EARLY_EXIT';
    } else {
      resolvedStatus = 'HALF_DAY';
    }
  } else if (!checkOut && attendanceDurationSeconds > 0) {
    resolvedStatus = isLate ? 'LATE' : (currentStatus === 'WFH' ? 'WFH' : 'PRESENT');
  }

  return {
    scheduledHours: policy?.requiredDailyHours || 8,
    sessionDurationSeconds,
    attendanceDurationSeconds,
    attendanceMinutes,
    netWorkSeconds,
    netWorkMinutes,
    activeSeconds,
    idleSeconds,
    breakSeconds: totalBreakSeconds,
    totalBreakMinutes,
    lateMinutes,
    isLate,
    isEarlyCheckout,
    overtimeMinutes,
    status: resolvedStatus,
  };
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}
