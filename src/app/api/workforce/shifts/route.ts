import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getShiftPolicies, saveShiftPolicy, deleteShiftPolicy } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);

    const shifts = await getShiftPolicies({ clientId });
    return NextResponse.json({ success: true, shifts });
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
    if (!body.name || !body.startTime || !body.endTime) {
      return NextResponse.json({ error: 'Shift name, start time, and end time are required.' }, { status: 400 });
    }

    // Client users can only configure client-specific shifts for their company
    if (user.role === 'CLIENT') {
      body.clientId = user.parentClientId || user.clientId;
    }

    const saved = await saveShiftPolicy(body, user);
    return NextResponse.json({
      success: true,
      message: `Shift policy '${saved.name}' saved successfully.`,
      shift: saved,
    });
  } catch (err: any) {
    console.error('Error saving shift policy:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });

    const deleted = await deleteShiftPolicy(id, user);
    return NextResponse.json({ success: deleted, message: 'Shift policy removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
