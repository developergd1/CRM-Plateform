import { NextRequest, NextResponse } from 'next/server';
import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM, canManageCRM } from '@/lib/rbac';
import { getAccount360 } from '@/services/crm/account.service';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const account = await getAccount360(params.id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error: any) {
    console.error('Error fetching account 360:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch account 360' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const existing = await prisma.account.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const resolvedOwnerId = body.ownerId ? await resolveEmployeeObjectId(body.ownerId) : existing.ownerId;

    const updated = await prisma.account.update({
      where: { id: params.id },
      data: {
        companyName: body.companyName !== undefined ? body.companyName.trim() : existing.companyName,
        legalName: body.legalName !== undefined ? body.legalName.trim() : existing.legalName,
        industry: body.industry !== undefined ? body.industry.trim() : existing.industry,
        companySize: body.companySize !== undefined ? body.companySize : existing.companySize,
        website: body.website !== undefined ? body.website.trim() : existing.website,
        email: body.email !== undefined ? body.email.trim().toLowerCase() : existing.email,
        phone: body.phone !== undefined ? body.phone.trim() : existing.phone,
        city: body.city !== undefined ? body.city.trim() : existing.city,
        state: body.state !== undefined ? body.state.trim() : existing.state,
        country: body.country !== undefined ? body.country.trim() : existing.country,
        address: body.address !== undefined ? body.address.trim() : existing.address,
        status: body.status !== undefined ? body.status : existing.status,
        accountType: body.accountType !== undefined ? body.accountType : existing.accountType,
        annualRevenue: body.annualRevenue !== undefined ? Number(body.annualRevenue) : existing.annualRevenue,
        ownerId: resolvedOwnerId,
      },
      include: {
        owner: { select: { id: true, employeeId: true, fullName: true, designation: true } },
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'SYSTEM',
      action: 'UPDATE_ACCOUNT',
      entityType: 'ACCOUNT',
      entityId: updated.accountCode,
      previousData: { status: existing.status, companyName: existing.companyName },
      newData: { status: updated.status, companyName: updated.companyName },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}
