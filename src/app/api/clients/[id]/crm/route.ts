import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getClientCRMData } from '@/lib/services/client-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Client Portal Users are strictly forbidden from viewing internal CRM data
    if (user.role === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden. Internal sales CRM records are not accessible in Client Portal.' },
        { status: 403 }
      );
    }

    const data = await getClientCRMData(params.id);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching client CRM data:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch client CRM data' }, { status: 500 });
  }
}
