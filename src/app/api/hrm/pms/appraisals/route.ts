import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { createAppraisalDecision, getPmsAppraisals } from '@/services/hrm/performance.service';
import { getTenantContext } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;

    const appraisals = await getPmsAppraisals({
      employeeId,
      clientId: tenantContext?.clientDocId,
    });

    return NextResponse.json({ success: true, appraisals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Creating appraisal decisions requires HR or Admin role' }, { status: 403 });
    }

    const tenantContext = await getTenantContext(req);
    const body = await req.json();

    const appraisal = await createAppraisalDecision(
      {
        ...body,
        clientId: tenantContext?.isAdmin ? (body.clientId || null) : tenantContext?.clientDocId,
      },
      user
    );

    return NextResponse.json({ success: true, appraisal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
