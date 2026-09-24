import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';
import { getSalesForecast } from '@/services/crm/analytics.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || undefined;

    const forecast = await getSalesForecast(period, tenantContext?.clientDocId);
    return NextResponse.json({ success: true, data: forecast });
  } catch (error: any) {
    console.error('Error fetching sales forecast:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch sales forecast' }, { status: 500 });
  }
}
