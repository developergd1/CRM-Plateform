import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const stage = searchParams.get('stage') || '';
    const priority = searchParams.get('priority') || '';
    const assignedEmployeeId = searchParams.get('assignedEmployeeId') || '';
    const source = searchParams.get('source') || '';

    const where: any = {};

    if (stage) where.stage = stage;
    if (priority) where.priority = priority;
    if (source) where.source = source;

    // RBAC filtering
    if (user.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
      if (emp) {
        where.OR = [
          { assignedEmployeeId: emp.id },
          { createdById: emp.id },
        ];
      }
    } else if (user.role === 'MANAGER_TL') {
      const managerEmp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
      if (managerEmp?.teamId) {
        // Manager sees team's clients
        const teamMembers = await prisma.employee.findMany({
          where: { teamId: managerEmp.teamId },
          select: { id: true },
        });
        const teamIds = teamMembers.map((m) => m.id);
        where.OR = [
          { assignedEmployeeId: { in: teamIds } },
          { createdById: { in: teamIds } },
          { assignedEmployeeId: managerEmp.id },
        ];
      }
    } else if (assignedEmployeeId) {
      const targetEmp = await prisma.employee.findFirst({
        where: { OR: [{ id: assignedEmployeeId }, { employeeId: assignedEmployeeId }] },
      });
      if (targetEmp) where.assignedEmployeeId = targetEmp.id;
    }

    // Text search (Client ID, Name, Phone, Email, Company)
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { clientId: { contains: search } },
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
            { location: { contains: search } },
          ],
        },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        createdBy: {
          select: { employeeId: true, fullName: true },
        },
        assignedEmployee: {
          select: { employeeId: true, fullName: true, designation: true },
        },
        _count: {
          select: {
            activities: true,
            notes: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedClients = clients.map((c) => ({
      ...c,
      tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : c.tags,
    }));

    return NextResponse.json({ success: true, clients: parsedClients });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentEmp = await prisma.employee.findUnique({
      where: { employeeId: user.employeeId },
    });
    if (!currentEmp) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

    const data = await req.json();
    const {
      name,
      phone,
      email,
      company,
      location,
      source = 'Direct Call',
      requirement,
      estimatedValue = 0,
      priority = 'MEDIUM',
      stage = 'NEW',
      assignedEmployeeId,
      tags = [],
      allowDuplicate = false,
    } = data;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Client Name and Contact Phone are required' }, { status: 400 });
    }

    // Duplicate Check
    if (!allowDuplicate) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const existing = await prisma.client.findFirst({
        where: {
          OR: [
            { phone: { contains: cleanPhone } },
            ...(email ? [{ email: { equals: email.toLowerCase().trim() } }] : []),
          ],
        },
        include: {
          assignedEmployee: { select: { employeeId: true, fullName: true } },
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: 'Possible duplicate client found',
            isDuplicate: true,
            duplicateMatch: existing,
          },
          { status: 409 }
        );
      }
    }

    // Generate formatted Client ID sequence: CL-2026-000001
    const currentYear = new Date().getFullYear();
    const totalClientsCount = await prisma.client.count();
    const sequenceNumber = (totalClientsCount + 1).toString().padStart(6, '0');
    const clientId = `CL-${currentYear}-${sequenceNumber}`;

    // Target Assigned Employee
    let targetOwnerId = currentEmp.id;
    if (assignedEmployeeId && isManagerOrAbove(user.role)) {
      const targetEmp = await prisma.employee.findFirst({
        where: { OR: [{ id: assignedEmployeeId }, { employeeId: assignedEmployeeId }] },
      });
      if (targetEmp) targetOwnerId = targetEmp.id;
    }

    // Create Client in DB
    const client = await prisma.client.create({
      data: {
        clientId,
        companyName: company ? company.trim() : name.trim(),
        contactPerson: name.trim(),
        mobile: phone.trim(),
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.toLowerCase().trim() : null,
        company: company ? company.trim() : null,
        location: location ? location.trim() : null,
        source,
        requirement: requirement ? requirement.trim() : null,
        estimatedValue: parseFloat(estimatedValue) || 0,
        priority,
        stage,
        createdById: currentEmp.id,
        assignedEmployeeId: targetOwnerId,
        tags: JSON.stringify(tags || []),
      },
      include: {
        createdBy: { select: { employeeId: true, fullName: true } },
        assignedEmployee: { select: { employeeId: true, fullName: true, designation: true } },
      },
    });

    // Create Initial Ownership Assignment
    await prisma.clientAssignment.create({
      data: {
        clientId: client.id,
        fromEmployeeId: null,
        toEmployeeId: targetOwnerId,
        assignedById: currentEmp.id,
        assignmentReason: 'Initial client creation and assignment',
      },
    });

    // Create Activity Timeline Entry
    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await prisma.clientActivity.create({
      data: {
        activityId,
        clientId: client.id,
        actorEmployeeId: currentEmp.id,
        activityType: 'CLIENT_CREATED',
        title: 'Client Record Created',
        description: `Client ${client.name} (${client.company || 'Direct'}) created and assigned to ${client.assignedEmployee?.fullName || user.fullName}.`,
        newValue: client.stage,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'CREATE_CLIENT',
      entityType: 'CLIENT',
      entityId: client.clientId,
      newData: {
        clientId: client.clientId,
        name: client.name,
        phone: client.phone,
        company: client.company,
        stage: client.stage,
        owner: client.assignedEmployee?.employeeId,
      },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        tags: typeof client.tags === 'string' ? JSON.parse(client.tags || '[]') : client.tags,
      },
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
