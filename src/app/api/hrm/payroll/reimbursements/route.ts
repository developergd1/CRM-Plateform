import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';
import {
  getReimbursementClaims,
  submitReimbursementClaim,
  approveReimbursementClaim,
} from '@/services/hrm/payroll.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = isAdmin(user.role)
      ? searchParams.get('employeeId') || undefined
      : user.employeeProfile?.id || user.employeeId;

    const claims = await getReimbursementClaims({
      employeeId: employeeId || undefined,
      status: (searchParams.get('status') as any) || undefined,
    });

    return NextResponse.json({ success: true, claims });
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

    const body = await req.json();

    if (body.type === 'APPROVE' || body.type === 'REJECT') {
      if (!isAdmin(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const claim = await approveReimbursementClaim(
        body.claimId,
        {
          id: user.id,
          fullName: user.fullName || 'Admin',
        },
        body.type === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      );

      return NextResponse.json({ success: true, claim });
    }

    // Default: Submit Claim
    const targetEmpId = body.employeeId || user.employeeProfile?.id || user.employeeId;
    if (!targetEmpId || !body.title || !body.amount) {
      return NextResponse.json({ error: 'Missing employeeId, title, or amount' }, { status: 400 });
    }

    const claim = await submitReimbursementClaim(
      {
        employeeId: targetEmpId,
        category: body.category || 'TRAVEL',
        title: body.title,
        amount: Number(body.amount),
        receiptUrl: body.receiptUrl,
        claimDate: body.claimDate || new Date().toISOString(),
      },
      {
        id: user.id,
        fullName: user.fullName || 'Employee',
      }
    );

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
