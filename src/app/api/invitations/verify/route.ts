import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
    }

    const invitation = await prisma.accountInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: 'This invitation link does not exist or has expired.' },
        { status: 404 }
      );
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json(
        {
          valid: false,
          isRevoked: true,
          error: '🔒 Access Denied: This invitation link has been deactivated/revoked by the account administrator.',
        },
        { status: 403 }
      );
    }

    let inviterName = 'Platform Administrator';
    let organizationName = 'Growth India CRM Headquarters';

    if (invitation.inviterRole === 'CLIENT') {
      let client = null;
      if (invitation.clientId) {
        client = await prisma.client.findUnique({ where: { id: invitation.clientId } });
      }
      if (!client) {
        client = await prisma.client.findFirst({ where: { userId: invitation.inviterUserId } });
      }

      if (client) {
        inviterName = client.contactPerson || client.companyName;
        organizationName = client.companyName;
      } else {
        inviterName = 'Corporate Client';
        organizationName = 'Corporate Client Organization';
      }
    } else {
      const inviterUser = await prisma.user.findUnique({
        where: { id: invitation.inviterUserId },
        include: { employeeProfile: true },
      });
      if (inviterUser?.employeeProfile?.fullName) {
        inviterName = inviterUser.employeeProfile.fullName;
      }
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(invitation.permissions);
    } catch (e) {
      parsedPermissions = [];
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        designation: invitation.designation,
        inviterRole: invitation.inviterRole,
        inviterName,
        organizationName,
        permissions: parsedPermissions,
        isAlreadyAccepted: !!invitation.acceptedAt,
      },
    });
  } catch (error: any) {
    console.error('Verify invitation error:', error);
    return NextResponse.json({ valid: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
