import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { calculateTimesheets, approveTimesheet } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const periodType = (searchParams.get('periodType') || 'MONTHLY') as 'DAILY' | 'WEEKLY' | 'MONTHLY';
    const periodIdentifier = searchParams.get('period') || new Date().toISOString().substring(0, 7);
    const clientId = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);
    const employeeId = user.role === 'EMPLOYEE' ? user.employeeProfileId : (searchParams.get('employeeId') || undefined);

    const timesheets = await calculateTimesheets({
      periodType,
      periodIdentifier,
      clientId,
      employeeId,
    });

    return NextResponse.json({ success: true, timesheets, periodIdentifier, periodType });
  } catch (err: any) {
    console.error('Error fetching timesheets:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied. Timesheet approval requires supervisor or administrator authority.' }, { status: 403 });
    }

    const body = await req.json();
    const { timesheetId, remarks } = body;

    if (!timesheetId) return NextResponse.json({ error: 'Timesheet ID is required' }, { status: 400 });

    const result = await approveTimesheet(timesheetId, user, remarks);
    return NextResponse.json({
      message: `Timesheet ${timesheetId} approved successfully.`,
      ...result,
    });
  } catch (err: any) {
    console.error('Error approving timesheet:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
