import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent, maskPAN } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';
    const department = searchParams.get('department') || '';

    // Find admin user IDs once to avoid slow 2-stage multi-collection lookup pipelines in MongoDB
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
          ],
        },
      });
      if (clientRecord) {
        andConditions.push({ clientId: clientRecord.id });
      } else {
        return NextResponse.json({ success: true, employees: [] });
      }
    } else if (clientId) {
      // Admin filtered by specific client
      const clientRecord = await prisma.client.findFirst({
        where: getClientLookup(clientId),
      });
      if (clientRecord) {
        andConditions.push({ clientId: clientRecord.id });
      } else {
        return NextResponse.json({ success: true, employees: [] });
      }
    }

    if (status) {
      if (status === 'BLOCKED') {
        andConditions.push({ OR: [{ status: 'BLOCKED' }, { isBlocked: true }] });
      } else {
        andConditions.push({ status });
      }
    }

    if (department) {
      andConditions.push({
        OR: [
          { departmentName: { contains: department } },
          { department: { name: { contains: department } } },
        ],
      });
    }

    // Text search (Employee ID, Name, Phone, Email, Client, Designation)
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
        ],
      });
    }

    const where = { AND: andConditions };

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
    });

    const sanitized = employees.map((emp) => ({
      ...emp,
      aadharNumber: emp.aadhaarMasked || null,
      panMasked: emp.panMasked || (emp.panNumber ? maskPAN(emp.panNumber) : null),
    }));

    return NextResponse.json({ success: true, employees: sanitized });
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
      panNumber,
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      departmentName = 'General Operations',
      designation,
      jobLocation = 'Headquarters',
      joiningDate,
      employmentType = 'Full-Time',
      shiftStartTime = '10:00',
      shiftEndTime = '19:00',
      remarks,
      customPassword,
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

    if (!fullName || !phone || !designation) {
      return NextResponse.json(
        { error: 'Full Name, Mobile Number, and Designation are required.' },
        { status: 400 }
      );
    }

    // Determine target client ID
    let targetClientId: string | null = null;
    if (user.role === 'CLIENT') {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });
      if (!clientRecord) {
        return NextResponse.json({ error: 'Client profile not found for this account.' }, { status: 400 });
      }
      targetClientId = clientRecord.id;
    } else if (clientId) {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [{ id: clientId }, { clientId: clientId }],
        },
      });
      targetClientId = clientRecord ? clientRecord.id : clientId;
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
    const generatedEmail = email
      ? email.toLowerCase().trim()
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

    // Generate automatic sequential unique Employee ID: GI-EMP-000001, GI-EMP-000002...
    const allEmployees = await prisma.employee.findMany({
      select: { employeeId: true },
    });

    let maxNum = 0;
    for (const e of allEmployees) {
      if (e.employeeId && e.employeeId.startsWith('GI-EMP-')) {
        const numPart = parseInt(e.employeeId.replace('GI-EMP-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      } else if (e.employeeId && e.employeeId.startsWith('EMP-')) {
        const numPart = parseInt(e.employeeId.replace('EMP-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }

    const nextNumber = maxNum + 1;
    const newEmployeeId = `GI-EMP-${nextNumber.toString().padStart(6, '0')}`;

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

    // Auto-generate employee password
    const generatedPassword = customPassword || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: generatedEmail,
        passwordHash: hashedPassword,
        roleId: employeeRole.id,
        isActive: true,
        isSuspended: false,
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

    return NextResponse.json({
      success: true,
      employee: newEmployee,
      credentials: {
        employeeId: newEmployee.employeeId,
        fullName: newEmployee.fullName,
        companyName: newEmployee.client?.companyName || 'Internal',
        email: generatedEmail,
        password: generatedPassword,
      },
      message: `Employee ${newEmployee.employeeId} onboarded successfully!`,
    });
  } catch (error: any) {
    console.error('Error onboarding employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
