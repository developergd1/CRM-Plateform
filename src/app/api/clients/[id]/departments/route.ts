import { NextRequest, NextResponse } from 'next/server';
import { prisma, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { verifyClientOrganizationAccess } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { hasAccess, resolvedClientId } = await verifyClientOrganizationAccess(user, params.id);
    if (!hasAccess || !resolvedClientId) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const departments = await prisma.clientDepartment.findMany({
      where: { clientId: resolvedClientId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('Error fetching client departments:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { hasAccess, resolvedClientId } = await verifyClientOrganizationAccess(user, params.id);
    if (!hasAccess || !resolvedClientId) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, description, managerId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
    }

    // Check duplicate department name within this client
    const existing = await prisma.clientDepartment.findFirst({
      where: {
        clientId: resolvedClientId,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Department "${name.trim()}" already exists for this client.` },
        { status: 409 }
      );
    }

    const department = await prisma.clientDepartment.create({
      data: {
        clientId: resolvedClientId,
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        managerId: managerId || null,
      },
    });

    return NextResponse.json({ success: true, data: department }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: error.message || 'Failed to create department' }, { status: 500 });
  }
}
