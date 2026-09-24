import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getHolidays, saveHoliday, deleteHoliday } from '@/lib/services/ems-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const clientId = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);

    const holidays = await getHolidays({ year, clientId });
    return NextResponse.json({ success: true, holidays, year });
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
    if (!body.name || !body.date) {
      return NextResponse.json({ error: 'Holiday name and date (YYYY-MM-DD) are required.' }, { status: 400 });
    }

    if (user.role === 'CLIENT') {
      body.clientId = user.parentClientId || user.clientId;
    }

    const saved = await saveHoliday(body, user);
    return NextResponse.json({
      success: true,
      message: `Holiday '${saved.name}' saved successfully.`,
      holiday: saved,
    });
  } catch (err: any) {
    console.error('Error saving holiday:', err);
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
    if (!id) return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });

    const deleted = await deleteHoliday(id, user);
    return NextResponse.json({ success: deleted, message: 'Holiday removed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
