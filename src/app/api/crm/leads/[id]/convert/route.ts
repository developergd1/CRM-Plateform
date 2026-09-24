import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canConvertLeads } from '@/lib/rbac';
import { convertLeadToCommercialEntities } from '@/services/crm/lead.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canConvertLeads(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to convert commercial leads.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const leadId = params.id;

    const result = await convertLeadToCommercialEntities({
      leadId,
      createAccount: body.createAccount !== false,
      accountName: body.accountName,
      createContact: body.createContact !== false,
      contactName: body.contactName,
      decisionRole: body.decisionRole,
      createDeal: body.createDeal !== false,
      dealTitle: body.dealTitle,
      dealAmount: body.dealAmount,
      dealProbability: body.dealProbability,
      expectedCloseDate: body.expectedCloseDate,
      ownerId: body.ownerId,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
      actorName: user.fullName || 'Admin User',
    });

    return NextResponse.json({
      success: true,
      message: `Lead successfully converted to Account, Contact, and Deal.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error converting lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert lead.' },
      { status: 500 }
    );
  }
}
