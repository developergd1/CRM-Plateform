const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetToProductionClean() {
  console.log('🚀 RESETTING GROWTH INDIA PLATFORM TO 100% CLEAN PRODUCTION STATE...\n');

  // 1. All transactional, CRM, attendance, and operational collections to purge
  const collectionsToPurge = [
    'attendanceBreak',
    'attendance',
    'workSession',
    'leaveRequest',
    'employeeBlockHistory',
    'documentAccessLog',
    'employeeDocument',
    'asset',
    'clientDocument',
    'clientDepartment',
    'clientAssignment',
    'clientPipelineHistory',
    'clientActivity',
    'clientNote',
    'clientTask',
    'followUp',
    'leadAssignment',
    'dealStageHistory',
    'activity',
    'taskComment',
    'taskHistory',
    'task',
    'note',
    'deal',
    'opportunity',
    'contact',
    'lead',
    'notification',
    'accountInvitation',
    'activeUserSession',
    'auditLog',
    'systemSetting',
  ];

  for (const model of collectionsToPurge) {
    if (prisma[model] && typeof prisma[model].deleteMany === 'function') {
      try {
        const res = await prisma[model].deleteMany({});
        console.log(`  🗑️ Purged ${model.padEnd(24)}: ${res.count} records removed`);
      } catch (err) {
        console.warn(`  ⚠️ Warning clearing ${model}:`, err.message);
      }
    }
  }

  // 2. Clear all dummy clients
  try {
    const clientRes = await prisma.client.deleteMany({});
    console.log(`  🗑️ Purged clients                 : ${clientRes.count} records removed`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing clients:', err.message);
  }

  // 3. Clear all employees except Super Admin
  try {
    const empRes = await prisma.employee.deleteMany({
      where: {
        employeeId: { not: 'GI-EMP-000001' },
      },
    });
    console.log(`  🗑️ Purged non-admin employees     : ${empRes.count} records removed`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing employees:', err.message);
  }

  // 4. Clear all user accounts except Super Admin
  try {
    const userRes = await prisma.user.deleteMany({
      where: {
        email: { not: 'admin@growthindia.co' },
      },
    });
    console.log(`  🗑️ Purged non-admin users         : ${userRes.count} records removed`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing users:', err.message);
  }

  // 5. Ensure official system roles are pristine
  console.log('\n🛡️ Initializing Official System Roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { displayName: 'Administrator', description: 'Platform Administrator with full governance control', isSystem: true },
    create: { name: 'ADMIN', displayName: 'Administrator', description: 'Platform Administrator with full governance control', isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { displayName: 'Administrator', description: 'Platform Administrator with full governance control', isSystem: true },
    create: { name: 'SUPER_ADMIN', displayName: 'Administrator', description: 'Platform Administrator with full governance control', isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: { displayName: 'Client', description: 'Corporate Client portal for employee onboarding and company management', isSystem: true },
    create: { name: 'CLIENT', displayName: 'Client', description: 'Corporate Client portal for employee onboarding and company management', isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { displayName: 'Employee', description: 'Employee self-service workspace and task profile', isSystem: true },
    create: { name: 'EMPLOYEE', displayName: 'Employee', description: 'Employee self-service workspace and task profile', isSystem: true },
  });

  // 6. Ensure default department
  console.log('🏢 Initializing Official Default Department...');
  await prisma.department.upsert({
    where: { code: 'GENERAL_OPS' },
    update: {},
    create: {
      name: 'General Operations',
      code: 'GENERAL_OPS',
      description: 'Core Business & Operations',
    },
  });

  // 7. Seed Official Single Primary Administrator Account
  console.log('👤 Provisioning Official Super Administrator...');
  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@growthindia.co' },
    update: {
      passwordHash: hashedPasswordAdmin,
      roleId: adminRole.id,
      isActive: true,
      isSuspended: false,
      failedAttempts: 0,
      lockoutUntil: null,
    },
    create: {
      email: 'admin@growthindia.co',
      passwordHash: hashedPasswordAdmin,
      roleId: adminRole.id,
      isActive: true,
      isSuspended: false,
      failedAttempts: 0,
    },
  });

  await prisma.employee.upsert({
    where: { employeeId: 'GI-EMP-000001' },
    update: {
      fullName: 'System Administrator',
      designation: 'Platform Head',
      departmentName: 'General Operations',
      userId: adminUser.id,
      status: 'ACTIVE',
      isBlocked: false,
      personalEmail: 'admin@growthindia.co',
    },
    create: {
      employeeId: 'GI-EMP-000001',
      userId: adminUser.id,
      fullName: 'System Administrator',
      phone: '+91 98000 00000',
      personalEmail: 'admin@growthindia.co',
      departmentName: 'General Operations',
      designation: 'Platform Head',
      jobLocation: 'Headquarters',
      joiningDate: new Date('2024-01-01'),
      employmentType: 'Full-Time',
      status: 'ACTIVE',
      isBlocked: false,
      createdBy: 'SYSTEM',
    },
  });

  console.log('\n' + '='.repeat(70));
  console.log('🎉 PLATFORM IS NOW COMPLETELY CLEAN & READY FOR REAL USE!');
  console.log('='.repeat(70));
  console.log('🛡️ OFFICIAL SUPER ADMIN ACCESS:');
  console.log('   🔗 Admin Portal URL  : http://localhost:3000/growthIndia');
  console.log('   📧 Email / ID        : admin@growthindia.co (or GI-EMP-000001)');
  console.log('   🔑 Password          : Admin@123');
  console.log('   👑 Role              : Platform Administrator');
  console.log('----------------------------------------------------------------------');
  console.log('🌐 CLIENT & EMPLOYEE WORKSPACE GATEWAY:');
  console.log('   🔗 Portal URL        : http://localhost:3000');
  console.log('   📌 Ready for real corporate client onboarding and employee registrations.');
  console.log('='.repeat(70) + '\n');
}

resetToProductionClean()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
