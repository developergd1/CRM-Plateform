import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token parameter is missing.' }, { status: 400 });
    }

    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired Administrator invitation token.' },
        { status: 404 }
      );
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json(
        { valid: false, error: 'This Administrator invitation has been revoked by the system administrator.' },
        { status: 403 }
      );
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        {
          valid: false,
          alreadyAccepted: true,
          invitation: {
            id: invitation.id,
            name: invitation.name,
            email: invitation.email,
            role: invitation.role,
            designation: invitation.designation,
            department: invitation.department,
            acceptedAt: invitation.acceptedAt,
          },
          error: 'This Administrator invitation has already been accepted and activated.',
        },
        { status: 200 }
      );
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          expired: true,
          email: invitation.email,
          error: 'This Administrator invitation link has expired. Please request a new invite.',
        },
        { status: 410 }
      );
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(invitation.permissions);
    } catch {
      parsedPermissions = [];
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role,
        designation: invitation.designation,
        department: invitation.department,
        inviterAdminName: invitation.inviterAdminName || 'Platform Administrator',
        permissions: parsedPermissions,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/invitations/verify:', error);
    return NextResponse.json({ valid: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
