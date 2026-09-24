import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';
import { getCalendarActivities } from '@/services/crm/activity.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const ownerId = searchParams.get('ownerId') || undefined;

    const data = await getCalendarActivities({ start, end, ownerId });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching calendar activities:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch calendar' }, { status: 500 });
  }
}
