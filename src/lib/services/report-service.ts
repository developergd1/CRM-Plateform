import { prisma } from '@/lib/prisma';
import { resolveDateRange, DateRangeOptions } from './analytics-service';

export type CrmReportType =
  | 'leads'
  | 'lead-sources'
  | 'salesperson-performance'
  | 'opportunities'
  | 'deals'
  | 'pipeline'
  | 'won-lost'
  | 'revenue'
  | 'client-acquisition'
  | 'follow-ups';

export interface ReportQueryOptions extends DateRangeOptions {
  type: CrmReportType;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generates structured report data for display or CSV export.
 */
export async function generateCrmReport(options: ReportQueryOptions) {
  const { start, end, label } = resolveDateRange(options);
  const type = options.type || 'leads';
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, options.limit || 25);
  const skip = (page - 1) * limit;

  const dateFilter = {
    createdAt: { gte: start, lte: end },
  };

  switch (type) {
    case 'leads': {
      const [total, rows] = await Promise.all([
        prisma.lead.count({ where: { isArchived: false, ...dateFilter } }),
        prisma.lead.findMany({
          where: { isArchived: false, ...dateFilter },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { fullName: true, employeeId: true } },
            client: { select: { companyName: true } },
          },
        }),
      ]);

      const formatted = rows.map((l) => ({
        'Lead Number': l.leadNumber,
        'Company': l.companyName,
        'Contact Person': l.contactPerson || l.fullName,
        'Email': l.email || 'N/A',
        'Phone': l.phone || 'N/A',
        'Source': l.source || 'OTHER',
        'Status': l.status,
        'City': l.city || 'N/A',
        'Estimated Value (INR)': l.estimatedValue || 0,
        'Owner': l.assignedTo?.fullName || 'Unassigned',
        'Created Date': new Date(l.createdAt).toLocaleDateString(),
      }));

