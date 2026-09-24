import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canConvertCandidate } from '@/lib/rbac';
import { convertCandidateToEmployee } from '@/services/hrm/recruitment.service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canConvertCandidate(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can onboard/convert candidates into EMS' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const result = await convertCandidateToEmployee(
      params.id,
      {
        joiningDate: body.joiningDate,
        departmentId: body.departmentId,
        designation: body.designation,
        offeredCtc: body.offeredCtc ? Number(body.offeredCtc) : undefined,
        bankAccountNumber: body.bankAccountNumber,
        bankIfscCode: body.bankIfscCode,
        panNumber: body.panNumber,
        defaultPassword: body.defaultPassword,
      },
      {
        id: user.id,
        fullName: user.fullName || 'Administrator',
      }
    );

    return NextResponse.json({
      ...result,
      message: `Candidate successfully converted into EMS Master Employee ${result.employeeId}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
