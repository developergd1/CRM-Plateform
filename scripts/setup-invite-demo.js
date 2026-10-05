const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  console.log('Creating valid demo invitations in DB...');

  // 1. Admin Invitation
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@growthindia.co' }
  });

  const adminToken = 'demo_admin_preview_active_2026';
  await prisma.adminInvitation.deleteMany({ where: { token: adminToken } });
  await prisma.adminInvitation.create({
    data: {
      token: adminToken,
      name: 'Vikramaditya Singhania',
      email: 'vikram.singhania@growthindia.co',
      phone: '+91 98765 43210',
      designation: 'VP of Technology & Governance',
      department: 'Administration & Governance',
      role: 'ADMIN',
      permissions: JSON.stringify(['all_access', 'cms_full', 'hrm_full', 'workforce_full', 'payroll_admin']),
      inviterAdminId: adminUser ? adminUser.id : '6aaa26cc7b5d0486a9c1d1d8',
      inviterAdminName: 'System Administrator',
      inviterAdminEmail: 'admin@growthindia.co',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });
  console.log('✅ Created AdminInvitation with token:', adminToken);

  // 2. Client Invitation (AccountInvitation)
  const clientUser = await prisma.user.findFirst({
    where: { role: { name: 'CLIENT' } }
  });
  const clientOrg = await prisma.client.findFirst();

  const clientToken = 'demo_client_preview_active_2026';
  await prisma.accountInvitation.deleteMany({ where: { token: clientToken } });
  await prisma.accountInvitation.create({
    data: {
      token: clientToken,
      name: 'Ananya Sharma',
      email: 'ananya.sharma@shreecement.in',
      designation: 'Operations Director',
      inviterUserId: clientUser ? clientUser.id : '6ab27a4029704131b5bc989d',
      inviterRole: 'CLIENT',
      clientId: clientOrg ? clientOrg.id : null,
      permissions: JSON.stringify(['workforce', 'attendance', 'tasks', 'documents']),
      status: 'ACTIVE',
    }
  });
  console.log('✅ Created AccountInvitation with token:', clientToken);

  await prisma.$disconnect();
}

setup().catch(console.error);
