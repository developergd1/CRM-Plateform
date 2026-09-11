import bcrypt from 'bcryptjs';
import { prisma, getClientLookup, getEmployeeLookup, getDealLookup, resolveClientObjectId, resolveEmployeeObjectId } from '@/lib/prisma';
import { generateClientId, generateActivityNumber } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export interface CreateClientInput {
  companyName: string;
  legalName?: string | null;
  contactPerson: string;
  mobile: string;
  alternatePhone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  industry?: string | null;
  customPassword?: string | null;
  salesOwnerId?: string | null;
  accountOwnerId?: string | null;
  estimatedValue?: number;
  status?: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  aadharNumber?: string | null;
}

export interface ClientDeduplicationQuery {
  companyName?: string | null;
  email?: string | null;
  mobile?: string | null;
}

/**
 * 1. Find Existing Client (Deduplication Check)
 */
export async function findExistingClient(query: ClientDeduplicationQuery) {
  const conditions: any[] = [];
  if (query.companyName && query.companyName.trim().length > 1) {
    conditions.push({ companyName: { equals: query.companyName.trim(), mode: 'insensitive' } });
  }
  if (query.email && query.email.trim().length > 3) {
    conditions.push({ email: { equals: query.email.trim().toLowerCase(), mode: 'insensitive' } });
  }
  if (query.mobile && query.mobile.trim().length >= 7) {
    conditions.push({ mobile: { equals: query.mobile.trim() } });
  }

  if (conditions.length === 0) return null;

  return await prisma.client.findFirst({
    where: { OR: conditions },
    include: {
      user: { select: { email: true, isActive: true } },
      _count: { select: { employees: true, deals: true } },
    },
  });
}

/**
 * 2. Create Client (Unified Service for Manual Admin + CRM Deal Conversion)
 */
export async function createClient(
  data: CreateClientInput,
  actorUser?: { id?: string; employeeId?: string | null; fullName?: string }
) {
  const newClientId = await generateClientId(data.companyName);
  const numPart = newClientId.replace(/\D/g, '');
  const clientEmail = (data.email?.trim().toLowerCase()) || `client.${numPart}@growthindia.in`;
  const clientMobile = data.mobile?.trim() || '0000000000';
  const generatedPassword = data.customPassword || `Client#${Math.floor(1000 + Math.random() * 9000)}`;
  const hashedPassword = await bcrypt.hash(generatedPassword, 10);

  // Ensure CLIENT role exists
  let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
  if (!clientRole) {
    clientRole = await prisma.role.create({
      data: {
        name: 'CLIENT',
        displayName: 'Client Account',
        description: 'Client corporate workspace',
        isSystem: true,
      },
    });
  }

  // Create or retrieve client User account
  let clientUser = await prisma.user.findUnique({ where: { email: clientEmail } });
  if (!clientUser) {
    clientUser = await prisma.user.create({
      data: {
        email: clientEmail,
        passwordHash: hashedPassword,
        roleId: clientRole.id,
        isActive: true,
      },
    });
  }

  // Pack compliance tags if provided
  let tags = '[]';
  if (data.gstNumber || data.panNumber || data.aadharNumber) {
    tags = JSON.stringify({
      gstNumber: data.gstNumber?.trim().toUpperCase() || '',
      panNumber: data.panNumber?.trim().toUpperCase() || '',
      aadharNumber: data.aadharNumber?.trim() || '',
    });
  }

  const newClient = await prisma.client.create({
    data: {
      clientId: newClientId,
      companyName: data.companyName.trim(),
      legalName: data.legalName?.trim() || null,
      contactPerson: data.contactPerson.trim(),
      mobile: clientMobile,
      alternatePhone: data.alternatePhone?.trim() || null,
      email: clientEmail,
      website: data.website?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || 'India',
      industry: data.industry?.trim() || 'Services',
      status: data.status || 'ACTIVE',
      onboardingDate: new Date(),
      dateAdded: new Date(),
      userId: clientUser.id,
      canBlockEmployees: false,
      canDeleteEmployees: false,
      estimatedValue: data.estimatedValue || 0,
      salesOwnerId: data.salesOwnerId || null,
      accountOwnerId: data.accountOwnerId || null,
      assignedEmployeeId: data.accountOwnerId || data.salesOwnerId || null,
      tags,
      createdById: actorUser?.employeeId || null,
    },
    include: {
      user: { select: { id: true, email: true, isActive: true } },
      accountOwner: { select: { id: true, employeeId: true, fullName: true } },
    },
  });

  if (actorUser?.id) {
    await logAuditEvent({
      actorUserId: actorUser.id,
      actorEmployeeId: actorUser.employeeId || 'ADMIN',
      action: 'CREATE_CLIENT',
      entityType: 'CLIENT',
      entityId: newClient.clientId,
      newData: newClient,
      status: 'SUCCESS',
    });
  }

  return {
    client: newClient,
    credentials: {
      email: clientEmail,
      temporaryPassword: generatedPassword,
    },
  };
}

