import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { approveAppraisalDecision } from '@/services/hrm/performance.service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Approving appraisals requires Admin or HR role' }, { status: 403 });
    }

    const body = await req.json();
    const { decision } = body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision: must be APPROVED or REJECTED' }, { status: 400 });
    }

    const appraisal = await approveAppraisalDecision(params.id, user, decision);
    return NextResponse.json({ success: true, appraisal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
