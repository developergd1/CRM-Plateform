import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canApproveQuotes } from '@/lib/rbac';
import { approveQuote } from '@/services/crm/commercial.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canApproveQuotes(user.role)) return NextResponse.json({ error: 'Forbidden: Approval authority required.' }, { status: 403 });

    const quote = await approveQuote(params.id, {
      userId: user.id,
      employeeId: user.employeeId || undefined,
    });

    return NextResponse.json({ success: true, message: 'Quote approved.', data: quote });
  } catch (error: any) {
    console.error('Error approving quote:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve quote' }, { status: 500 });
  }
}