/**
 * 3. Convert Deal to Client (Transactional Bridge)
 */
export async function convertDealToClient(
  dealIdentifier: string,
  options: {
    existingClientId?: string;
    confirmCreateNew?: boolean;
    customCompany?: string;
    customContact?: string;
    customEmail?: string;
    customMobile?: string;
  },
  actorUser?: { id?: string; employeeId?: string | null; fullName?: string }
) {
  const deal = await prisma.deal.findFirst({
    where: getDealLookup(dealIdentifier),
    include: { client: true, lead: true, primaryContact: true, opportunity: true },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Idempotency check
  if (deal.isConvertedToClient && deal.convertedToClientId) {
    const existingConverted = await prisma.client.findUnique({
      where: { id: deal.convertedToClientId },
      include: { user: true },
    });
    if (existingConverted) {
      return {
        success: true,
        alreadyConverted: true,
        client: existingConverted,
        message: `Deal ${deal.dealNumber} is already converted to client ${existingConverted.companyName} (${existingConverted.clientId}).`,
      };
    }
  }

  // Link to existing client if requested
  if (options.existingClientId) {
    const client = await prisma.client.findFirst({
      where: getClientLookup(options.existingClientId),
    });
    if (!client) throw new Error('Specified existing client not found');

    const now = new Date();
    await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          clientId: client.id,
          isConvertedToClient: true,
          convertedToClientId: client.id,
          stage: 'WON',
          status: 'WON',
          closedAt: deal.closedAt || now,
        },
      }),
      ...(deal.leadId
        ? [
            prisma.lead.update({
              where: { id: deal.leadId },
              data: { clientId: client.id, status: 'CONVERTED', convertedAt: now },
            }),
          ]
        : []),
      ...(deal.primaryContactId
        ? [prisma.contact.update({ where: { id: deal.primaryContactId }, data: { clientId: client.id } })]
        : []),
      ...(deal.opportunityId
        ? [prisma.opportunity.update({ where: { id: deal.opportunityId }, data: { clientId: client.id, stage: 'CLOSED_WON' } })]
        : []),
    ]);

    if (actorUser?.id) {
      await logAuditEvent({
        actorUserId: actorUser.id,
        actorEmployeeId: actorUser.employeeId || 'ADMIN',
        action: 'CLIENT_CONVERSION_COMPLETED',
        entityType: 'DEAL',
        entityId: deal.dealNumber,
        reason: `Linked to existing client ${client.clientId}`,
        status: 'SUCCESS',
      });
    }

    return {
      success: true,
      isNewClient: false,
      client,
      message: `Deal ${deal.dealNumber} successfully linked to client ${client.companyName} (${client.clientId}).`,
    };
  }

  // Deduplication check
  const targetCompany = options.customCompany || deal.lead?.companyName || deal.title.replace(/^Deal:\s*/i, '') || 'Corporate Client';
  const targetEmail = options.customEmail || deal.primaryContact?.email || deal.lead?.email || '';
  const targetMobile = options.customMobile || deal.primaryContact?.phone || deal.lead?.phone || '';

  if (!options.confirmCreateNew) {
    const match = await findExistingClient({
      companyName: targetCompany,
      email: targetEmail,
      mobile: targetMobile,
    });
    if (match) {
      return {
        success: false,
        duplicateFound: true,
        candidate: match,
        message: `An existing client matching "${match.companyName}" (${match.clientId}) was found.`,
      };
    }
  }

  // Create new Client
  const { client: newClient, credentials } = await createClient(
    {
      companyName: targetCompany,
      contactPerson: options.customContact || deal.primaryContact?.fullName || deal.lead?.contactPerson || 'Authorized Representative',
      mobile: targetMobile,
      email: targetEmail,
      address: deal.lead?.location || deal.lead?.city || null,
      city: deal.lead?.city || null,
      industry: deal.lead?.industry || 'Services',
      salesOwnerId: deal.assignedToId || null,
      accountOwnerId: deal.assignedToId || null,
      estimatedValue: deal.amount || 0,
      status: 'ACTIVE',
    },
    actorUser
  );

  const now = new Date();
  const activityNumber = await generateActivityNumber();

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: deal.id },
      data: {
        clientId: newClient.id,
        isConvertedToClient: true,
        convertedToClientId: newClient.id,
        stage: 'WON',
        status: 'WON',
        closedAt: deal.closedAt || now,
      },
    }),
    ...(deal.leadId
      ? [
          prisma.lead.update({
            where: { id: deal.leadId },
            data: { clientId: newClient.id, status: 'CONVERTED', convertedAt: now },
          }),
        ]
      : []),
    ...(deal.primaryContactId
      ? [prisma.contact.update({ where: { id: deal.primaryContactId }, data: { clientId: newClient.id } })]
      : []),
    ...(deal.opportunityId
      ? [prisma.opportunity.update({ where: { id: deal.opportunityId }, data: { clientId: newClient.id, stage: 'CLOSED_WON' } })]
      : []),
    prisma.activity.create({
      data: {
        activityNumber,
        type: 'OTHER',
        status: 'COMPLETED',
        subject: `Deal Won & Converted: Client ${newClient.clientId} Provisioned`,
        description: `Client ${newClient.companyName} created from Deal ${deal.dealNumber}. Ready for workforce operations.`,
        completedAt: now,
        dealId: deal.id,
        clientId: newClient.id,
        performedById: deal.assignedToId || null,
      },
    }),
  ]);

  if (actorUser?.id) {
    await logAuditEvent({
      actorUserId: actorUser.id,
      actorEmployeeId: actorUser.employeeId || 'ADMIN',
      action: 'CLIENT_CONVERSION_COMPLETED',
      entityType: 'CLIENT',
      entityId: newClient.clientId,
      newData: { dealNumber: deal.dealNumber, clientId: newClient.clientId },
      status: 'SUCCESS',
    });
  }

  return {
    success: true,
    isNewClient: true,
    client: newClient,
    credentials,
    message: `Client ${newClient.companyName} (${newClient.clientId}) successfully created and connected to Workforce Management!`,
  };
}

