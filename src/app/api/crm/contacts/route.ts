import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId, isValidObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause } from '@/lib/tenant';
import { generateContactNumber } from '@/lib/id-generator';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const leadIdParam = searchParams.get('leadId')?.trim() || '';
    const isDecisionMaker = searchParams.get('isDecisionMaker');
    const isPrimary = searchParams.get('isPrimary');
    const status = searchParams.get('status')?.trim() || '';
    const includeArchived = searchParams.get('archived') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    let resolvedLeadId: string | null = null;
    if (leadIdParam) {
      if (isValidObjectId(leadIdParam)) {
        resolvedLeadId = leadIdParam;
      } else {
        const lead = await prisma.lead.findFirst({
          where: { leadNumber: leadIdParam },
          select: { id: true },
        });
        resolvedLeadId = lead?.id || null;
      }
    }

    const where: any = {
      ...tenantWhere,
      isArchived: includeArchived ? undefined : false,
      ...(status ? { status } : {}),
      ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
      ...(isDecisionMaker !== null && isDecisionMaker !== undefined && isDecisionMaker !== ''
        ? { isDecisionMaker: isDecisionMaker === 'true' }
        : {}),
      ...(isPrimary !== null && isPrimary !== undefined && isPrimary !== ''
        ? { isPrimary: isPrimary === 'true' }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { contactNumber: { contains: search, mode: 'insensitive' } },
              { designation: { contains: search, mode: 'insensitive' } },
              { department: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { alternatePhone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: {
          client: {
            select: { id: true, clientId: true, companyName: true },
          },
          lead: {
            select: { id: true, leadNumber: true, fullName: true, companyName: true },
          },
          _count: {
            select: { activities: true, followUps: true, tasks: true, notesRel: true },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      fullName,
      designation,
      email,
      phone,
      alternatePhone,
      isDecisionMaker = false,
      isPrimary = false,
      department,
      status = 'ACTIVE',
      notes,
      clientId,
      leadId,
    } = body;

    const trimmedName = fullName?.trim();
    const trimmedPhone = phone?.trim();

    if (!trimmedName || !trimmedPhone) {
      return NextResponse.json(
        { error: 'Contact Name and Phone Number are required.' },
        { status: 400 }
      );
    }

    let resolvedClientId = clientId ? await resolveClientObjectId(clientId) : null;
    let resolvedLeadId: string | null = null;

    if (leadId) {
      if (isValidObjectId(leadId)) {
        resolvedLeadId = leadId;
      } else {
        const lead = await prisma.lead.findFirst({
          where: { leadNumber: leadId },
          select: { id: true, clientId: true },
        });
        resolvedLeadId = lead?.id || null;
        if (!resolvedClientId && lead?.clientId) {
          resolvedClientId = lead.clientId;
        }
      }
    }

    // Duplicate check on phone or email
    const duplicateWhere: any[] = [{ phone: trimmedPhone }];
    if (email?.trim()) {
      duplicateWhere.push({ email: { equals: email.trim(), mode: 'insensitive' } });
    }
    const duplicate = await prisma.contact.findFirst({
      where: {
        isArchived: false,
        OR: duplicateWhere,
        ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
      },
      select: { id: true, contactNumber: true, fullName: true, phone: true, email: true },
    });

    const contactNumber = await generateContactNumber();

    // If this contact is marked primary, unmark previous primary contacts for the same lead or client
    if (isPrimary) {
      if (resolvedLeadId) {
        await prisma.contact.updateMany({
          where: { leadId: resolvedLeadId, isPrimary: true },
          data: { isPrimary: false },
        });
      } else if (resolvedClientId) {
        await prisma.contact.updateMany({
          where: { clientId: resolvedClientId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
    }

    const newContact = await prisma.contact.create({
      data: {
        contactNumber,
        fullName: trimmedName,
        designation: designation?.trim() || null,
        email: email?.trim()?.toLowerCase() || null,
        phone: trimmedPhone,
        alternatePhone: alternatePhone?.trim() || null,
        isDecisionMaker: Boolean(isDecisionMaker),
        isPrimary: Boolean(isPrimary),
        department: department?.trim() || null,
        status: status || 'ACTIVE',
        notes: notes?.trim() || null,
        clientId: resolvedClientId,
        leadId: resolvedLeadId,
      },
      include: {
        client: { select: { clientId: true, companyName: true } },
        lead: { select: { leadNumber: true, fullName: true, companyName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CREATE_CONTACT',
      entityType: 'CONTACT',
      entityId: newContact.contactNumber,
      newData: {
        id: newContact.id,
        contactNumber: newContact.contactNumber,
        fullName: newContact.fullName,
        phone: newContact.phone,
        clientId: newContact.clientId,
        leadId: newContact.leadId,
      },
      status: 'SUCCESS',
    });

    return NextResponse.json(
      {
        success: true,
        data: newContact,
        warning: duplicate
          ? `Note: A contact with matching phone/email (${duplicate.fullName} - ${duplicate.contactNumber}) already exists.`
          : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to create contact' }, { status: 500 });
  }
}
