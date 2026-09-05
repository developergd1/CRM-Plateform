import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, AUTH_COOKIE_NAME, ensureDefaultAdmin } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { email, password, portalType } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const lookup = email.trim();
    const lookupLower = lookup.toLowerCase();
    const lookupUpper = lookup.toUpperCase();

    // 1. Look up by direct user email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: lookupLower },
          { email: lookup },
        ],
      },
      include: {
        role: true,
        employeeProfile: {
          include: {
            department: true,
            team: true,
            client: true,
          },
        },
      },
    });

    // If no user exists and admin login is attempted, auto-seed clean default admin & roles
    if (!user && (lookupLower === 'admin@growthindia.in' || lookupUpper === 'GI-EMP-000001' || portalType === 'ADMIN')) {
      await ensureDefaultAdmin();
      user = await prisma.user.findFirst({
        where: { email: 'admin@growthindia.in' },
        include: {
          role: true,
          employeeProfile: {
            include: {
              department: true,
              team: true,
              client: true,
            },
          },
        },
      });
    }


    // 2. If not found by email, look up by Employee ID or Phone Number
    if (!user) {
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { employeeId: lookupUpper },
            { phone: lookup },
            { phone: lookup.replace(/\s+/g, '') },
            { phone: lookup.startsWith('+91') ? lookup.replace('+91', '').trim() : `+91 ${lookup}` },
          ],
        },
        include: {
          user: { include: { role: true } },
          department: true,
          team: true,
          client: true,
        },
      });

      if (emp?.user) {
        user = {
          ...emp.user,
          employeeProfile: emp,
        } as any;
      }
    }

    // 3. If not found, look up by Client ID, Client Email, or Client Mobile Number
    if (!user) {
      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { clientId: lookupUpper },
            { email: lookupLower },
            { email: lookup },
            { mobile: lookup },
            { mobile: lookup.replace(/\s+/g, '') },
            { mobile: lookup.startsWith('+91') ? lookup.replace('+91', '').trim() : `+91 ${lookup}` },
          ],
        },
        include: {
          user: { include: { role: true } },
        },
      });

      if (client?.user) {
        user = {
          ...client.user,
          employeeProfile: null,
        } as any;
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!user) {
      await logAuditEvent({
        action: 'FAILED_LOGIN_UNKNOWN_USER',
        entityType: 'AUTH',
        reason: `Login attempt with non-existent user identifier: ${email}`,
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
      });
      return NextResponse.json({ error: 'Invalid email/ID or password' }, { status: 401 });
    }

    // Check if account or employee is blocked/suspended
    const isBlocked =
      user.isSuspended ||
      !user.isActive ||
      user.employeeProfile?.status === 'BLOCKED' ||
      user.employeeProfile?.isBlocked ||
      user.employeeProfile?.status === 'SUSPENDED';

    if (isBlocked) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeProfile?.employeeId || 'BLOCKED_USER',
        action: 'BLOCKED_LOGIN_SUSPENDED_ACCOUNT',
        entityType: 'AUTH',
        reason: 'Attempted login to blocked / suspended account without admin approval',
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
      });
      return NextResponse.json(
        {
          error: '🔒 Account Blocked: This account has been blocked by the Administrator. Access is strictly forbidden without authorized Admin approval.',
          isBlocked: true,
        },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeProfile?.employeeId,
        action: 'FAILED_LOGIN_BAD_PASSWORD',
        entityType: 'AUTH',
        reason: 'Incorrect password entered',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
      });
      return NextResponse.json({ error: 'Invalid email/ID or password' }, { status: 401 });
    }

    const isAdminUser =
      user.role.name === 'ADMIN' ||
      user.role.name === 'SUPER_ADMIN' ||
      user.role.name === 'ADMIN_HR';

    // Strict Security Isolation:
    // 1. Prevent Admin login from the public Client/Employee Portal (http://localhost:3000/)
    if (portalType !== 'ADMIN' && isAdminUser) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeProfile?.employeeId || 'ADMIN',
        action: 'ADMIN_LOGIN_BLOCKED_ON_PUBLIC_PORTAL',
        entityType: 'AUTH',
        reason: 'Administrator attempted authentication on standard public portal instead of secure /growthIndia gateway',
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
      });
      return NextResponse.json(
        {
          error: '🔒 Security Policy: Administrator accounts are strictly protected and cannot log in through the public employee/client portal. Please authenticate at the secure Admin Console at /growthIndia.',
          isAdminAccount: true,
          adminLoginUrl: '/growthIndia',
        },
        { status: 403 }
      );
    }

    // 2. Prevent Client / Employee login from the Admin Gateway (/growthIndia)
    if (portalType === 'ADMIN' && !isAdminUser) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeProfile?.employeeId || user.email,
        action: 'NON_ADMIN_LOGIN_BLOCKED_ON_ADMIN_GATEWAY',
        entityType: 'AUTH',
        reason: 'Client or employee attempted authentication on secure /growthIndia gateway without administrator credentials',
        ipAddress: ip,
        userAgent,
        status: 'DENIED',
      });
      return NextResponse.json(
        {
          error: '⛔ Access Denied: This console is strictly restricted to Platform Administrators. Clients and Employees must log in at the main portal.',
          isNonAdmin: true,
        },
        { status: 403 }
      );
    }


    // Generate JWT session
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
      employeeId: user.employeeProfile?.employeeId || 'GI-EMP-000001',
    });

    // Create WorkSession for employees
    if (user.employeeProfile) {
      const sessionId = `WKS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await prisma.workSession.create({
        data: {
          sessionId,
          userId: user.id,
          employeeId: user.employeeProfile.id,
          ipAddress: ip,
          userAgent,
          deviceInfo: userAgent.includes('Windows') ? 'Windows PC' : 'Web Device',
          status: 'ACTIVE',
        },
      });
    }

    // Update user last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });

    // Audit login success
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeProfile?.employeeId || 'ADMIN',
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'AUTH',
      reason: 'User authenticated successfully',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    // Query client profile if user is a client
    const clientRecord = user.role.name === 'CLIENT'
      ? await prisma.client.findFirst({ where: { userId: user.id } })
      : null;

    let returnUser: any = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleDisplayName: user.role.displayName,
    };

    if (user.role.name === 'CLIENT' && clientRecord) {
      returnUser = {
        ...returnUser,
        clientId: clientRecord.clientId,
        companyName: clientRecord.companyName,
        canBlockEmployees: clientRecord.canBlockEmployees,
        canDeleteEmployees: clientRecord.canDeleteEmployees,
        fullName: clientRecord.contactPerson || clientRecord.companyName,
        designation: 'Client Administrator',
        department: clientRecord.industry || 'Corporate Client',
      };
    } else if (user.employeeProfile) {
      returnUser = {
        ...returnUser,
        employeeId: user.employeeProfile.employeeId,
        clientId: user.employeeProfile.clientId,
        companyName: user.employeeProfile.client?.companyName,
        fullName: user.employeeProfile.fullName,
        designation: user.employeeProfile.designation,
        department: user.employeeProfile.departmentName || user.employeeProfile.department?.name || 'General Operations',
      };
    } else {
      returnUser = {
        ...returnUser,
        employeeId: 'GI-EMP-000001',
        fullName: 'Administrator',
        designation: 'Platform Head',
        department: 'General Operations',
      };
    }

    const response = NextResponse.json({
      success: true,
      user: returnUser,
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
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
