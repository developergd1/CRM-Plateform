import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';
import { verifyClientOrganizationAccess } from '@/lib/tenant';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'CLIENT') {
      const { hasAccess } = await verifyClientOrganizationAccess(user, params.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own organization.' }, { status: 403 });
      }
    }

    const client = await prisma.client.findFirst({
      where: getClientLookup(params.id),
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
        accountOwner: {
          select: { id: true, employeeId: true, fullName: true, designation: true },
        },
        departments: {
          take: 20,
          orderBy: { name: 'asc' },
        },
        documents: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            employees: true,
            deals: true,
            opportunities: true,
            contacts: true,
            leads: true,
            departments: true,
            documents: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Role-based boundary enforcement:
    if (user.role === 'CLIENT') {
      const isOwner =
        user.clientId === client.clientId ||
        user.id === client.userId ||
        user.parentClientId === client.id;
      if (!isOwner) {
        return NextResponse.json({ error: 'Permission denied. You can only view your own client organization.' }, { status: 403 });
      }
    } else if (user.role === 'EMPLOYEE') {
      const isAssigned =
        client.assignedEmployeeId === user.employeeProfileId ||
        client.createdById === user.employeeProfileId ||
        client.employees.some((e) => e.employeeId === user.employeeId || e.id === user.employeeProfileId);
      if (!isAssigned) {
        return NextResponse.json({ error: 'Permission denied. You are not assigned to this client organization.' }, { status: 403 });
      }
    }

    let gstNumber = client.gst || '';
    let panNumber = '';
    let aadharNumber = '';
    let companyType = client.companyType || 'Private Limited';
    let remarks = client.remarks || '';
    let assignedModules = Array.isArray(client.assignedModules) && client.assignedModules.length > 0 ? client.assignedModules : ['EMS'];
    try {
      if (client.tags && client.tags.startsWith('{')) {
        const parsed = JSON.parse(client.tags);
        if (!gstNumber) gstNumber = parsed.gstNumber || '';
        panNumber = parsed.panNumber || '';
        aadharNumber = parsed.aadharNumber || '';
        if (parsed.companyType) companyType = parsed.companyType;
        if (parsed.remarks) remarks = parsed.remarks;
        if ((!client.assignedModules || client.assignedModules.length === 0) && Array.isArray(parsed.assignedModules)) {
          assignedModules = parsed.assignedModules;
        }
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        gstNumber,
        panNumber,
        aadharNumber,
        companyType,
        remarks,
        assignedModules,
      },
    });
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
      where: getClientLookup(params.id),
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
      gst,
      gstNumber,
      panNumber,
      aadharNumber,
      address,
      temporaryAddress,
      permanentAddress,
      industry,
      companyType,
      remarks,
      assignedModules,
      subscriptionPlan,
      subscriptionStatus,
      legalName,
      alternatePhone,
      website,
      city,
      state,
      country,
      onboardingDate,
      salesOwnerId,
      accountOwnerId,
      canBlockEmployees,
      canDeleteEmployees,
      newPassword,
      status,
    } = data;

    let computedAddress = address;
    if (computedAddress === undefined && (temporaryAddress !== undefined || permanentAddress !== undefined)) {
      computedAddress = temporaryAddress && permanentAddress
        ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
        : (temporaryAddress || permanentAddress || null);
    }

    const resolvedGst = gst !== undefined ? (gst ? gst.trim().toUpperCase() : null) : (gstNumber !== undefined ? (gstNumber ? gstNumber.trim().toUpperCase() : null) : undefined);

    let updatedTags: string | undefined = undefined;
    if (gstNumber !== undefined || panNumber !== undefined || aadharNumber !== undefined) {
      let existingTagsObj: any = {};
      try {
        if (existing.tags && existing.tags.startsWith('{')) {
          existingTagsObj = JSON.parse(existing.tags);
        }
      } catch (e) {}

      if (gstNumber !== undefined) existingTagsObj.gstNumber = gstNumber ? gstNumber.trim().toUpperCase() : '';
      if (panNumber !== undefined) existingTagsObj.panNumber = panNumber ? panNumber.trim().toUpperCase() : '';
      if (aadharNumber !== undefined) existingTagsObj.aadharNumber = aadharNumber ? aadharNumber.trim() : '';
      updatedTags = JSON.stringify(existingTagsObj);
    }

    // Optional password reset for client
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: {
            passwordHash: hashedPassword,
            failedAttempts: 0,
            lockoutUntil: null,
            isSuspended: false,
          },
        });
      } else {
        // If client didn't have a linked user account yet, create or link one
        let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
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
        const clientEmail = (email || existing.email || `client.${existing.clientId.toLowerCase()}@growthindia.in`).toLowerCase().trim();
        let userRecord = await prisma.user.findUnique({ where: { email: clientEmail } });
        if (userRecord) {
          userRecord = await prisma.user.update({
            where: { id: userRecord.id },
            data: {
              passwordHash: hashedPassword,
              failedAttempts: 0,
              lockoutUntil: null,
              isSuspended: false,
            },
          });
        } else {
          userRecord = await prisma.user.create({
            data: {
              email: clientEmail,
              passwordHash: hashedPassword,
              roleId: clientRole.id,
              isActive: true,
              isSuspended: false,
            },
          });
        }
        await prisma.client.update({
          where: { id: existing.id },
          data: { userId: userRecord.id },
        });
      }
    }

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        ...(companyName ? { companyName: companyName.trim(), company: companyName.trim() } : {}),
        ...(legalName !== undefined ? { legalName: legalName?.trim() || null } : {}),
        ...(contactPerson ? { contactPerson: contactPerson.trim(), name: contactPerson.trim() } : {}),
        ...(mobile ? { mobile: mobile.trim(), phone: mobile.trim() } : {}),
        ...(alternatePhone !== undefined ? { alternatePhone: alternatePhone?.trim() || null } : {}),
        ...(email !== undefined ? { email: email ? email.toLowerCase().trim() : null } : {}),
        ...(website !== undefined ? { website: website?.trim() || null } : {}),
        ...(city !== undefined ? { city: city?.trim() || null } : {}),
        ...(state !== undefined ? { state: state?.trim() || null } : {}),
        ...(country !== undefined ? { country: country?.trim() || 'India' } : {}),
        ...(computedAddress !== undefined ? { address: computedAddress ? computedAddress.trim() : null } : {}),
        ...(permanentAddress !== undefined ? { location: permanentAddress ? permanentAddress.trim() : null } : {}),
        ...(industry !== undefined ? { industry: industry ? industry.trim() : null } : {}),
        ...(companyType !== undefined ? { companyType: companyType ? companyType.trim() : 'Private Limited' } : {}),
        ...(resolvedGst !== undefined ? { gst: resolvedGst } : {}),
        ...(remarks !== undefined ? { remarks: remarks ? remarks.trim() : null } : {}),
        ...(assignedModules !== undefined && Array.isArray(assignedModules)
          ? { assignedModules: assignedModules.filter((m: string) => ['EMS', 'CRM', 'HRM'].includes(m.toUpperCase())) }
          : {}),
        ...(subscriptionPlan !== undefined ? { subscriptionPlan } : {}),
        ...(subscriptionStatus !== undefined ? { subscriptionStatus } : {}),
        ...(status !== undefined ? { status: status ? status.trim().toUpperCase() : existing.status } : {}),
        ...(salesOwnerId !== undefined ? { salesOwnerId: salesOwnerId || null } : {}),
        ...(accountOwnerId !== undefined ? { accountOwnerId: accountOwnerId || null, assignedEmployeeId: accountOwnerId || null } : {}),
        ...(onboardingDate ? { onboardingDate: new Date(onboardingDate) } : {}),
        ...(canBlockEmployees !== undefined ? { canBlockEmployees: !!canBlockEmployees } : {}),
        ...(canDeleteEmployees !== undefined ? { canDeleteEmployees: !!canDeleteEmployees } : {}),
        updatedById: user.employeeProfileId || user.id,
        ...(updatedTags !== undefined ? { tags: updatedTags } : {}),
      },
      include: {
        user: true,
      },
    });

    // Inactive status synchronization: If client is deactivated, disable portal user login
    if (status !== undefined && existing.userId) {
      const isClientActive = status.toUpperCase() === 'ACTIVE';
      await prisma.user.update({
        where: { id: existing.userId },
        data: {
          isActive: isClientActive,
          isSuspended: !isClientActive,
        },
      });
    }

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
      where: getClientLookup(params.id),
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
