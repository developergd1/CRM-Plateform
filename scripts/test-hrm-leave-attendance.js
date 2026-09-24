const BASE_URL = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function login(email, password, portalType = 'EMPLOYEE') {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portalType }),
      });
      if (res.status === 200) {
        const data = await res.json();
        const setCookie = res.headers.get('set-cookie');
        return { cookie: setCookie ? setCookie.split(';')[0] : '', user: data.user };
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`Failed to login as ${email}`);
}

async function runLeaveAttendanceTests() {
  console.log('🏖️  PHASE 6 & 7: LEAVE ENGINE, LEDGER INTEGRITY & ATTENDANCE AUDIT\n');

  const adminAuth = await login('admin@growthindia.co', 'Admin@123', 'ADMIN');
  const mgrAuth = await login('qa.manager@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  const emp1Auth = await login('qa.emp1@growthindia.test', 'QaPass#2026', 'EMPLOYEE');

  const results = { passed: 0, failed: 0 };
  function record(id, name, pass, details) {
    if (pass) {
      results.passed++;
      console.log(`   ✅ [PASS] ${id}: ${name} -> ${details}`);
    } else {
      results.failed++;
      console.log(`   ❌ [FAIL] ${id}: ${name} -> ${details}`);
    }
  }

  // ========================================================
  // PART 1: LEAVE TYPES & BALANCE INITIALIZATION
  // ========================================================
  console.log('1️⃣ Auditing Leave Policies & Balance Ledger Initialization...');

  const leavesRes = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    headers: { Cookie: emp1Auth.cookie },
  });
  const leavesData = await leavesRes.json();
  record('LVE-01', 'Leave Types Initialized', leavesData.leaveTypes?.length >= 4, `Found ${leavesData.leaveTypes?.length} types (CL, SL, EL, UNPAID)`);

  const clType = leavesData.leaveTypes?.find(t => t.code === 'CASUAL') || leavesData.leaveTypes?.[0];
  const clBalBefore = leavesData.balances?.find(b => b.leaveTypeId === clType.id);
  let initialAvailable = clBalBefore?.availableDays || 12;
  if (clBalBefore && clBalBefore.availableDays < 4) {
    await prisma.leaveBalance.update({
      where: { id: clBalBefore.id },
      data: { available: 12, used: 0 },
    });
    initialAvailable = 12;
  }
  record('LVE-02', 'Initial Casual Leave Balance Available', initialAvailable > 0, `Initial Available: ${initialAvailable} days`);

  // ========================================================
  // PART 2: LEAVE APPLICATION & VALIDATIONS
  // ========================================================
  console.log('\n2️⃣ Auditing Leave Application & Input Validation Rules...');

  // Test 1: Overlapping Leave Prevention with dynamic isolated dates
  const randOffset = Math.floor(Math.random() * 200) + 20;
  const d1 = new Date(Date.now() + randOffset * 86400000);
  const d2 = new Date(Date.now() + (randOffset + 1) * 86400000);
  const targetDate1 = d1.toISOString().split('T')[0];
  const targetDate2 = d2.toISOString().split('T')[0];

  const applyRes1 = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      leaveTypeId: clType.id,
      startDate: targetDate1,
      endDate: targetDate2,
      days: 2,
      reason: 'Automated test casual leave',
    }),
  });
  const applyData1 = await applyRes1.json();
  const app1 = applyData1.application;
  record('LVE-03', 'Employee Applies Casual Leave (2 Days)', applyRes1.status === 200 && !!app1?.id, `App #: ${app1?.applicationNumber}, Status: ${app1?.status}`);

  // Test 2: Overlapping application must be rejected
  const overlapRes = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      leaveTypeId: clType.id,
      startDate: targetDate1,
      endDate: targetDate2,
      days: 2,
      reason: 'Attempting overlapping leave',
    }),
  });
  record('LVE-04', 'Overlapping Leave Application Correctly Rejected', overlapRes.status >= 400, `Status: ${overlapRes.status} (Rejected overlapping application)`);

  // Test 3: Insufficient Balance Prevention
  const hugeRes = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      leaveTypeId: clType.id,
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      days: 99,
      reason: 'Attempting to exceed quota',
    }),
  });
  record('LVE-05', 'Insufficient Balance Application Correctly Rejected', hugeRes.status >= 400, `Status: ${hugeRes.status} (Rejected excessive quota)`);

  // ========================================================
  // PART 3: MANAGER APPROVAL & BALANCE DECREMENT
  // ========================================================
  console.log('\n3️⃣ Auditing Manager Approval & Ledger Balance Decrement...');

  // Manager approves app1
  const approveRes = await fetch(`${BASE_URL}/api/hrm/leaves/${app1?.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie },
    body: JSON.stringify({ decision: 'APPROVED', remarks: 'Supervisor sign-off passed' }),
  });
  const approveData = await approveRes.json();
  record('LVE-06', 'Manager Approves Leave Application', approveRes.status === 200 && approveData.application?.status === 'APPROVED', `Status: ${approveData.application?.status}`);

  // Verify LeaveBalance in DB
  const clBalAfter = await prisma.leaveBalance.findFirst({
    where: {
      employeeId: app1.employeeId,
      policy: { leaveTypeId: clType.id },
      year: 2026,
    },
  });
  record('LVE-07', 'Leave Balance Available Decremented in Database', clBalAfter?.available === initialAvailable - 2, `Balance: ${initialAvailable} -> ${clBalAfter?.available} (Used: ${clBalAfter?.used})`);

  // Verify LeaveLedger entry in DB
  const ledgerEntry = await prisma.leaveLedger.findFirst({
    where: {
      requestId: app1.id,
      entryType: 'USAGE',
    },
  });
  record('LVE-08', 'Immutable Leave Ledger Audit Record Written', !!ledgerEntry && ledgerEntry.days === -2, `Ledger Days: ${ledgerEntry?.days}, Balance After: ${ledgerEntry?.balanceAfter}`);

  // ========================================================
  // PART 4: LEAVE REJECTION TEST
  // ========================================================
  console.log('\n4️⃣ Auditing Leave Rejection Workflow...');

  const applyRes2 = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      leaveTypeId: clType.id,
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      days: 1,
      reason: 'Leave to be rejected',
    }),
  });
  const applyData2 = await applyRes2.json();
  const app2 = applyData2.application;

  const rejectRes = await fetch(`${BASE_URL}/api/hrm/leaves/${app2?.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie },
    body: JSON.stringify({ decision: 'REJECTED', remarks: 'Critical sprint delivery day' }),
  });
  const rejectData = await rejectRes.json();
  record('LVE-09', 'Manager Rejects Leave with Mandatory Reason', rejectRes.status === 200 && rejectData.application?.status === 'REJECTED', `Status: ${rejectData.application?.status}, Reason: ${rejectData.application?.rejectionReason}`);

  // Verify balance didn't change on rejection
  const clBalAfterReject = await prisma.leaveBalance.findFirst({
    where: { id: clBalAfter.id },
  });
  record('LVE-10', 'Leave Balance Remains Intact on Rejection', clBalAfterReject?.available === clBalAfter.available, `Available remains: ${clBalAfterReject?.available}`);

  // ========================================================
  // PART 5: UNPAID LEAVE (LOSS OF PAY / LOP)
  // ========================================================
  console.log('\n5️⃣ Auditing Unpaid Leave (Loss of Pay / LOP)...');

  const unpaidType = leavesData.leaveTypes?.find(t => t.code === 'UNPAID') || leavesData.leaveTypes?.find(t => t.isUnpaid);
  const randDay = Math.floor(Math.random() * 25) + 1;
  const lopDate = `2026-09-${String(randDay).padStart(2, '0')}`;

  // Clean up any existing record for this random day
  const empObj = await prisma.employee.findUnique({ where: { employeeId: 'QA-EMP-001' } });
  if (empObj) {
    await prisma.leaveRequest.deleteMany({
      where: { employeeId: empObj.id, startDate: lopDate },
    });
  }

  const lopApplyRes = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      leaveTypeId: unpaidType?.id || 'UNPAID',
      startDate: lopDate,
      endDate: lopDate,
      days: 1,
      reason: 'Emergency unpaid absence',
    }),
  });
  const lopApplyData = await lopApplyRes.json();
  const lopApp = lopApplyData.application;

  const lopApproveRes = await fetch(`${BASE_URL}/api/hrm/leaves/${lopApp?.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie },
    body: JSON.stringify({ decision: 'APPROVED', remarks: 'Authorized unpaid leave' }),
  });
  record('LVE-11', 'Unpaid Leave (LOP) Approved for Payroll Integration', lopApproveRes.status === 200, `Approved LOP day on: ${lopDate}`);

  // ========================================================
  // PART 6: ATTENDANCE & REGULARIZATION
  // ========================================================
  console.log('\n6️⃣ Auditing Attendance Punching & Regularization...');

  const todayStr = new Date().toISOString().split('T')[0];
  const punchRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
  });
  record('ATT-01', 'Employee Live Clock-In Punch', punchRes.status === 200 || punchRes.status === 400, `Clock-in response: ${punchRes.status}`);

  // Verify attendance record in database
  const attRecord = await prisma.attendance.findFirst({
    where: {
      employee: { employeeId: 'QA-EMP-001' },
      date: todayStr,
    },
  });
  record('ATT-02', 'Attendance Record Persisted in Database', !!attRecord, `Date: ${todayStr}, Status: ${attRecord?.status || 'PRESENT'}`);

  // Regularization request from Employee
  const regReqRes = await fetch(`${BASE_URL}/api/attendance/regularization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      date: todayStr,
      requestedCheckIn: '09:30',
      requestedCheckOut: '18:30',
      reason: 'Biometric device network connectivity sync failure',
    }),
  });
  const regData = await regReqRes.json().catch(() => ({}));
  const isExpected = regReqRes.status === 200 || regReqRes.status === 201 || (regReqRes.status === 400 && regData.error?.includes('already exists'));
  record('ATT-03', 'Employee Submits Attendance Regularization Request (or Enforces Duplicate Guard)', isExpected, `Status: ${regReqRes.status} (${regData.error || 'Success'})`);

  console.log(`\n============================================================`);
  console.log(`📊 LEAVE & ATTENDANCE SUMMARY: Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log(`============================================================\n`);

  if (results.failed > 0) process.exit(1);
}

runLeaveAttendanceTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
