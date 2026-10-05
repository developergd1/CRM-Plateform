import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import {
  getPayrollExceptions,
  resolvePayrollException,
  waivePayrollException,
  scanPayrollPeriodExceptions,
} from '@/services/hrm/exception.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get('periodId') || undefined;

    const exceptions = await getPayrollExceptions(periodId);
    return NextResponse.json({ success: true, exceptions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Exception resolution requires Admin or HR role' }, { status: 403 });
    }

    const body = await req.json();
    const { action, exceptionId, resolution, periodId } = body;

    if (action === 'SCAN' && periodId) {
      const count = await scanPayrollPeriodExceptions(periodId);
      return NextResponse.json({ success: true, count, message: `Scanned and discovered ${count} exception(s)` });
    }

    if (action === 'RESOLVE' && exceptionId) {
      const updated = await resolvePayrollException(exceptionId, resolution || 'Resolved by administrative review', user);
      return NextResponse.json({ success: true, exception: updated });
    }

    if (action === 'WAIVE' && exceptionId) {
      const updated = await waivePayrollException(exceptionId, resolution || 'Waived by administrative override', user);
      return NextResponse.json({ success: true, exception: updated });
    }

    return NextResponse.json({ error: 'Invalid exception action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
