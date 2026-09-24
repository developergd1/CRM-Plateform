import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';

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

    const renewals = await prisma.renewal.findMany({
      where: targetClientId ? { account: { clientId: targetClientId } } : {},
      orderBy: { renewalDate: 'asc' },
      include: {
        account: { select: { id: true, accountCode: true, companyName: true, phone: true } },
        contract: { select: { id: true, contractNumber: true, value: true, endDate: true } },
      },
    });

    return NextResponse.json({ success: true, data: renewals });
  } catch (error: any) {
    console.error('Error fetching renewals:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch renewals' }, { status: 500 });
  }
}
