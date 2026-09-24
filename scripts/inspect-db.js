const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({
    include: { role: true, employeeProfile: true },
    take: 10,
  });
  console.log('Sample Users:');
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role?.name,
    empId: u.employeeProfile?.employeeId,
    empName: u.employeeProfile?.fullName,
  })), null, 2));

  const roles = await prisma.role.findMany();
  console.log('All Roles:', roles.map(r => r.name));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
