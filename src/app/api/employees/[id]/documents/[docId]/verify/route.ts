import { NextRequest, NextResponse } from 'next/server';
import { prisma, getEmployeeLookup, getDocumentLookup } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user || !isAdminOrHR(user.role)) {
      return NextResponse.json({ error: 'Permission denied. Only HR / Admin can verify KYC documents.' }, { status: 403 });
    }

    const { id, docId } = params;
    const { action, rejectionReason } = await req.json(); // action: 'VERIFY' | 'REJECT'

    const employee = await prisma.employee.findFirst({
      where: getEmployeeLookup(id),
    });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const doc = await prisma.employeeDocument.findFirst({
      where: {
        AND: [
          { employeeId: employee.id },
          getDocumentLookup(docId),
        ],
      },
    });
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const newStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const updated = await prisma.employeeDocument.update({
      where: { id: doc.id },
      data: {
        verificationStatus: newStatus,
        verifiedById: user.employeeId,
        verifiedAt: new Date(),
        rejectionReason: action === 'REJECT' ? rejectionReason || 'Document illegible or invalid' : null,
      },
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: action === 'VERIFY' ? 'VERIFY_DOCUMENT' : 'REJECT_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: doc.documentId,
      previousData: { status: doc.verificationStatus },
      newData: { status: newStatus, verifiedBy: user.employeeId, rejectionReason },
      ipAddress: ip,
      status: 'SUCCESS',
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
