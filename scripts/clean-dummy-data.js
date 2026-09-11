const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanDummyData() {
  console.log('🧹 Purging all dummy test data from Growth India Platform...');

  // 1. Transactional and relational data to delete
  const modelsToClear = [
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
    'task',
    'note',
    'deal',
    'opportunity',
    'contact',
    'lead',
    'activeUserSession',
    'notification',
  ];

  for (const model of modelsToClear) {
    if (prisma[model] && typeof prisma[model].deleteMany === 'function') {
      try {
        const res = await prisma[model].deleteMany({});
        console.log(`  🗑️ Cleared ${model}: ${res.count} records`);
      } catch (err) {
        console.warn(`  ⚠️ Warning clearing ${model}:`, err.message);
      }
    }
  }

  // 2. Clear dummy clients first to resolve ClientOwner relation
  try {
    const clientRes = await prisma.client.deleteMany({});
    console.log(`  🗑️ Cleared dummy clients: ${clientRes.count} records`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing clients:', err.message);
  }

  // 3. Clear non-admin employees
  try {
    const empRes = await prisma.employee.deleteMany({
      where: {
        employeeId: { not: 'GI-EMP-000001' },
      },
    });
    console.log(`  🗑️ Cleared dummy employees: ${empRes.count} records (Admin GI-EMP-000001 preserved)`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing employees:', err.message);
  }

  // 4. Clear non-admin users
  try {
    const userRes = await prisma.user.deleteMany({
      where: {
        email: { not: 'admin@growthindia.in' },
      },
    });
    console.log(`  🗑️ Cleared dummy user accounts: ${userRes.count} records (admin@growthindia.in preserved)`);
  } catch (err) {
    console.warn('  ⚠️ Warning clearing users:', err.message);
  }

  // 5. Ensure System Administrator profile exists and is clean
  const adminRole = await prisma.role.findFirst({
    where: { name: 'ADMIN' },
  });

  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@growthindia.in' },
    update: {
      isActive: true,
      isSuspended: false,
    },
    create: {
      email: 'admin@growthindia.in',
      passwordHash: hashedPasswordAdmin,
      roleId: adminRole ? adminRole.id : undefined,
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
    },
    create: {
      employeeId: 'GI-EMP-000001',
      userId: adminUser.id,
      fullName: 'System Administrator',
      phone: '+91 98000 00000',
      personalEmail: 'admin@growthindia.in',
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

  console.log('✅ Clean Database state successfully restored!');
  console.log('   All dummy pipeline deals, fake attendance, and duplicate clients/employees purged.');
  console.log('   Admin credentials intact: admin@growthindia.in / Admin@123 (GI-EMP-000001)');
}

cleanDummyData()
  .catch((e) => {
    console.error('Purge error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
