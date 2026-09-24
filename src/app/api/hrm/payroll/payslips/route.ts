import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdmin, canViewEmployeePayslip } from '@/lib/rbac';
import { getPayslips } from '@/services/hrm/payroll.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedEmpId = searchParams.get('employeeId') || undefined;
    const periodCode = searchParams.get('periodCode') || undefined;

    let targetEmpId = requestedEmpId;

    if (!isAdmin(user.role)) {
      // Non-admin can only see their own payslips
      targetEmpId = user.employeeProfile?.id || user.employeeId;
      if (!targetEmpId) {
        return NextResponse.json({ success: true, payslips: [] });
      }
    }

    const payslips = await getPayslips({
      employeeId: targetEmpId,
      periodCode,
    });

    return NextResponse.json({
      success: true,
      payslips,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
