import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { createPayrollAdjustment, getPayrollAdjustments } from '@/services/hrm/adjustment.service';
import { getTenantContext } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);

    const employeeId = searchParams.get('employeeId') || undefined;
    const effectivePeriodCode = searchParams.get('periodCode') || undefined;
    const status = searchParams.get('status') || undefined;

    const adjustments = await getPayrollAdjustments({
      employeeId,
      effectivePeriodCode,
      status,
      clientId: tenantContext?.clientDocId,
    });

    return NextResponse.json({ success: true, adjustments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Creating payroll adjustments requires HR or Admin role' }, { status: 403 });
    }

    const tenantContext = await getTenantContext(req);
    const body = await req.json();

    const adjustment = await createPayrollAdjustment(
      {
        ...body,
        clientId: tenantContext?.isAdmin ? (body.clientId || null) : tenantContext?.clientDocId,
      },
      user
    );

    return NextResponse.json({ success: true, adjustment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
