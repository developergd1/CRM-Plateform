import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getLeaveTypes,
  getLeaveApplications,
  getEmployeeLeaveBalances,
  applyLeave,
} from '@/services/hrm/leave.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getTenantContext, checkModuleAccess } = await import('@/lib/tenant');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const targetClientId = tenantContext?.clientDocId;

    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status') as any;

    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (employeeId && employeeId !== ownEmpId && employeeId !== user.employeeProfile?.id && employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own leave applications.' }, { status: 403 });
      }
      employeeId = ownEmpId || null;
    }

    const leaveTypes = await getLeaveTypes();
    const applications = await getLeaveApplications({
      employeeId: employeeId || undefined,
      status: status || undefined,
      tenantClientId: targetClientId,
    });

    let balances: any[] = [];
    if (employeeId) {
      balances = await getEmployeeLeaveBalances(employeeId);
    } else if (user.employeeProfile?.id) {
      balances = await getEmployeeLeaveBalances(user.employeeProfile.id);
    }

    return NextResponse.json({
      success: true,
      leaveTypes,
      applications,
      balances,
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
    let targetEmployeeId = body.employeeId || user.employeeProfile?.id || user.employeeId;
    if (user.role === 'EMPLOYEE') {
      const ownEmpId = user.employeeProfile?.id || user.employeeId;
      if (body.employeeId && body.employeeId !== ownEmpId && body.employeeId !== user.employeeProfile?.id && body.employeeId !== user.employeeId) {
        return NextResponse.json({ error: 'Permission denied. You cannot apply for leave on behalf of another employee.' }, { status: 403 });
      }
      targetEmployeeId = ownEmpId;
    }

    if (!targetEmployeeId || !body.leaveTypeId || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required leave fields: employeeId, leaveTypeId, startDate, endDate' },
        { status: 400 }
      );
    }

    const totalDays = Number(body.days || body.totalDays) || 1;

    const application = await applyLeave(
      {
        employeeId: targetEmployeeId,
        leaveTypeId: body.leaveTypeId,
        startDate: body.startDate,
        endDate: body.endDate,
        dayType: body.dayType || 'FULL_DAY',
        totalDays,
        reason: body.reason || 'Personal leave request',
        attachmentUrl: body.attachmentUrl,
      } as any,
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName || 'Employee',
      }
    );

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
