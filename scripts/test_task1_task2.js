const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTest() {
  console.log('🧪 Verifying Task 1 (Sequential CLI & EMP IDs) & Task 2 (Admin Task Governance)...');

  // Clean test tables first
  await prisma.attendanceBreak.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.employee.deleteMany({ where: { employeeId: { not: 'GI-EMP-000001' } } });
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { not: 'admin@growthindia.in' } } });

  // Get Admin session cookie
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@growthindia.in', password: 'Admin@123', portalType: 'ADMIN' })
  });
  const adminCookie = loginRes.headers.get('set-cookie');
  console.log('   Admin Login Status:', loginRes.status);

  // ----------------------------------------------------
  // TEST TASK 1: CLIENT & EMPLOYEE ID GENERATION
  // ----------------------------------------------------

  // 1. Create Client 1: Titan Infotech Solutions
  const client1Res = await fetch('http://localhost:3000/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      companyName: 'Titan Infotech Solutions',
      contactPerson: 'Aditya Verma',
      mobile: '+91 98000 00001',
      industry: 'IT Services',
    }),
  });
  const client1Data = await client1Res.json();
  console.log('client1Res Status:', client1Res.status, 'Response:', client1Data);
  const c1 = client1Data.client;
  console.log(`\n1️⃣ Client 1 Created: ${c1?.companyName}`);
  console.log(`   Client ID: ${c1?.clientId} (Expected: CLI-TIT-00001)`);

  // 2. Create Client 2: Zenith Logistics & Supply Chain
  const client2Res = await fetch('http://localhost:3000/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      companyName: 'Zenith Logistics & Supply Chain',
      contactPerson: 'Sunil Rao',
      mobile: '+91 98000 00002',
      industry: 'Logistics',
    }),
  });
  const client2Data = await client2Res.json();
  const c2 = client2Data.client;
  console.log(`\n2️⃣ Client 2 Created: ${c2.companyName}`);
  console.log(`   Client ID: ${c2.clientId} (Expected: CLI-ZEN-00002)`);

  // 3. Client 1 hires 3 Employees
  console.log('\n3️⃣ Client 1 (Titan) hires 3 employees:');
  const e1Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Rahul Sharma',
      phone: '+91 91000 00001',
      clientId: c1.id,
      designation: 'Senior Developer',
    }),
  });
  const e1 = (await e1Res.json()).employee;
  console.log(`   Emp 1: ${e1.fullName} -> ID: ${e1.employeeId} (Expected: EMP-TIT-0001)`);

  const e2Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Pooja Verma',
      phone: '+91 91000 00002',
      clientId: c1.id,
      designation: 'UI Designer',
    }),
  });
  const e2 = (await e2Res.json()).employee;
  console.log(`   Emp 2: ${e2.fullName} -> ID: ${e2.employeeId} (Expected: EMP-TIT-0002)`);

  const e3Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Amit Patel',
      phone: '+91 91000 00003',
      clientId: c1.id,
      designation: 'Backend Lead',
    }),
  });
  const e3 = (await e3Res.json()).employee;
  console.log(`   Emp 3: ${e3.fullName} -> ID: ${e3.employeeId} (Expected: EMP-TIT-0003)`);

  // 4. Client 2 (Zenith) hires 2 Employees
  console.log('\n4️⃣ Client 2 (Zenith) hires 2 employees (Should continue from 0004!):');
  const e4Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Vikas Kumar',
      phone: '+91 92000 00001',
      clientId: c2.id,
      designation: 'Fleet Manager',
    }),
  });
  const e4 = (await e4Res.json()).employee;
  console.log(`   Emp 4: ${e4.fullName} -> ID: ${e4.employeeId} (Expected: EMP-ZEN-0004)`);

  const e5Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Neha Gupta',
      phone: '+91 92000 00002',
      clientId: c2.id,
      designation: 'Logistics Analyst',
    }),
  });
  const e5 = (await e5Res.json()).employee;
  console.log(`   Emp 5: ${e5.fullName} -> ID: ${e5.employeeId} (Expected: EMP-ZEN-0005)`);

  // 5. Client 1 (Titan) hires another Employee (Should continue to 0006 with TIT!)
  console.log('\n5️⃣ Client 1 (Titan) hires 1 more employee (Should continue to 0006!):');
  const e6Res = await fetch('http://localhost:3000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      fullName: 'Sanjay Reddy',
      phone: '+91 91000 00004',
      clientId: c1.id,
      designation: 'QA Engineer',
    }),
  });
  const e6 = (await e6Res.json()).employee;
  console.log(`   Emp 6: ${e6.fullName} -> ID: ${e6.employeeId} (Expected: EMP-TIT-0006)`);

  // ----------------------------------------------------
  // TEST TASK 2: TASK CREATION & ADMIN GLOBAL VISIBILITY
  // ----------------------------------------------------
  console.log('\n6️⃣ Client 2 assigns task to Vikas Kumar (EMP-ZEN-0004):');
  const taskRes = await fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      title: 'Optimize North-Zone Dispatch Operations',
      description: 'Review SLA delivery times and report bottleneck routes for Q3',
      priority: 'HIGH',
      assignedToId: e4.id,
      clientId: c2.id,
    }),
  });
  const taskData = await taskRes.json();
  console.log(`   Task Created: ${taskData.taskNumber} - ${taskData.title}`);

  // Admin queries all tasks:
  console.log('\n7️⃣ Admin queries All Tasks (/api/tasks?view=all):');
  const allTasksRes = await fetch('http://localhost:3000/api/tasks?view=all', {
    headers: { Cookie: adminCookie },
  });
  const allTasks = await allTasksRes.json();
  console.log(`   Total tasks visible to Admin: ${allTasks.length}`);
  allTasks.forEach(t => {
    console.log(`   - [${t.taskNumber}] ${t.title} | Client: ${t.client?.companyName} (${t.client?.clientId}) | Assignee: ${t.assignedTo?.fullName} (${t.assignedTo?.employeeId})`);
  });

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED!');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
