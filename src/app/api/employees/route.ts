import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, getClientLookup, isValidObjectId, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent, maskPAN } from '@/lib/audit';
import { generateEmployeeId } from '@/lib/id-generator';
import { canAddEmployee } from '@/lib/services/subscription-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';
    const department = searchParams.get('department') || '';
    const employmentType = searchParams.get('employmentType') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Find admin user IDs to exclude platform root admins from standard employee directory
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          name: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      },
      select: { id: true },
    });
    const adminUserIds = adminUsers.map((u) => u.id);

    const andConditions: any[] = [
      { employeeId: { not: 'GI-EMP-000001' } },
    ];
    if (adminUserIds.length > 0) {
      andConditions.push({ userId: { notIn: adminUserIds } });
    }

    // Role-based scoping: If user is CLIENT, only return employees belonging to their client account
    if (user.role === 'CLIENT') {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
            ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
            ...(user.parentClientId ? [{ id: user.parentClientId }, { clientId: user.parentClientId }] : []),
          ],
        },
      });
      const resolvedCId = clientRecord?.id || (user.parentClientId ? await resolveClientObjectId(user.parentClientId) : null) || (user.clientId ? await resolveClientObjectId(user.clientId) : null);
      if (resolvedCId) {
        andConditions.push({ clientId: resolvedCId });
      } else {
        return NextResponse.json({ success: true, employees: [], total: 0, page, totalPages: 0 });
      }
    } else if (user.role === 'EMPLOYEE') {
      const currentEmp = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
          ],
        },
      });
      if (currentEmp?.clientId) {
        andConditions.push({ clientId: currentEmp.clientId });
      } else if (currentEmp?.departmentId) {
        andConditions.push({ departmentId: currentEmp.departmentId });
      } else {
        andConditions.push({ id: currentEmp?.id || 'none' });
      }
    } else if (clientId && clientId !== 'ALL') {
      const clientRecord = await prisma.client.findFirst({
        where: getClientLookup(clientId),
      });
      if (clientRecord) {
        andConditions.push({ clientId: clientRecord.id });
      } else {
        return NextResponse.json({ success: true, employees: [], total: 0, page, totalPages: 0 });
      }
    }

    // Status filtering & archive exclusion
    if (status && status !== 'ALL') {
      if (status === 'BLOCKED') {
        andConditions.push({ OR: [{ status: 'BLOCKED' }, { isBlocked: true }] });
      } else {
        andConditions.push({ status });
      }
    } else if (!includeArchived) {
      // By default hide archived employees from primary directory unless explicitly filtered
      andConditions.push({ status: { not: 'ARCHIVED' } });
    }

    if (department && department !== 'ALL') {
      andConditions.push({
        OR: [
          { departmentName: { contains: department } },
          { department: { name: { contains: department } } },
        ],
      });
    }

    if (employmentType && employmentType !== 'ALL') {
      andConditions.push({ employmentType });
    }

    // Multi-field text search
    if (search) {
      andConditions.push({
        OR: [
          { employeeId: { contains: search } },
          { fullName: { contains: search } },
          { phone: { contains: search } },
          { personalEmail: { contains: search } },
          { user: { email: { contains: search } } },
          { designation: { contains: search } },
          { departmentName: { contains: search } },
          { client: { companyName: { contains: search } } },
          { client: { clientId: { contains: search } } },
          { location: { contains: search } },
          { jobLocation: { contains: search } },
        ],
      });
    }

    const where = { AND: andConditions };

    const total = await prisma.employee.count({ where });
    const employees = await prisma.employee.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientId: true,
            companyName: true,
            contactPerson: true,
            mobile: true,
            status: true,
          },
        },
        department: true,
        user: {
          select: {
            email: true,
            isActive: true,
            isSuspended: true,
            lastLoginAt: true,
            role: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            blockHistories: true,
            documents: true,
            attendanceRecords: true,
          },
        },
      },
      orderBy: { employeeId: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const sanitized = employees.map((emp) => ({
      ...emp,
      aadharNumber: emp.aadhaarMasked || null,
      panMasked: emp.panMasked || (emp.panNumber ? maskPAN(emp.panNumber) : null),
      lastLogin: emp.user?.lastLoginAt || null,
      accountStatus: emp.user?.isSuspended ? 'SUSPENDED' : emp.isBlocked ? 'BLOCKED' : emp.user?.isActive === false ? 'DEACTIVATED' : 'ACTIVE',
    }));

    return NextResponse.json({
      success: true,
      employees: sanitized,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAuthorized = isAdminOrHR(user.role) || user.role === 'CLIENT';
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Permission denied. Employees are not authorized to onboard staff.' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const {
      clientId,
      fullName,
      fatherMotherName,
      dob,
      gender,
      phone,
      email,
      personalEmail,
      panNumber,
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      emergencyContact,
      emergencyName,
      departmentName = 'General Operations',
      designation,
      jobLocation = 'Headquarters',
      joiningDate,
      employmentType = 'Full-Time',
      shiftStartTime = '10:00',
      shiftEndTime = '19:00',
      remarks,
      customPassword,
      isDraft = false,
      draftStep = 1,
    } = data;

    let finalAddress = address ? address.trim() : null;
    if (!finalAddress && (temporaryAddress || permanentAddress)) {
      const temp = (temporaryAddress || '').trim();
      const perm = (permanentAddress || '').trim();
      if (temp && perm && temp !== perm) {
        finalAddress = `Temporary: ${temp}\nPermanent: ${perm}`;
      } else {
        finalAddress = temp || perm || null;
      }
    }

    // Determine target client ID
    let targetClientId: string | null = null;
    if (user.role === 'CLIENT') {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
            ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
            ...(user.parentClientId ? [{ id: user.parentClientId }, { clientId: user.parentClientId }] : []),
          ],
        },
      });
      targetClientId = clientRecord?.id || (user.parentClientId ? await resolveClientObjectId(user.parentClientId) : null) || (user.clientId ? await resolveClientObjectId(user.clientId) : null);
      if (!targetClientId) {
        return NextResponse.json({ error: 'Client profile not found for this account.' }, { status: 400 });
      }
    } else if (clientId && clientId !== 'ALL') {
      const clientRecord = await prisma.client.findFirst({
        where: getClientLookup(clientId),
      });
      targetClientId = clientRecord ? clientRecord.id : (isValidObjectId(clientId) ? clientId : null);
    }

    // If saving incomplete draft
    if (isDraft) {
      const draftKey = `EMS_ONBOARDING_DRAFTS`;
      const draftSetting = await prisma.systemSetting.findUnique({ where: { key: draftKey } });
      const drafts = draftSetting?.value ? JSON.parse(draftSetting.value) : [];

      const draftId = data.draftId || `DFT-${Date.now().toString(36).toUpperCase()}`;
      const draftRecord = {
        id: draftId,
        step: draftStep,
        data: { ...data, targetClientId },
        createdBy: user.fullName,
        updatedAt: new Date().toISOString(),
      };

      const existingIdx = drafts.findIndex((d: any) => d.id === draftId);
      if (existingIdx !== -1) {
        drafts[existingIdx] = draftRecord;
      } else {
        drafts.unshift(draftRecord);
      }

      await prisma.systemSetting.upsert({
        where: { key: draftKey },
        update: { value: JSON.stringify(drafts), updatedAt: new Date() },
        create: { key: draftKey, value: JSON.stringify(drafts), category: 'EMS_ONBOARDING', description: 'Pending Employee Onboarding Drafts' },
      });

      return NextResponse.json({
        success: true,
        isDraft: true,
        draftId,
        message: 'Onboarding draft saved successfully.',
      });
    }

    // Required fields for activation
    if (!fullName || !phone || !designation) {
      return NextResponse.json(
        { error: 'Full Name, Mobile Number, and Designation are required to complete onboarding.' },
        { status: 400 }
      );
    }

    // Enforce subscription plan limits for client organizations (Section 23 & 24)
    if (targetClientId) {
      const quotaCheck = await canAddEmployee(targetClientId);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: quotaCheck.reason,
            quota: {
              current: quotaCheck.currentCount,
              max: quotaCheck.maxAllowed,
              plan: quotaCheck.planName,
            },
          },
          { status: 409 }
        );
      }
    }

    // Check unique phone number
    const cleanPhone = phone.trim();
    const existingPhone = await prisma.employee.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingPhone) {
      return NextResponse.json(
        { error: `An employee with phone number ${cleanPhone} already exists (${existingPhone.employeeId}).` },
        { status: 409 }
      );
    }

    // Generate unique email if not provided
    const cleanFullName = fullName.trim();
    const inputEmail = (email || personalEmail || '').trim();
    const generatedEmail = inputEmail
      ? inputEmail.toLowerCase()
      : `${cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}.${Date.now().toString().slice(-4)}@growthindia.in`;

    const existingUser = await prisma.user.findUnique({
      where: { email: generatedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: `A user account with email ${generatedEmail} already exists.` },
        { status: 409 }
      );
    }

    // Resolve Company Name for EMP ID Prefix (EMP-XXX-0001)
    let clientCompanyName: string | undefined;
    if (targetClientId) {
      const clientRecord = await prisma.client.findUnique({
        where: { id: targetClientId },
        select: { companyName: true },
      });
      clientCompanyName = clientRecord?.companyName;
    }

    const newEmployeeId = await generateEmployeeId(clientCompanyName);

    // Target default role
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

    // Auto-generate employee password - securely hashed
    const generatedPassword = customPassword || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: generatedEmail,
        passwordHash: hashedPassword,
        roleId: employeeRole.id,
        isActive: true,
        isSuspended: false,
        parentClientId: targetClientId,
      },
    });

    // Create Employee record
    const newEmployee = await prisma.employee.create({
      data: {
        employeeId: newEmployeeId,
        userId: newUser.id,
        clientId: targetClientId,
        fullName: cleanFullName,
        fatherMotherName: fatherMotherName ? fatherMotherName.trim() : null,
        dob: dob ? new Date(dob) : null,
        gender: gender || 'Not Specified',
        phone: cleanPhone,
        personalEmail: generatedEmail,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : null,
        panMasked: panNumber ? maskPAN(panNumber.trim().toUpperCase()) : null,
        aadhaarMasked: aadharNumber ? aadharNumber.trim() : null,
        address: finalAddress,
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        emergencyName: emergencyName ? emergencyName.trim() : null,
        departmentName: departmentName.trim(),
        designation: designation.trim(),
        jobLocation: jobLocation.trim(),
        location: jobLocation.trim(),
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        employmentType: employmentType || 'Full-Time',
        shiftStartTime: shiftStartTime || '10:00',
        shiftEndTime: shiftEndTime || '19:00',
        status: 'ACTIVE',
        isBlocked: false,
        remarks: remarks ? remarks.trim() : null,
        createdBy: `${user.fullName} (${user.employeeId || user.clientId || user.role})`,
        updatedBy: `${user.fullName} (${user.employeeId || user.clientId || user.role})`,
      },
      include: {
        client: true,
        user: true,
      },
    });

    // Clean up draft if one was used
    if (data.draftId) {
      try {
        const draftKey = `EMS_ONBOARDING_DRAFTS`;
        const draftSetting = await prisma.systemSetting.findUnique({ where: { key: draftKey } });
        if (draftSetting?.value) {
          const drafts = JSON.parse(draftSetting.value).filter((d: any) => d.id !== data.draftId);
          await prisma.systemSetting.update({
            where: { key: draftKey },
            data: { value: JSON.stringify(drafts) },
          });
        }
      } catch (e) {}
    }

    // Record lifecycle event
    try {
      const { transitionLifecycleStage } = await import('@/lib/services/ems-service');
      await transitionLifecycleStage(
        newEmployee.employeeId,
        {
          toStage: 'ACTIVE',
          reason: 'Employee onboarded and account activated via multi-step onboarding wizard',
        },
        user
      );
    } catch (e) {}

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'ADMIN',
      action: 'ONBOARD_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: newEmployee.employeeId,
      newData: {
        employeeId: newEmployee.employeeId,
        fullName: newEmployee.fullName,
        client: newEmployee.client?.companyName,
        phone: newEmployee.phone,
        designation: newEmployee.designation,
        status: 'ACTIVE',
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    const sanitizedEmployee = {
      ...newEmployee,
      user: {
        id: newUser.id,
        email: newUser.email,
        isActive: newUser.isActive,
        isSuspended: newUser.isSuspended,
      },
      panMasked: newEmployee.panMasked || (newEmployee.panNumber ? maskPAN(newEmployee.panNumber) : null),
      aadharNumber: newEmployee.aadhaarMasked || null,
      accountStatus: 'ACTIVE',
    };

    return NextResponse.json({
      success: true,
      employee: sanitizedEmployee,
      credentials: {
        employeeId: newEmployee.employeeId,
        fullName: newEmployee.fullName,
        companyName: newEmployee.client?.companyName || 'Internal Staff',
        email: generatedEmail,
        password: generatedPassword,
      },
      message: `Employee ${newEmployee.employeeId} onboarded and activated successfully!`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error onboarding employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
