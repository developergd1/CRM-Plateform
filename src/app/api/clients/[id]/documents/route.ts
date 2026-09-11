import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { verifyClientOrganizationAccess } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';

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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.trim();

    const documents = await prisma.clientDocument.findMany({
      where: {
        clientId: resolvedClientId,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    console.error('Error fetching client documents:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch documents' }, { status: 500 });
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
    const { title, category = 'OTHER', fileUrl, fileType, fileSize } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Document title is required.' }, { status: 400 });
    }

    const doc = await prisma.clientDocument.create({
      data: {
        clientId: resolvedClientId,
        title: title.trim(),
        category,
        fileUrl: fileUrl?.trim() || null,
        fileType: fileType?.trim() || null,
        fileSize: fileSize || null,
        uploadedBy: user.fullName || user.employeeId || 'ADMIN',
      },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'ADD_CLIENT_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      newData: doc,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding client document:', error);
    return NextResponse.json({ error: error.message || 'Failed to add document' }, { status: 500 });
  }
}
