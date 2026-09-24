import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPayrollPeriodDetail } from '@/services/hrm/payroll.service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const period = await getPayrollPeriodDetail(params.id);
    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, period });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { prisma } = await import('@/lib/prisma');
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: params.id },
    });

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    if (period.status === 'FINALIZED') {
      return NextResponse.json(
        { error: 'Cannot delete a finalized and locked payroll period. Finalized payrolls are immutable.' },
        { status: 400 }
      );
    }

    await prisma.payrollRecord.deleteMany({ where: { periodId: params.id } });
    await prisma.payrollPeriod.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Draft period deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
