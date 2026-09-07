import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import { getEffectiveWorkPolicy, saveWorkPolicyOverride } from '@/lib/work-policy';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const clientId = searchParams.get('clientId') || (user.role === 'CLIENT' ? user.clientId : undefined);

    const policy = await getEffectiveWorkPolicy({ employeeId, clientId });
    return NextResponse.json({ success: true, policy });
  } catch (error: any) {
    console.error('Policy fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { targetType, targetId, policy } = body;

    // RBAC: Admin can set GLOBAL, CLIENT, EMPLOYEE
    // Client can only set CLIENT (their own) or EMPLOYEE (their own employee)
    if (user.role === 'CLIENT') {
      if (targetType === 'GLOBAL') {
        return NextResponse.json({ error: 'Clients cannot modify global policy' }, { status: 403 });
      }

      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      if (!clientProfile) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      }

      if (targetType === 'CLIENT' && targetId !== clientProfile.id) {
        return NextResponse.json({ error: 'Unauthorized to modify other client policy' }, { status: 403 });
      }

      if (targetType === 'EMPLOYEE') {
        const emp = await prisma.employee.findUnique({ where: { id: targetId } });
        if (!emp || emp.clientId !== clientProfile.id) {
          return NextResponse.json({ error: 'Employee does not belong to your organization' }, { status: 403 });
        }
      }
    } else if (!isManagerOrAbove(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const updated = await saveWorkPolicyOverride(targetType, targetId, policy);

    return NextResponse.json({
      success: true,
      message: 'Work policy updated successfully',
      policy: updated,
    });
  } catch (error: any) {
    console.error('Policy update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
