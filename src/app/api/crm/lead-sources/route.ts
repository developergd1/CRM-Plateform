import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { buildTenantWhereClause } from '@/lib/tenant';
import { LEAD_SOURCES } from '@/lib/constants/crm';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantWhere = await buildTenantWhereClause(user);
    const where: any = {
      ...tenantWhere,
      isArchived: false,
    };

    // Fetch all leads with source, status, estimatedValue, deals
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        source: true,
        status: true,
        estimatedValue: true,
        createdAt: true,
        deals: {
          select: {
            id: true,
            stage: true,
            status: true,
            amount: true,
          },
        },
      },
    });

    // Grouping by source
    const statsBySource: Record<string, {
      source: string;
      totalLeads: number;
      newLeads: number;
      contactedLeads: number;
      qualifiedLeads: number;
      convertedLeads: number;
      lostLeads: number;
      pipelineValue: number;
      wonRevenue: number;
      conversionRate: number;
    }> = {};

    // Initialize all configured LEAD_SOURCES
    LEAD_SOURCES.forEach((src) => {
      statsBySource[src] = {
        source: src,
        totalLeads: 0,
        newLeads: 0,
        contactedLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        lostLeads: 0,
        pipelineValue: 0,
        wonRevenue: 0,
        conversionRate: 0,
      };
    });

    let overallTotal = 0;
    let overallQualified = 0;
    let overallConverted = 0;
    let overallPipelineValue = 0;
    let overallWonRevenue = 0;

    leads.forEach((l) => {
      const src = l.source || 'OTHER';
      if (!statsBySource[src]) {
        statsBySource[src] = {
          source: src,
          totalLeads: 0,
          newLeads: 0,
          contactedLeads: 0,
          qualifiedLeads: 0,
          convertedLeads: 0,
          lostLeads: 0,
          pipelineValue: 0,
          wonRevenue: 0,
          conversionRate: 0,
        };
      }

      statsBySource[src].totalLeads += 1;
      overallTotal += 1;

      if (l.status === 'NEW') statsBySource[src].newLeads += 1;
      if (l.status === 'CONTACTED') statsBySource[src].contactedLeads += 1;
      if (l.status === 'QUALIFIED') {
        statsBySource[src].qualifiedLeads += 1;
        overallQualified += 1;
      }
      if (l.status === 'CONVERTED') {
        statsBySource[src].convertedLeads += 1;
        statsBySource[src].qualifiedLeads += 1;
        overallConverted += 1;
        overallQualified += 1;
      }
      if (l.status === 'LOST' || l.status === 'UNQUALIFIED') {
        statsBySource[src].lostLeads += 1;
      }

      const val = l.estimatedValue || 0;
      statsBySource[src].pipelineValue += val;
      overallPipelineValue += val;

      if (l.deals && l.deals.length > 0) {
        l.deals.forEach((d) => {
          if (d.stage === 'WON' || d.status === 'WON') {
            const dealAmt = d.amount || 0;
            statsBySource[src].wonRevenue += dealAmt;
            overallWonRevenue += dealAmt;
          }
        });
      }
    });

    // Compute conversion rates
    const sourceList = Object.values(statsBySource).map((item) => {
      const convRate = item.totalLeads > 0 ? Math.round((item.convertedLeads / item.totalLeads) * 100) : 0;
      return {
        ...item,
        conversionRate: convRate,
      };
    });

    // Sort by total leads desc
    sourceList.sort((a, b) => b.totalLeads - a.totalLeads);

    return NextResponse.json({
      success: true,
      data: {
        sources: sourceList,
        summary: {
          totalLeads: overallTotal,
          qualifiedLeads: overallQualified,
          convertedLeads: overallConverted,
          totalPipelineValue: overallPipelineValue,
          totalWonRevenue: overallWonRevenue,
          overallConversionRate: overallTotal > 0 ? Math.round((overallConverted / overallTotal) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching lead sources summary:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lead sources data' }, { status: 500 });
  }
}
