const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Cleaning database and resetting to 3 official roles (ADMIN, CLIENT, EMPLOYEE)...');

  // 1. Delete sessions, logs, histories, employees, clients, users
  await prisma.activeUserSession.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.employeeBlockHistory.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Official Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { displayName: 'Administrator' },
    create: { name: 'ADMIN', displayName: 'Administrator', isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { displayName: 'Administrator' },
    create: { name: 'SUPER_ADMIN', displayName: 'Administrator', isSystem: true },
  });

  const clientRole = await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: { displayName: 'Client' },
    create: { name: 'CLIENT', displayName: 'Client', isSystem: true },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { displayName: 'Employee' },
    create: { name: 'EMPLOYEE', displayName: 'Employee', isSystem: true },
  });

  // Delete unwanted old roles
  await prisma.role.deleteMany({
    where: {
      name: { notIn: ['ADMIN', 'SUPER_ADMIN', 'CLIENT', 'EMPLOYEE'] },
    },
  });

  // 3. Official Single Admin User
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@growthindia.in',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      isSuspended: false,
    },
  });

  // 4. Admin Profile
  await prisma.employee.create({
    data: {
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

  console.log('✅ Database is completely clean! Only 1 Admin account exists.');
}

clean()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
