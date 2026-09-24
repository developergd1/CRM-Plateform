import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canApprovePayroll } from '@/lib/rbac';
import { approvePayrollPeriod } from '@/services/hrm/payroll.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApprovePayroll(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can approve payroll' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.periodId) {
      return NextResponse.json({ error: 'Missing periodId' }, { status: 400 });
    }

    const approved = await approvePayrollPeriod(
      body.periodId,
      {
        id: user.id,
        fullName: user.fullName || 'Admin',
        role: user.role,
      },
      body.remarks
    );

    return NextResponse.json({
      success: true,
      message: 'Payroll period approved successfully',
      period: approved,
    });
  } catch (error: any) {
    const msg = error.message || 'Internal Server Error';
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.toLowerCase().includes('finalized') || msg.toLowerCase().includes('already approved')) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
