import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await Promise.resolve(context.params);
    const targetId = params?.id;

    if (!targetId) {
      return NextResponse.json({ error: 'Employee ID parameter is required.' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: targetId }, { employeeId: targetId }],
      },
      include: {
        user: true,
        client: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission check: Admin, HR, or authorized Client who owns this employee
    const isAdmin = isAdminOrHR(user.role);
    const isAuthorizedClient =
      user.role === 'CLIENT' &&
      user.clientId === employee.client?.clientId;

    if (!isAdmin && !isAuthorizedClient) {
      return NextResponse.json(
        { error: 'Permission denied. You are not authorized to reset passwords for this employee.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newPassword =
      body.password?.trim() ||
      body.newPassword?.trim() ||
      body.customPassword?.trim() ||
      `Emp#${Math.floor(1000 + Math.random() * 9000)}`;

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters long.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    let targetUserId = employee.userId;

    // If employee doesn't have a linked user account, create one
    if (!targetUserId || !employee.user) {
      let employeeRole = await prisma.role.findFirst({
        where: { name: 'EMPLOYEE' },
      });
      if (!employeeRole) {
        employeeRole = await prisma.role.create({
          data: {
            name: 'EMPLOYEE',
            displayName: 'Employee',
            description: 'Employee workspace',
            isSystem: true,
          },
        });
      }

      const loginEmail =
        employee.personalEmail ||
        `${employee.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${Date.now().toString().slice(-4)}@growthindia.in`;

      const newUser = await prisma.user.create({
        data: {
          email: loginEmail,
          passwordHash,
          roleId: employeeRole.id,
          isActive: employee.status !== 'BLOCKED',
          isSuspended: employee.status === 'BLOCKED',
        },
      });

      targetUserId = newUser.id;

      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          userId: targetUserId,
          personalEmail: loginEmail,
        },
      });
    } else {
      // Update existing User password
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          passwordHash,
          failedAttempts: 0,
          lockoutUntil: null,
        },
      });

      // Revoke old active sessions safely if model exists
      try {
        if ((prisma as any).activeUserSession) {
          await (prisma as any).activeUserSession.updateMany({
            where: { userId: targetUserId },
            data: { isValid: false },
          });
        }
      } catch (err) {
        // Non-critical session cleanup error
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'RESET_EMPLOYEE_PASSWORD',
      entityType: 'EMPLOYEE',
      entityId: employee.employeeId,
      newData: {
        employeeId: employee.employeeId,
        targetEmail: employee.user?.email || employee.personalEmail,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Password for ${employee.fullName} (${employee.employeeId}) has been updated successfully.`,
      credentials: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        companyName: employee.client?.companyName || 'Internal / HQ',
        email: employee.user?.email || employee.personalEmail || employee.phone,
        phone: employee.phone,
        password: newPassword,
      },
    });
  } catch (error: any) {
    console.error('Error resetting employee password:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
