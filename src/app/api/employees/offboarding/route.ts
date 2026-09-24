import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getOffboardings, initiateOffboarding, updateOffboardingClearance } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);
    const stage = searchParams.get('stage') || undefined;

    const offboardings = await getOffboardings({ clientId, stage });
    return NextResponse.json({ success: true, offboardings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, exitType, exitReason, noticeDate, lastWorkingDay, exitNotes } = body;

    if (!employeeId || !exitType || !exitReason || !noticeDate || !lastWorkingDay) {
      return NextResponse.json({ error: 'Employee, exit type, reason, notice date, and last working day are required.' }, { status: 400 });
    }

    const record = await initiateOffboarding(
      { employeeId, exitType, exitReason, noticeDate, lastWorkingDay, exitNotes },
      user
    );

    return NextResponse.json({
      success: true,
      message: `Offboarding initiated for ${record.employeeName} (${record.employeeDisplayId}).`,
      offboarding: record,
    });
  } catch (err: any) {
    console.error('Error initiating offboarding:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'Offboarding ID is required' }, { status: 400 });

    const updated = await updateOffboardingClearance(id, updates, user);
    return NextResponse.json({
      success: true,
      message: 'Offboarding clearances updated successfully.',
      offboarding: updated,
    });
  } catch (err: any) {
    console.error('Error updating offboarding:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
