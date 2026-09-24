import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const handoffs = await prisma.clientHandoff.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { id: true, accountCode: true, companyName: true, phone: true, email: true, industry: true } },
        deal: { select: { id: true, dealNumber: true, title: true, amount: true, expectedCloseDate: true } },
      },
    });

    return NextResponse.json({ success: true, data: handoffs });
  } catch (error: any) {
    console.error('Error fetching handoffs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch handoffs' }, { status: 500 });
  }
}
