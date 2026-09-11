import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause } from '@/lib/tenant';
import { generateLeadNumber } from '@/lib/id-generator';
import { notifyAssignment } from '@/lib/notifications';
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_PRIORITIES } from '@/lib/constants/crm';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const source = searchParams.get('source')?.trim() || '';
    const priority = searchParams.get('priority')?.trim() || '';
    const assignedToIdParam = searchParams.get('assignedToId')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const includeArchived = searchParams.get('archived') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    let resolvedAssignedId: string | null = null;
    if (assignedToIdParam) {
      resolvedAssignedId = await resolveEmployeeObjectId(assignedToIdParam);
    }

    const where: any = {
      ...tenantWhere,
      isArchived: includeArchived ? undefined : false,
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(priority ? { priority } : {}),
      ...(resolvedAssignedId ? { assignedToId: resolvedAssignedId } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { leadNumber: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { alternatePhone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, clientId: true, companyName: true },
          },
          assignedTo: {
            select: { id: true, employeeId: true, fullName: true, designation: true, phone: true },
          },
          _count: {
            select: {
              contacts: true,
              activities: true,
              tasks: true,
              notes: true,
              followUps: true,
            },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      fullName,
      contactPerson,
      companyName,
      phone,
      alternatePhone,
      email,
      website,
      industry,
      location,
      city,
      state,
      country = 'India',
      source = 'WEBSITE',
      status = 'NEW',
      priority = 'MEDIUM',
      leadScore = 0,
      estimatedValue = 0,
      description,
      nextFollowUpAt,
      clientId,
      assignedToId,
    } = body;

    const primaryName = (fullName || contactPerson)?.trim();
    const primaryPhone = phone?.trim();

    if (!primaryName || !primaryPhone) {
      return NextResponse.json(
        { error: 'Contact Name / Full Name and Phone Number are required.' },
        { status: 400 }
      );
    }

    // Validate enum values if provided
    if (source && !LEAD_SOURCES.includes(source as any)) {
      return NextResponse.json({ error: `Invalid source. Must be one of: ${LEAD_SOURCES.join(', ')}` }, { status: 400 });
    }
    if (status && !LEAD_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${LEAD_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (priority && !LEAD_PRIORITIES.includes(priority as any)) {
      return NextResponse.json({ error: `Invalid priority. Must be one of: ${LEAD_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    const leadNumber = await generateLeadNumber();
    const resolvedClientId = clientId ? await resolveClientObjectId(clientId) : null;
    const resolvedAssignedToId = assignedToId ? await resolveEmployeeObjectId(assignedToId) : null;

    const newLead = await prisma.lead.create({
      data: {
        leadNumber,
        fullName: primaryName,
        contactPerson: contactPerson?.trim() || primaryName,
        companyName: companyName?.trim() || null,
        phone: primaryPhone,
        alternatePhone: alternatePhone?.trim() || null,
        email: email?.trim()?.toLowerCase() || null,
        website: website?.trim() || null,
        industry: industry?.trim() || null,
        location: location?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || 'India',
        source: source || 'WEBSITE',
        status: status || 'NEW',
        priority: priority || 'MEDIUM',
        leadScore: parseInt(leadScore, 10) || 0,
        estimatedValue: parseFloat(estimatedValue) || 0,
        description: description?.trim() || null,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
        clientId: resolvedClientId,
        assignedToId: resolvedAssignedToId,
        createdBy: user.fullName || user.email || user.id,
      },
      include: {
        client: { select: { clientId: true, companyName: true } },
        assignedTo: { select: { id: true, employeeId: true, fullName: true, designation: true } },
      },
    });

    // Record initial assignment history if assigned
    if (resolvedAssignedToId) {
      const assignerEmpId = user.employeeId
        ? await resolveEmployeeObjectId(user.employeeId)
        : (await prisma.employee.findFirst({ select: { id: true } }))?.id;

      if (assignerEmpId) {
        await prisma.leadAssignment.create({
          data: {
            leadId: newLead.id,
            toEmployeeId: resolvedAssignedToId,
            assignedById: assignerEmpId,
            assignmentReason: 'Initial assignment upon lead creation',
          },
        });
      }

      await notifyAssignment({
        employeeId: resolvedAssignedToId,
        assignerName: user.fullName || 'Admin',
        itemType: 'Lead',
        itemTitle: `${newLead.leadNumber} - ${newLead.fullName}`,
        itemId: newLead.id,
      });
    }

    // Log audit event
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CREATE_LEAD',
      entityType: 'LEAD',
      entityId: newLead.leadNumber,
      newData: {
        id: newLead.id,
        leadNumber: newLead.leadNumber,
        fullName: newLead.fullName,
        companyName: newLead.companyName,
        phone: newLead.phone,
        status: newLead.status,
        assignedToId: newLead.assignedToId,
      },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: newLead }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: error.message || 'Failed to create lead' }, { status: 500 });
  }
}
