import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdmin } from '@/lib/rbac';
import { getEmployeeLoans, createEmployeeLoan } from '@/services/hrm/payroll.service';

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

    const loans = await getEmployeeLoans(employeeId || undefined);
    return NextResponse.json({ success: true, loans });
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

    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can disburse loans' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.employeeId || !body.principalAmount || !body.monthlyInstallment || !body.totalInstallments) {
      return NextResponse.json({ error: 'Missing required loan fields' }, { status: 400 });
    }

    const loan = await createEmployeeLoan(
      {
        employeeId: body.employeeId,
        principalAmount: Number(body.principalAmount),
        monthlyInstallment: Number(body.monthlyInstallment),
        totalInstallments: Number(body.totalInstallments),
        purpose: body.purpose,
      },
      {
        id: user.id,
        fullName: user.fullName || 'Payroll Admin',
      }
    );

    return NextResponse.json({ success: true, loan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
