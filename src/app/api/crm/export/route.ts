import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canExportCRMData } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canExportCRMData(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity') || 'leads';

    let csvContent = '';
    let filename = `crm-${entity}-${Date.now()}.csv`;

    if (entity === 'leads') {
      const leads = await prisma.lead.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['Lead Number', 'Name', 'Company', 'Phone', 'Email', 'Source', 'Status', 'Priority', 'Score', 'Created At'];
      const rows = leads.map((l) => [
        `"${l.leadNumber}"`,
        `"${l.fullName || l.contactPerson || ''}"`,
        `"${l.companyName || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.email || ''}"`,
        `"${l.source || ''}"`,
        `"${l.status || ''}"`,
        `"${l.priority || ''}"`,
        l.leadScore,
        `"${new Date(l.createdAt).toLocaleDateString()}"`,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'accounts') {
      const accounts = await prisma.account.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['Account Code', 'Company Name', 'Industry', 'Phone', 'Email', 'City', 'Status', 'Account Type'];
      const rows = accounts.map((a) => [
        `"${a.accountCode}"`,
        `"${a.companyName}"`,
        `"${a.industry || ''}"`,
        `"${a.phone || ''}"`,
        `"${a.email || ''}"`,
        `"${a.city || ''}"`,
        `"${a.status}"`,
        `"${a.accountType}"`,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (entity === 'deals') {
      const deals = await prisma.deal.findMany({
        orderBy: { createdAt: 'desc' },
        include: { account: true },
      });

      const headers = ['Deal Number', 'Title', 'Account', 'Amount', 'Probability', 'Weighted Value', 'Stage', 'Status'];
      const rows = deals.map((d) => [
        `"${d.dealNumber}"`,
        `"${d.title}"`,
        `"${d.account?.companyName || ''}"`,
        d.amount,
        d.probability,
        d.weightedValue,
        `"${d.stage}"`,
        `"${d.status}"`,
      ]);

    } else if (entity === 'clients') {
      const clients = await prisma.client.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const headers = ['Client ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Stage', 'Priority', 'Estimated Value'];
      const rows = clients.map((c) => [
        `"${c.clientId}"`,
        `"${c.companyName}"`,
        `"${c.name}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.stage}"`,
        `"${c.priority}"`,
        c.estimatedValue || 0,
      ]);

      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      return NextResponse.json({ error: 'Unsupported entity for export' }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting CRM data:', error);
    return NextResponse.json({ error: error.message || 'Failed to export data' }, { status: 500 });
  }
}
