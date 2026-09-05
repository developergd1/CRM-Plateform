import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const actionType = searchParams.get('actionType') || '';
    const employeeId = searchParams.get('employeeId') || '';

    const where: any = {};

    // Role-based scoping: If user is CLIENT, only return block history of their employees
    if (user.role === 'CLIENT') {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (clientRecord) {
        where.employee = { clientId: clientRecord.id };
      } else {
        return NextResponse.json({ success: true, histories: [] });
      }
    }

    if (actionType) {
      where.actionType = actionType;
    }

    if (employeeId) {
      where.OR = [
        { employeeId: employeeId },
        { employee: { employeeId: employeeId } },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { reason: { contains: search } },
            { remarks: { contains: search } },
            { actionBy: { contains: search } },
            { employee: { employeeId: { contains: search } } },
            { employee: { fullName: { contains: search } } },
            { employee: { client: { companyName: { contains: search } } } },
          ],
        },
      ];
    }

    const histories = await prisma.employeeBlockHistory.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            status: true,
            client: {
              select: {
                id: true,
                clientId: true,
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { actionDate: 'desc' },
    });

    return NextResponse.json({ success: true, histories });
  } catch (error: any) {
    console.error('Error fetching block history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
