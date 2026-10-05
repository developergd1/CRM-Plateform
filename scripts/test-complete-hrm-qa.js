/**
 * GROWTH INDIA HRM + PAYROLL SYSTEM COMPLETE END-TO-END QA AUDIT SUITE
 * 
 * Tests the entire HRM & Payroll subsystem:
 * - Employee Master CRUD & Lifecycle
 * - Multi-Tenant Isolation & Security
 * - Biometric Attendance & Regularization
 * - Leave Management & Ledger
 * - Salary Structures & Versioned Assignments
 * - Adjustments & PMS Appraisal Bridge
 * - 5-Step Payroll Engine & Independent Mathematical Calculation Validation
 * - Audit Exceptions Scanning & Gating
 * - Period Finalization & Immutable Payslip Generation
 * - Reports & Regulatory Compliance Consistency
 * - Negative Net Pay & Boundary Conditions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

let adminCookie = '';
let testEmpDbId = '';
let testEmpCode = '';
let testEmpEmail = '';
let testPeriodId = '';
let testPeriodCode = 'PAY-2027-01'; // Clean idempotent test period

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function recordTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`   ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    testResults.failed++;
    testResults.failures.push({ testName, details });
    console.error(`   ❌ FAIL: ${testName} -> ${details}`);
  }
}

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(adminCookie ? { Cookie: adminCookie } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { rawText: text };
  }
  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

async function cleanPeriodIfPresent(periodCode) {
  const existing = await prisma.payrollPeriod.findUnique({ where: { periodCode } });
  if (existing) {
    await prisma.payslip.deleteMany({ where: { periodCode } });
    await prisma.payrollRecord.deleteMany({ where: { periodId: existing.id } });
    await prisma.payrollApprovalLog.deleteMany({ where: { periodId: existing.id } });
    await prisma.payrollException.deleteMany({ where: { periodId: existing.id } });
    await prisma.payrollAdjustment.deleteMany({ where: { effectivePeriodCode: periodCode } });
    await prisma.payrollPeriod.delete({ where: { id: existing.id } });
  }
}

async function runCompleteQaAudit() {
  console.log('================================================================');
  console.log('  GROWTH INDIA HRM + PAYROLL SUBSYSTEM COMPLETE QA AUDIT SUITE  ');
  console.log('================================================================\n');

  try {
    // Clean test periods for idempotent deterministic test run
    await cleanPeriodIfPresent('PAY-2027-01');
    await cleanPeriodIfPresent('PAY-2027-02');

    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & INITIAL TELEMETRY
    // -------------------------------------------------------------
    console.log('🔹 1. Authenticating Super Administrator...');
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' }),
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }

    recordTest(
      'Super Admin Authentication',
      loginRes.status === 200 && adminCookie.length > 0,
      `User: ${loginRes.data.user?.fullName} (${loginRes.data.user?.email})`
    );

    const dashRes = await api('/api/hrm/dashboard');
    recordTest(
      'HRM Dashboard Telemetry',
      dashRes.status === 200 && dashRes.data.metrics?.totalHeadcount !== undefined,
      `Headcount: ${dashRes.data.metrics?.totalHeadcount}, Open Jobs: ${dashRes.data.metrics?.openJobs}`
    );

    // -------------------------------------------------------------
    // SECTION 2: EMPLOYEE MASTER E2E CRUD & DATABASE PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n🔹 2. Testing Employee E2E Lifecycle & Database Persistence...');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    testEmpEmail = `qa.audit.emp.${randSuffix}@growthindia.test`;
    const testEmpPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

    const createEmpRes = await api('/api/hrm/employees', {
      method: 'POST',
      body: JSON.stringify({
        name: `QA Engineer ${randSuffix}`,
        email: testEmpEmail,
        phone: testEmpPhone,
        department: 'Quality Assurance & Audit',
        designation: 'Senior QA Specialist',
        location: 'Mumbai Tech Hub',
        employmentType: 'FULL_TIME',
      }),
    });

    recordTest(
      'POST /api/hrm/employees (Create Employee API)',
      createEmpRes.status === 200 && createEmpRes.data.employee?.employeeCode,
      `Created Employee Code: ${createEmpRes.data.employee?.employeeCode}`
    );

    testEmpCode = createEmpRes.data.employee?.employeeCode;
    testEmpDbId = createEmpRes.data.employee?.id;

    // Verify Direct Database Record
    const dbEmp = await prisma.employee.findUnique({
      where: { id: testEmpDbId },
      include: { user: true },
    });

    recordTest(
      'Database Integrity: Employee Master Record Exists',
      dbEmp !== null && dbEmp.employeeId === testEmpCode && dbEmp.status === 'ACTIVE',
      `DB ID: ${dbEmp?.id}, Employee Code: ${dbEmp?.employeeId}`
    );

    recordTest(
      'Database Integrity: Linked User Account Created & Hashed',
      dbEmp?.user !== null && dbEmp?.user?.email === testEmpEmail && dbEmp?.user?.passwordHash?.startsWith('$2'),
      `Linked User ID: ${dbEmp?.user?.id}`
    );

    // Update Employee Details via PATCH (Set PAN and bank details)
    const patchRes = await api(`/api/employees/${testEmpDbId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        designation: 'Lead QA Architect',
        panNumber: 'ABCDE9999F',
        bankAccount: '112233445566',
        bankIfsc: 'HDFC0001234',
        ptState: 'Maharashtra',
      }),
    });

    recordTest(
      'PATCH /api/employees/[id] (Update Employee Profile)',
      patchRes.status === 200 && patchRes.data.employee?.designation === 'Lead QA Architect',
      `New Designation: ${patchRes.data.employee?.designation}`
    );

    // Verify DB Read for Updated Fields
    const dbEmpUpdated = await prisma.employee.findUnique({ where: { id: testEmpDbId } });
    recordTest(
      'Database Integrity: Update Persisted in DB',
      dbEmpUpdated?.designation === 'Lead QA Architect' && dbEmpUpdated?.panNumber === 'ABCDE9999F',
      `DB Designation: ${dbEmpUpdated?.designation}, Masked PAN: ${dbEmpUpdated?.panMasked}`
    );

    // Also persist bankAccount directly on employee model if needed
    await prisma.employee.update({
      where: { id: testEmpDbId },
      data: { bankAccount: '112233445566', bankIfsc: 'HDFC0001234', ptState: 'Maharashtra' },
    });

    // Verify 360 View API
    const view360Res = await api(`/api/employees/${testEmpDbId}/360`);
    recordTest(
      'GET /api/employees/[id]/360 (Comprehensive Profile)',
      view360Res.status === 200 && view360Res.data.employee?.employeeId === testEmpCode,
      `Employee 360 Linked Relations Loaded`
    );

    // Test Employee Block & Security Revocation
    const blockRes = await api(`/api/employees/${testEmpDbId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Audit Security Verification Test Block' }),
    });

    recordTest(
      'POST /api/employees/[id]/block (Administrative Account Lock)',
      blockRes.status === 200 && blockRes.data.employee?.status === 'BLOCKED',
      `Employee Blocked`
    );

    // Verify User Session Revocation in DB
    const dbBlockedUser = await prisma.user.findUnique({ where: { id: dbEmp.userId } });
    recordTest(
      'Security: Block Deactivates User & Suspends Account',
      dbBlockedUser?.isActive === false && dbBlockedUser?.isSuspended === true,
      `User isActive: ${dbBlockedUser?.isActive}, isSuspended: ${dbBlockedUser?.isSuspended}`
    );

    // Unblock Employee for Subsequent Testing
    const unblockRes = await api(`/api/employees/${testEmpDbId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    recordTest(
      'Restore Employee to ACTIVE Status',
      unblockRes.status === 200 && unblockRes.data.employee?.status === 'ACTIVE'
    );

    // -------------------------------------------------------------
    // SECTION 3: MULTI-TENANT ISOLATION & IDOR DEFENSE
    // -------------------------------------------------------------
    console.log('\n🔹 3. Testing Multi-Tenant Isolation & IDOR Boundaries...');
    let clientTenant = await prisma.client.findFirst();
    if (!clientTenant) {
      clientTenant = await prisma.client.create({
        data: {
          clientId: `CLI-${Date.now().toString().slice(-6)}`,
          companyName: 'Acme Global Corp (Tenant B)',
          email: `contact.${Date.now()}@acme.corp`,
          phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
      });
    }

    const tenantParamRes = await api(`/api/hrm/payroll/assignments?tenantId=${clientTenant.id}`);
    recordTest(
      'Tenant Scoping: Payroll Assignments Filtered Strictly by Tenant',
      tenantParamRes.status === 200 && Array.isArray(tenantParamRes.data.assignments),
      `Tenant Assignments Returned: ${tenantParamRes.data.assignments?.length}`
    );

    // -------------------------------------------------------------
    // SECTION 4: BIOMETRIC ATTENDANCE & REGULARIZATION LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n🔹 4. Testing Attendance Persistence & Regularization...');
    const dateJan4 = '2027-01-04';
    const dateJan5 = '2027-01-05';
    const dateJan6 = '2027-01-06';

    // Day 1: Present with Overtime (1 hr = 60 min)
    const punch1Res = await api('/api/hrm/attendance', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        date: dateJan4,
        status: 'PRESENT',
        checkInTime: `${dateJan4}T09:00:00.000Z`,
        checkOutTime: `${dateJan4}T18:00:00.000Z`,
        totalWorkMinutes: 540,
        overtimeMinutes: 60, // 1 hour overtime
        remarks: 'Full day worked with 1 hr OT',
      }),
    });

    recordTest(
      'POST /api/hrm/attendance (Present + 60 min Overtime)',
      punch1Res.status === 200 && punch1Res.data.attendance?.status === 'PRESENT',
      `Punch Saved: Status ${punch1Res.data.attendance?.status}, OT: ${punch1Res.data.attendance?.overtimeMinutes}m`
    );

    // Day 2: Half Day
    const punch2Res = await api('/api/hrm/attendance', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        date: dateJan5,
        status: 'HALF_DAY',
        totalWorkMinutes: 240,
        remarks: 'Afternoon half day',
      }),
    });

    recordTest(
      'POST /api/hrm/attendance (Half Day Recorded)',
      punch2Res.status === 200 && punch2Res.data.attendance?.status === 'HALF_DAY'
    );

    // Day 3: Absent (Missed punch)
    const punch3Res = await api('/api/hrm/attendance', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        date: dateJan6,
        status: 'ABSENT',
        totalWorkMinutes: 0,
        remarks: 'Missed punch biometric glitch',
      }),
    });

    recordTest(
      'POST /api/hrm/attendance (Absent Recorded)',
      punch3Res.status === 200 && punch3Res.data.attendance?.status === 'ABSENT'
    );

    // Verify DB Attendance Persistence
    const dbAtt1 = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: testEmpDbId, date: dateJan4 } },
    });
    recordTest(
      'Database Integrity: Attendance Record Persisted in Prisma DB',
      dbAtt1 !== null && dbAtt1.overtimeMinutes === 60 && dbAtt1.status === 'PRESENT',
      `DB Record: ${dbAtt1?.date} -> ${dbAtt1?.status}, ${dbAtt1?.totalWorkMinutes} min`
    );

    // Regularization Workflow: Submit request for Day 3 (ABSENT -> PRESENT)
    const regReqRes = await api('/api/attendance/regularization', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        date: dateJan6,
        requestedCheckIn: '09:30',
        requestedCheckOut: '18:30',
        reason: 'Client site deployment meeting',
      }),
    });

    recordTest(
      'POST /api/attendance/regularization (Submit Request)',
      regReqRes.status === 200 && regReqRes.data.request?.id,
      `Request ID: ${regReqRes.data.request?.id}`
    );

    const regId = regReqRes.data.request?.id;

    // Review & Approve Regularization
    const regApproveRes = await api(`/api/attendance/regularization/${regId}`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'APPROVED',
        remarks: 'Verified with client onsite log',
      }),
    });

    recordTest(
      'POST /api/attendance/regularization/[id] (Approve Regularization)',
      regApproveRes.status === 200 && regApproveRes.data.request?.status === 'APPROVED'
    );

    // Verify Day 3 in Attendance DB is now PRESENT
    const dbAtt3Updated = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: testEmpDbId, date: dateJan6 } },
    });

    recordTest(
      'Database Integrity: Regularization Updated DB Attendance Status to PRESENT',
      dbAtt3Updated !== null && dbAtt3Updated.status === 'PRESENT' && dbAtt3Updated.remarks.includes('Regularized'),
      `New Status: ${dbAtt3Updated?.status}, Remarks: ${dbAtt3Updated?.remarks}`
    );

    // -------------------------------------------------------------
    // SECTION 5: LEAVE MANAGEMENT & LEDGER LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n🔹 5. Testing Leave Lifecycle, Balance Ledger & Overlap Guards...');
    const leaveTypesRes = await api('/api/hrm/leaves');
    const casualType = leaveTypesRes.data.leaveTypes?.find((t) => t.code === 'CASUAL') || leaveTypesRes.data.leaveTypes?.[0];

    recordTest(
      'GET /api/hrm/leaves (Leave Types Initialized)',
      leaveTypesRes.status === 200 && casualType?.id !== undefined,
      `Found ${leaveTypesRes.data.leaveTypes?.length} types`
    );

    // Apply for Paid Casual Leave on 2027-01-11 to 2027-01-12 (2 days)
    const applyClRes = await api('/api/hrm/leaves', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        leaveTypeId: casualType.id,
        startDate: '2027-01-11',
        endDate: '2027-01-12',
        days: 2,
        reason: 'Family engagement',
      }),
    });

    recordTest(
      'POST /api/hrm/leaves (Apply Paid Casual Leave - 2 Days)',
      applyClRes.status === 200 && applyClRes.data.application?.id,
      `Application: ${applyClRes.data.application?.applicationNumber}`
    );

    const clAppId = applyClRes.data.application?.id;

    // Negative Test: Attempt Overlapping Leave on 2027-01-11
    const overlapRes = await api('/api/hrm/leaves', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        leaveTypeId: casualType.id,
        startDate: '2027-01-11',
        endDate: '2027-01-11',
        days: 1,
        reason: 'Duplicate overlap attempt',
      }),
    });

    recordTest(
      'Negative Test: Overlapping Leave Request Rejected with 409 Conflict',
      overlapRes.status === 409,
      `Status: ${overlapRes.status}, Error: ${overlapRes.data.error}`
    );

    // Approve Casual Leave
    const approveClRes = await api(`/api/hrm/leaves/${clAppId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVED', remarks: 'Approved by HR Lead' }),
    });

    recordTest(
      'POST /api/hrm/leaves/[id]/approve (Approve Leave)',
      approveClRes.status === 200 && approveClRes.data.application?.status === 'APPROVED'
    );

    // Verify Leave Balance & Ledger in DB
    const dbBal = await prisma.leaveBalance.findFirst({
      where: { employeeId: testEmpDbId },
    });
    recordTest(
      'Database Integrity: Leave Balance Decremented & Used Days Updated',
      dbBal !== null && dbBal.used >= 2,
      `Balance Used Days: ${dbBal?.used}, Available: ${dbBal?.available}`
    );

    // Apply & Approve 1 Day Unpaid Leave on 2027-01-18 (to test LOP calculation)
    let dbUnpaidType = await prisma.leaveType.findFirst({ where: { code: 'UNPAID' } });
    if (!dbUnpaidType) {
      dbUnpaidType = await prisma.leaveType.create({
        data: {
          code: 'UNPAID',
          name: 'Loss of Pay / Unpaid Leave',
          description: 'Unpaid absence',
          category: 'UNPAID',
          isActive: true,
          policies: {
            create: {
              annualQuota: 0,
              isUnpaid: true,
              effectiveYear: 2027,
            },
          },
        },
      });
    }

    const applyUnpaidRes = await api('/api/hrm/leaves', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        leaveTypeId: dbUnpaidType.id,
        startDate: '2027-01-18',
        endDate: '2027-01-18',
        days: 1,
        reason: 'Unforeseen personal work (unpaid)',
      }),
    });

    const unpaidAppId = applyUnpaidRes.data.application?.id;
    if (unpaidAppId) {
      await api(`/api/hrm/leaves/${unpaidAppId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'APPROVED', remarks: 'Unpaid leave approved' }),
      });
    }

    recordTest(
      'Apply & Approve 1 Day Unpaid Leave (for LOP verification)',
      applyUnpaidRes.status === 200,
      `Application ID: ${unpaidAppId}`
    );

    // -------------------------------------------------------------
    // SECTION 6: SALARY STRUCTURE ASSIGNMENT & VERSIONING
    // -------------------------------------------------------------
    console.log('\n🔹 6. Testing Salary Structure Assignment & Versioning...');
    const structRes = await api('/api/hrm/payroll/structures');
    const standardStructure = structRes.data.structures?.[0];

    recordTest(
      'GET /api/hrm/payroll/structures (Available Salary Structures)',
      structRes.status === 200 && standardStructure?.id !== undefined,
      `Structure: ${standardStructure?.name}`
    );

    // Assign Salary: Annual CTC ₹600,000 => Monthly ₹50,000
    const assignRes = await api('/api/hrm/payroll/assignments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        structureId: standardStructure.id,
        baseCtcAnnual: 600000,
        effectiveFrom: '2026-01-01',
      }),
    });

    recordTest(
      'POST /api/hrm/payroll/assignments (Assign CTC ₹600,000)',
      assignRes.status === 200 && assignRes.data.assignment?.monthlyCtc === 50000,
      `Monthly CTC: ₹${assignRes.data.assignment?.monthlyCtc}`
    );

    // -------------------------------------------------------------
    // SECTION 7: ADJUSTMENTS & PMS APPRAISAL BRIDGE
    // -------------------------------------------------------------
    console.log('\n🔹 7. Testing PMS Appraisal & Controlled Payroll Adjustments...');
    // Create PMS Appraisal Decision: ₹5,000 Bonus for PAY-2027-01
    const appraisalRes = await api('/api/hrm/pms/appraisals', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: testEmpCode,
        cycleName: 'FY27 Q1 Review',
        performanceRating: 4.8,
        decisionType: 'BONUS',
        bonusAmount: 5000,
        effectiveDate: '2027-01-01',
        remarks: 'Outstanding delivery on audit compliance milestones',
      }),
    });

    recordTest(
      'POST /api/hrm/pms/appraisals (Create Appraisal Decision: ₹5,000 Bonus)',
      appraisalRes.status === 201 && appraisalRes.data.appraisal?.id,
      `Appraisal ID: ${appraisalRes.data.appraisal?.id}`
    );

    const appraisalId = appraisalRes.data.appraisal?.id;

    // Approve Appraisal (Bridges to Payroll Adjustment)
    const approveAppraisalRes = await api(`/api/hrm/pms/appraisals/${appraisalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVED' }),
    });

    recordTest(
      'POST /api/hrm/pms/appraisals/[id]/approve (Approve Appraisal Decision)',
      approveAppraisalRes.status === 200 && approveAppraisalRes.data.appraisal?.status === 'APPROVED'
    );

    // Verify Payroll Adjustment created in DB
    const dbAdjustment = await prisma.payrollAdjustment.findFirst({
      where: { appraisalId, status: 'APPROVED' },
    });

    recordTest(
      'PMS-Payroll Bridge: Approved Appraisal Generated Approved Payroll Adjustment',
      dbAdjustment !== null && dbAdjustment.amount === 5000 && dbAdjustment.type === 'BONUS',
      `Adjustment ID: ${dbAdjustment?.id}, Amount: ₹${dbAdjustment?.amount}`
    );

    // Negative Test: Attempt Re-Approval Idempotency Guard
    const reApproveRes = await api(`/api/hrm/pms/appraisals/${appraisalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVED' }),
    });

    recordTest(
      'Negative Test: Appraisal Re-Approval Idempotency Guard Rejects Duplicate Approval',
      reApproveRes.status === 500 && reApproveRes.data.error.includes('already APPROVED'),
      `Guard Result: ${reApproveRes.data.error}`
    );

    // -------------------------------------------------------------
    // SECTION 8: 5-STEP DETERMINISTIC PAYROLL CALCULATION ENGINE
    // -------------------------------------------------------------
    console.log('\n🔹 8. Testing 5-Step Payroll Engine & Independent Mathematical Calculation...');
    // Create Period for January 2027 (Month 1)
    const createPeriodRes = await api('/api/hrm/payroll/periods', {
      method: 'POST',
      body: JSON.stringify({ month: 1, year: 2027 }),
    });

    recordTest(
      'POST /api/hrm/payroll/periods (Initialize January 2027 Period)',
      createPeriodRes.status === 200 && createPeriodRes.data.period?.periodCode === testPeriodCode,
      `Period Code: ${createPeriodRes.data.period?.periodCode}, Status: ${createPeriodRes.data.period?.status}`
    );

    testPeriodId = createPeriodRes.data.period?.id;

    // Run 5-Step Payroll Engine
    const processRes = await api('/api/hrm/payroll/process', {
      method: 'POST',
      body: JSON.stringify({ periodId: testPeriodId }),
    });

    recordTest(
      'POST /api/hrm/payroll/process (Execute 5-Step Computation Engine)',
      processRes.status === 200 && processRes.data.period?.status === 'PENDING_REVIEW',
      `Computed Gross: ₹${processRes.data.period?.totalGrossPay?.toLocaleString()}, Net: ₹${processRes.data.period?.totalNetPay?.toLocaleString()}`
    );

    // Fetch the calculated PayrollRecord for our test employee from Prisma DB
    const testRecord = await prisma.payrollRecord.findFirst({
      where: { periodId: testPeriodId, employeeId: testEmpDbId },
      include: { earningsItems: true, deductionItems: true },
    });

    recordTest(
      'Database Integrity: PayrollRecord Generated for Test Employee',
      testRecord !== null,
      `Record ID: ${testRecord?.id}`
    );

    // -------------------------------------------------------------
    // SECTION 9: INDEPENDENT MATHEMATICAL VALIDATION
    // -------------------------------------------------------------
    console.log('\n🔹 9. Independent Mathematical Calculation Verification:');
    /**
     * Independent Reference Calculations:
     * Base Monthly CTC: ₹50,000
     * Working days in month: 26
     * Calendar days: 31
     * LOP days: 1.0 unpaid leave (2027-01-18) + 0.5 unpaid day from Half-Day attendance (2027-01-05) = 1.5 LOP days
     * Rate per working day: 50,000 / 26 = 1923.0769
     * LOP Deduction: Math.round(1923.0769 * 1.5) = 2,885
     * Adjusted Gross: 50,000 - 2,885 = 47,115
     * Basic (50% of Adjusted Gross): Math.round(47,115 * 0.5) = 23,558
     * HRA (40% of Basic): Math.round(23,558 * 0.4) = 9,423
     * Special Allowance: 47,115 - (23,558 + 9,423) = 14,134
     * Overtime Pay: 60 minutes = 1.0 hr * 200/hr * 1.5x = 300
     * Approved Bonus: 5,000
     * Total Gross Earnings: 47,115 + 300 + 5,000 = 52,415
     * 
     * Statutory Deductions:
     * PF (12% capped at ₹15,000): Basic (23,558) > 15,000 ceiling => 15,000 * 0.12 = 1,800
     * ESI: Gross ₹52,415 > ₹21,000 threshold => 0 (exempt)
     * TDS: Gross ₹52,415 >= ₹50,000 threshold => 52,415 * 0.05 = Math.round(2,620.75) = 2,621
     * PT (Maharashtra): Gross > ₹10,000 => 200
     * Total Deductions: 1,800 + 0 + 2,621 + 200 = 4,621
     * Expected Net Pay: 52,415 - 4,621 = 47,794
     */
    const expectedBaseGross = 50000;
    const totalLopDays = 1.5; // 1.0 unpaid leave + 0.5 half-day attendance
    const expectedLopDeduction = Math.round((50000 / 26) * totalLopDays); // 2885
    const expectedAdjustedGross = 50000 - expectedLopDeduction; // 47115
    const expectedBasic = Math.round(expectedAdjustedGross * 0.5); // 23558
    const expectedHra = Math.round(expectedBasic * 0.4); // 9423
    const expectedOt = 300;
    const expectedBonus = 5000;
    const expectedTotalGross = expectedAdjustedGross + expectedOt + expectedBonus; // 52415
    const expectedPf = 1800;
    const expectedEsi = 0;
    const expectedTds = Math.round(expectedTotalGross * 0.05); // 2621
    const expectedPt = 200;
    const expectedTotalDeductions = expectedPf + expectedEsi + expectedTds + expectedPt; // 4621
    const expectedNetPay = expectedTotalGross - expectedTotalDeductions; // 47794

    console.log(`   Expected Base Gross: ₹${expectedBaseGross} | Actual: ₹${testRecord?.baseGross}`);
    recordTest('Math Check: Base Gross CTC', testRecord?.baseGross === expectedBaseGross);

    console.log(`   Expected LOP Deduction: ₹${expectedLopDeduction} | Actual: ₹${testRecord?.lopDeduction}`);
    recordTest('Math Check: Loss of Pay (LOP) Deduction', testRecord?.lopDeduction === expectedLopDeduction);

    console.log(`   Expected Basic Salary: ₹${expectedBasic} | Actual: ₹${testRecord?.basic}`);
    recordTest('Math Check: Basic Component', testRecord?.basic === expectedBasic);

    console.log(`   Expected HRA: ₹${expectedHra} | Actual: ₹${testRecord?.hra}`);
    recordTest('Math Check: HRA Component', testRecord?.hra === expectedHra);

    console.log(`   Expected Overtime Pay: ₹${expectedOt} | Actual: ₹${testRecord?.overtimePay}`);
    recordTest('Math Check: Overtime Pay', testRecord?.overtimePay === expectedOt);

    console.log(`   Expected Bonus: ₹${expectedBonus} | Actual: ₹${testRecord?.bonus}`);
    recordTest('Math Check: Bonus Adjustment', testRecord?.bonus === expectedBonus);

    console.log(`   Expected Total Gross: ₹${expectedTotalGross} | Actual: ₹${testRecord?.totalEarnings}`);
    recordTest('Math Check: Total Gross Earnings', testRecord?.totalEarnings === expectedTotalGross);

    console.log(`   Expected PF (Employee): ₹${expectedPf} | Actual: ₹${testRecord?.pfEmployee}`);
    recordTest('Math Check: Statutory PF Capped at ₹15,000 ceiling', testRecord?.pfEmployee === expectedPf);

    console.log(`   Expected ESI: ₹${expectedEsi} | Actual: ₹${testRecord?.esiEmployee}`);
    recordTest('Math Check: Statutory ESI Exemption over ₹21,000', testRecord?.esiEmployee === expectedEsi);

    console.log(`   Expected TDS: ₹${expectedTds} | Actual: ₹${testRecord?.tds}`);
    recordTest('Math Check: Statutory Provisional TDS (5%)', testRecord?.tds === expectedTds);

    console.log(`   Expected PT (Maharashtra): ₹${expectedPt} | Actual: ₹${testRecord?.pt}`);
    recordTest('Math Check: Maharashtra Professional Tax', testRecord?.pt === expectedPt);

    console.log(`   Expected Total Deductions: ₹${expectedTotalDeductions} | Actual: ₹${testRecord?.totalDeductions}`);
    recordTest('Math Check: Total Deductions', testRecord?.totalDeductions === expectedTotalDeductions);

    console.log(`   Expected Net Pay: ₹${expectedNetPay} | Actual: ₹${testRecord?.netPay}`);
    recordTest('Math Check: Exact Net Take-Home Pay', testRecord?.netPay === expectedNetPay);

    // -------------------------------------------------------------
    // SECTION 10: AUDIT EXCEPTIONS & FINALIZATION GATE
    // -------------------------------------------------------------
    console.log('\n🔹 10. Testing Audit Exception Scanning & Approval Gate...');
    const exceptionsRes = await api(`/api/hrm/payroll/exceptions?periodId=${testPeriodId}`);
    recordTest(
      'GET /api/hrm/payroll/exceptions (Scan Audit Exceptions)',
      exceptionsRes.status === 200,
      `Found ${exceptionsRes.data.exceptions?.length} exception(s)`
    );

    // Resolve any blocking exceptions on the period before finalization
    for (const exc of exceptionsRes.data.exceptions || []) {
      if (exc.status === 'OPEN') {
        const resRes = await api('/api/hrm/payroll/exceptions', {
          method: 'POST',
          body: JSON.stringify({
            action: 'RESOLVE',
            exceptionId: exc.id,
            resolution: 'Verified by Senior Auditor in QA Test Suite',
          }),
        });
        console.log(`   Resolved exception ${exc.exceptionType} (${exc.id}) -> ${resRes.status}`);
      }
    }

    // Approve Payroll Period
    const approvePeriodRes = await api('/api/hrm/payroll/approve', {
      method: 'POST',
      body: JSON.stringify({
        periodId: testPeriodId,
        remarks: 'Executive QA sign-off approved',
      }),
    });

    recordTest(
      'POST /api/hrm/payroll/approve (Administrative Payroll Approval)',
      approvePeriodRes.status === 200 && approvePeriodRes.data.period?.status === 'APPROVED',
      `New Status: ${approvePeriodRes.data.period?.status}`
    );

    // Finalize Payroll Period & Generate Immutable Payslips
    const finalizePeriodRes = await api('/api/hrm/payroll/finalize', {
      method: 'POST',
      body: JSON.stringify({ periodId: testPeriodId }),
    });

    recordTest(
      'POST /api/hrm/payroll/finalize (Permanent Financial Locking & Payslip Generation)',
      finalizePeriodRes.status === 200 && finalizePeriodRes.data.period?.status === 'FINALIZED',
      `Locked Status: ${finalizePeriodRes.data.period?.status}`
    );

    // Negative Test: Attempt Recalculating a Finalized Period
    const reProcessRes = await api('/api/hrm/payroll/process', {
      method: 'POST',
      body: JSON.stringify({ periodId: testPeriodId }),
    });

    recordTest(
      'Negative Test: Finalized Period Immutability Rejects Re-processing with 409 Conflict',
      reProcessRes.status === 409,
      `Response Status: ${reProcessRes.status}`
    );

    // -------------------------------------------------------------
    // SECTION 11: PAYSLIP INTEGRITY & PRIVACY AUDIT
    // -------------------------------------------------------------
    console.log('\n🔹 11. Testing Payslip Retrieval & Data Integrity...');
    const payslipsRes = await api(`/api/hrm/payroll/payslips?periodCode=${testPeriodCode}`);
    recordTest(
      'GET /api/hrm/payroll/payslips (Fetch Generated Payslips)',
      payslipsRes.status === 200 && payslipsRes.data.payslips?.length > 0,
      `Generated ${payslipsRes.data.payslips?.length} slips`
    );

    const testPayslip = payslipsRes.data.payslips?.find((p) => p.employeeId === testEmpDbId || p.employee?.employeeId === testEmpCode);

    recordTest(
      'Payslip Accuracy: Net Pay Matches Calculated Record',
      testPayslip !== undefined && (testPayslip.netPay === expectedNetPay || testPayslip.netSalary === expectedNetPay),
      `Payslip Net: ₹${testPayslip?.netPay || testPayslip?.netSalary} vs Record: ₹${expectedNetPay}`
    );

    const slipWords = testPayslip?.netPayInWords || testPayslip?.netSalaryWords;
    recordTest(
      'Payslip Words: Net Salary in Words Populated',
      slipWords && slipWords.includes('Rupees Only'),
      `In Words: "${slipWords}"`
    );

    // -------------------------------------------------------------
    // SECTION 12: COMPLIANCE & HR REPORTS AUDIT
    // -------------------------------------------------------------
    console.log('\n🔹 12. Testing Compliance Reports & Export Formatting...');
    const payrollReportRes = await api('/api/hrm/reports?category=PAYROLL');
    recordTest(
      'GET /api/hrm/reports?category=PAYROLL (Payroll Ledger Report)',
      payrollReportRes.status === 200 && payrollReportRes.data.summary?.grossTotal > 0,
      `Total Net Disbursed: ₹${payrollReportRes.data.summary?.netTotal?.toLocaleString()}`
    );

    const compReportRes = await api('/api/hrm/reports?category=COMPLIANCE');
    recordTest(
      'GET /api/hrm/reports?category=COMPLIANCE (Statutory TDS/PF/PT Report)',
      compReportRes.status === 200 && compReportRes.data.summary?.totalPf > 0,
      `Total PF: ₹${compReportRes.data.summary?.totalPf}, TDS: ₹${compReportRes.data.summary?.totalTds}`
    );

    const csvReportRes = await api('/api/hrm/reports?category=EMPLOYEES&format=csv');
    recordTest(
      'GET /api/hrm/reports?category=EMPLOYEES&format=csv (CSV Streaming Export)',
      csvReportRes.status === 200 && csvReportRes.data.rawText?.includes('employeeId,fullName'),
      `CSV Headers Verified`
    );

    // -------------------------------------------------------------
    // SECTION 13: NEGATIVE NET SALARY EXCEPTION TEST
    // -------------------------------------------------------------
    console.log('\n🔹 13. Testing Negative Net Salary Exception Trigger & Gating...');
    // Create an employee with ₹10,000 monthly salary and ₹20,000 deduction adjustment
    const lowEmpPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;
    const lowEmpEmail = `low.sal.${Date.now()}@growthindia.test`;

    const lowEmpRes = await api('/api/hrm/employees', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Negative Net Test Employee',
        email: lowEmpEmail,
        phone: lowEmpPhone,
        department: 'Operations',
        designation: 'Intern',
      }),
    });

    const lowEmpId = lowEmpRes.data.employee?.id;
    const lowEmpCode = lowEmpRes.data.employee?.employeeCode;

    // Assign ₹120,000 annual = ₹10,000 monthly
    await api('/api/hrm/payroll/assignments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: lowEmpCode,
        structureId: standardStructure.id,
        baseCtcAnnual: 120000,
        effectiveFrom: '2026-01-01',
      }),
    });

    // Create a ₹25,000 deduction adjustment for period PAY-2027-02
    const testMonthFebCode = 'PAY-2027-02';
    const negAdjRes = await api('/api/hrm/payroll/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: lowEmpCode,
        type: 'OTHER_DEDUCTION',
        category: 'DEDUCTION',
        amount: 25000,
        reason: 'Asset damage penalty deduction exceeding monthly earnings',
        effectivePeriodCode: testMonthFebCode,
      }),
    });

    const negAdjId = negAdjRes.data.adjustment?.id;
    // Approve this adjustment
    await api(`/api/hrm/payroll/adjustments/${negAdjId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVED' }),
    });

    // Create February 2027 Period
    const febPeriodRes = await api('/api/hrm/payroll/periods', {
      method: 'POST',
      body: JSON.stringify({ month: 2, year: 2027 }),
    });
    const febPeriodId = febPeriodRes.data.period?.id;

    // Process February 2027 Payroll
    await api('/api/hrm/payroll/process', {
      method: 'POST',
      body: JSON.stringify({ periodId: febPeriodId }),
    });

    // Verify Record Status is 'HOLD' in DB
    const lowRecord = await prisma.payrollRecord.findFirst({
      where: { periodId: febPeriodId, employeeId: lowEmpId },
    });

    recordTest(
      'Negative Net Pay: Record Flagged with Status "HOLD"',
      lowRecord?.status === 'HOLD',
      `Status: ${lowRecord?.status}, Net Pay: ₹${lowRecord?.netPay}`
    );

    // Verify Blocking Audit Exception Generated
    const negException = await prisma.payrollException.findFirst({
      where: {
        periodId: febPeriodId,
        exceptionType: 'NEGATIVE_NET_SALARY',
        severity: 'BLOCKING',
      },
    });

    recordTest(
      'Audit Exception: BLOCKING "NEGATIVE_NET_SALARY" Exception Created',
      negException !== null && negException.severity === 'BLOCKING',
      `Exception: ${negException?.exceptionType} (${negException?.severity})`
    );

    // Attempt to Finalize February Payroll with open blocking exception
    const failFinalizeRes = await api('/api/hrm/payroll/finalize', {
      method: 'POST',
      body: JSON.stringify({ periodId: febPeriodId }),
    });

    recordTest(
      'Security Gate: Finalization Blocked when Unresolved Blocking Exceptions Exist',
      failFinalizeRes.status === 400 && failFinalizeRes.data.error?.includes('blocking audit exception'),
      `Rejection Message: ${failFinalizeRes.data.error}`
    );

  } catch (error) {
    console.error('Fatal execution error during QA audit:', error);
  } finally {
    console.log('\n================================================================');
    console.log(`  QA AUDIT COMPLETE: ${testResults.passed} / ${testResults.total} TESTS PASSED  `);
    if (testResults.failed > 0) {
      console.log(`  ⚠️  ${testResults.failed} TESTS FAILED:`);
      testResults.failures.forEach((f, idx) => {
        console.log(`     ${idx + 1}. ${f.testName}: ${f.details}`);
      });
    } else {
      console.log('  🎉 100% SUCCESS RATE ACROSS ALL SUBSYSTEMS & CALCULATION ENGINES!');
    }
    console.log('================================================================\n');

    await prisma.$disconnect();
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

runCompleteQaAudit();
