import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, AUTH_COOKIE_NAME, invalidateSessionUserCache } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Administrator invitation token is required.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Administrative password must be at least 8 characters long for security compliance.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Look up token in dedicated admin_invitations collection ONLY
    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Administrator invitation token not found or invalid.' },
        { status: 404 }
      );
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This Administrator invitation has already been accepted. Tokens are strictly single-use.' },
        { status: 410 }
      );
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Access Denied: This Administrator invitation was revoked by a Platform Administrator.' },
        { status: 403 }
      );
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'This Administrator invitation link has expired. Please contact your system administrator.' },
        { status: 410 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve system role: SUPER_ADMIN, ADMIN, or ADMIN_HR
    const targetRoleName = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_HR'].includes(invitation.role)
      ? invitation.role
      : 'ADMIN';

    let roleRecord = await prisma.role.findFirst({
      where: { name: targetRoleName },
    });

    if (!roleRecord) {
      // Fallback to ADMIN if specific sub-role not in roles table
      roleRecord = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    }

    if (!roleRecord) {
      return NextResponse.json({ error: 'Administrator role definition missing from database.' }, { status: 500 });
    }

    const cleanEmail = invitation.email.toLowerCase().trim();

    // Find or create User record
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { role: true, employeeProfile: true },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          roleId: roleRecord.id,
          isActive: true,
          isSuspended: false,
          isDelegated: invitation.role !== 'SUPER_ADMIN',
          delegatedPermissions: invitation.permissions,
          parentClientId: null, // Strictly null - no client linkage
          lastLoginAt: new Date(),
        },
        include: { role: true, employeeProfile: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          roleId: roleRecord.id,
          isActive: true,
          isSuspended: false,
          isDelegated: invitation.role !== 'SUPER_ADMIN',
          delegatedPermissions: invitation.permissions,
          parentClientId: null, // Strictly null - no client linkage
          lastLoginAt: new Date(),
        },
        include: { role: true, employeeProfile: true },
      });
    }

    // Ensure dedicated Admin Employee profile exists (GI-ADM-XXXX)
    let adminEmpCode = user.employeeProfile?.employeeId;

    if (!adminEmpCode) {
      const adminCount = await prisma.employee.count({
        where: { employeeId: { startsWith: 'GI-ADM-' } },
      });
      adminEmpCode = `GI-ADM-${String(adminCount + 1).padStart(4, '0')}`;

      await prisma.employee.create({
        data: {
          employeeId: adminEmpCode,
          userId: user.id,
          fullName: invitation.name.trim(),
          phone: invitation.phone?.trim() || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
          personalEmail: cleanEmail,
          designation: invitation.designation || 'System Administrator',
          departmentName: invitation.department || 'Administration & Governance',
          jobLocation: 'Headquarters',
          status: 'ACTIVE',
          clientId: null, // Strictly null - isolated from client tenancy
          createdBy: 'ADMIN_INVITATION_FLOW',
        },
      });
    } else {
      // Update existing employee profile to ensure administrative status
      await prisma.employee.update({
        where: { id: user.employeeProfile!.id },
        data: {
          fullName: invitation.name.trim(),
          designation: invitation.designation || user.employeeProfile!.designation,
          departmentName: invitation.department || user.employeeProfile!.departmentName,
          status: 'ACTIVE',
          clientId: null, // Strictly null
        },
      });
    }

    // Mark invitation record in admin_invitations as ACCEPTED
    await prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedUserId: user.id,
        acceptedEmployeeId: adminEmpCode,
      },
    });

    invalidateSessionUserCache();

    // Create JWT Token
    const jwtToken = createToken({
      userId: user.id,
      email: user.email,
      role: roleRecord.name,
      employeeId: adminEmpCode,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: adminEmpCode,
      action: 'ADMIN_INVITATION_ACCEPTED',
      entityType: 'AUTH',
      entityId: invitation.id,
      details: {
        adminEmail: cleanEmail,
        adminRole: roleRecord.name,
        adminEmployeeId: adminEmpCode,
      },
      reason: `Platform Administrator account activated: ${cleanEmail} (${roleRecord.name})`,
    });

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(invitation.permissions);
    } catch {
      parsedPermissions = [];
    }

    const response = NextResponse.json({
      success: true,
      message: 'Platform Administrator account activated successfully.',
      redirectTo: '/growthIndia',
      user: {
        id: user.id,
        email: user.email,
        role: roleRecord.name,
        roleDisplayName: invitation.role !== 'SUPER_ADMIN' ? 'Delegated Administrator' : roleRecord.displayName,
        fullName: invitation.name,
        employeeId: adminEmpCode,
        isDelegated: invitation.role !== 'SUPER_ADMIN',
        delegatedPermissions: parsedPermissions,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Error in POST /api/admin/invitations/accept:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
