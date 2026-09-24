import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, isValidObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { generateEmployeeId } from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';
import { canAddEmployee } from '@/lib/services/subscription-service';
import { hrmStore, HrmEmployee } from '@/lib/hrmStore';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const { resolveClientObjectId } = await import('@/lib/prisma');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const tenantParam = searchParams.get('tenantId');

    let clientDocId = tenantContext?.clientDocId || null;
    if (!clientDocId && tenantParam && tenantParam !== 'ten-growth-india' && !tenantParam.startsWith('ten-')) {
      clientDocId = await resolveClientObjectId(tenantParam);
    }

    const whereClause: any = {
      employeeId: { not: 'GI-EMP-000001' },
    };

    if (clientDocId) {
      whereClause.clientId = clientDocId;
    } else if (!tenantContext?.isAdmin) {
      whereClause.clientId = null;
    }

    // Query single source of truth: Prisma Employee master
    const dbEmps = await prisma.employee.findMany({
      where: whereClause,
      include: {
        department: true,
        user: { select: { email: true, role: true } },
        client: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (dbEmps.length > 0) {
      const mappedEmployees: HrmEmployee[] = dbEmps.map((emp) => ({
        id: emp.id,
        tenantId: clientDocId || 'ten-growth-india',
        employeeCode: emp.employeeId,
        name: emp.fullName,
        email: emp.personalEmail || emp.user?.email || `${emp.employeeId.toLowerCase()}@company.com`,
        phone: emp.phone || '+91 98000 00000',
        department: emp.departmentName || emp.department?.name || 'General Operations',
        designation: emp.designation || 'Staff Associate',
        location: emp.location || emp.jobLocation || 'Headquarters',
        joiningDate: emp.joiningDate ? emp.joiningDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        employmentType: (emp.employmentType as any) || 'FULL_TIME',
        status: (emp.status as any) || 'ACTIVE',
        reportingManager: 'Department Head',
        shift: `${emp.shiftStartTime || '09:30'} - ${emp.shiftEndTime || '18:30'}`,
        skills: ['Core Competency', emp.designation || 'Specialist'],
        assets: [],
        documents: [],
        history: [{ role: emp.designation || 'Staff Associate', from: emp.joiningDate ? emp.joiningDate.toISOString().slice(0, 7) : '2026-01', to: 'Present' }],
      }));

      return NextResponse.json({
        success: true,
        employees: mappedEmployees,
        total: mappedEmployees.length,
      });
    }

    // Never leak mock employees to client tenant
    if (clientDocId) {
      return NextResponse.json({
        success: true,
        employees: [],
        total: 0,
      });
    }

    // Fallback to in-memory store for newly seeded tenant data
    const employees = hrmStore.employees.filter((e) => e.tenantId === 'ten-growth-india');

    return NextResponse.json({
      success: true,
      employees,
      total: employees.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const { resolveClientObjectId } = await import('@/lib/prisma');
    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const body = await req.json();

    if (!body.name || !body.email || !body.department) {
      return NextResponse.json({ error: 'Name, Email and Department are required' }, { status: 400 });
    }

    // Generate standardized sequential employee ID
    const employeeId = await generateEmployeeId();

    let clientId: string | null = tenantContext?.clientDocId || null;
    if (!clientId && body.tenantId && body.tenantId !== 'ten-growth-india' && !body.tenantId.startsWith('ten-')) {
      clientId = await resolveClientObjectId(body.tenantId);
    }
    if (!clientId && body.clientId) {
      clientId = await resolveClientObjectId(body.clientId);
    }

    // Enforce subscription plan limits for client organizations (Section 23 & 24)
    if (clientId) {
      const quotaCheck = await canAddEmployee(clientId);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          {
            error: quotaCheck.reason,
            quota: {
              current: quotaCheck.currentCount,
              max: quotaCheck.maxAllowed,
              plan: quotaCheck.planName,
            },
          },
          { status: 409 }
        );
      }
    }

    // Check email uniqueness
    const cleanEmail = body.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: `A user account with email "${cleanEmail}" already exists.` },
        { status: 409 }
      );
    }

    // Check phone uniqueness if phone is provided
    if (body.phone) {
      const cleanPhone = body.phone.trim();
      const existingPhone = await prisma.employee.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: `An employee with phone "${cleanPhone}" already exists (${existingPhone.employeeId}).` },
          { status: 409 }
        );
      }
    }

    // Fetch default EMPLOYEE role
    let empRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });
    if (!empRole) {
      empRole = await prisma.role.findFirst();
    }

    // Create User account with temporary password
    const tempPassword = 'User@123';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        roleId: empRole!.id,
        isActive: true,
        parentClientId: clientId || null,
      },
    });

    // Create single source of truth Employee record in Prisma
    const newEmp = await prisma.employee.create({
      data: {
        employeeId,
        userId: newUser.id,
        clientId,
        fullName: body.name.trim(),
        phone: body.phone || `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        personalEmail: body.email.toLowerCase().trim(),
        departmentName: body.department,
        designation: body.designation || 'Staff Associate',
        jobLocation: body.location || 'Headquarters',
        location: body.location || 'Headquarters',
        employmentType: body.employmentType || 'FULL_TIME',
        status: 'ACTIVE',
        createdBy: user ? `${user.fullName} (${user.employeeId || 'ADMIN'})` : 'HR Administration',
      },
    });

    if (user) {
      await logAuditEvent({
        actorUserId: user.id,
        actorEmployeeId: user.employeeId || 'ADMIN',
        action: 'CREATE_EMPLOYEE',
        entityType: 'EMPLOYEE',
        entityId: newEmp.id,
        newData: { tenantId: clientId || null, employeeId, name: body.name },
        reason: `Onboarded employee ${employeeId} (${body.name}) via HRM`,
        status: 'SUCCESS',
      });
    }

    const returnHrmEmp: HrmEmployee = {
      id: newEmp.id,
      tenantId: clientId || 'ten-growth-india',
      employeeCode: newEmp.employeeId,
      name: newEmp.fullName,
      email: body.email,
      phone: newEmp.phone,
      department: body.department,
      designation: newEmp.designation,
      location: newEmp.location,
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: body.employmentType || 'FULL_TIME',
      status: 'ACTIVE',
      reportingManager: 'Department Head',
      shift: 'General Day (09:30 - 18:30)',
      skills: ['Core Competency'],
      assets: [],
      documents: [],
      history: [{ role: newEmp.designation, from: new Date().toISOString().slice(0, 7), to: 'Present' }],
    };

    return NextResponse.json({
      success: true,
      employee: returnHrmEmp,
      message: `Employee ${employeeId} onboarded successfully with synchronized EMS/HRM master record`,
    });
  } catch (error: any) {
    console.error('HRM Employee create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
