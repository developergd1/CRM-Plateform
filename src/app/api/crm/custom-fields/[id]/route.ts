import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { label, isRequired, options } = body;

    const existing = await prisma.crmCustomField.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });

    const updated = await prisma.crmCustomField.update({
      where: { id },
      data: {
        ...(label ? { label: label.trim() } : {}),
        ...(typeof isRequired === 'boolean' ? { isRequired } : {}),
        ...(Array.isArray(options) ? { options: options.map((o: any) => String(o).trim()).filter(Boolean) } : {}),
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'UPDATE_CUSTOM_FIELD',
      entityType: 'SYSTEM',
      entityId: id,
      previousData: existing,
      newData: updated,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, customField: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.crmCustomField.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });

    await prisma.crmCustomField.delete({ where: { id } });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'DELETE_CUSTOM_FIELD',
      entityType: 'SYSTEM',
      entityId: id,
      previousData: existing,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Custom field deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
