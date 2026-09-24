import { prisma } from '@/lib/prisma';

export async function getCrmDashboardMetrics(timeframe?: string, tenantClientId?: string | null) {
  // Determine date filter if applicable
  const now = new Date();
  let dateFilter: Date | undefined;

  if (timeframe === 'today') {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeframe === 'week') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === 'month') {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (timeframe === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    dateFilter = new Date(now.getFullYear(), quarterMonth, 1);
  } else if (timeframe === 'year') {
    dateFilter = new Date(now.getFullYear(), 0, 1);
  }

  const dealWhere: any = {
    ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
    ...(tenantClientId ? { clientId: tenantClientId } : {}),
  };

  // 1. Deals aggregation
  const deals = await prisma.deal.findMany({
    where: dealWhere,
    include: {
      account: { select: { companyName: true } },
      assignedTo: { select: { fullName: true, employeeId: true } },
      pipelineStage: { select: { name: true, colorToken: true } },
    },
    orderBy: { amount: 'desc' },
  });

  let openPipelineValue = 0;
  let weightedForecastValue = 0;
  let wonRevenue = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;
  let openDealsCount = 0;

  const stageBreakdown: Record<string, { count: number; value: number }> = {};

  deals.forEach((d) => {
    const amt = d.amount || 0;
    const stageName = d.pipelineStage?.name || d.stage || 'Discovery';
    if (!stageBreakdown[stageName]) {
      stageBreakdown[stageName] = { count: 0, value: 0 };
    }
    stageBreakdown[stageName].count += 1;
    stageBreakdown[stageName].value += amt;

    if (d.status === 'WON') {
      wonRevenue += amt;
      wonDealsCount += 1;
    } else if (d.status === 'LOST') {
      lostDealsCount += 1;
    } else {
      openPipelineValue += amt;
      const prob = d.probability || 0;
      weightedForecastValue += (amt * prob) / 100;
      openDealsCount += 1;
    }
  });

  const totalClosedDeals = wonDealsCount + lostDealsCount;
  const winRatePercent = totalClosedDeals > 0 ? Math.round((wonDealsCount / totalClosedDeals) * 100) : 0;
  const winRateDisplay = `${wonDealsCount} / ${totalClosedDeals} (${winRatePercent}%)`;

  // 2. Leads Funnel
  const leadBaseWhere: any = {
    isArchived: false,
    ...(tenantClientId ? { clientId: tenantClientId } : {}),
  };

  const [newLeadsCount, qualifiedLeadsCount, convertedLeadsCount, totalLeads] = await Promise.all([
    prisma.lead.count({ where: { ...leadBaseWhere, status: 'NEW' } }),
    prisma.lead.count({ where: { ...leadBaseWhere, status: 'QUALIFIED' } }),
    prisma.lead.count({ where: { ...(tenantClientId ? { clientId: tenantClientId } : {}), status: 'CONVERTED' } }),
    prisma.lead.count({ where: leadBaseWhere }),
  ]);

  // 3. Overdue & upcoming activities + Commercial Entities (Quotes, Contracts, Renewals)
  const activityBaseWhere: any = tenantClientId ? { clientId: tenantClientId } : {};
  const quoteWhere: any = tenantClientId ? { OR: [{ deal: { clientId: tenantClientId } }, { account: { clientId: tenantClientId } }] } : {};
  const contractWhere: any = tenantClientId ? { OR: [{ deal: { clientId: tenantClientId } }, { account: { clientId: tenantClientId } }] } : {};
  const renewalWhere: any = tenantClientId ? { account: { clientId: tenantClientId } } : {};

  const [
    overdueActivitiesCount,
    totalActivitiesCount,
    quotesCount,
    contractsCount,
    contractsAggregate,
    renewalsCount,
    upcomingRenewalsCount,
    overdueActivities,
    topDeals,
  ] = await Promise.all([
    prisma.activity.count({
      where: {
        ...activityBaseWhere,
        scheduledAt: { lt: now },
        status: { in: ['SCHEDULED', 'PENDING'] },
      },
    }),
    prisma.activity.count({ where: activityBaseWhere }),
    prisma.quote.count({ where: quoteWhere }),
    prisma.contract.count({ where: contractWhere }),
    prisma.contract.aggregate({
      _sum: { value: true },
      where: { ...contractWhere, status: 'ACTIVE' },
    }),
    prisma.renewal.count({ where: renewalWhere }),
    prisma.renewal.count({
      where: { ...renewalWhere, status: 'UPCOMING' },
    }),
    prisma.activity.findMany({
      where: {
        ...activityBaseWhere,
        scheduledAt: { lt: now },
        status: { in: ['SCHEDULED', 'PENDING'] },
      },
      take: 5,
      orderBy: { scheduledAt: 'asc' },
      include: {
        lead: { select: { leadNumber: true, companyName: true, contactPerson: true } },
        deal: { select: { dealNumber: true, title: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
    prisma.deal.findMany({
      where: {
        ...(tenantClientId ? { clientId: tenantClientId } : {}),
        status: 'OPEN',
      },
      take: 5,
      orderBy: { amount: 'desc' },
      include: {
        account: { select: { companyName: true } },
        assignedTo: { select: { fullName: true } },
        pipelineStage: { select: { name: true } },
      },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeadsCount / totalLeads) * 100) : 0;

  return {
    kpis: {
      openPipelineValue,
      weightedForecastValue,
      wonRevenue,
      winRate: {
        numerator: wonDealsCount,
        denominator: totalClosedDeals,
        percentage: winRatePercent,
        display: winRateDisplay,
      },
      openDealsCount,
      wonDealsCount,
      lostDealsCount,
      totalLeads,
      newLeadsCount,
      qualifiedLeadsCount,
      convertedLeadsCount,
      conversionRate,
      quotesCount,
      contractsCount,
      activeContractsValue: contractsAggregate._sum.value || 0,
      renewalsCount,
      upcomingRenewalsCount,
      totalActivitiesCount,
      overdueActivitiesCount,
    },
    funnel: {
      total: totalLeads,
      new: newLeadsCount,
      qualified: qualifiedLeadsCount,
      converted: convertedLeadsCount,
      deals: deals.length,
      won: wonDealsCount,
    },
    stageBreakdown,
    topDeals,
    overdueActivities,
  };
}

export async function getSalesForecast(period?: string, tenantClientId?: string | null) {
  const deals = await prisma.deal.findMany({
    where: tenantClientId ? { clientId: tenantClientId } : {},
    include: {
      pipelineStage: true,
      account: { select: { companyName: true } },
      assignedTo: { select: { fullName: true, employeeId: true } },
    },
  });

  let totalPipeline = 0;
  let weightedForecast = 0;
  let bestCase = 0;
  let commit = 0;
  let closed = 0;

  let totalCycleDays = 0;
  let closedCycleCount = 0;

  deals.forEach((d) => {
    const amt = d.amount || 0;
    const prob = d.probability || 0;
    const weighted = (amt * prob) / 100;

    if (d.status === 'WON') {
      closed += amt;
      if (d.closedAt && d.createdAt) {
        const diffDays = Math.max(1, Math.round((d.closedAt.getTime() - d.createdAt.getTime()) / (1000 * 3600 * 24)));
        totalCycleDays += diffDays;
        closedCycleCount += 1;
      }
    } else if (d.status === 'OPEN') {
      totalPipeline += amt;
      weightedForecast += weighted;

      if (prob >= 75) {
        commit += amt;
      } else if (prob >= 50) {
        bestCase += amt;
      }
    }
  });

  const avgDealSize = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + (d.amount || 0), 0) / deals.length) : 0;
  const avgSalesCycleDays = closedCycleCount > 0 ? Math.round(totalCycleDays / closedCycleCount) : 18;

  return {
    metrics: {
      totalPipeline,
      weightedForecast,
      bestCase,
      commit,
      closed,
      avgDealSize,
      avgSalesCycleDays,
    },
    dealCount: deals.length,
  };
}

export async function generateReportData(reportType: string, tenantClientId?: string | null) {
  const baseWhere = tenantClientId ? { clientId: tenantClientId } : {};
  switch (reportType) {
    case 'win-loss': {
      const deals = await prisma.deal.findMany({
        where: { ...baseWhere, status: { in: ['WON', 'LOST'] } },
        include: { account: true, assignedTo: true },
      });
      return { reportType, count: deals.length, deals };
    }
    case 'funnel': {
      const metrics = await getCrmDashboardMetrics(undefined, tenantClientId);
      return { reportType, funnel: metrics.funnel, stages: metrics.stageBreakdown };
    }
    case 'revenue': {
      const wonDeals = await prisma.deal.findMany({
        where: { ...baseWhere, status: 'WON' },
        include: { account: true, assignedTo: true },
        orderBy: { closedAt: 'desc' },
      });
      return { reportType, totalRevenue: wonDeals.reduce((s, d) => s + (d.amount || 0), 0), deals: wonDeals };
    }
    default: {
      const metrics = await getCrmDashboardMetrics(undefined, tenantClientId);
      return { reportType, overview: metrics.kpis, stages: metrics.stageBreakdown };
    }
  }
}
