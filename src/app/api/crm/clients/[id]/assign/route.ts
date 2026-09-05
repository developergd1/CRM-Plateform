import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReassignClients } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || !canReassignClients(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Managers and Administrators can reassign clients.' }, { status: 403 });
    }

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { id } = params;
    const { targetEmployeeId, assignmentReason } = await req.json();

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Target employee ID is required' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ id }, { clientId: id }] },
      include: { assignedEmployee: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const newOwner = await prisma.employee.findFirst({
      where: { OR: [{ id: targetEmployeeId }, { employeeId: targetEmployeeId }] },
    });
    if (!newOwner) return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });

    const previousOwnerId = client.assignedEmployeeId;
    const previousOwnerName = client.assignedEmployee?.fullName || 'Unassigned';

    // 1. Update Client owner
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        assignedEmployeeId: newOwner.id,
      },
      include: {
        assignedEmployee: { select: { employeeId: true, fullName: true, designation: true } },
      },
    });

    // 2. Insert Assignment Chain Record
    await prisma.clientAssignment.create({
      data: {
        clientId: client.id,
        fromEmployeeId: previousOwnerId,
        toEmployeeId: newOwner.id,
        assignedById: currentEmp.id,
        assignmentReason: assignmentReason || 'Reassigned by Manager / Admin',
      },
    });

    // 3. Insert Client Activity Timeline entry
    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType: 'CLIENT_REASSIGNED',
        title: `Client Reassigned to ${newOwner.fullName} (${newOwner.employeeId})`,
        description: `Ownership transferred from ${previousOwnerName} to ${newOwner.fullName}. Reason: ${assignmentReason || 'Territory optimization / Load balancing'}`,
        previousValue: previousOwnerName,
        newValue: newOwner.fullName,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'REASSIGN_CLIENT',
      entityType: 'CLIENT',
      entityId: client.clientId,
      previousData: { previousOwner: previousOwnerName },
      newData: { newOwner: newOwner.employeeId, assignedBy: user.employeeId, reason: assignmentReason },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