/**
 * 4. Assign Employee to Client (Workforce Relationship)
 */
export async function assignEmployeeToClient(
  employeeIdentifier: string,
  clientIdentifier: string,
  actorUser?: { id?: string; employeeId?: string | null; fullName?: string }
) {
  const client = await prisma.client.findFirst({ where: getClientLookup(clientIdentifier) });
  if (!client) throw new Error('Client organization not found');

  const emp = await prisma.employee.findFirst({
    where: getEmployeeLookup(employeeIdentifier),
  });
  if (!emp) throw new Error('Employee not found');

  const prevClientId = emp.clientId;

  const [updatedEmployee] = await prisma.$transaction([
    prisma.employee.update({
      where: { id: emp.id },
      data: { clientId: client.id },
    }),
    ...(actorUser?.employeeId
      ? [
          prisma.clientAssignment.create({
            data: {
              clientId: client.id,
              fromEmployeeId: prevClientId || emp.id,
              toEmployeeId: emp.id,
              assignedById: actorUser.employeeId,
              assignmentReason: `Assigned to client ${client.companyName} (${client.clientId})`,
            },
          }),
        ]
      : []),
  ]);

  if (actorUser?.id) {
    await logAuditEvent({
      actorUserId: actorUser.id,
      actorEmployeeId: actorUser.employeeId || 'ADMIN',
      action: 'ASSIGN_EMPLOYEE_TO_CLIENT',
      entityType: 'CLIENT',
      entityId: client.clientId,
      newData: { employeeId: emp.employeeId, clientId: client.clientId },
      status: 'SUCCESS',
    });
  }

  return { success: true, employee: updatedEmployee, client };
}

