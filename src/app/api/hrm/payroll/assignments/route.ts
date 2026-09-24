import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canManageSalaryStructure } from '@/lib/rbac';
import { getEmployeeSalaryAssignments, assignSalaryStructure } from '@/services/hrm/payroll.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await getEmployeeSalaryAssignments();
    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageSalaryStructure(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to assign salary structures' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.employeeId || !body.structureId || !body.baseCtcAnnual) {
      return NextResponse.json({ error: 'Missing employeeId, structureId, or baseCtcAnnual' }, { status: 400 });
    }

    const assignment = await assignSalaryStructure(
      {
        employeeId: body.employeeId,
        structureId: body.structureId,
        baseCtcAnnual: Number(body.baseCtcAnnual),
        effectiveFrom: body.effectiveFrom,
      },
      {
        id: user.id,
        fullName: user.fullName || 'Admin',
      }
    );

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
