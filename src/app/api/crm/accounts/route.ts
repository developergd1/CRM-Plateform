import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { canAccessCRM, canManageCRM } from '@/lib/rbac';
import { checkModuleAccess } from '@/lib/tenant';
import { listAccounts, createAccount } from '@/services/crm/account.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccessCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const { resolveClientObjectId } = await import('@/lib/prisma');
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const industry = searchParams.get('industry')?.trim() || '';
    const ownerId = searchParams.get('ownerId')?.trim() || '';
    const qClientId = searchParams.get('clientId')?.trim() || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const targetClientId = tenantContext?.clientDocId || (qClientId ? await resolveClientObjectId(qClientId) : undefined);

    const result = await listAccounts({ search, status, industry, ownerId, clientId: targetClientId, page, limit });

    return NextResponse.json({
      success: true,
      data: result.accounts,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManageCRM(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { checkModuleAccess, getTenantContext } = await import('@/lib/tenant');
    const { resolveClientObjectId } = await import('@/lib/prisma');
    const moduleForbidden = checkModuleAccess(user, 'CRM');
    if (moduleForbidden) return moduleForbidden;

    const tenantContext = await getTenantContext(req);
    const body = await req.json();
    if (!body.companyName?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ error: 'Company Name and Phone Number are required.' }, { status: 400 });
    }

    const targetClientId = tenantContext?.clientDocId || (body.clientId ? await resolveClientObjectId(body.clientId) : null);

    const account = await createAccount({
      ...body,
      clientId: targetClientId,
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || null,
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
  }
}