/**
 * 5. Get Client 360 Overview
 */
export async function getClient360Overview(clientIdentifier: string) {
  const client = await prisma.client.findFirst({
    where: getClientLookup(clientIdentifier),
    include: {
      user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
      accountOwner: { select: { id: true, employeeId: true, fullName: true, designation: true, personalEmail: true, phone: true } },
      createdBy: { select: { id: true, employeeId: true, fullName: true } },
      _count: {
        select: {
          employees: true,
          contacts: true,
          leads: true,
          opportunities: true,
          deals: true,
          crmActivities: true,
          crmTasks: true,
          departments: true,
          documents: true,
        },
      },
    },
  });

  if (!client) throw new Error('Client organization not found');

  // Query CRM Pipeline totals
  const deals = await prisma.deal.findMany({
    where: { clientId: client.id },
    select: { amount: true, weightedValue: true, stage: true, status: true },
  });

  let totalPipelineValue = 0;
  let weightedPipelineValue = 0;
  let wonRevenue = 0;
  let openDealsCount = 0;
  let wonDealsCount = 0;

  deals.forEach((d) => {
    const amt = d.amount || 0;
    const weighted = d.weightedValue || 0;
    if (d.stage === 'WON' || d.status === 'WON') {
      wonRevenue += amt;
      wonDealsCount += 1;
    } else if (d.stage !== 'LOST') {
      totalPipelineValue += amt;
      weightedPipelineValue += weighted;
      openDealsCount += 1;
    }
  });

  // Query Live Workforce counts for today
  const todayStr = new Date().toISOString().split('T')[0];

  const clientEmployees = await prisma.employee.findMany({
    where: { clientId: client.id, status: 'ACTIVE', isBlocked: false },
    select: { id: true },
  });
  const employeeIds = clientEmployees.map((e) => e.id);

  let workingNow = 0;
  let onBreak = 0;
  let presentToday = 0;

  if (employeeIds.length > 0) {
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: todayStr,
      },
      select: { checkInTime: true, checkOutTime: true, breaks: { select: { breakEndTime: true } } },
    });

    presentToday = attendances.length;
    attendances.forEach((att) => {
      if (att.checkInTime && !att.checkOutTime) {
        const activeBreak = att.breaks.some((b: { breakEndTime: Date | null }) => !b.breakEndTime);
        if (activeBreak) {
          onBreak += 1;
        } else {
          workingNow += 1;
        }
      }
    });
  }

  const totalEmployees = client._count.employees;
  const absentToday = Math.max(0, totalEmployees - presentToday);

  return {
    client,
    metrics: {
      totalEmployees,
      workingNow,
      onBreak,
      presentToday,
      absentToday,
      openDealsCount,
      totalPipelineValue,
      weightedPipelineValue,
      wonDealsCount,
      wonRevenue,
    },
  };
}

/**
 * 6. Get Client CRM Data (Contacts, Leads, Opps, Deals, Activities, Tasks)
 */
export async function getClientCRMData(clientIdentifier: string) {
  const client = await prisma.client.findFirst({
    where: getClientLookup(clientIdentifier),
    select: { id: true, clientId: true, companyName: true },
  });
  if (!client) throw new Error('Client organization not found');

  const [contacts, leads, opportunities, deals, activities, tasks, followUps, notes] = await Promise.all([
    prisma.contact.findMany({
      where: { clientId: client.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.lead.findMany({
      where: { clientId: client.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { fullName: true } } },
      take: 50,
    }),
    prisma.opportunity.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { fullName: true } } },
      take: 50,
    }),
    prisma.deal.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { fullName: true } },
        stageHistory: { orderBy: { changedAt: 'desc' }, take: 3 },
      },
      take: 50,
    }),
    prisma.activity.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: { performedBy: { select: { fullName: true } } },
      take: 50,
    }),
    prisma.task.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { fullName: true } } },
      take: 50,
    }),
    prisma.followUp.findMany({
      where: { clientId: client.id },
      orderBy: { scheduledAt: 'desc' },
      include: { assignedTo: { select: { fullName: true } } },
      take: 50,
    }),
    prisma.note.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { fullName: true } } },
      take: 50,
    }),
  ]);

  return {
    client,
    contacts,
    leads,
    opportunities,
    deals,
    activities,
    tasks,
    followUps,
    notes,
  };
}

