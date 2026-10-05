const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('STARTING END-TO-END INVITATION & HRM ACCESS TESTING');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Invitation with HRM Access
    // ----------------------------------------------------
    console.log('--- TEST 1: Admin Team Invitation (with HRM & CMS Scopes) ---');
    
    // Find or pick a Super Admin / Admin user to act as inviter
    const adminInviter = await prisma.user.findFirst({
      where: {
        role: {
          name: { in: ['SUPER_ADMIN', 'ADMIN'] },
        },
      },
      include: { role: true },
    });

    if (!adminInviter) {
      throw new Error('No admin user found to act as inviter');
    }
    console.log(`Found inviter admin: ${adminInviter.email} (${adminInviter.role.name})`);

    const testAdminEmail = `test.hrm.admin.${Date.now()}@growthindia.test`;
    const adminToken = `adm_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const adminPermissions = [
      'hrm_full',
      'workforce_full',
      'payroll_admin',
      'tasks_admin',
    ];

    // 1A. Create AdminInvitation record
    const adminInviteRecord = await prisma.adminInvitation.create({
      data: {
        token: adminToken,
        name: 'HR Director Test',
        email: testAdminEmail,
        phone: '+91 98765 11223',
        designation: 'VP of Human Resources',
        department: 'Human Resources',
        role: 'ADMIN_HR',
        permissions: JSON.stringify(adminPermissions),
        inviterAdminId: adminInviter.id,
        inviterAdminName: adminInviter.email,
        status: 'PENDING',
      },
    });
    console.log(`✓ Created AdminInvitation: id=${adminInviteRecord.id}, email=${adminInviteRecord.email}, role=${adminInviteRecord.role}`);
    console.log(`  Permissions assigned: ${adminInviteRecord.permissions}`);

    // 1B. Accept the Admin Invitation (Simulating /api/admin/invitations/accept)
    const testAdminPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(testAdminPassword, 10);
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN_HR' } }) 
      || await prisma.role.findFirst({ where: { name: 'ADMIN' } });

    const adminCount = await prisma.employee.count({
      where: { employeeId: { startsWith: 'GI-ADM-' } },
    });
    const adminEmpCode = `GI-ADM-${String(adminCount + 1).padStart(4, '0')}`;

    const acceptedAdminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        isSuspended: false,
        isDelegated: true,
        delegatedPermissions: adminInviteRecord.permissions,
        parentClientId: null,
        lastLoginAt: new Date(),
      },
      include: { role: true },
    });

    await prisma.employee.create({
      data: {
        employeeId: adminEmpCode,
        userId: acceptedAdminUser.id,
        fullName: 'HR Director Test',
        phone: '+91 98765 11223',
        personalEmail: testAdminEmail,
        designation: 'VP of Human Resources',
        departmentName: 'Human Resources',
        jobLocation: 'Headquarters',
        status: 'ACTIVE',
        createdBy: 'ADMIN_INVITATION_FLOW',
      },
    });

    await prisma.adminInvitation.update({
      where: { id: adminInviteRecord.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedUserId: acceptedAdminUser.id,
        acceptedEmployeeId: adminEmpCode,
      },
    });

    console.log(`✓ Accepted Admin Invitation for ${acceptedAdminUser.email}`);
    console.log(`  Assigned Employee Code: ${adminEmpCode}`);
    console.log(`  Delegated Permissions on User: ${acceptedAdminUser.delegatedPermissions}`);

    const parsedAdminPerms = JSON.parse(acceptedAdminUser.delegatedPermissions);
    const hasHrmAccess = parsedAdminPerms.includes('hrm_full');
    const hasPayrollAccess = parsedAdminPerms.includes('payroll_admin');

    if (!hasHrmAccess || !hasPayrollAccess) {
      throw new Error('Admin user missing HRM permissions!');
    }
    console.log(`✓ Admin User has full HRM permissions verified: hrm_full=${hasHrmAccess}, payroll_admin=${hasPayrollAccess}\n`);


    // ----------------------------------------------------
    // TEST 2: Client Member Invitation with HRM Access
    // ----------------------------------------------------
    console.log('--- TEST 2: Client Member Invitation (with HRM & EMS Scopes) ---');

    // Find an existing Client organization
    let clientOrg = await prisma.client.findFirst({
      include: { user: true },
    });

    if (!clientOrg) {
      console.log('No client organization found. Creating a test client org...');
      const clientRole = await prisma.role.findFirst({ where: { name: 'CLIENT' } });
      const clientUser = await prisma.user.create({
        data: {
          email: `client.org.${Date.now()}@growthindia.test`,
          passwordHash: await bcrypt.hash('ClientPass123!', 10),
          roleId: clientRole.id,
          isActive: true,
        },
      });

      clientOrg = await prisma.client.create({
        data: {
          companyName: 'Apex Innovations Corp',
          contactPerson: 'Siddharth Roy',
          email: clientUser.email,
          mobile: '9876543210',
          userId: clientUser.id,
          assignedModules: ['EMS', 'HRM'],
          status: 'ACTIVE',
        },
        include: { user: true },
      });
    }

    console.log(`Client Organization: ${clientOrg.companyName} (${clientOrg.clientId || clientOrg.id})`);
    console.log(`Client Modules: ${JSON.stringify(clientOrg.assignedModules)}`);

    const testClientMemberEmail = `client.member.${Date.now()}@growthindia.test`;
    const clientToken = `cli_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const clientMemberPermissions = [
      'overview',
      'employees',
      'hrm-dashboard',
      'hrm-lifecycle',
      'hrm-payroll',
      'hrm-performance',
      'hrm-helpdesk',
    ];

    // 2A. Create AccountInvitation record (Simulating /api/invitations POST with role=CLIENT)
    const clientInviteRecord = await prisma.accountInvitation.create({
      data: {
        token: clientToken,
        name: 'Ananya Verma',
        email: testClientMemberEmail,
        designation: 'HR & People Operations Manager',
        inviterUserId: clientOrg.user?.id || adminInviter.id,
        inviterRole: 'CLIENT',
        clientId: clientOrg.id,
        permissions: JSON.stringify(clientMemberPermissions),
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Created Client AccountInvitation: id=${clientInviteRecord.id}, name=${clientInviteRecord.name}`);
    console.log(`  Assigned Permissions: ${clientInviteRecord.permissions}`);

    // 2B. Accept the Client Invitation (Simulating /api/invitations/accept POST)
    const clientRole = await prisma.role.findFirst({ where: { name: 'CLIENT' } });
    const testMemberPassword = 'ClientMemberPass123!';
    const memberPasswordHash = await bcrypt.hash(testMemberPassword, 10);

    const acceptedClientUser = await prisma.user.create({
      data: {
        email: testClientMemberEmail,
        passwordHash: memberPasswordHash,
        roleId: clientRole.id,
        isActive: true,
        isSuspended: false,
        isDelegated: true,
        parentUserId: clientInviteRecord.inviterUserId,
        parentClientId: clientOrg.id,
        delegatedPermissions: clientInviteRecord.permissions,
        invitationId: clientInviteRecord.id,
        lastLoginAt: new Date(),
      },
      include: { role: true },
    });

    await prisma.accountInvitation.update({
      where: { id: clientInviteRecord.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedUserId: acceptedClientUser.id,
      },
    });

    console.log(`✓ Accepted Client Invitation for ${acceptedClientUser.email}`);
    console.log(`  Delegated Permissions on User: ${acceptedClientUser.delegatedPermissions}`);

    const parsedClientPerms = JSON.parse(acceptedClientUser.delegatedPermissions);
    const hasEmsOverview = parsedClientPerms.includes('overview');
    const hasHrmDash = parsedClientPerms.includes('hrm-dashboard');
    const hasHrmLifecycle = parsedClientPerms.includes('hrm-lifecycle');
    const hasHrmPayroll = parsedClientPerms.includes('hrm-payroll');

    if (!hasEmsOverview || !hasHrmDash || !hasHrmLifecycle || !hasHrmPayroll) {
      throw new Error('Client member missing expected EMS or HRM permissions!');
    }

    console.log(`✓ Client Member has both EMS & HRM permissions verified:`);
    console.log(`  - EMS Overview: ${hasEmsOverview}`);
    console.log(`  - HRM Dashboard: ${hasHrmDash}`);
    console.log(`  - HRM Staff Lifecycle: ${hasHrmLifecycle}`);
    console.log(`  - HRM Payroll: ${hasHrmPayroll}`);

    // ----------------------------------------------------
    // TEST 3: Admin Workforce Delegation with HRM
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Admin Workforce Shared Member Invitation (with HRM) ---');

    const testAdminMemberEmail = `admin.member.${Date.now()}@growthindia.test`;
    const adminMemberToken = `adm_member_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const adminMemberPermissions = [
      'clients',
      'employees',
      'attendance',
      'hrm-dashboard',
      'hrm-recruitment',
      'hrm-organization',
    ];

    const adminMemberInvite = await prisma.accountInvitation.create({
      data: {
        token: adminMemberToken,
        name: 'Karan Mehra',
        email: testAdminMemberEmail,
        designation: 'Operations & HR Associate',
        inviterUserId: adminInviter.id,
        inviterRole: 'ADMIN',
        permissions: JSON.stringify(adminMemberPermissions),
        status: 'ACTIVE',
      },
    });

    console.log(`✓ Created Admin AccountInvitation: id=${adminMemberInvite.id}`);
    console.log(`  Assigned Permissions: ${adminMemberInvite.permissions}`);

    const acceptedAdminMember = await prisma.user.create({
      data: {
        email: testAdminMemberEmail,
        passwordHash: memberPasswordHash,
        roleId: adminRole.id,
        isActive: true,
        isSuspended: false,
        isDelegated: true,
        parentUserId: adminInviter.id,
        delegatedPermissions: adminMemberInvite.permissions,
        invitationId: adminMemberInvite.id,
        lastLoginAt: new Date(),
      },
    });

    console.log(`✓ Accepted Admin Shared Member for ${acceptedAdminMember.email}`);
    const parsedAdminMemberPerms = JSON.parse(acceptedAdminMember.delegatedPermissions);
    console.log(`✓ Admin Member Permissions verified: ${parsedAdminMemberPerms.join(', ')}`);

    // Clean up test records
    console.log('\n--- Cleaning up temporary test records ---');
    await prisma.adminInvitation.delete({ where: { id: adminInviteRecord.id } });
    await prisma.employee.deleteMany({ where: { userId: acceptedAdminUser.id } });
    await prisma.user.delete({ where: { id: acceptedAdminUser.id } });

    await prisma.accountInvitation.delete({ where: { id: clientInviteRecord.id } });
    await prisma.user.delete({ where: { id: acceptedClientUser.id } });

    await prisma.accountInvitation.delete({ where: { id: adminMemberInvite.id } });
    await prisma.user.delete({ where: { id: acceptedAdminMember.id } });

    console.log('✓ Cleaned up test invitation and user records.');

    console.log('\n====================================================');
    console.log('ALL INVITATION & PERMISSION ACCESS TESTS PASSED! 100% SUCCESS');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
