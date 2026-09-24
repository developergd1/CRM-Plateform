import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canFinalizePayroll } from '@/lib/rbac';
import { finalizePayrollPeriod } from '@/services/hrm/payroll.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canFinalizePayroll(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only Super Administrators can finalize payroll' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.periodId) {
      return NextResponse.json({ error: 'Missing periodId' }, { status: 400 });
    }

    const finalized = await finalizePayrollPeriod(body.periodId, {
      id: user.id,
      fullName: user.fullName || 'Admin',
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Payroll period permanently finalized. Immutable payslips generated.',
      period: finalized,
    });
  } catch (error: any) {
    const msg = error.message || 'Internal Server Error';
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.toLowerCase().includes('already finalized') || msg.toLowerCase().includes('finalized')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
