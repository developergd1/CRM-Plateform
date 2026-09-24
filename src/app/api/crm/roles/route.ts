import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch existing roles with their permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch active users with their role assignments using include
    const users = await prisma.user.findMany({
      include: {
        role: true,
        employeeProfile: {
          include: {
            department: true,
          },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      fullName: u.employeeProfile?.fullName || u.email.split('@')[0],
      email: u.email,
      role: u.role?.name || 'Staff',
      employeeId: u.employeeProfile?.employeeId || 'GI-STAFF',
      department: u.employeeProfile?.department?.name || 'Commercial',
      isActive: u.isActive,
    }));

    // Fetch active account invitations
    const invitations = await prisma.accountInvitation.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        designation: true,
        inviterRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const standardCrmPermissions = [
      { code: 'crm:leads:read', name: 'View Leads', module: 'Leads' },
      { code: 'crm:leads:create', name: 'Create Leads', module: 'Leads' },
      { code: 'crm:leads:edit', name: 'Edit & Convert Leads', module: 'Leads' },
      { code: 'crm:deals:read', name: 'View Deals & Pipelines', module: 'Deals' },
      { code: 'crm:deals:create', name: 'Create & Move Deals', module: 'Deals' },
      { code: 'crm:deals:close', name: 'Close Deals (Won/Lost)', module: 'Deals' },
      { code: 'crm:accounts:manage', name: 'Manage Accounts & Contacts', module: 'Accounts' },
      { code: 'crm:reports:view', name: 'View CRM Reports & Analytics', module: 'Analytics' },
      { code: 'crm:admin:settings', name: 'Configure CRM Administration', module: 'Administration' },
      { code: 'crm:data:export', name: 'Export Commercial Records (CSV)', module: 'Import / Export' },
      { code: 'crm:data:import', name: 'Import Bulk Commercial Data', module: 'Import / Export' },
    ];

    return NextResponse.json({
      success: true,
      roles,
      users: formattedUsers,
      pendingInvitations: invitations,
      permissionCatalog: standardCrmPermissions,
    });
  } catch (error: any) {
    console.error('Error fetching CRM roles:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch roles' }, { status: 500 });
  }
}
