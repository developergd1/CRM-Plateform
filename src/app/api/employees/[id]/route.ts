import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent, maskPAN } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
      include: {
        client: true,
        department: true,
        user: {
          select: {
            email: true,
            isActive: true,
            isSuspended: true,
            lastLoginAt: true,
            role: true,
          },
        },
        blockHistories: {
          orderBy: { actionDate: 'desc' },
        },
        _count: {
          select: {
            blockHistories: true,
            documents: true,
            attendanceRecords: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const sanitized = {
      ...employee,
      panMasked: employee.panMasked || (employee.panNumber ? maskPAN(employee.panNumber) : null),
    };

    return NextResponse.json({ success: true, employee: sanitized });
  } catch (error: any) {
    console.error('Error fetching employee details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Admins can edit employee records.' }, { status: 403 });
    }

    const existing = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }


    const data = await req.json();
    const {
      clientId,
      fullName,
      fatherMotherName,
      dob,
      gender,
      phone,
      personalEmail,
      panNumber,
      address,
      departmentName,
      designation,
      jobLocation,
      joiningDate,
      employmentType,
      remarks,
      status,
      password,
      customPassword,
    } = data;

    // Handle password update if passed
    const newPlainPassword = (password || customPassword)?.trim();
    if (newPlainPassword && newPlainPassword.length >= 4 && existing.userId) {
      const passwordHash = await bcrypt.hash(newPlainPassword, 10);
      await prisma.user.update({
        where: { id: existing.userId },
        data: { passwordHash, failedAttempts: 0, lockoutUntil: null },
      });
    }

    // If changing phone, check uniqueness
    if (phone && phone.trim() !== existing.phone) {
      const duplicatePhone = await prisma.employee.findUnique({
        where: { phone: phone.trim() },
      });
      if (duplicatePhone) {
        return NextResponse.json(
          { error: `Phone number ${phone} is already assigned to ${duplicatePhone.employeeId}` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id: existing.id },
      data: {
        ...(clientId !== undefined ? { clientId: clientId || null } : {}),
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(fatherMotherName !== undefined ? { fatherMotherName: fatherMotherName ? fatherMotherName.trim() : null } : {}),
        ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(personalEmail !== undefined ? { personalEmail: personalEmail ? personalEmail.trim() : null } : {}),
        ...(panNumber !== undefined
          ? {
              panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
              panMasked: panNumber ? maskPAN(panNumber.trim().toUpperCase()) : null,
            }
          : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(departmentName ? { departmentName: departmentName.trim() } : {}),
        ...(designation ? { designation: designation.trim() } : {}),
        ...(jobLocation ? { jobLocation: jobLocation.trim(), location: jobLocation.trim() } : {}),
        ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(remarks !== undefined ? { remarks: remarks ? remarks.trim() : null } : {}),
        ...(status && status !== 'BLOCKED' ? { status, isBlocked: false } : {}),
        updatedBy: `${user.fullName} (${user.employeeId})`,
      },
      include: {
        client: true,
        user: true,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: updated.employeeId,
      previousData: existing,
      newData: updated,
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
      include: { user: true, client: true },
    });


    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Safety guard: Super Admin or self account cannot be deleted
    if (
      existing.employeeId === 'GI-EMP-000001' ||
      existing.employeeId === user.employeeId ||
      existing.user?.email === 'admin@growthindia.in'
    ) {
      return NextResponse.json(
        { error: 'Primary Super Administrator and your own active account cannot be deleted.' },
        { status: 400 }
      );
    }

    // Check permission: Admin or Client with canDeleteEmployees
    const isAdmin = isAdminOrHR(user.role);
    const isOwnerClient =
      user.role === 'CLIENT' &&
      user.clientId === existing.client?.clientId &&
      user.canDeleteEmployees;

    if (!isAdmin && !isOwnerClient) {
      return NextResponse.json(
        { error: 'Permission denied. You are not authorized to delete this employee.' },
        { status: 403 }
      );
    }

    const employeeDbId = existing.id;
    const employeeUserId = existing.userId;

    // Clean up all referencing foreign keys & child relations safely
    await prisma.$transaction(async (tx) => {
      // 1. Unlink client relationships
      await tx.client.updateMany({
        where: { createdById: employeeDbId },
        data: { createdById: null },
      });
      await tx.client.updateMany({
        where: { assignedEmployeeId: employeeDbId },
        data: { assignedEmployeeId: null },
      });

      // 2. Unlink asset allocations
      await tx.asset.updateMany({
        where: { assignedEmployeeId: employeeDbId },
        data: { assignedEmployeeId: null, status: 'AVAILABLE' },
      });

      // 3. Unlink manager and team lead hierarchies
      await tx.employee.updateMany({
        where: { reportingManagerId: employeeDbId },
        data: { reportingManagerId: null },
      });
      await tx.team.updateMany({
        where: { leadEmployeeId: employeeDbId },
        data: { leadEmployeeId: null },
      });

      // 4. Delete CRM activities, notes, tasks, assignments
      await tx.clientAssignment.deleteMany({
        where: { OR: [{ toEmployeeId: employeeDbId }, { assignedById: employeeDbId }] },
      });
      await tx.clientActivity.deleteMany({
        where: { actorEmployeeId: employeeDbId },
      });
      await tx.clientNote.deleteMany({
        where: { authorId: employeeDbId },
      });
      await tx.clientTask.deleteMany({
        where: { OR: [{ assignedToId: employeeDbId }, { createdById: employeeDbId }] },
      });

      // 5. Delete employee operations data
      await tx.notification.deleteMany({
        where: { recipientId: employeeDbId },
      });
      await tx.workSession.deleteMany({
        where: { employeeId: employeeDbId },
      });
      await tx.leaveRequest.deleteMany({
        where: { employeeId: employeeDbId },
      });
      await tx.employeeBlockHistory.deleteMany({
        where: { employeeId: employeeDbId },
      });

      // Documents
      const docs = await tx.employeeDocument.findMany({
        where: { employeeId: employeeDbId },
        select: { id: true },
      });
      if (docs.length > 0) {
        const docIds = docs.map((d) => d.id);
        await tx.documentAccessLog.deleteMany({
          where: { documentId: { in: docIds } },
        });
        await tx.employeeDocument.deleteMany({
          where: { employeeId: employeeDbId },
        });
      }

      // Attendance
      const attendances = await tx.attendance.findMany({
        where: { employeeId: employeeDbId },
        select: { id: true },
      });
      if (attendances.length > 0) {
        const attIds = attendances.map((a) => a.id);
        await tx.attendanceBreak.deleteMany({
          where: { attendanceId: { in: attIds } },
        });
        await tx.attendance.deleteMany({
          where: { employeeId: employeeDbId },
        });
      }

      // 6. Delete active user sessions
      if (employeeUserId) {
        await tx.activeUserSession.deleteMany({
          where: { userId: employeeUserId },
        });
      }

      // 7. Delete employee record first
      await tx.employee.delete({
        where: { id: employeeDbId },
      });

      // 8. Delete user record if exists
      if (employeeUserId) {
        await tx.user.delete({
          where: { id: employeeUserId },
        }).catch(() => {});
      }
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'DELETE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: existing.employeeId,
      reason: 'Employee record deleted by administrator',
      previousData: { employeeId: existing.employeeId, fullName: existing.fullName },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${existing.employeeId} (${existing.fullName}) was removed.`,
    });
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete employee record.' }, { status: 500 });
  }
}
