import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause, verifyClientOrganizationAccess } from '@/lib/tenant';
import { generateOpportunityNumber } from '@/lib/id-generator';
import { notifyAssignment } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const stage = searchParams.get('stage')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const leadIdParam = searchParams.get('leadId')?.trim() || '';
    const assignedToIdParam = searchParams.get('assignedToId')?.trim() || '';

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    const where: any = {
      ...tenantWhere,
      ...(stage ? { stage } : {}),
      ...(leadIdParam ? { leadId: leadIdParam } : {}),
      ...(assignedToIdParam ? { assignedToId: assignedToIdParam } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { opportunityNumber: { contains: search, mode: 'insensitive' } },
              { productService: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, clientId: true, companyName: true },
        },
        lead: {
          select: { id: true, leadNumber: true, companyName: true, contactPerson: true, email: true, phone: true },
        },
        primaryContact: {
          select: { id: true, contactNumber: true, fullName: true, phone: true, email: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
        _count: {
          select: { deals: true, activities: true, tasks: true, notes: true, followUps: true },
        },
      },
      take: 100,
    });

    const totalValue = opportunities.reduce((acc, curr) => acc + (curr.value || 0), 0);

    return NextResponse.json({
      success: true,
      data: opportunities,
      count: opportunities.length,
      metrics: {
        totalValue,
      },
    });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch opportunities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      value = 0,
      currency = 'INR',
      stage = 'PROSPECTING',
      probability = 20,
      productService,
      competitor,
      proposalStatus = 'NOT_REQUIRED',
      expectedCloseDate,
      leadId,
      clientId,
      primaryContactId,
      assignedToId,
    } = body;

    if (!title || (!clientId && !leadId)) {
      return NextResponse.json(
        { error: 'Title and either a Client or a Lead ID are required.' },
        { status: 400 }
      );
    }

    let resolvedClientId: string | null = null;
    if (clientId) {
      const { hasAccess, resolvedClientId: verifiedId } = await verifyClientOrganizationAccess(user, clientId);
      if (!hasAccess || !verifiedId) {
        return NextResponse.json({ error: 'Permission denied or invalid organization ID.' }, { status: 403 });
      }
      resolvedClientId = verifiedId;
    }

    const opportunityNumber = await generateOpportunityNumber();

    const newOpportunity = await prisma.opportunity.create({
      data: {
        opportunityNumber,
        title: title.trim(),
        description: description?.trim() || null,
        value: parseFloat(value) || 0,
        currency: currency || 'INR',
        stage,
        probability: parseInt(probability, 10) || 20,
        productService: productService?.trim() || null,
        competitor: competitor?.trim() || null,
        proposalStatus: proposalStatus || 'NOT_REQUIRED',
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        leadId: leadId || null,
        clientId: resolvedClientId,
        primaryContactId: primaryContactId || null,
        assignedToId: assignedToId || null,
        createdBy: user.fullName || user.id,
      },
      include: {
        client: { select: { clientId: true, companyName: true } },
        lead: { select: { leadNumber: true, companyName: true, contactPerson: true } },
        primaryContact: { select: { contactNumber: true, fullName: true } },
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CREATE_OPPORTUNITY',
      entityType: 'OPPORTUNITY',
      entityId: newOpportunity.opportunityNumber,
      newData: newOpportunity,
      status: 'SUCCESS',
    });

    if (newOpportunity.assignedToId) {
      await notifyAssignment({
        employeeId: newOpportunity.assignedToId,
        assignerName: user.fullName,
        itemType: 'Opportunity',
        itemTitle: newOpportunity.title,
        itemId: newOpportunity.id,
      });
    }

    return NextResponse.json({ success: true, data: newOpportunity }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating opportunity:', error);
    return NextResponse.json({ error: error.message || 'Failed to create opportunity' }, { status: 500 });
  }
}
