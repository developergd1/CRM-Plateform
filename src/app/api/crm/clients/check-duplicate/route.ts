import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const phone = searchParams.get('phone')?.trim() || '';
    const email = searchParams.get('email')?.toLowerCase().trim() || '';
    const company = searchParams.get('company')?.trim() || '';

    const conditions: any[] = [];
    if (phone && phone.length > 5) {
      // Normalize phone digits
      const digits = phone.replace(/\D/g, '').slice(-10);
      if (digits.length >= 7) {
        conditions.push({ phone: { contains: digits } });
      }
    }
    if (email && email.includes('@')) {
      conditions.push({ email: { equals: email } });
    }
    if (company && company.length > 3) {
      conditions.push({ company: { contains: company } });
    }

    if (conditions.length === 0) {
      return NextResponse.json({ isDuplicate: false, matches: [] });
    }

    const duplicates = await prisma.client.findMany({
      where: {
        OR: conditions,
      },
      include: {
        assignedEmployee: {
          select: { employeeId: true, fullName: true },
        },
      },
      take: 5,
    });

    return NextResponse.json({
      isDuplicate: duplicates.length > 0,
      matches: duplicates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
