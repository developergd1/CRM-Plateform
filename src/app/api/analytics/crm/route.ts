import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCrmAnalyticsData, DateFilterPreset } from '@/lib/services/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Strict Tenant Isolation & RBAC: CLIENT role cannot access internal CRM analytics
    if (user.role === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden: Client accounts are restricted from internal CRM pipeline analytics.' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const preset = (searchParams.get('preset') || 'THIS_MONTH') as DateFilterPreset;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const timezone = searchParams.get('timezone') || 'Asia/Kolkata';

    const analytics = await getCrmAnalyticsData({ preset, startDate, endDate, timezone });

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error('Error in CRM Analytics API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate CRM analytics' },
      { status: 500 }
    );
  }
}
