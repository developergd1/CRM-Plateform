const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating Admin email in database to admin@growthindia.co...');
  
  // Find admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'admin@growthindia.in' },
        { email: 'admin@growthindia.co' },
      ],
    },
    include: { employeeProfile: true },
  });

  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { email: 'admin@growthindia.co' },
    });
    console.log(`Updated User ID: ${adminUser.id} email to admin@growthindia.co`);

    if (adminUser.employeeProfile) {
      await prisma.employee.update({
        where: { id: adminUser.employeeProfile.id },
        data: { personalEmail: 'admin@growthindia.co' },
      });
      console.log(`Updated Employee Profile ID: ${adminUser.employeeProfile.id} personalEmail to admin@growthindia.co`);
    }
  } else {
    console.log('No existing admin user found to update. (ensureDefaultAdmin will create it with admin@growthindia.co)');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error updating admin email:', err);
  process.exit(1);
});
