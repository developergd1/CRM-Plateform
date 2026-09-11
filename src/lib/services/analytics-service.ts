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
 * Generates comprehensive Executive Dashboard metrics combining CRM, Workforce, Clients, Tasks, and Alerts.
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
    });
    if (clientRecord) {
      clientFilter = { clientId: clientRecord.id };
    }
  }

  // ----------------------------------------------------
  // 1. WORKFORCE & ATTENDANCE QUERIES
  // ----------------------------------------------------
  const [
    totalClients,
    activeClients,
    totalEmployees,
    blockedEmployees,
    todayAttendances,
    activeSessionsCount,
    recentlyAddedClients,
    clientsWithoutEmployeesList,
    clientsWithoutEmployeesCount,
  ] = await Promise.all([
    prisma.client.count({
      where: clientFilter.clientId ? { id: clientFilter.clientId } : undefined,
    }),
    prisma.client.count({
      where: {
        ...(clientFilter.clientId ? { id: clientFilter.clientId } : {}),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.count({
      where: {
        ...clientFilter,
        employeeId: { not: 'GI-EMP-000001' },
      },
    }),
    prisma.employee.count({
      where: {
        ...clientFilter,
        OR: [{ status: 'BLOCKED' }, { isBlocked: true }],
      },
    }),
    prisma.attendance.findMany({
      where: {
        date: dateStr,
        employee: {
          employeeId: { not: 'GI-EMP-000001' },
          ...(clientFilter.clientId ? { clientId: clientFilter.clientId } : {}),
        },
      },
      select: {
        id: true,
        checkInTime: true,
        checkOutTime: true,
        isLate: true,
        status: true,
        breaks: { select: { breakEndTime: true } },
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            client: { select: { companyName: true } },
          },
        },
      },
    }),
    prisma.workSession.count({
      where: {
        status: 'ACTIVE',
      },
    }),
    prisma.client.findMany({
      where: clientFilter.clientId ? { id: clientFilter.clientId } : {},
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        companyName: true,
        status: true,
        createdAt: true,
        _count: {
          select: { employees: true, deals: true },
        },
      },
    }),
    !isClientUser
      ? prisma.client.findMany({
          where: {
            employees: { none: {} },
          },
          take: 5,
          select: {
            id: true,
            clientId: true,
            companyName: true,
            status: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    !isClientUser
      ? prisma.client.count({
          where: {
            employees: { none: {} },
          },
        })
      : Promise.resolve(0),
  ]);

  let workingNow = 0;
  let onBreak = 0;
  let offline = 0;
  let lateToday = 0;
  const presentToday = todayAttendances.length;
  const currentlyWorkingEmployees: any[] = [];

  todayAttendances.forEach((att) => {
    if (att.isLate) lateToday += 1;
    if (att.checkInTime && !att.checkOutTime) {
      const activeBreak = att.breaks.some((b) => !b.breakEndTime);
      if (activeBreak) {
        onBreak += 1;
      } else {
        workingNow += 1;
        if (currentlyWorkingEmployees.length < 8 && att.employee) {
          currentlyWorkingEmployees.push({
            id: att.employee.id,
            employeeId: att.employee.employeeId,
            fullName: att.employee.fullName,
            designation: att.employee.designation || 'Staff',
            clientName: att.employee.client?.companyName || 'Corporate',
            checkInTime: att.checkInTime,
          });
        }
      }
    } else if (att.checkInTime && att.checkOutTime) {
      offline += 1;
    }
  });

  const absentToday = Math.max(0, totalEmployees - presentToday);
  const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

  // ----------------------------------------------------
  // 2. TASKS, FOLLOW-UPS & PENDING REQUESTS
  // ----------------------------------------------------
  const [
    todayFollowUpsCount,
    overdueFollowUpsCount,
    openTasksCount,
    upcomingFollowUps,
    urgentTasks,
    settingsRecords,
    failedAutomations,
    failedAutomationsCount,
  ] = await Promise.all([
    prisma.followUp.count({
      where: {
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: 'PENDING',
      },
    }),
    prisma.followUp.count({
      where: {
        scheduledAt: { lt: now },
        status: 'PENDING',
      },
    }),
    prisma.task.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    }),
    prisma.followUp.findMany({
      where: {
        status: 'PENDING',
      },
      take: 5,
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        followUpNumber: true,
        title: true,
        priority: true,
        scheduledAt: true,
        status: true,
        assignedTo: { select: { fullName: true } },
        lead: { select: { companyName: true, contactPerson: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
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
      ? prisma.automationLog.findMany({
          where: { status: 'FAILED' },
          take: 4,
          orderBy: { executedAt: 'desc' },
          select: {
            id: true,
            event: true,
            action: true,
            message: true,
            executedAt: true,
          },
        })
      : Promise.resolve([]),
    !isClientUser
      ? prisma.automationLog.count({
          where: { status: 'FAILED' },
        })
      : Promise.resolve(0),
  ]);

  let pendingPasswordRequests: any[] = [];
  let pendingRegularizations: any[] = [];

  settingsRecords.forEach((s) => {
    if (s.key === 'PASSWORD_RESET_REQUESTS' && s.value) {
      try {
        const parsed = JSON.parse(s.value);
        if (Array.isArray(parsed)) {
          pendingPasswordRequests = parsed.filter((r: any) => r.status === 'PENDING');
        }
      } catch {}
    }
    if (s.key === 'ATTENDANCE_REGULARIZATIONS' && s.value) {
      try {
        const parsed = JSON.parse(s.value);
        if (Array.isArray(parsed)) {
          pendingRegularizations = parsed.filter((r: any) => r.status === 'PENDING');
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
      actionTab: 'password-resets',
    });
  }

  if (overdueFollowUpsCount > 0) {
    actionableAlerts.push({
      id: 'alert-flw',
      type: 'OVERDUE_FOLLOWUP',
      title: `${overdueFollowUpsCount} Overdue Follow-up${overdueFollowUpsCount > 1 ? 's' : ''}`,
      description: 'Scheduled sales or client check-ins past their designated deadline.',
      severity: 'HIGH',
      badge: 'CRM Pipeline',
      count: overdueFollowUpsCount,
      actionTab: 'crm-followups',
    });
  }

  if (failedAutomationsCount > 0) {
    actionableAlerts.push({
      id: 'alert-auto',
      type: 'FAILED_AUTOMATION',
      title: `${failedAutomationsCount} Failed Automation Trigger${failedAutomationsCount > 1 ? 's' : ''}`,
      description: 'Background automation events halted with execution errors.',
      severity: 'MEDIUM',
      badge: 'System Engine',
      count: failedAutomationsCount,
      actionTab: 'crm-reports',
    });
  }

  if (lateToday > 0) {
    actionableAlerts.push({
      id: 'alert-late',
      type: 'ATTENDANCE_ALERT',
      title: `${lateToday} Staff Arrived Late Today`,
      description: 'Check-in timestamps recorded after the permissible shift grace threshold.',
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
      description: 'Staff identities currently locked due to policy breaches or suspension.',
      severity: 'HIGH',
      badge: 'Access Control',
      count: blockedEmployees,
      actionTab: 'employees',
    });
  }

  // ----------------------------------------------------
  // 3. CRM METRICS & VISUAL ANALYTICS
  // ----------------------------------------------------
  let crmMetrics: any = null;
  let crmOverview: any = null;

  if (!isClientUser) {
    const crmDateFilter = {
      createdAt: { gte: start, lte: end },
    };

    const [
      allLeadsInRange,
      openOpportunitiesRecords,
      dealsInRange,
      currentMonthWonDeals,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { isArchived: false, ...crmDateFilter },
        select: {
          id: true,
          status: true,
          source: true,
          estimatedValue: true,
          createdAt: true,
        },
      }),
      prisma.opportunity.findMany({
        where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }, ...crmDateFilter },
        select: { id: true, value: true, stage: true },
      }),
      prisma.deal.findMany({
        where: crmDateFilter,
        select: {
          id: true,
          title: true,
          amount: true,
          probability: true,
          weightedValue: true,
          stage: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Monthly Realized Won Revenue: Won deals in current calendar month
      prisma.deal.findMany({
        where: {
          OR: [{ stage: 'WON' }, { status: 'WON' }],
          updatedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
          },
        },
        select: { amount: true },
      }),
    ]);

    const totalLeads = allLeadsInRange.length;
    const newLeads = allLeadsInRange.filter((l) => l.status === 'NEW').length;
    const contactedLeads = allLeadsInRange.filter((l) => l.status === 'CONTACTED').length;
    const qualifiedLeads = allLeadsInRange.filter((l) => l.status === 'QUALIFIED' || l.status === 'CONVERTED').length;
    const convertedLeads = allLeadsInRange.filter((l) => l.status === 'CONVERTED').length;
    const lostLeads = allLeadsInRange.filter((l) => l.status === 'LOST' || l.status === 'UNQUALIFIED').length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    const openOpportunities = openOpportunitiesRecords.length;
    const openOpportunitiesValue = openOpportunitiesRecords.reduce((sum, o) => sum + (o.value || 0), 0);

    let openDeals = 0;
    let wonDeals = 0;
    let wonRevenue = 0;
    let lostDeals = 0;
    let lostRevenue = 0;
    let pipelineValue = 0;
    let weightedPipelineValue = 0;

    const stageMap: Record<string, { count: number; value: number }> = {
      NEW: { count: 0, value: 0 },
      QUALIFIED: { count: 0, value: 0 },
      PROPOSAL: { count: 0, value: 0 },
      NEGOTIATION: { count: 0, value: 0 },
      WON: { count: 0, value: 0 },
      LOST: { count: 0, value: 0 },
    };

    dealsInRange.forEach((d) => {
      const amt = d.amount || 0;
      const weighted = d.weightedValue ?? (amt * (d.probability || 0)) / 100;
      const stg = d.stage || 'NEW';

      if (stageMap[stg]) {
        stageMap[stg].count += 1;
        stageMap[stg].value += amt;
      }

      if (d.stage === 'WON' || d.status === 'WON') {
        wonDeals += 1;
        wonRevenue += amt;
      } else if (d.stage === 'LOST' || d.status === 'LOST') {
        lostDeals += 1;
        lostRevenue += amt;
      } else {
        openDeals += 1;
        pipelineValue += amt;
        weightedPipelineValue += weighted;
      }
    });

    const monthlyWonRevenue = currentMonthWonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalClosed = wonDeals + lostDeals;
    const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;

    // Lead Source Performance
    const sourceBuckets: Record<string, { count: number; converted: number }> = {};
    allLeadsInRange.forEach((l) => {
      const src = l.source || 'OTHER';
      if (!sourceBuckets[src]) sourceBuckets[src] = { count: 0, converted: 0 };
      sourceBuckets[src].count += 1;
      if (l.status === 'CONVERTED') sourceBuckets[src].converted += 1;
    });

    const leadSourcePerformance = Object.entries(sourceBuckets).map(([source, item]) => ({
      source,
      count: item.count,
      percentage: totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0,
      conversionRate: item.count > 0 ? Math.round((item.converted / item.count) * 100) : 0,
    }));

    // Lead Conversion Funnel Steps
    const leadFunnel = [
      { step: 'Total Leads', count: totalLeads, rate: 100 },
      { step: 'Contacted', count: contactedLeads, rate: totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0 },
      { step: 'Qualified', count: qualifiedLeads, rate: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0 },
      { step: 'Deals Created', count: dealsInRange.length, rate: totalLeads > 0 ? Math.round((dealsInRange.length / totalLeads) * 100) : 0 },
      { step: 'Deals Won', count: wonDeals, rate: dealsInRange.length > 0 ? Math.round((wonDeals / dealsInRange.length) * 100) : 0 },
    ];

    const totalOpenOpportunities = openDeals + openOpportunities;
    const totalPipelineValue = pipelineValue + openOpportunitiesValue;

    crmMetrics = {
      totalLeads,
      newLeads,
      contactedLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      openOpportunities: totalOpenOpportunities,
      openOpportunitiesValue: totalPipelineValue,
      openDeals,
      wonDeals,
      wonRevenue,
      lostDeals,
      lostRevenue,
      pipelineValue: totalPipelineValue,
      weightedPipelineValue,
      conversionRate,
      monthlyRevenue: monthlyWonRevenue,
      winRate,
    };

    crmOverview = {
      funnel: leadFunnel,
      leadSourcePerformance,
      pipelineByStage: Object.entries(stageMap).map(([stage, item]) => ({
        stage,
        count: item.count,
        value: item.value,
      })),
      monthlyWonRevenue,
      wonVsLost: {
        wonDeals,
        wonRevenue,
        lostDeals,
        lostRevenue,
        winRate,
      },
    };
  }

  // ----------------------------------------------------
  // 4. RECENT ACTIVITY TIMELINE (Top 8 real records)
  // ----------------------------------------------------
  const [recentCrmActivities, recentAuditLogs] = await Promise.all([
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        subject: true,
        description: true,
        createdAt: true,
        lead: { select: { companyName: true, contactPerson: true } },
        deal: { select: { title: true, amount: true } },
        client: { select: { companyName: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
    prisma.auditLog.findMany({
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
    }),
  ]);

  const recentTimeline: any[] = [];

  recentCrmActivities.forEach((act) => {
    let title = act.subject || `${act.type} logged`;
    let subtitle = '';
    if (act.deal) subtitle = `Deal: ${act.deal.title} (₹${(act.deal.amount || 0).toLocaleString()})`;
    else if (act.lead) subtitle = `Lead: ${act.lead.companyName || act.lead.contactPerson}`;
    else if (act.client) subtitle = `Client: ${act.client.companyName}`;

    recentTimeline.push({
      id: `act-${act.id}`,
      type: act.type,
      title,
      subtitle,
      actor: act.performedBy?.fullName || 'System',
      timestamp: act.createdAt,
      source: 'CRM',
    });
  });

  recentAuditLogs.forEach((audit) => {
    recentTimeline.push({
      id: `aud-${audit.id}`,
      type: audit.action,
      title: `${audit.action.replace(/_/g, ' ')} (${audit.entityType})`,
      subtitle: audit.reason || `Entity ID: ${audit.entityId || 'N/A'}`,
      actor: audit.actorUser?.email?.split('@')[0] || 'Administrator',
      timestamp: audit.timestamp,
      source: 'AUDIT',
    });
  });

  // Sort unified timeline by timestamp descending, take top 8
  recentTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const formattedRecentActivities = recentTimeline.slice(0, 8);

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
      totalLeads: crmMetrics?.totalLeads ?? 0,
      qualifiedLeads: crmMetrics?.qualifiedLeads ?? 0,
      openOpportunities: crmMetrics?.openOpportunities ?? 0,
      pipelineValue: crmMetrics?.pipelineValue ?? 0,
      wonRevenue: crmMetrics?.wonRevenue ?? crmMetrics?.monthlyRevenue ?? 0,
      conversionRate: crmMetrics?.conversionRate ?? 0,
      totalClients,
      totalEmployees,
      workingNow,
      onBreak,
      absentToday,
      attendancePercentage,
    },
    // Section 2: CRM Overview
    crmOverview,
    // Section 3: Workforce Overview
    workforceOverview: {
      workingNow,
      onBreak,
      offline,
      absent: absentToday,
      lateToday,
      attendancePercentage,
      currentlyWorkingEmployees,
    },
    // Section 4: Tasks & Follow-ups
    tasksAndFollowUps: {
      todayFollowUpsCount,
      overdueFollowUpsCount,
      openTasksCount,
      pendingRequestsCount,
      upcomingFollowUps,
      urgentTasks,
    },
    // Section 5: Client Overview
    clientOverview: {
      totalClients,
      activeClients,
      recentlyAddedClients,
      clientsWithoutEmployeesCount,
      clientsWithoutEmployeesList,
    },
    // Section 6: Actionable Alerts & Notifications
    alerts: {
      passwordRequestsCount: pendingPasswordRequests.length,
      overdueFollowUpsCount,
      failedAutomationsCount,
      attendanceAlertsCount: lateToday + pendingRegularizations.length,
      securityAlertsCount: blockedEmployees,
      actionableAlerts,
    },
    // Section 7: Recent Activity Timeline
    recentActivities: formattedRecentActivities,
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
    crm: crmMetrics,
  };
}

/**
 * Dedicated CRM Analytics Service providing detailed breakdown:
 * - Lead Conversion Rate
 * - Lead Source Performance
 * - Salesperson Performance
 * - Pipeline Stages & Funnel
 * - Won/Lost Analysis & Lost Reasons
 * - Average Deal Value
 * - Sales Cycle Length
 * - Monthly Revenue Trend
 * - Client Acquisition
 */
export async function getCrmAnalyticsData(options: DateRangeOptions) {
  const { start, end, label } = resolveDateRange(options);

  const dateFilter = {
    createdAt: { gte: start, lte: end },
  };

  // 1. Lead Conversion Rate over Time
  const allLeads = await prisma.lead.findMany({
    where: { isArchived: false, ...dateFilter },
    select: {
      id: true,
      status: true,
      source: true,
      createdAt: true,
      assignedToId: true,
    },
  });

  const totalLeads = allLeads.length;
  const convertedLeads = allLeads.filter((l) => l.status === 'CONVERTED').length;
  const qualifiedLeads = allLeads.filter((l) => l.status === 'QUALIFIED' || l.status === 'CONVERTED').length;
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // 2. Lead Source Performance
  const sourceMap: Record<string, { total: number; qualified: number; converted: number }> = {};
  allLeads.forEach((lead) => {
    const src = lead.source || 'OTHER';
    if (!sourceMap[src]) {
      sourceMap[src] = { total: 0, qualified: 0, converted: 0 };
    }
    sourceMap[src].total += 1;
    if (lead.status === 'QUALIFIED' || lead.status === 'CONVERTED') {
      sourceMap[src].qualified += 1;
    }
    if (lead.status === 'CONVERTED') {
      sourceMap[src].converted += 1;
    }
  });

  const sourcePerformance = Object.entries(sourceMap).map(([source, item]) => ({
    source,
    total: item.total,
    qualified: item.qualified,
    converted: item.converted,
    conversionRate: item.total > 0 ? Math.round((item.converted / item.total) * 100) : 0,
  }));

  // 3. Deals Analysis
  const allDeals = await prisma.deal.findMany({
    where: dateFilter,
    include: {
      assignedTo: { select: { id: true, employeeId: true, fullName: true } },
    },
  });

  let totalPipelineValue = 0;
  let totalWeightedValue = 0;
  let wonDealsCount = 0;
  let wonDealsValue = 0;
  let lostDealsCount = 0;
  let lostDealsValue = 0;

  const stageCounts: Record<string, { count: number; value: number }> = {
    NEW: { count: 0, value: 0 },
    QUALIFIED: { count: 0, value: 0 },
    PROPOSAL: { count: 0, value: 0 },
    NEGOTIATION: { count: 0, value: 0 },
    WON: { count: 0, value: 0 },
    LOST: { count: 0, value: 0 },
  };

  const lostReasonsMap: Record<string, number> = {};
  const salesCyclesDays: number[] = [];

  allDeals.forEach((deal) => {
    const amt = deal.amount || 0;
    const stage = deal.stage || 'NEW';

    if (stageCounts[stage]) {
      stageCounts[stage].count += 1;
      stageCounts[stage].value += amt;
    }

    if (deal.stage === 'WON' || deal.status === 'WON') {
      wonDealsCount += 1;
      wonDealsValue += amt;

      // Calculate sales cycle in days
      if (deal.createdAt && deal.updatedAt) {
        const diffMs = deal.updatedAt.getTime() - deal.createdAt.getTime();
        const days = Math.max(1, Math.round(diffMs / (24 * 3600 * 1000)));
        salesCyclesDays.push(days);
      }
    } else if (deal.stage === 'LOST' || deal.status === 'LOST') {
      lostDealsCount += 1;
      lostDealsValue += amt;
      const r = deal.lostReason || 'OTHER';
      lostReasonsMap[r] = (lostReasonsMap[r] || 0) + 1;
    } else {
      totalPipelineValue += amt;
      totalWeightedValue += deal.weightedValue ?? (amt * (deal.probability || 0)) / 100;
    }
  });

  const totalClosedDeals = wonDealsCount + lostDealsCount;
  const winRate = totalClosedDeals > 0 ? Math.round((wonDealsCount / totalClosedDeals) * 100) : 0;
  const avgDealValue = wonDealsCount > 0 ? Math.round(wonDealsValue / wonDealsCount) : 0;

  const avgSalesCycle = salesCyclesDays.length > 0
    ? Math.round(salesCyclesDays.reduce((a, b) => a + b, 0) / salesCyclesDays.length)
    : 0;
  const shortestCycle = salesCyclesDays.length > 0 ? Math.min(...salesCyclesDays) : 0;
  const longestCycle = salesCyclesDays.length > 0 ? Math.max(...salesCyclesDays) : 0;

  // 4. Salesperson Performance
  const salesReps = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, employeeId: true, fullName: true, designation: true },
  });

  const repPerformance = await Promise.all(
    salesReps.map(async (rep) => {
      const repLeads = allLeads.filter((l) => l.assignedToId === rep.id);
      const repDeals = allDeals.filter((d) => d.assignedToId === rep.id);

      const repWon = repDeals.filter((d) => d.stage === 'WON' || d.status === 'WON');
      const repLost = repDeals.filter((d) => d.stage === 'LOST' || d.status === 'LOST');
      const repWonValue = repWon.reduce((sum, d) => sum + (d.amount || 0), 0);
      const repPipeline = repDeals
        .filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      const followUps = await prisma.followUp.findMany({
        where: { assignedToId: rep.id },
        select: { status: true, scheduledAt: true },
      });

      const completedFollowUps = followUps.filter((f) => f.status === 'COMPLETED').length;
      const overdueFollowUps = followUps.filter(
        (f) => f.status === 'PENDING' && new Date(f.scheduledAt).getTime() < Date.now()
      ).length;

      return {
        id: rep.id,
        employeeId: rep.employeeId,
        fullName: rep.fullName,
        designation: rep.designation,
        assignedLeads: repLeads.length,
        qualifiedLeads: repLeads.filter((l) => l.status === 'QUALIFIED' || l.status === 'CONVERTED').length,
        totalDeals: repDeals.length,
        wonDeals: repWon.length,
        lostDeals: repLost.length,
        pipelineValue: repPipeline,
        wonValue: repWonValue,
        winRate: repWon.length + repLost.length > 0
          ? Math.round((repWon.length / (repWon.length + repLost.length)) * 100)
          : 0,
        averageDealValue: repWon.length > 0 ? Math.round(repWonValue / repWon.length) : 0,
        completedFollowUps,
        overdueFollowUps,
      };
    })
  );

  // 5. Client Acquisition from WON Deals
  const newClients = await prisma.client.findMany({
    where: dateFilter,
    select: {
      id: true,
      clientId: true,
      companyName: true,
      createdAt: true,
      deals: {
        where: { OR: [{ stage: 'WON' }, { status: 'WON' }] },
        select: { id: true, amount: true },
      },
    },
  });

  const convertedFromDealsCount = newClients.filter((c) => c.deals.length > 0).length;
  const directOnboardingCount = newClients.length - convertedFromDealsCount;

  return {
    dateRange: { label, startDate: start.toISOString(), endDate: end.toISOString() },
    leadConversion: {
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      conversionRate: leadConversionRate,
    },
    sourcePerformance,
    pipeline: {
      totalPipelineValue,
      totalWeightedValue,
      stages: Object.entries(stageCounts).map(([stage, item]) => ({
        stage,
        count: item.count,
        value: item.value,
      })),
    },
    wonLost: {
      wonDealsCount,
      wonDealsValue,
      lostDealsCount,
      lostDealsValue,
      winRate,
      topLostReasons: Object.entries(lostReasonsMap).map(([reason, count]) => ({
        reason,
        count,
      })),
    },
    dealMetrics: {
      averageDealValue: avgDealValue,
      totalWonValue: wonDealsValue,
      wonDealsCount,
    },
    salesCycle: {
      averageDays: avgSalesCycle,
      shortestDays: shortestCycle,
      longestDays: longestCycle,
    },
    salespersonPerformance: repPerformance.filter((r) => r.assignedLeads > 0 || r.totalDeals > 0),
    clientAcquisition: {
      totalNewClients: newClients.length,
      fromWonDeals: convertedFromDealsCount,
      directOnboarded: directOnboardingCount,
    },
  };
}
