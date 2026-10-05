import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { reviewPayrollAdjustment } from '@/services/hrm/adjustment.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Approving payroll adjustments requires Admin or HR role' }, { status: 403 });
    }

    const body = await req.json();
    const { decision, remarks } = body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision: must be APPROVED or REJECTED' }, { status: 400 });
    }

    const adjustment = await reviewPayrollAdjustment(params.id, decision, user, remarks);
    return NextResponse.json({ success: true, adjustment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
