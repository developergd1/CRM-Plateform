import { prisma } from '@/lib/prisma';
import { getTimezoneDayBounds } from './scheduled-tasks';

export type DateFilterPreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'ALL_TIME'
  | 'CUSTOM';

export interface DateRangeOptions {
  preset?: DateFilterPreset;
  startDate?: string; // ISO string or YYYY-MM-DD
  endDate?: string;   // ISO string or YYYY-MM-DD
  timezone?: string;  // Default: Asia/Kolkata
}

export interface DateRangeBounds {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Calculates start and end Date objects based on preset or custom range.
 */
export function resolveDateRange(options: DateRangeOptions): DateRangeBounds {
  const timezone = options.timezone || 'Asia/Kolkata';
  const now = new Date();

  const preset = (options.preset || 'THIS_MONTH').toUpperCase() as DateFilterPreset;

  if (preset === 'CUSTOM' && options.startDate && options.endDate) {
    return {
      start: new Date(options.startDate),
      end: new Date(new Date(options.endDate).setHours(23, 59, 59, 999)),
      label: 'Custom Range',
    };
  }

  const todayBounds = getTimezoneDayBounds(timezone);

  switch (preset) {
    case 'TODAY': {
      return {
        start: todayBounds.startOfDay,
        end: todayBounds.endOfDay,
        label: 'Today',
      };
    }

    case 'YESTERDAY': {
      const yStart = new Date(todayBounds.startOfDay.getTime() - 24 * 3600 * 1000);
      const yEnd = new Date(todayBounds.endOfDay.getTime() - 24 * 3600 * 1000);
      return {
        start: yStart,
        end: yEnd,
        label: 'Yesterday',
      };
    }

    case 'THIS_WEEK': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday.getTime() + 6 * 24 * 3600 * 1000);
      sunday.setHours(23, 59, 59, 999);
      return {
        start: monday,
        end: sunday,
        label: 'This Week',
      };
    }

    case 'THIS_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start: firstDay,
        end: lastDay,
        label: 'This Month',
      };
    }

    case 'LAST_MONTH': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        start: firstDay,
        end: lastDay,
        label: 'Last Month',
      };
    }

    case 'THIS_QUARTER': {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
      return {
        start: firstDay,
        end: lastDay,
        label: 'This Quarter',
      };
    }

    case 'THIS_YEAR': {
      const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        start: firstDay,
        end: lastDay,
        label: 'This Year',
      };
    }

    case 'ALL_TIME':
    default: {
      return {
        start: new Date(2020, 0, 1),
        end: new Date(2035, 11, 31),
        label: 'All Time',
      };
    }
  }
}

/**
 * Generates comprehensive Executive Dashboard metrics for Workforce, Clients, Tasks, and Governance.
 */
