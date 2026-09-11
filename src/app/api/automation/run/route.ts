import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { runScheduledAutomation } from '@/lib/services/scheduled-tasks';

export async function POST(req: NextRequest) {
  try {
    // Check either internal admin session or cron authorization header
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const user = await getSessionUser(req);
      if (!user || !isAdminOrHR(user.role)) {
        return NextResponse.json({ error: 'Unauthorized: Admin privileges required to run automation' }, { status: 403 });
      }
    }

    const searchParams = req.nextUrl.searchParams;
    const timezone = searchParams.get('timezone') || 'Asia/Kolkata';

    const result = await runScheduledAutomation(timezone);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error running scheduled automation:', error);
    return NextResponse.json(
      { error: error.message || 'Automation execution failed' },
      { status: 500 }
    );
  }
}
