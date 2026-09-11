import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause } from '@/lib/tenant';
import { generateActivityNumber } from '@/lib/id-generator';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const leadIdParam = searchParams.get('leadId')?.trim() || '';

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    const where: any = {
      ...tenantWhere,
      ...(type ? { type } : {}),
      ...(leadIdParam ? { leadId: leadIdParam } : {}),
    };

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, clientId: true, companyName: true },
        },
        lead: {
          select: { id: true, leadNumber: true, fullName: true },
        },
        contact: {
          select: { id: true, contactNumber: true, fullName: true },
        },
        opportunity: {
          select: { id: true, opportunityNumber: true, title: true },
        },
        deal: {
          select: { id: true, dealNumber: true, title: true },
        },
        performedBy: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({ success: true, data: activities, count: activities.length });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      type = 'CALL',
      subject,
      description,
      durationMinutes = 0,
      scheduledAt,
      completedAt,
      status = 'COMPLETED',
      clientId,
      leadId,
      contactId,
      opportunityId,
      dealId,
    } = body;

    if (!subject) {
      return NextResponse.json({ error: 'Activity subject is required.' }, { status: 400 });
    }

    const activityNumber = await generateActivityNumber();
    const resolvedClientId = clientId ? await resolveClientObjectId(clientId) : null;

    // Find performing employee ID
    let performerEmployeeId: string | null = null;
    if (user.employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { employeeId: user.employeeId },
        select: { id: true },
      });
      performerEmployeeId = emp?.id || null;
    }

    const newActivity = await prisma.activity.create({
      data: {
        activityNumber,
        type,
        subject: subject.trim(),
        description: description?.trim() || null,
        durationMinutes: parseInt(durationMinutes, 10) || 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        status,
        clientId: resolvedClientId,
        leadId: leadId || null,
        contactId: contactId || null,
        opportunityId: opportunityId || null,
        dealId: dealId || null,
        performedById: performerEmployeeId,
      },
      include: {
        performedBy: { select: { employeeId: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'LOG_ACTIVITY',
      entityType: 'ACTIVITY',
      entityId: newActivity.activityNumber,
      newData: newActivity,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: newActivity }, { status: 201 });
  } catch (error: any) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ error: error.message || 'Failed to log activity' }, { status: 500 });
  }
}
