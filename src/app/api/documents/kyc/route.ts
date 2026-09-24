import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup, getClientLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent, maskPAN } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const clientId = user.role === 'CLIENT' ? user.clientId : (searchParams.get('clientId') || undefined);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: any = {};
    if (category && category !== 'ALL') where.documentType = category;
    if (status && status !== 'ALL') where.verificationStatus = status;

    if (employeeId) {
      const emp = await prisma.employee.findFirst({ where: getEmployeeLookup(employeeId), select: { id: true } });
      if (emp) where.employeeId = emp.id;
    } else if (clientId && clientId !== 'ALL') {
      const client = await prisma.client.findFirst({ where: getClientLookup(clientId), select: { id: true } });
      if (client) {
        where.employee = { clientId: client.id };
      }
    } else if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employeeProfileId;
    }

    const documents = await prisma.employeeDocument.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            designation: true,
            panMasked: true,
            aadhaarMasked: true,
            client: { select: { companyName: true, clientId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, documents });
  } catch (err: any) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      employeeId,
      documentType,
      title,
      fileStoragePath = '/vault/documents/secure-vault-doc.pdf',
      mimeType = 'application/pdf',
      fileSizeBytes = 245760,
      expiryDate,
    } = body;

    if (!employeeId || !documentType || !title) {
      return NextResponse.json({ error: 'Employee, document type, and title are required.' }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({ where: getEmployeeLookup(employeeId) });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const docId = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newDoc = await prisma.employeeDocument.create({
      data: {
        documentId: docId,
        employeeId: employee.id,
        documentType,
        title,
        fileStoragePath,
        mimeType,
        fileSizeBytes,
        verificationStatus: 'PENDING_VERIFICATION',
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: { employee: true },
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: 'UPLOAD_EMPLOYEE_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: newDoc.documentId,
      newData: { title, documentType, employeeId: employee.employeeId },
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Document '${title}' uploaded and submitted for KYC verification.`,
      document: newDoc,
    });
  } catch (err: any) {
    console.error('Error creating document:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isAdminOrHR(user.role) && user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Permission denied. Only Admins or Client Approvers can verify KYC documents.' }, { status: 403 });
    }

    const body = await req.json();
    const { documentId, status, rejectionReason } = body;

    if (!documentId || !status) {
      return NextResponse.json({ error: 'Document ID and verification status are required.' }, { status: 400 });
    }

    const existing = await prisma.employeeDocument.findFirst({
      where: { OR: [{ id: documentId }, { documentId }] },
      include: { employee: true },
    });
    if (!existing) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const updated = await prisma.employeeDocument.update({
      where: { id: existing.id },
      data: {
        verificationStatus: status, // VERIFIED, REJECTED, EXPIRED, PENDING_VERIFICATION
        verifiedById: `${user.fullName} (${user.employeeId || user.role})`,
        verifiedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Document details could not be validated') : null,
      },
      include: { employee: true },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId || 'ADMIN',
      action: status === 'VERIFIED' ? 'VERIFY_DOCUMENT' : 'REJECT_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: updated.documentId,
      previousData: { verificationStatus: existing.verificationStatus },
      newData: { verificationStatus: status, rejectionReason },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      message: `Document status updated to ${status}.`,
      document: updated,
    });
  } catch (err: any) {
    console.error('Error updating document KYC status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
