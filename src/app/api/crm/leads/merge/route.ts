import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canManageCRM } from '@/lib/rbac';
import { mergeLeads } from '@/services/crm/lead.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canManageCRM(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required to merge records.' }, { status: 403 });
    }

    const { primaryLeadId, secondaryLeadId } = await req.json();

    if (!primaryLeadId || !secondaryLeadId) {
      return NextResponse.json({ error: 'primaryLeadId and secondaryLeadId are required.' }, { status: 400 });
    }

    const result = await mergeLeads({
      primaryLeadId,
      secondaryLeadId,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
    });

    return NextResponse.json({
      success: true,
      message: 'Leads merged successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('Error merging leads:', error);
    return NextResponse.json({ error: error.message || 'Failed to merge leads' }, { status: 500 });
  }
}
