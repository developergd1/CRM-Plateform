import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId, resolveClientObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause } from '@/lib/tenant';
import { generateFollowUpNumber, generateActivityNumber } from '@/lib/id-generator';
import { notifyAssignment } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter')?.toUpperCase() || 'ALL'; // TODAY, UPCOMING, OVERDUE, COMPLETED, ALL
    const statusParam = searchParams.get('status')?.trim() || '';
    const leadIdParam = searchParams.get('leadId')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const assignedToIdParam = searchParams.get('assignedToId')?.trim() || '';
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

    let resolvedAssignedId: string | null = null;
    if (assignedToIdParam) {
      resolvedAssignedId = await resolveEmployeeObjectId(assignedToIdParam);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const where: any = {
      ...tenantWhere,
      ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
      ...(resolvedAssignedId ? { assignedToId: resolvedAssignedId } : {}),
    };

    // Apply smart filters
    if (filter === 'TODAY') {
      where.scheduledAt = { gte: startOfToday, lte: endOfToday };
      where.status = 'PENDING';
    } else if (filter === 'UPCOMING') {
      where.scheduledAt = { gt: endOfToday };
      where.status = 'PENDING';
    } else if (filter === 'OVERDUE') {
      where.scheduledAt = { lt: startOfToday };
      where.status = 'PENDING';
    } else if (filter === 'COMPLETED') {
      where.status = 'COMPLETED';
    } else if (statusParam) {
      where.status = statusParam;
    }

    const [total, followUps] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        orderBy: filter === 'OVERDUE' ? { scheduledAt: 'asc' } : { scheduledAt: 'desc' },
        include: {
          lead: {
            select: { id: true, leadNumber: true, fullName: true, companyName: true, phone: true, email: true },
          },
          contact: {
            select: { id: true, contactNumber: true, fullName: true, phone: true, designation: true },
          },
          client: {
            select: { id: true, clientId: true, companyName: true },
          },
          assignedTo: {
            select: { id: true, employeeId: true, fullName: true, designation: true },
          },
        },
        skip,
        take: limit,
      }),
    ]);

    // Also fetch summary counts for quick navigation tabs
    const baseWhere = {
      ...tenantWhere,
      ...(resolvedLeadId ? { leadId: resolvedLeadId } : {}),
      ...(resolvedAssignedId ? { assignedToId: resolvedAssignedId } : {}),
    };

    const [todayCount, upcomingCount, overdueCount, completedCount] = await Promise.all([
      prisma.followUp.count({
        where: { ...baseWhere, status: 'PENDING', scheduledAt: { gte: startOfToday, lte: endOfToday } },
      }),
      prisma.followUp.count({
        where: { ...baseWhere, status: 'PENDING', scheduledAt: { gt: endOfToday } },
      }),
      prisma.followUp.count({
        where: { ...baseWhere, status: 'PENDING', scheduledAt: { lt: startOfToday } },
      }),
      prisma.followUp.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: followUps,
      summary: {
        today: todayCount,
        upcoming: upcomingCount,
        overdue: overdueCount,
        completed: completedCount,
        all: todayCount + upcomingCount + overdueCount + completedCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      remarks,
      scheduledAt,
      priority = 'MEDIUM',
      status = 'PENDING',
      leadId,
      contactId,
      clientId,
      assignedToId,
    } = body;

    if (!title?.trim() || !scheduledAt) {
      return NextResponse.json(
        { error: 'Follow-up title and scheduled date/time are required.' },
        { status: 400 }
      );
    }

    let resolvedLeadId: string | null = null;
    let resolvedClientId = clientId ? await resolveClientObjectId(clientId) : null;
    let resolvedContactId = contactId ? (isValidObjectId(contactId) ? contactId : null) : null;
    const resolvedAssignedToId = assignedToId ? await resolveEmployeeObjectId(assignedToId) : null;

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

    const followUpNumber = await generateFollowUpNumber();
    const scheduledDate = new Date(scheduledAt);

    const followUp = await prisma.followUp.create({
      data: {
        followUpNumber,
        title: title.trim(),
        remarks: remarks?.trim() || null,
        scheduledAt: scheduledDate,
        status: status || 'PENDING',
        priority: priority || 'MEDIUM',
        leadId: resolvedLeadId,
        contactId: resolvedContactId,
        clientId: resolvedClientId,
        assignedToId: resolvedAssignedToId,
        createdById: user.id,
      },
      include: {
        lead: { select: { id: true, leadNumber: true, fullName: true } },
        contact: { select: { id: true, fullName: true } },
        client: { select: { clientId: true, companyName: true } },
        assignedTo: { select: { employeeId: true, fullName: true } },
      },
    });

    // If linked to lead, update lead's nextFollowUpAt if this is the closest upcoming
    if (resolvedLeadId) {
      await prisma.lead.update({
        where: { id: resolvedLeadId },
        data: { nextFollowUpAt: scheduledDate },
      });
    }

    // Log Activity for Lead
    if (resolvedLeadId) {
      const actNumber = await generateActivityNumber();
      await prisma.activity.create({
        data: {
          activityNumber: actNumber,
          type: 'FOLLOW_UP',
          subject: `Follow-up scheduled: ${title}`,
          description: remarks || `Scheduled for ${scheduledDate.toLocaleString()}`,
          status: 'COMPLETED',
          leadId: resolvedLeadId,
          clientId: resolvedClientId,
          performedById: resolvedAssignedToId,
        },
      });
    }

    // Audit log
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'CREATE_FOLLOWUP',
      entityType: 'FOLLOW_UP',
      entityId: followUp.followUpNumber,
      newData: {
        id: followUp.id,
        followUpNumber: followUp.followUpNumber,
        title: followUp.title,
        scheduledAt: followUp.scheduledAt,
        leadId: followUp.leadId,
        assignedToId: followUp.assignedToId,
      },
      status: 'SUCCESS',
    });

    // Notify assignee
    if (resolvedAssignedToId) {
      await notifyAssignment({
        employeeId: resolvedAssignedToId,
        assignerName: user.fullName || 'Admin',
        itemType: 'Follow-up',
        itemTitle: `${followUp.followUpNumber} - ${followUp.title}`,
        itemId: followUp.id,
      });
    }

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json({ error: error.message || 'Failed to create follow-up' }, { status: 500 });
  }
}
