import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';
import { getCrmDashboardMetrics } from '@/services/crm/analytics.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || 'month';

    const metrics = await getCrmDashboardMetrics(timeframe, tenantContext?.clientDocId);
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('Error getting dashboard metrics:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}
