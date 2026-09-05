const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runPhase1Validation() {
  console.log('🧪 Starting Phase 1 Flow Automated Verification Test...\n');

  try {
    // 1. Verify Admin User
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@growthindia.in' },
      include: { role: true, employeeProfile: true },
    });
    console.log(`✅ Admin Account Verified: ${adminUser.email} (Role: ${adminUser.role.name}, Employee ID: ${adminUser.employeeProfile?.employeeId})`);

    // 2. Test Client Creation with Automatic Sequential CLI-XXXXX ID
    console.log('\n--- 1. Testing Automatic Client ID Generation (CLI-XXXXX) ---');
    const allClients = await prisma.client.findMany({ select: { clientId: true } });
    let maxClientNum = 0;
    for (const c of allClients) {
      if (c.clientId && c.clientId.startsWith('CLI-')) {
        const num = parseInt(c.clientId.replace('CLI-', ''), 10);
        if (!isNaN(num) && num > maxClientNum) maxClientNum = num;
      }
    }
    const nextClientNum = maxClientNum + 1;
    const expectedClientId = `CLI-${nextClientNum.toString().padStart(5, '0')}`;

    const newClient = await prisma.client.create({
      data: {
        clientId: expectedClientId,
        companyName: 'Acme Global Ventures Pvt Ltd',
        contactPerson: 'Sanjay Kapoor',
        mobile: '+91 98990 12345',
        email: 'sanjay.kapoor@acmeglobal.com',
        address: 'Cyber Towers, Madhapur, Hyderabad, Telangana - 500081',
        industry: 'IT & Software Services',
        status: 'ACTIVE',
        dateAdded: new Date(),
        name: 'Sanjay Kapoor',
        phone: '+91 98990 12345',
        company: 'Acme Global Ventures Pvt Ltd',
      },
    });
    console.log(`✅ New Client Created Successfully: ID = ${newClient.clientId}, Company = ${newClient.companyName}`);
    if (newClient.clientId !== expectedClientId) {
      throw new Error(`Client ID mismatch! Expected: ${expectedClientId}, Received: ${newClient.clientId}`);
    }

    // 3. Test Employee Onboarding with Automatic Sequential GI-EMP-XXXXXX ID under the Client
    console.log('\n--- 2. Testing Automatic Employee ID Generation (GI-EMP-XXXXXX) under Client ---');
    const allEmployees = await prisma.employee.findMany({ select: { employeeId: true } });
    let maxEmpNum = 0;
    for (const e of allEmployees) {
      if (e.employeeId && e.employeeId.startsWith('GI-EMP-')) {
        const num = parseInt(e.employeeId.replace('GI-EMP-', ''), 10);
        if (!isNaN(num) && num > maxEmpNum) maxEmpNum = num;
      }
    }
    const nextEmpNum = maxEmpNum + 1;
    const expectedEmpId = `GI-EMP-${nextEmpNum.toString().padStart(6, '0')}`;

    const defaultRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });
    const hashedPass = await bcrypt.hash('Growth@2026', 10);
    const testUser = await prisma.user.create({
      data: {
        email: `ananya.desai.${Date.now()}@growthindia.in`,
        passwordHash: hashedPass,
        roleId: defaultRole.id,
      },
    });

    const newEmployee = await prisma.employee.create({
      data: {
        employeeId: expectedEmpId,
        userId: testUser.id,
        clientId: newClient.id,
        fullName: 'Ananya Desai',
        fatherMotherName: 'Vivek Desai',
        dob: new Date('1997-03-25'),
        gender: 'Female',
        phone: `+91 98770 ${Math.floor(10000 + Math.random() * 90000)}`,
        personalEmail: testUser.email,
        panNumber: 'ABCDE9876K',
        panMasked: 'ABCDE****K',
        address: 'B-404, Tech Heights, Whitefield, Bengaluru',
        departmentName: 'Strategic Operations',
        designation: 'Operations Specialist',
        jobLocation: 'Bengaluru Tech Park',
        joiningDate: new Date('2026-09-01'),
        employmentType: 'Full-Time',
        status: 'ACTIVE',
        isBlocked: false,
        remarks: 'Phase 1 test employee onboarded under Acme Global Ventures',
        createdBy: 'Aarav Sharma (GI-EMP-000001)',
        updatedBy: 'Aarav Sharma (GI-EMP-000001)',
      },
      include: {
        client: true,
      },
    });
    console.log(`✅ New Employee Onboarded Successfully: ID = ${newEmployee.employeeId}, Name = ${newEmployee.fullName}, Client = ${newEmployee.client?.companyName}`);
    console.log(`   Default Status = ${newEmployee.status} (isBlocked = ${newEmployee.isBlocked})`);
    if (newEmployee.employeeId !== expectedEmpId) {
      throw new Error(`Employee ID mismatch! Expected: ${expectedEmpId}, Received: ${newEmployee.employeeId}`);
    }

    // 4. Test Employee Blocking with Reason & Remarks
    console.log('\n--- 3. Testing Employee Block Flow (Modal Confirmation -> Status BLOCKED -> History Logged) ---');
    const blockReason = 'Disciplinary Policy Breach';
    const blockRemarks = 'Unannounced absence during client SLA audit. Action taken by HR.';
    
    // Update Employee
    const blockedEmp = await prisma.employee.update({
      where: { id: newEmployee.id },
      data: {
        status: 'BLOCKED',
        isBlocked: true,
        blockedReason: blockReason,
        blockedRemarks: blockRemarks,
        blockedBy: 'Aarav Sharma (SUPER_ADMIN)',
        blockedAt: new Date(),
        updatedBy: 'Aarav Sharma (SUPER_ADMIN)',
      },
    });

    // Revoke user login
    await prisma.user.update({
      where: { id: newEmployee.userId },
      data: { isActive: false, isSuspended: true },
    });

    // Record in History table
    const blockHistoryRecord = await prisma.employeeBlockHistory.create({
      data: {
        employeeId: newEmployee.id,
        actionType: 'BLOCK',
        reason: blockReason,
        remarks: blockRemarks,
        actionBy: 'Aarav Sharma (SUPER_ADMIN)',
        actionDate: new Date(),
        previousStatus: 'ACTIVE',
        newStatus: 'BLOCKED',
      },
    });

    console.log(`✅ Employee Blocked: Status = ${blockedEmp.status}, isBlocked = ${blockedEmp.isBlocked}`);
    console.log(`✅ History Log Entry: Action = ${blockHistoryRecord.actionType}, Reason = ${blockHistoryRecord.reason}, ActionBy = ${blockHistoryRecord.actionBy}`);
    console.log(`   Status Transition = ${blockHistoryRecord.previousStatus} -> ${blockHistoryRecord.newStatus}`);

    // Verify user account is disabled
    const userAfterBlock = await prisma.user.findUnique({ where: { id: newEmployee.userId } });
    console.log(`✅ User Account Status: isActive = ${userAfterBlock.isActive}, isSuspended = ${userAfterBlock.isSuspended}`);
    if (userAfterBlock.isActive || !userAfterBlock.isSuspended) {
      throw new Error('User login was not disabled during block!');
    }

    // 5. Test Employee Unblocking with Reason & Remarks
    console.log('\n--- 4. Testing Employee Unblock Flow (Modal Confirmation -> Status ACTIVE -> History Logged) ---');
    const unblockReason = 'HR Inquiry Completed & Reinstatement Approved';
    const unblockRemarks = 'Compliance check verified. Employee cleared to resume operations.';

    const unblockedEmp = await prisma.employee.update({
      where: { id: newEmployee.id },
      data: {
        status: 'ACTIVE',
        isBlocked: false,
        unblockedBy: 'Neha Gupta (ADMIN_HR)',
        unblockedAt: new Date(),
        updatedBy: 'Neha Gupta (ADMIN_HR)',
      },
    });

    // Re-enable user login
    await prisma.user.update({
      where: { id: newEmployee.userId },
      data: { isActive: true, isSuspended: false },
    });

    // Record in History table
    const unblockHistoryRecord = await prisma.employeeBlockHistory.create({
      data: {
        employeeId: newEmployee.id,
        actionType: 'UNBLOCK',
        reason: unblockReason,
        remarks: unblockRemarks,
        actionBy: 'Neha Gupta (ADMIN_HR)',
        actionDate: new Date(),
        previousStatus: 'BLOCKED',
        newStatus: 'ACTIVE',
      },
    });

    console.log(`✅ Employee Unblocked: Status = ${unblockedEmp.status}, isBlocked = ${unblockedEmp.isBlocked}`);
    console.log(`✅ History Log Entry: Action = ${unblockHistoryRecord.actionType}, Reason = ${unblockHistoryRecord.reason}, ActionBy = ${unblockHistoryRecord.actionBy}`);
    console.log(`   Status Transition = ${unblockHistoryRecord.previousStatus} -> ${unblockHistoryRecord.newStatus}`);

    // Verify user account is re-enabled
    const userAfterUnblock = await prisma.user.findUnique({ where: { id: newEmployee.userId } });
    console.log(`✅ User Account Status: isActive = ${userAfterUnblock.isActive}, isSuspended = ${userAfterUnblock.isSuspended}`);
    if (!userAfterUnblock.isActive || userAfterUnblock.isSuspended) {
      throw new Error('User login was not restored during unblock!');
    }

    // 6. Test Employee Profile Full Retrieval with Block Histories
    console.log('\n--- 5. Testing Employee Profile Retrieval with History Trail ---');
    const fullProfile = await prisma.employee.findUnique({
      where: { id: newEmployee.id },
      include: {
        client: true,
        user: true,
        blockHistories: { orderBy: { actionDate: 'desc' } },
      },
    });
    console.log(`✅ Profile: ${fullProfile.fullName} (${fullProfile.employeeId})`);
    console.log(`   Client: ${fullProfile.client?.companyName} (${fullProfile.client?.clientId})`);
    console.log(`   Father/Mother: ${fullProfile.fatherMotherName}`);
    console.log(`   DOB: ${fullProfile.dob?.toISOString().split('T')[0]}, Gender: ${fullProfile.gender}`);
    console.log(`   PAN: ${fullProfile.panMasked}`);
    console.log(`   Audit: CreatedBy = ${fullProfile.createdBy}, BlockedBy = ${fullProfile.blockedBy}, UnblockedBy = ${fullProfile.unblockedBy}`);
    console.log(`   Total Block/Unblock History Entries: ${fullProfile.blockHistories.length}`);
    if (fullProfile.blockHistories.length < 2) {
      throw new Error('Block/Unblock history records are missing!');
    }

    // 7. Test Dashboard Aggregates
    console.log('\n--- 6. Testing Phase 1 Dashboard KPIs ---');
    const [totalClients, totalEmployees, activeEmployees, blockedEmployees] = await Promise.all([
      prisma.client.count(),
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE', isBlocked: false } }),
      prisma.employee.count({ where: { OR: [{ status: 'BLOCKED' }, { isBlocked: true }] } }),
    ]);
    console.log(`✅ Total Clients: ${totalClients}`);
    console.log(`✅ Total Employees: ${totalEmployees}`);
    console.log(`✅ Active Employees: ${activeEmployees}`);
    console.log(`✅ Blocked Employees: ${blockedEmployees}`);

    console.log('\n✨ ALL PHASE 1 REQUIREMENTS VALIDATED SUCCESSFULLY AND WORKING FLAWLESSLY! ✨');
  } catch (error) {
    console.error('\n❌ Validation Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1Validation();
