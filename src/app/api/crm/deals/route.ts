import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause, verifyClientOrganizationAccess } from '@/lib/tenant';
import { generateDealNumber } from '@/lib/id-generator';
import { notifyAssignment } from '@/lib/notifications';
import { DEAL_STAGE_DEFAULT_PROBABILITIES, DealStage } from '@/lib/constants/crm';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const stage = searchParams.get('stage')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const assignedToId = searchParams.get('assignedToId')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const leadIdParam = searchParams.get('leadId')?.trim() || '';
    const opportunityIdParam = searchParams.get('opportunityId')?.trim() || '';

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    const where: any = {
      ...tenantWhere,
      ...(stage ? { stage } : {}),
      ...(status ? { status } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      ...(leadIdParam ? { leadId: leadIdParam } : {}),
      ...(opportunityIdParam ? { opportunityId: opportunityIdParam } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { dealNumber: { contains: search, mode: 'insensitive' } },
              { productService: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const deals = await prisma.deal.findMany({
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
        opportunity: {
          select: { id: true, opportunityNumber: true, title: true, value: true },
        },
        assignedTo: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5,
          include: {
            changedBy: { select: { fullName: true, employeeId: true } },
          },
        },
        _count: {
          select: { activities: true, tasks: true, notes: true, followUps: true },
        },
      },
      take: 200,
    });

    // Pipeline calculations
    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    let wonValue = 0;
    let lostValue = 0;
    let wonCount = 0;
    let lostCount = 0;
    let openCount = 0;

    const stageBreakdown: Record<string, { count: number; totalValue: number; weightedValue: number }> = {
      NEW: { count: 0, totalValue: 0, weightedValue: 0 },
      QUALIFIED: { count: 0, totalValue: 0, weightedValue: 0 },
      PROPOSAL: { count: 0, totalValue: 0, weightedValue: 0 },
      NEGOTIATION: { count: 0, totalValue: 0, weightedValue: 0 },
      WON: { count: 0, totalValue: 0, weightedValue: 0 },
      LOST: { count: 0, totalValue: 0, weightedValue: 0 },
    };

    deals.forEach((deal) => {
      const amt = deal.amount || 0;
      const weighted = deal.weightedValue ?? (amt * (deal.probability || 0)) / 100;
      const st = deal.stage || 'NEW';

      if (stageBreakdown[st]) {
        stageBreakdown[st].count += 1;
        stageBreakdown[st].totalValue += amt;
        stageBreakdown[st].weightedValue += weighted;
      }

      if (st === 'WON') {
        wonValue += amt;
        wonCount += 1;
      } else if (st === 'LOST') {
        lostValue += amt;
        lostCount += 1;
      } else {
        totalPipelineValue += amt;
        weightedPipelineValue += weighted;
        openCount += 1;
      }
    });

    return NextResponse.json({
      success: true,
      data: deals,
      count: deals.length,
      metrics: {
        totalPipelineValue,
        weightedPipelineValue,
        wonValue,
        lostValue,
        wonCount,
        lostCount,
        openCount,
        stageBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      amount = 0,
      stage = 'NEW',
      probability,
      currency = 'INR',
      proposalStatus = 'NOT_REQUIRED',
      productService,
      competitor,
      competitorNotes,
      terms,
      expectedCloseDate,
      closingDate,
      clientId,
      leadId,
      opportunityId,
      primaryContactId,
      assignedToId,
    } = body;

    if (!title || (!clientId && !leadId && !opportunityId)) {
      return NextResponse.json(
        { error: 'Title and either Client, Lead, or Opportunity association is required.' },
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

    // Default probability by stage if not specified
    const targetProbability =
      probability !== undefined && probability !== null
        ? parseInt(probability, 10)
        : (DEAL_STAGE_DEFAULT_PROBABILITIES[stage as DealStage] ?? 10);

    const parsedAmount = parseFloat(amount) || 0;
    const weightedValue = (parsedAmount * targetProbability) / 100;
    const dealNumber = await generateDealNumber();

    const status = stage === 'WON' ? 'WON' : stage === 'LOST' ? 'LOST' : 'OPEN';

    // Find current employee id if available
    let changerEmployeeId: string | null = null;
    if (user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(user.employeeId),
        select: { id: true },
      });
      if (emp) changerEmployeeId = emp.id;
    }

    const newDeal = await prisma.deal.create({
      data: {
        dealNumber,
        title: title.trim(),
        amount: parsedAmount,
        currency: currency || 'INR',
        stage,
        probability: targetProbability,
        weightedValue,
        status,
        proposalStatus: proposalStatus || 'NOT_REQUIRED',
        productService: productService?.trim() || null,
        competitor: competitor?.trim() || null,
        competitorNotes: competitorNotes?.trim() || null,
        terms: terms?.trim() || null,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : closingDate ? new Date(closingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        clientId: resolvedClientId,
        leadId: leadId || null,
        opportunityId: opportunityId || null,
        primaryContactId: primaryContactId || null,
        assignedToId: assignedToId || null,
        isConvertedToClient: false,
        stageHistory: {
          create: {
            toStage: stage,
            toProbability: targetProbability,
            reason: 'Initial Deal Creation',
            changedById: changerEmployeeId,
          },
        },
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
      action: 'CREATE_DEAL',
      entityType: 'DEAL',
      entityId: newDeal.dealNumber,
      newData: newDeal,
      status: 'SUCCESS',
    });

    if (newDeal.assignedToId) {
      await notifyAssignment({
        employeeId: newDeal.assignedToId,
        assignerName: user.fullName,
        itemType: 'Deal',
        itemTitle: newDeal.title,
        itemId: newDeal.id,
      });
    }

    return NextResponse.json({ success: true, data: newDeal }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: error.message || 'Failed to create deal' }, { status: 500 });
  }
}
