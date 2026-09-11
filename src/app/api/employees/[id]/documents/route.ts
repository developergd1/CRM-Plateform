import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(id),
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isSelf = user.employeeId === employee.employeeId;
    if (!isAdminOrHR(user.role) && !isSelf) {
      return NextResponse.json({ error: 'Permission denied. You cannot view other employees’ KYC documents.' }, { status: 403 });
    }

    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: employee.id },
      include: {
        accessLogs: {
          orderBy: { accessedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(id),
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isSelf = user.employeeId === employee.employeeId;
    if (!isAdminOrHR(user.role) && !isSelf) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const data = await req.json();
    const { documentType, title, fileName = 'document.pdf', fileSizeBytes = 150000, mimeType = 'application/pdf' } = data;

    if (!documentType || !title) {
      return NextResponse.json({ error: 'Document type and title are required' }, { status: 400 });
    }

    const docCount = await prisma.employeeDocument.count({ where: { employeeId: employee.id } });
    const documentId = `DOC-${employee.employeeId}-${documentType.toUpperCase().replace(/\s+/g, '_')}-${docCount + 1}`;

    const newDoc = await prisma.employeeDocument.create({
      data: {
        documentId,
        employeeId: employee.id,
        documentType,
        title,
        fileStoragePath: `/vault/employees/${employee.employeeId}/${fileName}`,
        mimeType,
        fileSizeBytes,
        verificationStatus: 'PENDING_VERIFICATION',
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'UPLOAD_KYC_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: documentId,
      newData: { documentId, documentType, employeeId: employee.employeeId },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
