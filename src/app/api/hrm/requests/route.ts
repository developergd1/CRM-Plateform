import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getHrRequestTypes,
  getHrRequests,
  createHrRequest,
  updateHrRequestStatus,
} from '@/services/hrm/experience.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status') as any;

    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (employeeId && employeeId !== ownEmpId && employeeId !== user.employeeProfile?.id && employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own HR requests.' }, { status: 403 });
      }
      employeeId = ownEmpId || null;
    }

    const [types, requests] = await Promise.all([
      getHrRequestTypes(),
      getHrRequests({
        employeeId: employeeId || undefined,
        status: status || undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      types,
      requests,
    });
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

    const body = await req.json();

    if (body.type === 'STATUS_UPDATE') {
      if (user.role === 'EMPLOYEE') {
        return NextResponse.json({ error: 'Permission denied. Employees cannot update HR request status.' }, { status: 403 });
      }

      const request = await updateHrRequestStatus(
        body.requestId,
        body.status,
        body.remarks,
        {
          id: user.id,
          fullName: user.fullName || 'HR Executive',
        }
      );
      return NextResponse.json({ success: true, request });
    }

    // Default: Create Request
    let targetEmployeeId = body.employeeId || user.employeeProfile?.id || user.employeeId;
    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (body.employeeId && body.employeeId !== ownEmpId && body.employeeId !== user.employeeProfile?.id && body.employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You cannot submit HR requests for another employee.' }, { status: 403 });
      }
      targetEmployeeId = ownEmpId;
    }

    if (!targetEmployeeId || !body.requestTypeId || !body.title) {
      return NextResponse.json({ error: 'Missing employeeId, requestTypeId, or title' }, { status: 400 });
    }

    const request = await createHrRequest(
      {
        employeeId: targetEmployeeId,
        requestTypeId: body.requestTypeId,
        title: body.title,
        description: body.description || body.title,
        attachmentUrl: body.attachmentUrl,
      } as any,
      {
        id: user.id,
        fullName: user.fullName || 'Employee',
      }
    );

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
