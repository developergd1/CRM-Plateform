import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM, canManageCRM } from '@/lib/rbac';
import { checkModuleAccess, getTenantContext } from '@/lib/tenant';
import { createQuote } from '@/services/crm/commercial.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId;

    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('dealId')?.trim() || '';
    const accountId = searchParams.get('accountId')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const quotes = await prisma.quote.findMany({
      where: {
        ...(dealId ? { dealId } : {}),
        ...(accountId ? { accountId } : {}),
        ...(status ? { status } : {}),
        ...(targetClientId ? { OR: [{ deal: { clientId: targetClientId } }, { account: { clientId: targetClientId } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        deal: { select: { id: true, dealNumber: true, title: true } },
        account: { select: { id: true, accountCode: true, companyName: true } },
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, data: quotes });
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const body = await req.json();
    if (!body.dealId || !body.accountId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'dealId, accountId, and at least one item are required.' }, { status: 400 });
    }

    const quote = await createQuote({
      ...body,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
    });

    return NextResponse.json({ success: true, data: quote }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: error.message || 'Failed to create quote' }, { status: 500 });
  }
}
