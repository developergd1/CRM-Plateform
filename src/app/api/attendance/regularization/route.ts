import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isManagerOrAbove } from '@/lib/rbac';
import {
  createRegularizationRequest,
  getRegularizationRequests,
} from '@/lib/regularization';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any;

    // 1. Regular Employee: only their own requests
    if (user.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

      const requests = await getRegularizationRequests({
        employeeId: emp.id,
        status: status || undefined,
      });

      return NextResponse.json({ success: true, requests });
    }

    // 2. Client: only their assigned employees' requests
    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientProfile) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });

      const requests = await getRegularizationRequests({
        clientId: clientProfile.id,
        status: status || undefined,
      });

      return NextResponse.json({ success: true, requests });
    }

    // 3. Admin / HR / Manager: all requests
    if (isManagerOrAbove(user.role)) {
      const filterClientId = searchParams.get('clientId') || undefined;
      const filterEmployeeId = searchParams.get('employeeId') || undefined;

      const requests = await getRegularizationRequests({
        clientId: filterClientId,
        employeeId: filterEmployeeId,
        status: status || undefined,
      });

      return NextResponse.json({ success: true, requests });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('Error fetching regularization requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const emp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
        ],
      },
      include: { client: true },
    });
    if (!emp) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const {
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      supportingReason,
    } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: 'Date and reason are required' }, { status: 400 });
    }

    const request = await createRegularizationRequest({
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeDisplayId: emp.employeeId,
      clientId: emp.clientId || undefined,
      clientName: emp.client?.companyName || undefined,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      supportingReason,
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance regularization request submitted successfully',
      request,
    });
  } catch (error: any) {
    console.error('Error submitting regularization request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
