import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canApproveLeave } from '@/lib/rbac';
import { approveLeaveApplication } from '@/services/hrm/leave.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveLeave(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to approve leave' }, { status: 403 });
    }

    const body = await req.json();
    const decision = body.decision === 'REJECT' || body.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    const remarks = body.remarks || body.comment || '';

    const updated = await approveLeaveApplication(
      params.id,
      {
        id: user.id,
        fullName: user.fullName || 'Manager',
        role: user.role,
      },
      decision,
      remarks
    );

    return NextResponse.json({
      success: true,
      application: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
