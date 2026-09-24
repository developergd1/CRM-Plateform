import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canManageCRM } from '@/lib/rbac';
import { processClientHandoff } from '@/services/crm/commercial.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden: Admin authority required.' }, { status: 403 });

    const result = await processClientHandoff({
      handoffId: params.id,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
    });

    return NextResponse.json({
      success: true,
      message: `Client Handoff processed. Client ID ${result.client.clientId} created in Client Management.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing handoff:', error);
    return NextResponse.json({ error: error.message || 'Failed to process handoff' }, { status: 500 });
  }
}
