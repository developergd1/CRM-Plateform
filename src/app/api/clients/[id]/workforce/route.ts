import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClientWorkforceData } from '@/lib/services/client-service';
import { verifyClientOrganizationAccess } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { hasAccess, resolvedClientId } = await verifyClientOrganizationAccess(user, params.id);
    if (!hasAccess || !resolvedClientId) {
      return NextResponse.json({ error: 'Permission denied for this client organization.' }, { status: 403 });
    }

    const data = await getClientWorkforceData(resolvedClientId);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching client workforce data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch client workforce data' }, { status: 500 });
  }
}
