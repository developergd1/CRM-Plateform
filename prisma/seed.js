const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initializing Growth India Database Schema & Roles...');

  // 1. Exactly 3 Official Roles: ADMIN, CLIENT, EMPLOYEE
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

  // Also support SUPER_ADMIN alias for backward compatibility
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

  const clientRole = await prisma.role.upsert({
    where: { name: 'CLIENT' },
    update: { displayName: 'Client', description: 'Corporate Client portal for employee onboarding and company management' },
    create: {
      name: 'CLIENT',
      displayName: 'Client',
      description: 'Corporate Client portal for employee onboarding and company management',
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { displayName: 'Employee', description: 'Employee self-service workspace and task profile' },
    create: {
      name: 'EMPLOYEE',
      displayName: 'Employee',
      description: 'Employee self-service workspace and task profile',
      isSystem: true,
    },
  });

  // 2. Default Department
  const defaultDept = await prisma.department.upsert({
    where: { code: 'GENERAL_OPS' },
    update: {},
    create: {
      name: 'General Operations',
      code: 'GENERAL_OPS',
      description: 'Core Business & Operations',
    },
  });

  // 3. Single Primary Administrator Account
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

  // Create/Update linked Admin Employee Profile
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

  console.log('✅ Clean Database Seed Completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🛡️ OFFICIAL ADMIN ACCOUNT:');
  console.log('   Portal URL : http://localhost:3000/growthIndia');
  console.log('   Email / ID : admin@growthindia.co (or GI-EMP-000001)');
  console.log('   Password   : Admin@123');
  console.log('   Role       : ADMIN');
  console.log('----------------------------------------------------');
  console.log('📌 NOTE: All client and employee profiles are to be dynamically');
  console.log('   created by the Administrator via /growthIndia or by Clients.');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