/**
 * 7. Get Client Workforce Data (Employees, Today's Live Attendance, Timesheets)
 */
export async function getClientWorkforceData(clientIdentifier: string) {
  const client = await prisma.client.findFirst({
    where: getClientLookup(clientIdentifier),
    select: { id: true, clientId: true, companyName: true },
  });
  if (!client) throw new Error('Client organization not found');

  const todayStr = new Date().toISOString().split('T')[0];

  const employees = await prisma.employee.findMany({
    where: { clientId: client.id },
    orderBy: { employeeId: 'asc' },
    select: {
      id: true,
      employeeId: true,
      fullName: true,
      designation: true,
      departmentName: true,
      phone: true,
      status: true,
      isBlocked: true,
      joiningDate: true,
      attendanceRecords: {
        where: { date: todayStr },
        select: {
          id: true,
          checkInTime: true,
          checkOutTime: true,
          totalWorkMinutes: true,
          breaks: { select: { breakStartTime: true, breakEndTime: true, durationMinutes: true } },
        },
      },
    },
  });

  let workingNow = 0;
  let onBreak = 0;
  let presentCount = 0;

  const roster = employees.map((emp) => {
    const todayAtt = emp.attendanceRecords[0];
    let liveStatus = 'OFFLINE';
    if (emp.isBlocked || emp.status === 'BLOCKED') {
      liveStatus = 'BLOCKED';
    } else if (todayAtt) {
      presentCount += 1;
      if (todayAtt.checkInTime && !todayAtt.checkOutTime) {
        const activeBreak = todayAtt.breaks.some((b: { breakEndTime: Date | null }) => !b.breakEndTime);
        if (activeBreak) {
          liveStatus = 'ON_BREAK';
          onBreak += 1;
        } else {
          liveStatus = 'WORKING_NOW';
          workingNow += 1;
        }
      } else if (todayAtt.checkOutTime) {
        liveStatus = 'CHECKED_OUT';
      }
    } else {
      liveStatus = 'ABSENT';
    }

    return {
      id: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      designation: emp.designation,
      departmentName: emp.departmentName || 'General',
      phone: emp.phone,
      status: emp.status,
      isBlocked: emp.isBlocked,
      liveStatus,
      checkInTime: todayAtt?.checkInTime || null,
      checkOutTime: todayAtt?.checkOutTime || null,
      totalWorkingHours: todayAtt ? Math.round((todayAtt.totalWorkMinutes / 60) * 10) / 10 : 0,
    };
  });

  return {
    client,
    summary: {
      totalEmployees: employees.length,
      workingNow,
      onBreak,
      presentToday: presentCount,
      absentToday: Math.max(0, employees.length - presentCount),
    },
    employees: roster,
  };
}

/**
 * 8. Block / Unblock Client
 */
export async function setClientBlockStatus(
  clientIdentifier: string,
  blocked: boolean,
  reason?: string,
  actorUser?: { id?: string; employeeId?: string | null; fullName?: string }
) {
  const client = await prisma.client.findFirst({ where: getClientLookup(clientIdentifier) });
  if (!client) throw new Error('Client organization not found');

  const newStatus = blocked ? 'BLOCKED' : 'ACTIVE';

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: { status: newStatus },
  });

  if (actorUser?.id) {
    await logAuditEvent({
      actorUserId: actorUser.id,
      actorEmployeeId: actorUser.employeeId || 'ADMIN',
      action: blocked ? 'BLOCK_CLIENT' : 'UNBLOCK_CLIENT',
      entityType: 'CLIENT',
      entityId: client.clientId,
      reason: reason || (blocked ? 'Administrative suspension' : 'Administrative restoration'),
      previousData: { status: client.status },
      newData: { status: newStatus },
      status: 'SUCCESS',
    });
  }

  return { success: true, client: updated };
}
