import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { assignEmployeeToClient } from '@/lib/services/client-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden. Administrator or HR privileges required to assign employees.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });
    }

    const result = await assignEmployeeToClient(employeeId, params.id, {
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error assigning employee to client:', error);
    return NextResponse.json({ error: error.message || 'Failed to assign employee' }, { status: 500 });
  }
}
