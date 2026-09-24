import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, AUTH_COOKIE_NAME, invalidateSessionUserCache } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const invitation = await prisma.accountInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation link does not exist or is invalid.' }, { status: 404 });
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted. Tokens are single-use only.' },
        { status: 410 }
      );
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Access Denied: This invitation has been deactivated/revoked by the administrator.' },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Determine target role
    const targetRoleName = invitation.inviterRole === 'ADMIN' ? 'ADMIN' : 'CLIENT';
    const roleRecord = await prisma.role.findFirst({
      where: { name: targetRoleName },
    });

    if (!roleRecord) {
      return NextResponse.json({ error: `System role ${targetRoleName} not initialized.` }, { status: 500 });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
      include: { role: true, employeeProfile: true },
    });

    if (user) {
      // Update existing user with new delegated credentials and links
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          roleId: roleRecord.id,
          isActive: true,
          isSuspended: false,
          isDelegated: true,
          parentUserId: invitation.inviterUserId,
          parentClientId: invitation.clientId || null,
          delegatedPermissions: invitation.permissions,
          invitationId: invitation.id,
          lastLoginAt: new Date(),
        },
        include: { role: true, employeeProfile: true },
      });
    } else {
      // Create new delegated user
      user = await prisma.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          passwordHash,
          roleId: roleRecord.id,
          isActive: true,
          isSuspended: false,
          isDelegated: true,
          parentUserId: invitation.inviterUserId,
          parentClientId: invitation.clientId || null,
          delegatedPermissions: invitation.permissions,
          invitationId: invitation.id,
          lastLoginAt: new Date(),
        },
        include: { role: true, employeeProfile: true },
      });

      // Ensure delegated employee profile exists for Admin invitation
      if (invitation.inviterRole === 'ADMIN') {
        const count = await prisma.employee.count();
        const empCode = `GI-DLG-${String(count + 1).padStart(4, '0')}`;
        await prisma.employee.create({
          data: {
            employeeId: empCode,
            userId: user.id,
            fullName: invitation.name,
            phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
            personalEmail: invitation.email.toLowerCase(),
            designation: invitation.designation || 'Delegated Admin Associate',
            departmentName: 'Shared Administration',
            jobLocation: 'Headquarters',
            status: 'ACTIVE',
            createdBy: 'INVITATION_FLOW',
          },
        });
      }
    }

    // Determine delegated employee identity to ensure clean separation
    let delegatedEmpCode = 'SHARED-USER';
    if (invitation.inviterRole === 'ADMIN') {
      if (user.employeeProfile && user.employeeProfile.employeeId.startsWith('GI-DLG-')) {
        delegatedEmpCode = user.employeeProfile.employeeId;
      } else if (!user.employeeProfile) {
        const count = await prisma.employee.count();
        delegatedEmpCode = `GI-DLG-${String(count + 1).padStart(4, '0')}`;
      } else {
        delegatedEmpCode = `GI-DLG-${user.id.slice(-4).toUpperCase()}`;
      }
    } else {
      delegatedEmpCode = invitation.clientId || 'CLIENT-DELEGATED';
    }

    // Mark invitation record as accepted
    await prisma.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        acceptedUserId: user.id,
        status: 'ACCEPTED',
      },
    });

    invalidateSessionUserCache();

    // Generate JWT token with isolated delegated employee ID
    const jwtToken = createToken({
      userId: user.id,
      email: user.email,
      role: roleRecord.name,
      employeeId: delegatedEmpCode,
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.email,
      action: 'DELEGATED_ACCOUNT_INVITATION_ACCEPTED',
      entityType: 'AUTH',
      entityId: invitation.id,
      reason: `Account activated for invited user: ${invitation.email}`,
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    const redirectTo = invitation.inviterRole === 'ADMIN' ? '/growthIndia' : '/';

    const response = NextResponse.json({
      success: true,
      redirectTo,
      message: 'Account activated successfully! Redirecting to workspace...',
      user: {
        id: user.id,
        email: user.email,
        fullName: invitation.name,
        role: roleRecord.name,
        isDelegated: true,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: jwtToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
