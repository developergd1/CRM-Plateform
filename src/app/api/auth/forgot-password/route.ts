import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identifier, accountType, reason } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json({ error: 'Please enter your registered Email, Phone Number, or Account ID.' }, { status: 400 });
    }

    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();
    const cleanUpper = clean.toUpperCase();

    let targetUser: any = null;
    let employeeRecord: any = null;
    let clientRecord: any = null;
    let roleType: 'EMPLOYEE' | 'CLIENT' = 'EMPLOYEE';

    // 1. Try finding employee
    employeeRecord = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeId: cleanUpper },
          { phone: clean },
          { phone: clean.replace(/\s+/g, '') },
          { personalEmail: cleanLower },
          { user: { email: cleanLower } },
        ],
      },
      include: {
        user: true,
        client: true,
      },
    });

    if (employeeRecord) {
      targetUser = employeeRecord.user;
      roleType = 'EMPLOYEE';
    }

    // 2. If not employee, try finding client
    if (!targetUser) {
      clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { clientId: cleanUpper },
            { mobile: clean },
            { mobile: clean.replace(/\s+/g, '') },
            { email: cleanLower },
            { user: { email: cleanLower } },
          ],
        },
        include: {
          user: true,
        },
      });

      if (clientRecord) {
        targetUser = clientRecord.user;
        roleType = 'CLIENT';
      }
    }

    // 3. If still not found, check User by email
    if (!targetUser) {
      const user = await prisma.user.findUnique({
        where: { email: cleanLower },
        include: {
          role: true,
          employeeProfile: { include: { client: true } },
          clientProfile: true,
        },
      });

      if (user) {
        targetUser = user;
        if (user.employeeProfile) {
          employeeRecord = user.employeeProfile;
          roleType = 'EMPLOYEE';
        } else if (user.clientProfile || user.role?.name === 'CLIENT') {
          clientRecord = user.clientProfile;
          roleType = 'CLIENT';
        } else {
          // Admin account
          roleType = 'CLIENT';
        }
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No account found matching this Email, Phone Number, or Account ID.' },
        { status: 404 }
      );
    }

    // Determine target recipient for the reset request
    let targetRole: 'ADMIN' | 'CLIENT' = 'ADMIN';
    let targetClientId: string | undefined = undefined;
    let targetName = 'Growth India HQ Admin';

    if (roleType === 'CLIENT') {
      // Client password reset request -> goes to Admin
      targetRole = 'ADMIN';
      targetName = 'Growth India System Administrator';
    } else {
      // Employee password reset request -> goes to Client employer if linked, else Admin
      if (employeeRecord?.clientId && employeeRecord?.client) {
        targetRole = 'CLIENT';
        targetClientId = employeeRecord.clientId;
        targetName = `${employeeRecord.client.companyName} (${employeeRecord.client.clientId})`;
      } else {
        targetRole = 'ADMIN';
        targetName = 'Growth India System Administrator';
      }
    }

    // Fetch existing requests from SystemSetting
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'PASSWORD_RESET_REQUESTS' },
    });

    let requests: any[] = [];
    if (setting?.value) {
      try {
        requests = JSON.parse(setting.value);
      } catch (e) {
        requests = [];
      }
    }

    // Check if a pending request already exists in the last 2 hours
    const existingPending = requests.find(
      (r: any) =>
        r.userId === targetUser.id &&
        r.status === 'PENDING' &&
        Date.now() - new Date(r.createdAt).getTime() < 2 * 60 * 60 * 1000
    );

    if (existingPending) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        message: `A password reset request is already active and forwarded to ${existingPending.targetName}. Please await their update.`,
        targetName: existingPending.targetName,
        targetRole: existingPending.targetRole,
      });
    }

    const newRequest = {
      id: `PRR-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`,
      userId: targetUser.id,
      requesterId: employeeRecord?.employeeId || clientRecord?.clientId || targetUser.email,
      requesterName: employeeRecord?.fullName || clientRecord?.companyName || clientRecord?.contactPerson || targetUser.email,
      requesterRole: roleType,
      email: targetUser.email,
      phone: employeeRecord?.phone || clientRecord?.mobile || 'N/A',
      companyName: employeeRecord?.client?.companyName || clientRecord?.companyName || 'Growth India Staff',
      targetRole,
      targetClientId,
      targetName,
      reason: reason?.trim() || 'User requested password reset from login portal',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    // Keep last 100 requests
    if (requests.length > 100) requests = requests.slice(0, 100);

    await prisma.systemSetting.upsert({
      where: { key: 'PASSWORD_RESET_REQUESTS' },
      update: {
        value: JSON.stringify(requests),
        updatedAt: new Date(),
      },
      create: {
        key: 'PASSWORD_RESET_REQUESTS',
        value: JSON.stringify(requests),
        category: 'SECURITY',
        description: 'Store queue of pending and resolved password reset requests',
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: targetUser.id,
      actorEmployeeId: employeeRecord?.employeeId || clientRecord?.clientId || 'USER',
      action: 'REQUEST_PASSWORD_RESET',
      entityType: 'AUTH',
      entityId: newRequest.id,
      newData: newRequest,
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Your password reset request has been securely submitted to ${targetName}.`,
      targetName,
      targetRole,
      requestId: newRequest.id,
    });
  } catch (error: any) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
