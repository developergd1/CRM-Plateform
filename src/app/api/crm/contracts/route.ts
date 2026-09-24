import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM, canManageCRM } from '@/lib/rbac';
import { createContract } from '@/services/crm/commercial.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId;

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';

    const contracts = await prisma.contract.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        ...(status ? { status } : {}),
        ...(targetClientId ? { OR: [{ deal: { clientId: targetClientId } }, { account: { clientId: targetClientId } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { id: true, accountCode: true, companyName: true } },
        deal: { select: { id: true, dealNumber: true, title: true } },
        renewals: true,
      },
    });

    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (!body.accountId || !body.dealId || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'accountId, dealId, startDate, and endDate are required.' }, { status: 400 });
    }

    const contract = await createContract({
      ...body,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return NextResponse.json({ error: error.message || 'Failed to create contract' }, { status: 500 });
  }
}
