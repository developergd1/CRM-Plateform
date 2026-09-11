import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { buildTenantWhereClause, verifyClientOrganizationAccess } from '@/lib/tenant';
import { generateCrmTaskNumber } from '@/lib/id-generator';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';
import { notifyTaskAssigned } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const assignedToId = searchParams.get('assignedToId')?.trim() || '';
    const clientIdParam = searchParams.get('clientId')?.trim() || '';
    const priority = searchParams.get('priority')?.trim() || '';
    const view = searchParams.get('view')?.trim() || 'all'; // all, my-tasks, assigned-by-me, client-tasks, admin-tasks

    const tenantWhere = await buildTenantWhereClause(user, clientIdParam);

    let where: any = {
      ...tenantWhere,
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(priority && priority !== 'ALL' ? { priority } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    };

    // View filter logic
    if (view === 'my-tasks') {
      const empId = user.employeeProfile?.id;
      if (empId) {
        where.assignedToId = empId;
      }
    } else if (view === 'client-tasks') {
      // Tasks delegated by Corporate Clients
      where.clientId = { not: null };
    } else if (view === 'admin-tasks') {
      // Internal platform / Admin tasks
      where.clientId = null;
    } else if (view === 'assigned-by-me') {
      if (user.role === 'CLIENT') {
        const client = await prisma.client.findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.clientId ? [{ clientId: user.clientId }] : []),
            ],
          },
        });
        if (client) {
          where.clientId = client.id;
        }
      } else if (user.employeeProfile?.id) {
        where.createdById = user.employeeProfile.id;
      }
    }

    if (search) {
      where.OR = [
        { taskNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, fullName: true, employeeId: true, phone: true, designation: true } },
        createdBy: { select: { id: true, fullName: true, employeeId: true } },
        client: { select: { id: true, companyName: true, clientId: true, contactPerson: true } },
        lead: { select: { id: true, companyName: true, contactPerson: true } },
        deal: { select: { id: true, title: true, dealNumber: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login to continue.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      priority,
      dueDate,
      reminderTime,
      expectedDeliverable,
      assignedToId,
      clientId: requestedClientId,
      leadId,
      dealId,
    } = body;

    if (!title || !title.trim() || !assignedToId) {
      return NextResponse.json({ error: 'Task Title and Assignee are required.' }, { status: 400 });
    }

    // Verify Assignee Employee exists
    const assignedEmployee = await prisma.employee.findUnique({
      where: { id: assignedToId },
      include: { client: true },
    });

    if (!assignedEmployee) {
      return NextResponse.json({ error: 'Selected employee not found.' }, { status: 404 });
    }

    let resolvedClientId: string | null = null;
    let creatorEmployeeId: string | null = null;

    if (user.role === 'CLIENT') {
      // Client creating task for onboarded employee
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
          ],
        },
      });

      if (!clientRecord) {
        return NextResponse.json({ error: 'Client account record not found.' }, { status: 403 });
      }

      // Verify that the assigned employee belongs to this Client
      if (assignedEmployee.clientId !== clientRecord.id) {
        return NextResponse.json({
          error: `Access Denied: You can only assign tasks to employees onboarded under ${clientRecord.companyName}.`,
        }, { status: 403 });
      }

      resolvedClientId = clientRecord.id;
    } else if (isAdminOrHR(user.role) || isManagerOrAbove(user.role) || user.role === 'EMPLOYEE') {
      // Internal Admin/HR/Manager/Employee
      if (user.employeeProfile?.id) {
        creatorEmployeeId = user.employeeProfile.id;
      } else {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.employeeId ? [{ employeeId: user.employeeId }] : []),
            ],
          },
        });
        creatorEmployeeId = emp?.id || null;
      }

      if (requestedClientId) {
        const isAllowed = await verifyClientOrganizationAccess(user, requestedClientId);
        if (!isAllowed.hasAccess) {
          return NextResponse.json({ error: 'Forbidden: Cannot assign tasks to this client account.' }, { status: 403 });
        }
        resolvedClientId = isAllowed.resolvedClientId;
      } else if (assignedEmployee.clientId) {
        resolvedClientId = assignedEmployee.clientId;
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized: Your role does not have task assignment permissions.' }, { status: 403 });
    }

    const taskNumber = await generateCrmTaskNumber();

    const task = await prisma.task.create({
      data: {
        taskNumber,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderTime: reminderTime ? new Date(reminderTime) : null,
        expectedDeliverable: expectedDeliverable?.trim() || null,
        assignedToId: assignedEmployee.id,
        clientId: resolvedClientId,
        leadId: leadId || null,
        dealId: dealId || null,
        createdById: creatorEmployeeId,
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, employeeId: true, phone: true } },
        createdBy: { select: { id: true, fullName: true, employeeId: true } },
        client: { select: { id: true, companyName: true, clientId: true } },
      },
    });

    // Create Audit History
    const actorEmployeeId = creatorEmployeeId || assignedEmployee.id;
    const actorRemarks = user.role === 'CLIENT'
      ? `Task created by Client ${user.companyName || user.fullName} and assigned to ${assignedEmployee.fullName}`
      : `Task created by ${user.fullName} and assigned to ${assignedEmployee.fullName}`;

    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        actorId: actorEmployeeId,
        action: 'CREATED',
        remarks: actorRemarks,
      },
    });

    // Send Notification to Employee (and Client if assigned by Admin)
    await notifyTaskAssigned({
      taskId: task.id,
      taskNumber: task.taskNumber,
      title: task.title,
      assignedToId: assignedEmployee.id,
      assignerName: user.companyName || user.fullName || 'Admin',
      clientId: user.role !== 'CLIENT' ? resolvedClientId : null,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || user.clientId || 'CLIENT',
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: task.id,
      newData: JSON.stringify(task),
      status: 'SUCCESS',
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
