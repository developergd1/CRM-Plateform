import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminOrHR } from '@/lib/rbac';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, docId } = params;
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isSelf = user.employeeId === employee.employeeId;
    if (!isAdminOrHR(user.role) && !isSelf) {
      return NextResponse.json({ error: 'Permission denied. Unauthorized access to confidential KYC.' }, { status: 403 });
    }

    const doc = await prisma.employeeDocument.findFirst({
      where: {
        AND: [
          { employeeId: employee.id },
          { OR: [{ id: docId }, { documentId: docId }] },
        ],
      },
    });

    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const timestamp = new Date();

    // 1. Record in DocumentAccessLog
    await prisma.documentAccessLog.create({
      data: {
        documentId: doc.id,
        accessedByEmployeeId: user.employeeId || user.id || 'ADMIN',
        actionType: 'VIEWED',
        ipAddress: ip,
        userAgent,
        accessedAt: timestamp,
      },
    });

    // 2. Record in immutable AuditLog
    await logAuditEvent({
      actorUserId: user.id,
      actorEmployeeId: user.employeeId,
      action: 'VIEW_KYC_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: doc.documentId,
      newData: {
        targetEmployeeId: employee.employeeId,
        documentType: doc.documentType,
      },
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
    });

    // 3. Generate dynamic simulated secure watermarked viewer package
    const watermarkText = `GROWTH INDIA PRIVATE DOCUMENT | VIEWED BY: ${user.employeeId} (${user.fullName}) | DATE: ${timestamp.toISOString()} | IP: ${ip}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

    return NextResponse.json({
      success: true,
      document: {
        ...doc,
        watermarkText,
        expiresAt,
        simulatedSecureUrl: `https://vault.growthindia.internal/secure-stream/${doc.documentId}?token=sig_${Math.random().toString(36).substring(2)}&exp=300`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
