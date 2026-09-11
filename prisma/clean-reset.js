const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanReset() {
  console.log('🧹 Starting Complete Database Reset for Growth India Platform...');

  // 1. Delete all transactional, log, and subordinate data first
  const modelsToDelete = [
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
    'activeUserSession',
    'auditLog',
    'automationLog',
    'notification',
    'systemSetting',
    'client',
    'employee',
    'team',
    'department',
    'user',
  ];

  for (const modelName of modelsToDelete) {
    if (prisma[modelName] && typeof prisma[modelName].deleteMany === 'function') {
      try {
        const res = await prisma[modelName].deleteMany({});
        console.log(`  🗑️ Cleared ${modelName} (${res.count} records removed)`);
      } catch (err) {
        console.warn(`  ⚠️ Error clearing ${modelName}:`, err.message);
      }
    }
  }

  console.log('\n🌱 Seeding Fresh Foundation Data...');

  // 2. Seed Official Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { displayName: 'Administrator', description: 'Platform Administrator with full governance control' },
    create: {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Platform Administrator with full governance control',
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { displayName: 'Administrator' },
    create: {
      name: 'SUPER_ADMIN',
      displayName: 'Administrator',
      description: 'Platform Administrator with full governance control',
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: { displayName: 'Client', description: 'Corporate Client portal for employee onboarding and company management' },
    create: {
      name: 'CLIENT',
      displayName: 'Client',
      description: 'Corporate Client portal for employee onboarding and company management',
      isSystem: true,
    },
  });

  await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { displayName: 'Employee', description: 'Employee self-service workspace and task profile' },
    create: {
      name: 'EMPLOYEE',
      displayName: 'Employee',
      description: 'Employee self-service workspace and task profile',
      isSystem: true,
    },
  });
  console.log('  ✅ Official Roles configured (ADMIN, CLIENT, EMPLOYEE)');

  // 3. Seed Default Department
  const defaultDept = await prisma.department.upsert({
    where: { code: 'GENERAL_OPS' },
    update: {},
    create: {
      name: 'General Operations',
      code: 'GENERAL_OPS',
      description: 'Core Business & Operations',
    },
  });
  console.log('  ✅ Default Department configured (General Operations)');

  // 4. Primary Administrator Account
  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@growthindia.co' },
    update: {
      roleId: adminRole.id,
      passwordHash: hashedPasswordAdmin,
      isActive: true,
      isSuspended: false,
    },
    create: {
      email: 'admin@growthindia.co',
      passwordHash: hashedPasswordAdmin,
      roleId: adminRole.id,
      isActive: true,
      isSuspended: false,
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
  console.log('  ✅ Primary Administrator seeded: admin@growthindia.co / Admin@123 (ID: GI-EMP-000001)');

  console.log('\n✨ Database reset and clean foundation setup completed successfully!');
}

cleanReset()
  .catch((e) => {
    console.error('Reset Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