      return { type, label, total, page, limit, rows: formatted };
    }

    case 'deals': {
      const [total, rows] = await Promise.all([
        prisma.deal.count({ where: dateFilter }),
        prisma.deal.findMany({
          where: dateFilter,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { fullName: true } },
            client: { select: { companyName: true, clientId: true } },
          },
        }),
      ]);

      const formatted = rows.map((d) => ({
        'Deal Number': d.dealNumber,
        'Title': d.title,
        'Client': d.client?.companyName || 'N/A',
        'Amount (INR)': d.amount || 0,
        'Stage': d.stage,
        'Status': d.status,
        'Probability (%)': d.probability || 0,
        'Weighted Value (INR)': d.weightedValue || 0,
        'Owner': d.assignedTo?.fullName || 'Unassigned',
        'Expected Close': d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : 'N/A',
        'Created Date': new Date(d.createdAt).toLocaleDateString(),
      }));

      return { type, label, total, page, limit, rows: formatted };
    }

    case 'opportunities': {
      const [total, rows] = await Promise.all([
        prisma.opportunity.count({ where: dateFilter }),
        prisma.opportunity.findMany({
          where: dateFilter,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { fullName: true } },
            client: { select: { companyName: true } },
          },
        }),
      ]);

      const formatted = rows.map((o) => ({
        'Opportunity ID': o.opportunityNumber,
        'Title': o.title,
        'Client': o.client?.companyName || 'N/A',
        'Contract Value (INR)': o.value || 0,
        'Stage': o.stage,
        'Probability (%)': o.probability || 0,
        'Product / Service': o.productService || 'N/A',
        'Competitor': o.competitor || 'None',
        'Owner': o.assignedTo?.fullName || 'Unassigned',
        'Created Date': new Date(o.createdAt).toLocaleDateString(),
      }));

      return { type, label, total, page, limit, rows: formatted };
    }

    case 'salesperson-performance': {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, employeeId: true, fullName: true, designation: true },
      });

      const rows = await Promise.all(
        employees.map(async (emp) => {
          const [leads, deals] = await Promise.all([
            prisma.lead.findMany({ where: { assignedToId: emp.id, ...dateFilter }, select: { status: true } }),
            prisma.deal.findMany({ where: { assignedToId: emp.id, ...dateFilter }, select: { stage: true, status: true, amount: true } }),
          ]);

          const won = deals.filter((d) => d.stage === 'WON' || d.status === 'WON');
          const lost = deals.filter((d) => d.stage === 'LOST' || d.status === 'LOST');
          const wonValue = won.reduce((sum, d) => sum + (d.amount || 0), 0);
          const closed = won.length + lost.length;
          const winRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;

          return {
            'Employee ID': emp.employeeId,
            'Full Name': emp.fullName,
            'Designation': emp.designation,
            'Leads Assigned': leads.length,
            'Leads Qualified': leads.filter((l) => l.status === 'QUALIFIED' || l.status === 'CONVERTED').length,
            'Deals Created': deals.length,
            'Deals Won': won.length,
            'Deals Lost': lost.length,
            'Win Rate (%)': winRate,
            'Total Won Revenue (INR)': wonValue,
          };
        })
      );

      const activeRows = rows.filter((r) => r['Leads Assigned'] > 0 || r['Deals Created'] > 0);
      return { type, label, total: activeRows.length, page: 1, limit: activeRows.length, rows: activeRows };
    }

    case 'lead-sources': {
      const leads = await prisma.lead.findMany({
        where: { isArchived: false, ...dateFilter },
        select: { source: true, status: true },
      });

      const map: Record<string, { total: number; qualified: number; converted: number }> = {};
      leads.forEach((l) => {
        const src = l.source || 'OTHER';
        if (!map[src]) map[src] = { total: 0, qualified: 0, converted: 0 };
        map[src].total += 1;
        if (l.status === 'QUALIFIED' || l.status === 'CONVERTED') map[src].qualified += 1;
        if (l.status === 'CONVERTED') map[src].converted += 1;
      });

      const formatted = Object.entries(map).map(([source, item]) => ({
        'Source Channel': source,
        'Total Leads': item.total,
        'Qualified Leads': item.qualified,
        'Converted to Clients': item.converted,
        'Conversion Rate (%)': item.total > 0 ? Math.round((item.converted / item.total) * 100) : 0,
      }));

      return { type, label, total: formatted.length, page: 1, limit: formatted.length, rows: formatted };
    }

    case 'won-lost': {
      const deals = await prisma.deal.findMany({
        where: {
          OR: [{ stage: 'WON' }, { stage: 'LOST' }, { status: 'WON' }, { status: 'LOST' }],
          ...dateFilter,
        },
        include: { client: { select: { companyName: true } } },
      });

      const formatted = deals.map((d) => ({
        'Deal Number': d.dealNumber,
        'Title': d.title,
        'Client': d.client?.companyName || 'N/A',
        'Outcome': d.stage === 'WON' || d.status === 'WON' ? 'WON' : 'LOST',
        'Amount (INR)': d.amount || 0,
        'Reason for Loss / Win': d.lostReason || (d.stage === 'WON' ? 'Contract Executed' : 'Unspecified'),
        'Closed Date': new Date(d.updatedAt).toLocaleDateString(),
      }));

      return { type, label, total: formatted.length, page: 1, limit: formatted.length, rows: formatted };
    }

    case 'revenue': {
      const wonDeals = await prisma.deal.findMany({
        where: {
          OR: [{ stage: 'WON' }, { status: 'WON' }],
          updatedAt: { gte: start, lte: end },
        },
        include: { client: { select: { companyName: true, clientId: true } } },
      });

      const formatted = wonDeals.map((d) => ({
        'Deal Number': d.dealNumber,
        'Contract Title': d.title,
        'Client Company': d.client?.companyName || 'N/A',
        'Client ID': d.client?.clientId || 'N/A',
        'Realized Won Value (INR)': d.amount || 0,
        'Win Date': new Date(d.updatedAt).toLocaleDateString(),
      }));

      return { type, label, total: formatted.length, page: 1, limit: formatted.length, rows: formatted };
    }

    case 'client-acquisition': {
      const clients = await prisma.client.findMany({
        where: dateFilter,
        include: {
          deals: {
            where: { OR: [{ stage: 'WON' }, { status: 'WON' }] },
            select: { dealNumber: true, amount: true },
          },
        },
      });

      const formatted = clients.map((c) => ({
        'Client ID': c.clientId,
        'Company Name': c.companyName,
        'Contact Person': c.contactPerson,
        'Email': c.email || 'N/A',
        'Acquisition Origin': c.deals.length > 0 ? 'Deal Won Conversion' : 'Direct Executive Onboarding',
        'Associated Won Value (INR)': c.deals.reduce((sum, d) => sum + (d.amount || 0), 0),
        'Onboarding Date': new Date(c.createdAt).toLocaleDateString(),
      }));

      return { type, label, total: formatted.length, page: 1, limit: formatted.length, rows: formatted };
    }

    case 'follow-ups':
    default: {
      const [total, rows] = await Promise.all([
        prisma.followUp.count({ where: dateFilter }),
        prisma.followUp.findMany({
          where: dateFilter,
          skip,
          take: limit,
          orderBy: { scheduledAt: 'asc' },
          include: {
            assignedTo: { select: { fullName: true } },
            lead: { select: { companyName: true } },
            deal: { select: { title: true } },
          },
        }),
      ]);

      const formatted = rows.map((f) => ({
        'Follow-up ID': f.followUpNumber,
        'Title': f.title,
        'Remarks': f.remarks || 'N/A',
        'Status': f.status,
        'Priority': f.priority || 'MEDIUM',
        'Scheduled Date': new Date(f.scheduledAt).toLocaleString(),
        'Target Prospect': f.lead?.companyName || f.deal?.title || 'General',
        'Owner': f.assignedTo?.fullName || 'Unassigned',
      }));

      return { type, label, total, page, limit, rows: formatted };
    }
  }
}

/**
 * Converts JSON array of objects to standard CSV formatted string with escaping.
 */
export function serializeToCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');

  const dataLines = rows.map((row) =>
    headers
      .map((header) => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}
