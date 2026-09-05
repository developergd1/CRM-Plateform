import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await prisma.client.findFirst({
      where: {
        OR: [{ id: params.id }, { clientId: params.id }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            isSuspended: true,
            lastLoginAt: true,
          },
        },
        employees: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            phone: true,
            departmentName: true,
            designation: true,
            joiningDate: true,
            status: true,
            isBlocked: true,
            createdAt: true,
          },
          orderBy: { employeeId: 'asc' },
        },
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error('Error fetching client details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Admins can edit clients.' }, { status: 403 });
    }

    const existing = await prisma.client.findFirst({
      where: {
        OR: [{ id: params.id }, { clientId: params.id }],
      },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const data = await req.json();
    const {
      companyName,
      contactPerson,
      mobile,
      email,
      address,
      industry,
      status,
      canBlockEmployees,
      canDeleteEmployees,
      newPassword,
    } = data;

    // Optional password reset for client
    if (newPassword && existing.userId) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: existing.userId },
        data: { passwordHash: hashedPassword },
      });
    }

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        ...(companyName ? { companyName: companyName.trim(), company: companyName.trim() } : {}),
        ...(contactPerson ? { contactPerson: contactPerson.trim(), name: contactPerson.trim() } : {}),
        ...(mobile ? { mobile: mobile.trim(), phone: mobile.trim() } : {}),
        ...(email !== undefined ? { email: email ? email.toLowerCase().trim() : null } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null, location: address ? address.trim() : null } : {}),
        ...(industry !== undefined ? { industry: industry ? industry.trim() : null } : {}),
        ...(status ? { status } : {}),
        ...(canBlockEmployees !== undefined ? { canBlockEmployees: !!canBlockEmployees } : {}),
        ...(canDeleteEmployees !== undefined ? { canDeleteEmployees: !!canDeleteEmployees } : {}),
      },
      include: {
        user: true,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'UPDATE_CLIENT',
      entityType: 'CLIENT',
      entityId: updated.clientId,
      previousData: existing,
      newData: updated,
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      client: updated,
      message: `Client ${updated.clientId} updated successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only Admins can delete clients.' }, { status: 403 });
    }

    const existing = await prisma.client.findFirst({
      where: {
        OR: [{ id: params.id }, { clientId: params.id }],
      },
      include: { user: true, employees: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientDbId = existing.id;
    const clientUserId = existing.userId;

    await prisma.$transaction(async (tx) => {
      // 1. Unlink enrolled employees
      await tx.employee.updateMany({
        where: { clientId: clientDbId },
        data: { clientId: null },
      });

      // 2. Delete related CRM histories and notes
      await tx.clientAssignment.deleteMany({ where: { clientId: clientDbId } });
      await tx.clientPipelineHistory.deleteMany({ where: { clientId: clientDbId } });
      await tx.clientActivity.deleteMany({ where: { clientId: clientDbId } });
      await tx.clientNote.deleteMany({ where: { clientId: clientDbId } });
      await tx.clientTask.deleteMany({ where: { clientId: clientDbId } });

      // 3. Delete active user sessions for client user
      if (clientUserId) {
        await tx.activeUserSession.deleteMany({ where: { userId: clientUserId } });
      }

      // 4. Delete client record
      await tx.client.delete({
        where: { id: clientDbId },
      });

      // 5. Delete client user if exists
      if (clientUserId) {
        await tx.user.delete({ where: { id: clientUserId } }).catch(() => {});
      }
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'DELETE_CLIENT',
      entityType: 'CLIENT',
      entityId: existing.clientId,
      reason: 'Admin deleted client record',
      previousData: { clientId: existing.clientId, companyName: existing.companyName },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Client ${existing.clientId} (${existing.companyName}) was permanently removed.`,
    });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete client.' }, { status: 500 });
  }
}
