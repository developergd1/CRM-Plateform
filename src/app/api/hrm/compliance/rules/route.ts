import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { getStatutoryRules, upsertStatutoryRule } from '@/services/hrm/statutory.service';
import { getTenantContext } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const ruleType = searchParams.get('ruleType') || undefined;

    const rules = await getStatutoryRules({
      ruleType,
      clientId: tenantContext?.clientDocId,
    });

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Compliance rule modifications require Administrator or HR privilege' }, { status: 403 });
    }

    const tenantContext = await getTenantContext(req);
    const body = await req.json();

    const rule = await upsertStatutoryRule(
      {
        ...body,
        clientId: tenantContext?.isAdmin ? (body.clientId || null) : tenantContext?.clientDocId,
      },
      user
    );

    return NextResponse.json({ success: true, rule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
