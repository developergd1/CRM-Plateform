import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const [leads, accounts, contacts, deals, quotes, contracts] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { leadNumber: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          isArchived: false,
        },
        take: 5,
        select: { id: true, leadNumber: true, fullName: true, companyName: true, status: true },
      }),
      prisma.account.findMany({
        where: {
          OR: [
            { accountCode: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, accountCode: true, companyName: true, status: true },
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { contactNumber: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, contactNumber: true, fullName: true, phone: true, designation: true },
      }),
      prisma.deal.findMany({
        where: {
          OR: [
            { dealNumber: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, dealNumber: true, title: true, amount: true, stage: true, status: true },
      }),
      prisma.quote.findMany({
        where: {
          quoteNumber: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, quoteNumber: true, total: true, status: true },
      }),
      prisma.contract.findMany({
        where: {
          contractNumber: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, contractNumber: true, value: true, status: true },
      }),
    ]);

    const results = [
      ...leads.map((l) => ({ type: 'LEAD', id: l.id, code: l.leadNumber, title: l.fullName || l.companyName, subtitle: l.companyName, status: l.status })),
      ...accounts.map((a) => ({ type: 'ACCOUNT', id: a.id, code: a.accountCode, title: a.companyName, status: a.status })),
      ...contacts.map((c) => ({ type: 'CONTACT', id: c.id, code: c.contactNumber, title: c.fullName, subtitle: c.designation })),
      ...deals.map((d) => ({ type: 'DEAL', id: d.id, code: d.dealNumber, title: d.title, subtitle: `₹${(d.amount || 0).toLocaleString('en-IN')}`, status: d.stage })),
      ...quotes.map((q) => ({ type: 'QUOTE', id: q.id, code: q.quoteNumber, title: q.quoteNumber, subtitle: `₹${(q.total || 0).toLocaleString('en-IN')}`, status: q.status })),
      ...contracts.map((ct) => ({ type: 'CONTRACT', id: ct.id, code: ct.contractNumber, title: ct.contractNumber, subtitle: `₹${(ct.value || 0).toLocaleString('en-IN')}`, status: ct.status })),
    ];

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error searching CRM:', error);
    return NextResponse.json({ error: error.message || 'Failed to search CRM' }, { status: 500 });
  }
}
