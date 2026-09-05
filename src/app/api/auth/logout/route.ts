import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, AUTH_COOKIE_NAME } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (user) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId,
        action: 'LOGOUT',
        entityType: 'AUTH',
        ipAddress: ip,
        status: 'SUCCESS',
      });
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}
