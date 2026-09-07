import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

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
    if (user.role === 'CLIENT' && user.clientId) {
      where.clientId = user.clientId;
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
      let gstNumber = '';
      let panNumber = '';
      let aadharNumber = '';
      try {
        if (c.tags && c.tags.startsWith('{')) {
          const parsed = JSON.parse(c.tags);
          gstNumber = parsed.gstNumber || '';
          panNumber = parsed.panNumber || '';
          aadharNumber = parsed.aadharNumber || '';
        }
      } catch (e) {}
      return {
        ...c,
        gstNumber,
        panNumber,
        aadharNumber,
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
      gstNumber,
      panNumber,
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      industry = 'IT & Software Services',
      status = 'ACTIVE',
      canBlockEmployees = false,
      canDeleteEmployees = false,
      customPassword,
    } = data;

    const finalAddress = address || (temporaryAddress && permanentAddress
      ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
      : (temporaryAddress || permanentAddress || null));

    if (!companyName || !contactPerson || !mobile) {
      return NextResponse.json(
        { error: 'Company Name, Contact Person, and Mobile Number are required.' },
        { status: 400 }
      );
    }

    // Generate automatic sequential unique Client ID: CLI-00001, CLI-00002...
    const allClients = await prisma.client.findMany({
      select: { clientId: true },
    });

    let maxNum = 0;
    for (const c of allClients) {
      if (c.clientId && c.clientId.startsWith('CLI-')) {
        const numPart = parseInt(c.clientId.replace('CLI-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }

    const nextNumber = maxNum + 1;
    const clientId = `CLI-${nextNumber.toString().padStart(5, '0')}`;

    // Target email
    const clientEmail = email
      ? email.toLowerCase().trim()
      : `client.${nextNumber}@growthindia.in`;

    // Auto-generate client password
    const generatedPassword = customPassword || `Client#${Math.floor(1000 + Math.random() * 9000)}`;
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

    // Create User record for the client
    const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
    let clientUser = existingUser;
    if (!existingUser) {
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

    const newClient = await prisma.client.create({
      data: {
        clientId,
        userId: clientUser?.id || null,
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        email: clientEmail,
        address: finalAddress ? finalAddress.trim() : null,
        industry: industry ? industry.trim() : null,
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        canBlockEmployees: !!canBlockEmployees,
        canDeleteEmployees: !!canDeleteEmployees,
        dateAdded: new Date(),
        tags: JSON.stringify({
          gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : '',
          panNumber: panNumber ? panNumber.trim().toUpperCase() : '',
          aadharNumber: aadharNumber ? aadharNumber.trim() : '',
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
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
