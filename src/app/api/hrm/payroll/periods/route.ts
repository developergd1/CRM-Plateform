import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canProcessPayroll } from '@/lib/rbac';
import { getPayrollPeriods, createPayrollPeriod } from '@/services/hrm/payroll.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const periods = await getPayrollPeriods(tenantContext?.clientDocId);
    return NextResponse.json({ success: true, periods });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canProcessPayroll(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month (1-12) or year' }, { status: 400 });
    }

    const period = await createPayrollPeriod(month, year, {
      id: user.id,
      fullName: user.fullName || 'Payroll Officer',
    });

    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
