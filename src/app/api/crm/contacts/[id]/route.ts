import { NextRequest, NextResponse } from 'next/server';
import { prisma, isValidObjectId, resolveClientObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

async function findContactByIdentifier(id: string) {
  if (isValidObjectId(id)) {
    return prisma.contact.findFirst({
      where: { OR: [{ id }, { contactNumber: id }] },
    });
  }
  return prisma.contact.findFirst({
    where: { contactNumber: id },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const basic = await findContactByIdentifier(id);

    if (!basic) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId && basic.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Access denied to this contact' }, { status: 403 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: basic.id },
      include: {
        client: { select: { id: true, clientId: true, companyName: true } },
        lead: { select: { id: true, leadNumber: true, fullName: true, companyName: true, phone: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { performedBy: { select: { employeeId: true, fullName: true } } },
          take: 20,
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          include: { assignedTo: { select: { employeeId: true, fullName: true } } },
          take: 20,
        },
      },
    });

    return NextResponse.json({ success: true, data: contact });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch contact' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findContactByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT' && user.clientId && existing.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Access denied to this contact' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.fullName !== undefined) updateData.fullName = body.fullName.trim();
    if (body.designation !== undefined) updateData.designation = body.designation?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim()?.toLowerCase() || null;
    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.alternatePhone !== undefined) updateData.alternatePhone = body.alternatePhone?.trim() || null;
    if (body.department !== undefined) updateData.department = body.department?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.isDecisionMaker !== undefined) updateData.isDecisionMaker = Boolean(body.isDecisionMaker);
    if (body.isArchived !== undefined) updateData.isArchived = Boolean(body.isArchived);

    if (body.clientId !== undefined) {
      updateData.clientId = body.clientId ? await resolveClientObjectId(body.clientId) : null;
    }

    if (body.isPrimary !== undefined) {
      const isPrimary = Boolean(body.isPrimary);
      updateData.isPrimary = isPrimary;
      if (isPrimary) {
        if (existing.leadId) {
          await prisma.contact.updateMany({
            where: { leadId: existing.leadId, id: { not: existing.id } },
            data: { isPrimary: false },
          });
        } else if (existing.clientId) {
          await prisma.contact.updateMany({
            where: { clientId: existing.clientId, id: { not: existing.id } },
            data: { isPrimary: false },
          });
        }
      }
    }

    const updated = await prisma.contact.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        client: { select: { clientId: true, companyName: true } },
        lead: { select: { leadNumber: true, fullName: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_CONTACT',
      entityType: 'CONTACT',
      entityId: existing.contactNumber,
      previousData: { fullName: existing.fullName, phone: existing.phone },
      newData: updateData,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findContactByIdentifier(id);

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const archived = await prisma.contact.update({
      where: { id: existing.id },
      data: { isArchived: true },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'ARCHIVE_CONTACT',
      entityType: 'CONTACT',
      entityId: existing.contactNumber,
      newData: { isArchived: true },
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Contact ${existing.contactNumber} archived.`,
      data: archived,
    });
  } catch (error: any) {
    console.error('Error archiving contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete contact' }, { status: 500 });
  }
}
