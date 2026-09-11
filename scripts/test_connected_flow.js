const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLifecycleFlow() {
  console.log('🚀 Testing End-to-End CRM & Workforce Connected Lifecycle Flow...');

  // Clean any previous test run
  await prisma.attendanceBreak.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.dealStageHistory.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.employee.deleteMany({ where: { employeeId: { not: 'GI-EMP-000001' } } });
  await prisma.user.deleteMany({ where: { email: { not: 'admin@growthindia.in' } } });

  // Step 1: Admin creates an Inbound Lead
  console.log('1️⃣ Creating Lead: Titan Infotech Solutions...');
  const lead = await prisma.lead.create({
    data: {
      leadNumber: 'LEAD-000001',
      companyName: 'Titan Infotech Solutions',
      contactPerson: 'Aditya Verma',
      email: 'aditya@titaninfotech.com',
      phone: '+91 98765 43210',
      source: 'WEBSITE',
      status: 'QUALIFIED',
      priority: 'HIGH',
      estimatedValue: 850000,
    },
  });
  console.log('   ✅ Lead created:', lead.leadNumber, 'Value: ₹' + lead.estimatedValue);

  // Step 2: Create a Deal in Pipeline linked to the Lead
  console.log('2️⃣ Creating Sales Pipeline Deal in PROPOSAL stage...');
  const deal = await prisma.deal.create({
    data: {
      dealNumber: 'DEAL-000001',
      title: 'Titan Enterprise Workforce & Managed Services',
      leadId: lead.id,
      amount: 850000,
      stage: 'PROPOSAL',
      status: 'OPEN',
      probability: 75,
      weightedValue: 637500,
    },
  });
  console.log('   ✅ Deal created:', deal.dealNumber, 'Amount: ₹' + deal.amount, 'Stage:', deal.stage);

  // Step 3: Advance Deal to WON
  console.log('3️⃣ Closing Deal as WON...');
  const wonDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stage: 'WON',
      status: 'WON',
      closingNotes: 'Competitive Pricing & Complete Solution',
      closingDate: new Date(),
      closedAt: new Date(),
    },
  });
  console.log('   ✅ Deal WON:', wonDeal.dealNumber, 'Stage:', wonDeal.stage);

  // Step 4: Convert to Official Corporate Client
  console.log('4️⃣ Converting Won Deal to Corporate Client...');
  const clientRole = await prisma.role.findFirst({ where: { name: 'CLIENT' } });
  const clientUser = await prisma.user.create({
    data: {
      email: 'aditya@titaninfotech.com',
      passwordHash: await bcrypt.hash('Client@123', 10),
      roleId: clientRole.id,
      isActive: true,
    },
  });

  const client = await prisma.client.create({
    data: {
      clientId: 'CLI-00001',
      companyName: 'Titan Infotech Solutions Pvt Ltd',
      status: 'ACTIVE',
      contactPerson: 'Aditya Verma',
      email: 'aditya@titaninfotech.com',
      mobile: '+91 98765 43210',
      phone: '+91 98765 43210',
      industry: 'Information Technology',
      userId: clientUser.id,
    },
  });

  // Link deal to client
  await prisma.deal.update({
    where: { id: deal.id },
    data: { clientId: client.id },
  });
  console.log('   ✅ Client onboarded:', client.clientId, client.companyName);

  // Step 5: Onboard Employee under Client
  console.log('5️⃣ Onboarding Employee under Titan Infotech Solutions...');
  const employeeRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });
  const empUser = await prisma.user.create({
    data: {
      email: 'kavita.rao@titaninfotech.com',
      passwordHash: await bcrypt.hash('Employee@123', 10),
      roleId: employeeRole.id,
      isActive: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      employeeId: 'GI-EMP-000002',
      userId: empUser.id,
      fullName: 'Kavita Rao',
      clientId: client.id,
      departmentName: 'Software Engineering',
      designation: 'Senior Fullstack Engineer',
      personalEmail: 'kavita.rao@titaninfotech.com',
      phone: '+91 98123 45678',
      joiningDate: new Date(),
      employmentType: 'Full-Time',
      status: 'ACTIVE',
      isBlocked: false,
    },
  });
  console.log('   ✅ Employee enrolled:', employee.employeeId, employee.fullName, '(Client: Titan Infotech)');

  // Step 6: Log Clock-in Attendance for Employee
  console.log('6️⃣ Logging Live Clock-In Attendance for Kavita Rao...');
  const todayStr = new Date().toISOString().split('T')[0];
  const attendance = await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      date: todayStr,
      checkInTime: new Date(),
      status: 'PRESENT',
      isLate: false,
    },
  });
  console.log('   ✅ Attendance logged: Date=' + todayStr + ', Status=' + attendance.status);

  console.log('\n🎉 End-to-End Connected Lifecycle Flow completed successfully!');
}

testLifecycleFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
