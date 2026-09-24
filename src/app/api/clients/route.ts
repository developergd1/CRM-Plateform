import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { generateClientId } from '@/lib/id-generator';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const status = searchParams.get('status') || '';
    const industry = searchParams.get('industry') || '';

    const where: any = {};

    // Role-based scoping: If user is CLIENT, only return their own client profile
    if (user.role === 'CLIENT') {
      if (user.clientId) {
        where.OR = [
          { clientId: user.clientId },
          { id: user.clientId },
          { userId: user.id },
        ];
      } else {
        where.userId = user.id;
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
      if (currentEmp) {
        where.OR = [
          ...(currentEmp.clientId ? [{ id: currentEmp.clientId }] : []),
          { assignedEmployeeId: currentEmp.id },
          { createdById: currentEmp.id },
        ];
      }
    } else {
      if (status) where.status = status;
      if (industry) where.industry = industry;

      if (search) {
        where.OR = [
          { clientId: { contains: search } },
          { companyName: { contains: search } },
          { contactPerson: { contains: search } },
          { mobile: { contains: search } },
          { email: { contains: search } },
          { industry: { contains: search } },
          { address: { contains: search } },
        ];
      }
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            isSuspended: true,
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { clientId: 'asc' },
    });

    const mapped = clients.map((c) => {
      let gstNumber = c.gst || '';
      let panNumber = '';
      let aadharNumber = '';
      let companyType = c.companyType || 'Private Limited';
      let remarks = c.remarks || '';
      let assignedModules = Array.isArray(c.assignedModules) && c.assignedModules.length > 0 ? c.assignedModules : ['EMS'];
      try {
        if (c.tags && c.tags.startsWith('{')) {
          const parsed = JSON.parse(c.tags);
          if (!gstNumber) gstNumber = parsed.gstNumber || '';
          panNumber = parsed.panNumber || '';
          aadharNumber = parsed.aadharNumber || '';
          if (parsed.companyType) companyType = parsed.companyType;
          if (parsed.remarks) remarks = parsed.remarks;
          if ((!c.assignedModules || c.assignedModules.length === 0) && Array.isArray(parsed.assignedModules)) {
            assignedModules = parsed.assignedModules;
          }
        }
      } catch (e) {}
      return {
        ...c,
        gstNumber,
        panNumber,
        aadharNumber,
        companyType,
        remarks,
        assignedModules,
      };
    });

    return NextResponse.json({ success: true, clients: mapped });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Administrators can create clients.' }, { status: 403 });
    }

    const data = await req.json();
    const {
      companyName,
      contactPerson,
      mobile,
      email,
      gst,
      gstNumber,
      panNumber,
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      industry = 'IT & Software Services',
      companyType = 'Private Limited',
      remarks,
      status = 'ACTIVE',
      assignedModules = ['EMS'],
      subscriptionPlan = 'STANDARD',
      canBlockEmployees = false,
      canDeleteEmployees = false,
      customPassword,
      password,
    } = data;

    const finalAddress = address || (temporaryAddress && permanentAddress
      ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
      : (temporaryAddress || permanentAddress || null));

    const finalGst = (gst || gstNumber || '').trim().toUpperCase();

    if (!companyName || !contactPerson || !mobile) {
      return NextResponse.json(
        { error: 'Company Name, Contact Person, and Mobile Number are required.' },
        { status: 400 }
      );
    }

    // Duplicate detection: reject if company name, phone, or email already registered
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const duplicateClient = await prisma.client.findFirst({
      where: {
        OR: [
          { companyName: { equals: companyName.trim(), mode: 'insensitive' as const } },
          ...(cleanMobile.length >= 10 ? [{ mobile: { contains: cleanMobile } }] : []),
          ...(email ? [{ email: { equals: email.toLowerCase().trim(), mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (duplicateClient) {
      return NextResponse.json(
        {
          error: `Client organization already exists (${duplicateClient.clientId}: ${duplicateClient.companyName}). Duplicate registration rejected.`,
          code: 'DUPLICATE_CLIENT',
          existingClientId: duplicateClient.clientId,
        },
        { status: 409 }
      );
    }

    // Generate automatic sequential unique Client ID: CLI-00001, CLI-00002...
    const clientId = await generateClientId(companyName);

    // Target email
    const numPart = clientId.replace(/\D/g, '');
    const clientEmail = email
      ? email.toLowerCase().trim()
      : `client.${numPart}@growthindia.in`;

    // Auto-generate client password
    const generatedPassword = customPassword || password || `Client#${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Get or create CLIENT role
    let clientRole = await prisma.role.findUnique({
      where: { name: 'CLIENT' },
    });
    if (!clientRole) {
      clientRole = await prisma.role.create({
        data: {
          name: 'CLIENT',
          displayName: 'Client Account',
          description: 'Corporate client portal',
          isSystem: true,
        },
      });
    }

    // Create User record for the client safely
    const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
    let clientUser = existingUser;
    if (existingUser) {
      // Check if existing user is already linked to another client
      const linkedClient = await prisma.client.findUnique({ where: { userId: existingUser.id } });
      if (linkedClient) {
        // Generate dedicated unique user for this new client
        const uniqueSuffix = `${numPart}.${Date.now().toString().slice(-4)}`;
        const fallbackEmail = `client.${uniqueSuffix}@growthindia.in`;
        clientUser = await prisma.user.create({
          data: {
            email: fallbackEmail,
            passwordHash: hashedPassword,
            roleId: clientRole.id,
            isActive: true,
            isSuspended: false,
          },
        });
      }
    } else {
      clientUser = await prisma.user.create({
        data: {
          email: clientEmail,
          passwordHash: hashedPassword,
          roleId: clientRole.id,
          isActive: true,
          isSuspended: false,
        },
      });
    }

    let safeUserId: string | null = null;
    if (clientUser) {
      const isTaken = await prisma.client.findUnique({ where: { userId: clientUser.id } });
      if (!isTaken) {
        safeUserId = clientUser.id;
      }
    }

    const cleanModules = Array.isArray(assignedModules) && assignedModules.length > 0
      ? assignedModules.filter((m: string) => ['EMS', 'CRM', 'HRM'].includes(m.toUpperCase()))
      : ['EMS'];

    const newClient = await prisma.client.create({
      data: {
        clientId,
        userId: safeUserId,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        email: clientEmail,
        address: finalAddress ? finalAddress.trim() : null,
        industry: industry ? industry.trim() : null,
        companyType: companyType ? companyType.trim() : 'Private Limited',
        gst: finalGst || null,
        remarks: remarks ? remarks.trim() : null,
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        assignedModules: cleanModules.length > 0 ? cleanModules : ['EMS'],
        subscriptionPlan: subscriptionPlan || 'STANDARD',
        subscriptionStatus: 'ACTIVE',
        canBlockEmployees: !!canBlockEmployees,
        canDeleteEmployees: !!canDeleteEmployees,
        dateAdded: new Date(),
        createdById: user.employeeProfileId || null,
        tags: JSON.stringify({
          gstNumber: finalGst,
          panNumber: panNumber ? panNumber.trim().toUpperCase() : '',
          aadharNumber: aadharNumber ? aadharNumber.trim() : '',
          companyType,
          remarks,
          assignedModules: cleanModules,
        }),
        // Backwards compatibility sync
        name: contactPerson.trim(),
        phone: mobile.trim(),
        company: companyName.trim(),
        location: permanentAddress ? permanentAddress.trim() : (finalAddress ? finalAddress.trim() : null),
        stage: 'NEW',
      },
      include: {
        user: true,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'CREATE_CLIENT',
      entityType: 'CLIENT',
      entityId: newClient.clientId,
      newData: {
        clientId: newClient.clientId,
        companyName: newClient.companyName,
        contactPerson: newClient.contactPerson,
        mobile: newClient.mobile,
        email: clientEmail,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      client: newClient,
      credentials: {
        clientId: newClient.clientId,
        email: clientEmail,
        password: generatedPassword,
      },
      message: `Client ${newClient.clientId} created successfully!`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
