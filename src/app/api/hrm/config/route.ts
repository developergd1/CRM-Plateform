import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getHrmConfiguration, updateHrmConfiguration } from '@/services/hrm/config.service';
import { getTenantContext } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantContext = await getTenantContext(req);
    const config = await getHrmConfiguration(tenantContext?.clientDocId);

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Configuration requires Admin or HR role' }, { status: 403 });
    }

    const tenantContext = await getTenantContext(req);
    const body = await req.json();

    const config = await updateHrmConfiguration(
      body,
      tenantContext?.isAdmin ? (body.clientId || null) : tenantContext?.clientDocId,
      user
    );

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
