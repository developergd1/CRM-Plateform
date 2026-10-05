import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveEmployeeObjectId, isValidObjectId, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canManageSalaryStructure } from '@/lib/rbac';
import { getEmployeeSalaryAssignments, assignSalaryStructure } from '@/services/hrm/payroll.service';
import { getTenantContext, checkModuleAccess } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const moduleForbidden = checkModuleAccess(user, 'HRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const assignments = await getEmployeeSalaryAssignments(tenantContext?.clientDocId);
    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageSalaryStructure(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to assign salary structures' }, { status: 403 });
    }

    const tenantContext = await getTenantContext(req);
    const body = await req.json();
    if (!body.employeeId || !body.structureId || !body.baseCtcAnnual) {
      return NextResponse.json({ error: 'Missing employeeId, structureId, or baseCtcAnnual' }, { status: 400 });
    }

    // Verify employee belongs to current tenant organization
    const targetEmp = await prisma.employee.findFirst({
      where: getEmployeeLookup(body.employeeId),
      select: { id: true, clientId: true },
    });

    if (!targetEmp) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (user.role === 'CLIENT') {
      const clientProfile = await prisma.client.findFirst({
        where: {
          OR: [
            { userId: user.id },
            ...(user.clientId ? [{ clientId: user.clientId }] : []),
            ...(isValidObjectId(user.clientId) ? [{ id: user.clientId }] : []),
            ...(user.parentClientId ? [{ clientId: user.parentClientId }] : []),
            ...(isValidObjectId(user.parentClientId) ? [{ id: user.parentClientId }] : []),
          ],
        },
      });
      const clientDocId = clientProfile?.id || tenantContext?.clientDocId;
      if (!clientDocId || targetEmp.clientId !== clientDocId) {
        return NextResponse.json(
          { error: 'Forbidden: You can only assign salary structures to employees enrolled in your organization' },
          { status: 403 }
        );
      }
    } else if (tenantContext?.clientDocId && targetEmp.clientId !== tenantContext.clientDocId) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify salary for employees of another tenant' }, { status: 403 });
    }

    const assignment = await assignSalaryStructure(
      {
        employeeId: targetEmp.id,
        structureId: body.structureId,
        baseCtcAnnual: Number(body.baseCtcAnnual),
        effectiveFrom: body.effectiveFrom,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankIfsc: body.bankIfsc,
        panNumber: body.panNumber,
        customConfig: body.customConfig,
      },
      {
        id: user.id,
        fullName: user.fullName || 'Authorized Manager',
      }
    );

    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
