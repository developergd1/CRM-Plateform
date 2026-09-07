import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { reviewRegularizationRequest, getRegularizationRequests } from '@/lib/regularization';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { action, remarks } = body; // action: 'APPROVED' | 'REJECTED'

    if (action !== 'APPROVED' && action !== 'REJECTED') {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVED or REJECTED' }, { status: 400 });
    }

    // Check permissions
    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientProfile) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });

      // Verify the request belongs to an employee of this client
      const allClientRequests = await getRegularizationRequests({ clientId: clientProfile.id });
      const targetRequest = allClientRequests.find((r) => r.id === id);
      if (!targetRequest) {
        return NextResponse.json({ error: 'Regularization request not found or not belonging to your organization' }, { status: 404 });
      }
    } else if (!isManagerOrAbove(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to review regularization' }, { status: 403 });
    }

    const reviewerName = user.fullName || user.roleDisplayName || 'Supervisor';
    const updated = await reviewRegularizationRequest({
      requestId: id,
      action,
      reviewedByUserId: user.id,
      reviewerName,
      remarks,
    });

    return NextResponse.json({
      success: true,
      message: `Regularization request ${action.toLowerCase()} successfully`,
      request: updated,
    });
  } catch (error: any) {
    console.error('Error reviewing regularization request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
