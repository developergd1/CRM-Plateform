import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: any = {};
    if (!isManagerOrAbove(user.role)) {
      const emp = await prisma.employee.findUnique({ where: { employeeId: user.employeeId } });
      if (emp) where.assignedEmployeeId = emp.id;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignedEmployee: {
          select: {
            employeeId: true,
            fullName: true,
            designation: true,
          },
        },
      },
      orderBy: { assetTag: 'asc' },
    });

    return NextResponse.json({ success: true, assets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only HR and Admin can register assets.' }, { status: 403 });
    }

    const data = await req.json();
    const { name, assetType = 'LAPTOP', serialNumber, assignedEmployeeId, condition = 'GOOD', notes } = data;

    if (!name || !serialNumber) {
      return NextResponse.json({ error: 'Asset Name and Serial Number are required' }, { status: 400 });
    }

    const totalAssets = await prisma.asset.count();
    const prefix = assetType === 'LAPTOP' ? 'LAP' : assetType === 'MOBILE_DEVICE' ? 'MOB' : 'AST';
    const assetTag = `AST-${prefix}-${(totalAssets + 1).toString().padStart(3, '0')}`;

    let targetEmpId: string | null = null;
    if (assignedEmployeeId) {
      const emp = await prisma.employee.findFirst({
        where: getEmployeeLookup(assignedEmployeeId),
      });
      if (emp) targetEmpId = emp.id;
    }

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name: name.trim(),
        assetType,
        serialNumber: serialNumber.trim(),
        assignedEmployeeId: targetEmpId,
        assignedDate: targetEmpId ? new Date() : null,
        condition,
        status: targetEmpId ? 'ALLOCATED' : 'IN_STOCK',
        notes,
      },
      include: {
        assignedEmployee: { select: { employeeId: true, fullName: true } },
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'REGISTER_ASSET',
      entityType: 'ASSET',
      entityId: asset.assetTag,
      newData: { assetTag: asset.assetTag, name: asset.name, serialNumber: asset.serialNumber },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, asset });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