export async function getExecutiveDashboardMetrics(options: DateRangeOptions, user: any) {
  const { start, end, label } = resolveDateRange(options);
  const { dateStr, startOfDay: todayStart, endOfDay: todayEnd } = getTimezoneDayBounds(options.timezone);
  const now = new Date();

  const isClientUser = user?.role === 'CLIENT';
  let clientFilter: any = {};

  if (isClientUser) {
    const isValidObjectId = user?.id && /^[0-9a-fA-F]{24}$/.test(user.id);
    const clientRecord = await prisma.client.findFirst({
      where: {
        OR: [
          ...(isValidObjectId ? [{ userId: user.id }] : []),
          ...(user.clientId ? [{ clientId: user.clientId }] : []),
        ],
      },
      select: { id: true },
    });
    if (clientRecord) {
      clientFilter = { clientId: clientRecord.id };
    }
  }

  // ----------------------------------------------------
  // 1. LIVE WORKFORCE & ATTENDANCE TELEMETRY
  // ----------------------------------------------------
  const [
    totalClients,
    activeClients,
    totalEmployees,
    blockedEmployees,
    todayAttendanceRecords,
    activeSessionsCount,
    recentlyAddedClients,
    clientsWithoutEmployeesList,
    pendingRegularizations,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.employee.count({
      where: {
        status: { not: 'DELETED' },
        ...clientFilter,
        employeeId: { not: 'GI-EMP-000001' },
      },
    }),
    prisma.employee.count({
      where: {
        OR: [{ status: 'BLOCKED' }, { isBlocked: true }],
        ...clientFilter,
        employeeId: { not: 'GI-EMP-000001' },
      },
    }),
    prisma.attendance.findMany({
      where: {
        date: dateStr,
        employee: {
          ...clientFilter,
          employeeId: { not: 'GI-EMP-000001' },
        },
      },
      select: {
        id: true,
        employeeId: true,
        checkInTime: true,
        checkOutTime: true,
        isLate: true,
        status: true,
        breaks: {
          select: {
            breakStartTime: true,
            breakEndTime: true,
          },
        },
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
    }),
    prisma.activeUserSession.count({
      where: {
        isValid: true,
        expiresAt: { gt: now },
      },
    }),
    prisma.client.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        companyName: true,
        contactPerson: true,
        industry: true,
        createdAt: true,
        _count: { select: { employees: true } },
      },
    }),
    prisma.client.findMany({
      where: {
        status: 'ACTIVE',
        employees: { none: {} },
      },
      take: 6,
      select: {
        id: true,
        clientId: true,
        companyName: true,
        contactPerson: true,
        mobile: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        date: dateStr,
        status: 'PENDING_REGULARIZATION' as any,
      },
      take: 10,
    }),
  ]);

  const clientsWithoutEmployeesCount = clientsWithoutEmployeesList.length;

  let workingNow = 0;
  let onBreak = 0;
  let checkedOut = 0;
  let lateToday = 0;
  const currentlyWorkingEmployees: any[] = [];

  todayAttendanceRecords.forEach((att) => {
    if (att.isLate) lateToday += 1;

    if (att.checkInTime && !att.checkOutTime) {
      const hasOpenBreak = att.breaks.some((b) => !b.breakEndTime);
      if (hasOpenBreak) {
        onBreak += 1;
      } else {
        workingNow += 1;
        if (att.employee) {
          currentlyWorkingEmployees.push({
            id: att.employee.id,
            employeeId: att.employee.employeeId,
            fullName: att.employee.fullName,
            designation: att.employee.designation,
            departmentName: att.employee.departmentName,
            checkInTime: att.checkInTime,
          });
        }
      }
    } else if (att.checkOutTime) {
      checkedOut += 1;
    }
  });

  const presentToday = todayAttendanceRecords.length;
  const absentToday = Math.max(0, totalEmployees - presentToday);
  const offline = Math.max(0, totalEmployees - (workingNow + onBreak));
  const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  // ----------------------------------------------------
  // 2. TASKS & PENDING REQUESTS
  // ----------------------------------------------------
  const [
    openTasksCount,
    urgentTasks,
    settingsRecords,
    failedAutomationsCount,
  ] = await Promise.all([
    prisma.task.count({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'WAITING_FOR_REVIEW'] },
      },
    }),
    prisma.task.findMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'WAITING_FOR_REVIEW'] },
      },
      take: 5,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      select: {
        id: true,
        taskNumber: true,
        title: true,
        priority: true,
        status: true,
        dueDate: true,
        assignedTo: { select: { fullName: true } },
      },
    }),
    prisma.systemSetting.findMany({
      where: {
        key: { in: ['PASSWORD_RESET_REQUESTS', 'ATTENDANCE_REGULARIZATIONS'] },
      },
    }),
    !isClientUser
      ? prisma.automationLog.count({
          where: { status: 'FAILED' },
        })
      : Promise.resolve(0),
  ]);

  let pendingPasswordRequests: any[] = [];
  settingsRecords.forEach((s) => {
    if (s.key === 'PASSWORD_RESET_REQUESTS' && s.value) {
      try {
        const parsed = JSON.parse(s.value);
        if (Array.isArray(parsed)) {
          pendingPasswordRequests = parsed.filter((r: any) => r.status === 'PENDING');
        }
      } catch {}
    }
  });

  const pendingRequestsCount = pendingPasswordRequests.length + pendingRegularizations.length;

  // Format Actionable Alerts
  const actionableAlerts: any[] = [];

  if (pendingPasswordRequests.length > 0) {
    actionableAlerts.push({
      id: 'alert-pwd',
      type: 'PASSWORD_REQUEST',
      title: `${pendingPasswordRequests.length} Password Reset Request${pendingPasswordRequests.length > 1 ? 's' : ''}`,
      description: 'Employees or clients waiting for administrative password reset authorization.',
      severity: 'HIGH',
      badge: 'Auth Security',
      count: pendingPasswordRequests.length,
      actionTab: 'password-requests',
    });
  }

  if (lateToday > 0) {
    actionableAlerts.push({
      id: 'alert-late',
      type: 'ATTENDANCE_ALERT',
      title: `${lateToday} Late Punch-In${lateToday > 1 ? 's' : ''} Today`,
      description: 'Employees clocked in after standard grace threshold.',
      severity: 'LOW',
      badge: 'Workforce',
      count: lateToday,
      actionTab: 'attendance',
    });
  }

  if (blockedEmployees > 0) {
    actionableAlerts.push({
      id: 'alert-sec',
      type: 'SECURITY_ALERT',
      title: `${blockedEmployees} Blocked Employee Account${blockedEmployees > 1 ? 's' : ''}`,
      description: 'Staff restricted from system access due to active security blocks.',
      severity: 'MEDIUM',
      badge: 'Security',
      count: blockedEmployees,
      actionTab: 'block-history',
    });
  }

  // ----------------------------------------------------
  // 3. RECENT ACTIVITY TIMELINE (Audit Logs)
  // ----------------------------------------------------
  const recentAuditLogs = await prisma.auditLog.findMany({
    take: 8,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      reason: true,
      timestamp: true,
      actorUser: { select: { email: true } },
    },
  });

  const recentTimeline = recentAuditLogs.map((audit) => ({
    id: `aud-${audit.id}`,
    type: audit.action,
    title: `${audit.action.replace(/_/g, ' ')} (${audit.entityType})`,
    subtitle: audit.reason || `Entity ID: ${audit.entityId || 'N/A'}`,
    actor: audit.actorUser?.email?.split('@')[0] || 'Administrator',
    timestamp: audit.timestamp,
    source: 'AUDIT',
  }));

  // ----------------------------------------------------
  // ASSEMBLE EXECUTIVE DATA RESPONSE
  // ----------------------------------------------------
  return {
    dateRange: {
      label,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    // Section 1: Executive KPI Cards
    kpis: {
      totalClients,
      totalEmployees,
      workingNow,
      onBreak,
      absentToday,
      attendancePercentage,
    },
    // Section 2: Workforce Overview
    workforceOverview: {
      workingNow,
      onBreak,
      offline,
      absent: absentToday,
      lateToday,
      attendancePercentage,
      currentlyWorkingEmployees,
    },
    // Section 3: Tasks & Operations
    tasksAndFollowUps: {
      openTasksCount,
      pendingRequestsCount,
      urgentTasks,
    },
    // Section 4: Client Overview
    clientOverview: {
      totalClients,
      activeClients,
      recentlyAddedClients,
      clientsWithoutEmployeesCount,
      clientsWithoutEmployeesList,
    },
    // Section 5: Actionable Alerts & Notifications
    alerts: {
      passwordRequestsCount: pendingPasswordRequests.length,
      failedAutomationsCount,
      attendanceAlertsCount: lateToday + pendingRegularizations.length,
      securityAlertsCount: blockedEmployees,
      actionableAlerts,
    },
    // Section 6: Recent Activity Timeline
    recentActivities: recentTimeline,
    // Backwards compatibility for existing views
    workforce: {
      totalClients,
      totalEmployees,
      blockedEmployees,
      workingNow,
      onBreak,
      absentToday,
      presentToday,
      lateToday,
      attendancePercentage,
      activeSessions: activeSessionsCount,
      employeesCurrentlyOnline: workingNow + onBreak,
    },
  };
}
