import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent, maskPAN } from '@/lib/audit';
import { archiveEmployee } from '@/lib/services/ems-service';

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
            id: true,
            email: true,
            isActive: true,
            isSuspended: true,
            lastLoginAt: true,
            role: true,
            isDelegated: true,
          },
        },
        reportingManager: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
          },
        },
        blockHistories: {
          orderBy: { actionDate: 'desc' },
        },
        documents: {
          select: {
            id: true,
            documentId: true,
            documentType: true,
            title: true,
            verificationStatus: true,
            mimeType: true,
            fileSizeBytes: true,
            createdAt: true,
            verifiedAt: true,
          },
        },
        _count: {
          select: {
            blockHistories: true,
            documents: true,
            attendanceRecords: true,
            leaveRequests: true,
            subordinates: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Role-based boundary enforcement:
    const isAdmin = isAdminOrHR(user.role);
    if (!isAdmin) {
      if (user.role === 'CLIENT') {
        const isClientEmployee =
          user.clientId === employee.client?.clientId ||
          user.clientId === employee.clientId ||
          user.id === employee.client?.userId ||
          user.clientId === employee.client?.id ||
          user.parentClientId === employee.clientId ||
          user.parentClientId === employee.client?.id;
        if (!isClientEmployee) {
          return NextResponse.json(
            { error: 'Permission denied. You can only view employees enrolled in your organization.' },
            { status: 403 }
          );
        }
      } else if (user.role === 'EMPLOYEE') {
        const isSelfOrSubordinate =
          employee.id === user.employeeProfileId ||
          employee.employeeId === user.employeeId ||
          employee.userId === user.id ||
          employee.reportingManagerId === user.employeeProfileId;
        if (!isSelfOrSubordinate) {
          return NextResponse.json(
            { error: 'Permission denied. You can only view your own profile or direct subordinates.' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
      }
    }

    const sanitized = {
      ...employee,
      panMasked: employee.panMasked || (employee.panNumber ? maskPAN(employee.panNumber) : null),
      accountStatus: employee.user?.isSuspended
        ? 'SUSPENDED'
        : employee.isBlocked
        ? 'BLOCKED'
        : employee.user?.isActive === false
        ? 'DEACTIVATED'
        : 'ACTIVE',
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = isAdminOrHR(user.role);
    const isClient = user.role === 'CLIENT';
    if (!isAdmin && !isClient) {
      return NextResponse.json({ error: 'Permission denied. Only Admins and Corporate Clients can edit employees.' }, { status: 403 });
    }

    const existing = await prisma.employee.findFirst({
      where: getEmployeeLookup(params.id),
      include: { client: true, user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (isClient) {
      const authorized =
        user.clientId === existing.client?.clientId ||
        user.clientId === existing.clientId ||
        user.id === existing.client?.userId ||
        user.clientId === existing.client?.id ||
        user.parentClientId === existing.clientId ||
        user.parentClientId === existing.client?.id;
      if (!authorized) {
        return NextResponse.json({ error: 'Permission denied. You can only edit your own assigned employees.' }, { status: 403 });
      }
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
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      emergencyContact,
      emergencyName,
      departmentName,
      designation,
      jobLocation,
      joiningDate,
      employmentType,
      shiftStartTime,
      shiftEndTime,
      remarks,
      status,
      password,
      customPassword,
      reportingManagerId,
    } = data;

    let finalAddress = address !== undefined ? (address ? address.trim() : null) : undefined;
    if (finalAddress === undefined && (temporaryAddress !== undefined || permanentAddress !== undefined)) {
      const temp = temporaryAddress ? temporaryAddress.trim() : '';
      const perm = permanentAddress ? permanentAddress.trim() : '';
      if (temp && perm && temp !== perm) {
        finalAddress = `Temporary: ${temp}\nPermanent: ${perm}`;
      } else {
        finalAddress = temp || perm || null;
      }
    }

    // Handle password update if passed securely
    const newPlainPassword = (password || customPassword)?.trim();
    if (newPlainPassword && newPlainPassword.length >= 4) {
      const passwordHash = await bcrypt.hash(newPlainPassword, 10);
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { passwordHash, failedAttempts: 0, lockoutUntil: null, isSuspended: false },
        });
      } else {
        let employeeRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });
        if (!employeeRole) {
          employeeRole = await prisma.role.create({
            data: { name: 'EMPLOYEE', displayName: 'Employee', description: 'Employee workspace', isSystem: true },
          });
        }
        const loginEmail =
          existing.personalEmail ||
          `${existing.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${Date.now().toString().slice(-4)}@growthindia.in`;
        const newUser = await prisma.user.create({
          data: {
            email: loginEmail,
            passwordHash,
            roleId: employeeRole.id,
            isActive: existing.status !== 'BLOCKED',
            isSuspended: existing.status === 'BLOCKED',
          },
        });
        await prisma.employee.update({
          where: { id: existing.id },
          data: { userId: newUser.id, personalEmail: loginEmail },
        });
      }
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
        ...(aadharNumber !== undefined ? { aadhaarMasked: aadharNumber ? aadharNumber.trim() : null } : {}),
        ...(finalAddress !== undefined ? { address: finalAddress } : {}),
        ...(emergencyContact !== undefined ? { emergencyContact: emergencyContact ? emergencyContact.trim() : null } : {}),
        ...(emergencyName !== undefined ? { emergencyName: emergencyName ? emergencyName.trim() : null } : {}),
        ...(departmentName ? { departmentName: departmentName.trim() } : {}),
        ...(designation ? { designation: designation.trim() } : {}),
        ...(jobLocation ? { jobLocation: jobLocation.trim(), location: jobLocation.trim() } : {}),
        ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {}),
        ...(employmentType ? { employmentType } : {}),
        ...(shiftStartTime !== undefined ? { shiftStartTime: shiftStartTime || '10:00' } : {}),
        ...(shiftEndTime !== undefined ? { shiftEndTime: shiftEndTime || '19:00' } : {}),
        ...(remarks !== undefined ? { remarks: remarks ? remarks.trim() : null } : {}),
        ...(reportingManagerId !== undefined ? { reportingManagerId: reportingManagerId || null } : {}),
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

/**
 * Controlled Deletion / Retention Policy.
 * By default, employees are safely archived to preserve historical attendance, leave,
 * timesheets, and audit lineage.
 */
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

    // Safety guard: Super Admin or self account cannot be deleted or archived
    if (
      existing.employeeId === 'GI-EMP-000001' ||
      existing.employeeId === user.employeeId ||
      existing.user?.email === 'admin@growthindia.co' ||
      existing.user?.email === 'admin@growthindia.in'
    ) {
      return NextResponse.json(
        { error: 'Primary Super Administrator and your own active account cannot be removed or archived.' },
        { status: 400 }
      );
    }

    // Check permission: Admin or Client with canDeleteEmployees
    const isAdmin = isAdminOrHR(user.role);
    const isOwnerClient =
      user.role === 'CLIENT' &&
      (user.clientId === existing.client?.clientId ||
       user.parentClientId === existing.clientId ||
       user.parentClientId === existing.client?.id ||
       user.id === existing.client?.userId) &&
      user.canDeleteEmployees;

    if (!isAdmin && !isOwnerClient) {
      return NextResponse.json(
        { error: 'Permission denied. You are not authorized to archive this employee.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') || 'Administrative archive via Employee Management';

    // Execute Enterprise Soft-Archive Governance
    const result = await archiveEmployee(
      existing.employeeId,
      { reason, remarks: `Archived by ${user.fullName} (${user.employeeId})` },
      user
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      employeeId: existing.employeeId,
    });
  } catch (error: any) {
    console.error('Error archiving employee:', error);
    return NextResponse.json({ error: error.message || 'Failed to archive employee record.' }, { status: 500 });
  }
}
