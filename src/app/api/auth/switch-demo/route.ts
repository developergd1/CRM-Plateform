import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const role = body.role || body.roleCode;
    const directEmail = body.email;

    let targetEmail = 'admin@growthindia.in';

    if (directEmail && typeof directEmail === 'string' && directEmail.includes('@')) {
      targetEmail = directEmail.toLowerCase().trim();
    } else if (role === 'SUPER_ADMIN' || role === 'super-admin') {
      targetEmail = 'admin@growthindia.in';
    } else if (role === 'ADMIN_HR' || role === 'admin-hr') {
      targetEmail = 'neha.gupta@growthindia.in';
    } else if (role === 'MANAGER_TL' || role === 'client-services' || role === 'VIKRAM') {
      targetEmail = 'vikram.singh@growthindia.in';
    } else if (role === 'EMPLOYEE' || role === 'employee-sales' || role === 'PRIYA') {
      targetEmail = 'priya.patel@growthindia.in';
    } else if (role === 'BLOCKED_DEMO' || role === 'blocked-employee' || role === 'ROHAN') {
      targetEmail = 'rohan.mehta@growthindia.in';
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        role: true,
        employeeProfile: {
          include: {
            department: true,
            team: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: `Demo account (${targetEmail}) not found in database.` }, { status: 404 });
    }

    // Check if the account is blocked / suspended
    const isBlocked =
      user.isSuspended ||
      !user.isActive ||
      user.employeeProfile?.status === 'BLOCKED' ||
      user.employeeProfile?.isBlocked ||
      user.employeeProfile?.status === 'SUSPENDED';

    if (isBlocked) {
      return NextResponse.json(
        {
          error: `🔒 Access Denied: The profile for ${user.employeeProfile?.fullName || user.email} (${user.employeeProfile?.employeeId || 'DEMO'}) is currently BLOCKED by Administrator governance.`,
          isBlocked: true,
        },
        { status: 403 }
      );
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      employeeId: user.employeeProfile?.employeeId || 'ADMIN',
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeProfile?.employeeId || 'ADMIN',
      action: 'DEMO_ROLE_SWITCH',
      entityType: 'AUTH',
      newData: { switchedTo: role || targetEmail, email: user.email },
      status: 'SUCCESS',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        roleDisplayName: user.role.displayName,
        employeeId: user.employeeProfile?.employeeId || 'ADMIN',
        fullName: user.employeeProfile?.fullName || 'Administrator',
        designation: user.employeeProfile?.designation || 'Platform Head',
        department: user.employeeProfile?.department?.name || user.employeeProfile?.departmentName || 'Executive Leadership',
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Demo switch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
