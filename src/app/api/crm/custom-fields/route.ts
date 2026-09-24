import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType'); // LEAD | ACCOUNT | CONTACT | DEAL

    const where: any = {};
    if (entityType) {
      where.entityType = entityType.toUpperCase();
    }

    const fields = await prisma.crmCustomField.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, fields });
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch custom fields' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { entityType, label, fieldType, options, isRequired } = body;

    if (!entityType || !label || !fieldType) {
      return NextResponse.json({ error: 'entityType, label, and fieldType are required' }, { status: 400 });
    }

    const validEntities = ['LEAD', 'ACCOUNT', 'CONTACT', 'DEAL'];
    const cleanEntityType = entityType.toUpperCase().trim();
    if (!validEntities.includes(cleanEntityType)) {
      return NextResponse.json({ error: `Invalid entityType. Allowed: ${validEntities.join(', ')}` }, { status: 400 });
    }

    // Auto-generate fieldKey from label: e.g. "Tax Identification Number" -> "tax_identification_number"
    let fieldKey = body.fieldKey
      ? String(body.fieldKey).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

    if (!fieldKey.startsWith('cf_')) {
      fieldKey = `cf_${fieldKey}`;
    }

    // Check duplicate key on entity
    const existing = await prisma.crmCustomField.findUnique({
      where: {
        entityType_fieldKey: {
          entityType: cleanEntityType,
          fieldKey,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `A field with key "${fieldKey}" already exists for ${cleanEntityType}.` }, { status: 409 });
    }

    const customField = await prisma.crmCustomField.create({
      data: {
        entityType: cleanEntityType,
        fieldKey,
        label: label.trim(),
        fieldType: fieldType.toUpperCase(),
        options: Array.isArray(options) ? options.map((o: any) => String(o).trim()).filter(Boolean) : [],
        isRequired: Boolean(isRequired),
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'CREATE_CUSTOM_FIELD',
      entityType: 'SYSTEM',
      entityId: customField.id,
      newData: { entityType: customField.entityType, fieldKey: customField.fieldKey, label: customField.label },
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, customField });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: error.message || 'Failed to create custom field' }, { status: 500 });
  }
}
