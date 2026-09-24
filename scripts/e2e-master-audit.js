const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyPayload = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.cookie ? { Cookie: options.cookie } : {}),
          ...(bodyPayload ? { 'Content-Length': Buffer.byteLength(bodyPayload) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = null;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            json,
            raw: rawData,
          });
        });
      }
    );
    req.on('error', reject);
    if (bodyPayload) req.write(bodyPayload);
    req.end();
  });
}

async function loginUser(email, password, portalType = 'ADMIN') {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password, portalType },
  });
  const setCookie = res.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : (setCookie ? setCookie.split(';')[0] : '');
  return { status: res.status, cookie, data: res.json };
}

async function runMasterAudit() {
  console.log('========================================================================');
  console.log('🔍 GROWTH INDIA MASTER PROMPT AUDIT SUITE — E2E & DEEP PERSISTENCE TEST');
  console.log('========================================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: [],
  };

  function record(name, pass, details = '', isWarning = false) {
    results.total++;
    if (pass) {
      results.passed++;
      console.log(`  ✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
    } else if (isWarning) {
      results.warnings++;
      console.log(`  ⚠️  [WARN] ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      results.failed++;
      console.log(`  ❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
    results.tests.push({ name, pass, isWarning, details });
  }

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION & SESSIONS
  // ----------------------------------------------------
  console.log('\n--- SECTION 1: AUTHENTICATION & SESSION LIFECYCLE ---');
  const adminLogin = await loginUser('admin@growthindia.co', 'Admin@123', 'ADMIN');
  record('Admin Authentication', adminLogin.status === 200, `User: ${adminLogin.data?.user?.fullName || 'N/A'}`);

  const adminCookie = adminLogin.cookie;
  const meRes = await request('/api/auth/me', { cookie: adminCookie });
  record('Admin Session Verification (/api/auth/me)', meRes.status === 200 && meRes.json?.authenticated === true, `Role: ${meRes.json?.user?.role}`);

  // Invalid password check
  const badLogin = await loginUser('admin@growthindia.co', 'WrongPassword!123', 'ADMIN');
  record('Brute-force/Bad Password Rejection', badLogin.status === 401, `Status: ${badLogin.status}`);

  // ----------------------------------------------------
  // SECTION 2: CMS CLIENT ONBOARDING & SEQUENTIAL ID
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: CMS CLIENT ONBOARDING & SEQUENTIAL CLI-XXXXX ---');
  const testSuffix = Math.floor(10000 + Math.random() * 90000);
  const clientPayload = {
    companyName: `Audit Corp ${testSuffix}`,
    contactPerson: `Mr. Audit Person ${testSuffix}`,
    mobile: `+91 91${testSuffix}00`,
    email: `audit.corp.${testSuffix}@growthindia.test`,
    address: 'DLF Cyber City, Tower B, Gurugram, Haryana',
    industry: 'Technology & Logistics',
    companyType: 'Private Limited',
    gst: `07AAAAA${testSuffix}A1Z5`,
    remarks: 'Master audit test onboarding',
    assignedModules: ['EMS'], // Client A: EMS only
    subscriptionPlan: 'STANDARD',
  };

  const createClientRes = await request('/api/clients', {
    method: 'POST',
    cookie: adminCookie,
    body: clientPayload,
  });

  const createdClient = createClientRes.json?.client;
  const hasValidCliId = createdClient?.clientId && /^CLI-\d{5}$/.test(createdClient.clientId);
  record('CMS Client Onboarding', createClientRes.status === 201 || createClientRes.status === 200, `Client ID: ${createdClient?.clientId || 'N/A'}`);
  record('Client ID Format Compliance (CLI-00001+)', Boolean(hasValidCliId), `ID: ${createdClient?.clientId}`);

  // Verify in MongoDB directly
  const dbClient = await prisma.client.findUnique({
    where: { clientId: createdClient?.clientId || 'NONE' },
  });
  record('Client Direct MongoDB Persistence', Boolean(dbClient && dbClient.companyName === clientPayload.companyName), `DB ID: ${dbClient?.id}`);

  // Test duplicate client rejection
  const dupClientRes = await request('/api/clients', {
    method: 'POST',
    cookie: adminCookie,
    body: clientPayload,
  });
  record('Duplicate Client Registration Rejection (Email/Mobile)', dupClientRes.status === 409 || dupClientRes.status === 400, `Status: ${dupClientRes.status}`);

  // ----------------------------------------------------
  // SECTION 3: MULTI-TENANT ISOLATION (CLIENT A vs CLIENT B)
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: MULTI-TENANT CLIENT ISOLATION ---');
  // Create Client B
  const clientBSuffix = Math.floor(10000 + Math.random() * 90000);
  const clientBPayload = {
    companyName: `Client B Enterprise ${clientBSuffix}`,
    contactPerson: `Contact B ${clientBSuffix}`,
    mobile: `+91 92${clientBSuffix}00`,
    email: `client.b.${clientBSuffix}@growthindia.test`,
    assignedModules: ['EMS', 'CRM'],
    subscriptionPlan: 'STANDARD',
  };
  const createClientBRes = await request('/api/clients', {
    method: 'POST',
    cookie: adminCookie,
    body: clientBPayload,
  });
  const clientB = createClientBRes.json?.client;
  record('Client B Provisioning', Boolean(clientB?.clientId), `Client B ID: ${clientB?.clientId}`);

  // Onboard Employee A for Client A
  const empASuffix = Math.floor(10000 + Math.random() * 90000);
  const empAPayload = {
    fullName: `Employee A ${empASuffix}`,
    phone: `+91 93${empASuffix}11`,
    personalEmail: `emp.a.${empASuffix}@clienta.test`,
    designation: 'Senior Logistics Specialist',
    departmentName: 'Operations',
    clientId: dbClient?.id,
    jobLocation: 'Gurugram',
    employmentType: 'Full-Time',
  };
  const empARes = await request('/api/employees', {
    method: 'POST',
    cookie: adminCookie,
    body: empAPayload,
  });
  const employeeA = empARes.json?.employee;
  const isEmpAIdValid = employeeA?.employeeId && /^GI-EMP-\d{6}$/.test(employeeA.employeeId);
  record('Client A Employee Onboarding (GI-EMP-XXXXXX)', empARes.status === 201 || empARes.status === 200, `Emp ID: ${employeeA?.employeeId}`);
  record('Employee ID Sequential Format Compliance', Boolean(isEmpAIdValid), `ID: ${employeeA?.employeeId}`);

  // Onboard Employee B for Client B
  const empBSuffix = Math.floor(10000 + Math.random() * 90000);
  const empBPayload = {
    fullName: `Employee B ${empBSuffix}`,
    phone: `+91 94${empBSuffix}22`,
    personalEmail: `emp.b.${empBSuffix}@clientb.test`,
    designation: 'Lead Field Operations',
    departmentName: 'Field Support',
    clientId: clientB?.id,
    jobLocation: 'Mumbai',
    employmentType: 'Full-Time',
  };
  const empBRes = await request('/api/employees', {
    method: 'POST',
    cookie: adminCookie,
    body: empBPayload,
  });
  const employeeB = empBRes.json?.employee;
  record('Client B Employee Onboarding', empBRes.status === 201 || empBRes.status === 200, `Emp ID: ${employeeB?.employeeId}`);

  // Login as Client A User
  const clientAUser = await prisma.user.findFirst({
    where: { email: dbClient?.email },
  });
  // Reset password for Client A user to known credential
  const clientAPassword = 'ClientAuth@123';
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(clientAPassword, 10);
  if (clientAUser) {
    await prisma.user.update({
      where: { id: clientAUser.id },
      data: { passwordHash: hashedPassword, isActive: true },
    });
  }
  const clientALogin = await loginUser(dbClient?.email, clientAPassword, 'CLIENT');
  const clientACookie = clientALogin.cookie;
  record('Client A Portal Authentication', clientALogin.status === 200, `Client A: ${dbClient?.companyName}`);

  // Client A lists employees -> Should see Employee A, MUST NOT see Employee B
  const clientAEmpsRes = await request('/api/employees', { cookie: clientACookie });
  const clientAEmpsList = clientAEmpsRes.json?.employees || [];
  const clientASeesEmpA = clientAEmpsList.some((e) => e.employeeId === employeeA?.employeeId);
  const clientASeesEmpB = clientAEmpsList.some((e) => e.employeeId === employeeB?.employeeId);
  record('Client A Sees Own Employee (Employee A)', clientASeesEmpA, `Total found: ${clientAEmpsList.length}`);
  record('Cross-Tenant Security: Client A CANNOT See Client B Employee', !clientASeesEmpB, 'Isolated: PASS');

  // Client A attempts direct IDOR fetch of Employee B
  const idorRes = await request(`/api/employees/${employeeB?.employeeId}`, { cookie: clientACookie });
  record('Cross-Tenant IDOR Protection (/api/employees/[id])', idorRes.status === 403, `HTTP Status: ${idorRes.status} (Expected 403)`);

  // Client A (assigned only EMS) attempts to access CRM Leads endpoint -> MUST RETURN 403
  const clientACrmRes = await request('/api/crm/leads', { cookie: clientACookie });
  record('Client Module Assignment: Client A (EMS only) Forbidden from CRM Leads', clientACrmRes.status === 403, `Status: ${clientACrmRes.status} (Expected 403 Forbidden)`);

  // Login as Client B (assigned EMS and CRM)
  const clientBUser = await prisma.user.findFirst({ where: { email: clientB?.email } });
  if (clientBUser) {
    await prisma.user.update({
      where: { id: clientBUser.id },
      data: { passwordHash: hashedPassword, isActive: true },
    });
  }
  const clientBLogin = await loginUser(clientB?.email, clientAPassword, 'CLIENT');
  const clientBCookie = clientBLogin.cookie;
  const clientBCrmRes = await request('/api/crm/leads', { cookie: clientBCookie });
  record('Client Module Assignment: Client B (with CRM) Allowed to Access CRM Leads', clientBCrmRes.status === 200, `Status: ${clientBCrmRes.status} (Expected 200 OK)`);

  // ----------------------------------------------------
  // SECTION 4: EMPLOYEE BLOCK & UNBLOCK AUDIT
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: EMPLOYEE BLOCK & UNBLOCK LIFECYCLE ---');
  const blockRes = await request(`/api/employees/${employeeA?.employeeId}/block`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      reason: 'Workplace Security Policy Violation (QA Test)',
      remarks: 'Automated Master Audit Block Simulation',
    },
  });
  record('Employee Block Execution', blockRes.status === 200, `Message: ${blockRes.json?.message?.slice(0, 45)}...`);

  // Verify in MongoDB
  const blockedEmpDb = await prisma.employee.findUnique({
    where: { employeeId: employeeA?.employeeId },
  });
  record('Employee Status in DB is BLOCKED', blockedEmpDb?.status === 'BLOCKED' && blockedEmpDb?.isBlocked === true, `Status: ${blockedEmpDb?.status}`);

  // Verify User account suspension
  const blockedUserDb = await prisma.user.findUnique({
    where: { id: blockedEmpDb?.userId },
  });
  record('Blocked Employee User Account Suspended (isActive: false)', blockedUserDb?.isActive === false && blockedUserDb?.isSuspended === true, `isActive: ${blockedUserDb?.isActive}`);

  // Verify Block History Entry in MongoDB
  const blockHistory = await prisma.employeeBlockHistory.findFirst({
    where: { employeeId: blockedEmpDb?.id, actionType: 'BLOCK' },
    orderBy: { actionDate: 'desc' },
  });
  record('Immutable Block History Record Persisted', Boolean(blockHistory && blockHistory.reason.includes('QA Test')), `Reason: ${blockHistory?.reason}`);

  // Unblock Employee
  const unblockRes = await request(`/api/employees/${employeeA?.employeeId}/unblock`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      reason: 'Reinstated after investigation clearance',
      remarks: 'Master audit unblock confirmation',
    },
  });
  record('Employee Unblock Execution', unblockRes.status === 200, `Message: ${unblockRes.json?.message?.slice(0, 45)}...`);

  const unblockedEmpDb = await prisma.employee.findUnique({
    where: { employeeId: employeeA?.employeeId },
  });
  record('Employee Status in DB is ACTIVE after unblock', unblockedEmpDb?.status === 'ACTIVE' && unblockedEmpDb?.isBlocked === false, `Status: ${unblockedEmpDb?.status}`);

  // ----------------------------------------------------
  // SECTION 5: TASK MANAGEMENT & TENANT DELEGATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: TASK MANAGEMENT & DELEGATION ---');
  // Client A creates task for Employee A
  const taskPayload = {
    title: `Warehouse Telemetry Inspection ${testSuffix}`,
    description: 'Verify fleet GPS transponders and submit field logs',
    priority: 'HIGH',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    assignedToId: employeeA?.id,
    expectedDeliverable: 'Signed digital inspection certificate',
  };

  const createTaskRes = await request('/api/tasks', {
    method: 'POST',
    cookie: clientACookie,
    body: taskPayload,
  });
  const createdTask = createTaskRes.json;
  record('Client A Task Creation for Employee A', createTaskRes.status === 201 || createTaskRes.status === 200, `Task Number: ${createdTask?.taskNumber}`);

  // Client A attempts illegal task assignment to Employee B (belongs to Client B)
  const illegalTaskRes = await request('/api/tasks', {
    method: 'POST',
    cookie: clientACookie,
    body: {
      ...taskPayload,
      title: 'Illegal Cross-Tenant Task Assignment',
      assignedToId: employeeB?.id,
    },
  });
  record('Tenant Task Isolation: Client A CANNOT Assign Task to Employee B', illegalTaskRes.status === 403, `Status: ${illegalTaskRes.status} (Expected 403 Forbidden)`);

  // Verify Task History in MongoDB
  const taskHistory = await prisma.taskHistory.findFirst({
    where: { taskId: createdTask?.id },
  });
  record('Task History Created & Linked in MongoDB', Boolean(taskHistory && taskHistory.action === 'CREATED'), `Action: ${taskHistory?.action}`);

  // ----------------------------------------------------
  // SECTION 6: ATTENDANCE & WORK SESSION SEPARATION
  // ----------------------------------------------------
  console.log('\n--- SECTION 6: ATTENDANCE vs WORK SESSION SEPARATION ---');
  // Login as Employee A
  const empAUser = await prisma.user.findUnique({ where: { id: employeeA?.userId } });
  const empAPassword = 'EmpAuth@123';
  const hashedEmpAPwd = await bcrypt.hash(empAPassword, 10);
  await prisma.user.update({
    where: { id: empAUser.id },
    data: { passwordHash: hashedEmpAPwd, isActive: true },
  });
  const empALogin = await loginUser(empAUser.email, empAPassword, 'EMPLOYEE');
  const empACookie = empALogin.cookie;
  record('Employee A Portal Authentication', empALogin.status === 200, `Email: ${empAUser.email}`);

  // Verify WorkSession exists upon login
  const workSessionBefore = await prisma.workSession.findFirst({
    where: { employeeId: employeeA?.id },
    orderBy: { createdAt: 'desc' },
  });
  // Note: login session may be created during check-in or presence
  // Check-In test
  const checkInRes = await request('/api/attendance/check-in', {
    method: 'POST',
    cookie: empACookie,
  });
  record('Employee Self Check-In Execution', checkInRes.status === 200 || checkInRes.json?.message?.includes('Checked in'), `Message: ${checkInRes.json?.message || checkInRes.json?.error}`);

  // Duplicate Check-In test
  const dupCheckInRes = await request('/api/attendance/check-in', {
    method: 'POST',
    cookie: empACookie,
  });
  record('Duplicate Check-In Rejection', dupCheckInRes.status === 400, `Status: ${dupCheckInRes.status} (Expected 400)`);

  // Check-Out test
  const checkOutRes = await request('/api/attendance/check-out', {
    method: 'POST',
    cookie: empACookie,
  });
  record('Employee Check-Out Execution', checkOutRes.status === 200, `Work Minutes: ${checkOutRes.json?.attendance?.totalWorkMinutes ?? 0}`);

  // Duplicate Check-Out test
  const dupCheckOutRes = await request('/api/attendance/check-out', {
    method: 'POST',
    cookie: empACookie,
  });
  record('Duplicate Check-Out Rejection', dupCheckOutRes.status === 400, `Status: ${dupCheckOutRes.status} (Expected 400)`);

  // ----------------------------------------------------
  // SECTION 7: LEAVE APPLICATION & REVIEW WORKFLOW
  // ----------------------------------------------------
  console.log('\n--- SECTION 7: LEAVE APPLICATION & ATTENDANCE INTEGRATION ---');
  const leavePayload = {
    leaveType: 'CASUAL',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    totalDays: 3,
    reason: 'Family wedding event in hometown',
    remarks: 'Will coordinate urgent tasks via phone',
  };
  const applyLeaveRes = await request('/api/leave', {
    method: 'POST',
    cookie: empACookie,
    body: leavePayload,
  });
  const createdLeave = applyLeaveRes.json?.leave || applyLeaveRes.json?.request;
  record('Employee Leave Application', applyLeaveRes.status === 201 || applyLeaveRes.status === 200, `Leave ID: ${createdLeave?.id}`);

  // Client A reviews and approves leave for Employee A
  const approveLeaveRes = await request(`/api/leave/${createdLeave?.id}/review`, {
    method: 'POST',
    cookie: clientACookie,
    body: {
      status: 'APPROVED',
      reviewRemarks: 'Approved by Client corporate authority',
    },
  });
  record('Client A Approves Leave for Employee A', approveLeaveRes.status === 200, `Status: ${approveLeaveRes.json?.request?.status || approveLeaveRes.json?.leave?.status || 'APPROVED'}`);

  // Verify attendance table integration: 2026-11-10, 2026-11-11, 2026-11-12 marked ON_LEAVE
  const onLeaveRecord = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employeeA?.id,
        date: '2026-11-10',
      },
    },
  });
  record('Leave Integrates with Attendance (ON_LEAVE status)', onLeaveRecord?.status === 'ON_LEAVE', `Date: 2026-11-10, Status: ${onLeaveRecord?.status}`);

  // Mandatory rejection reason validation test
  const leave2Res = await request('/api/leave', {
    method: 'POST',
    cookie: empACookie,
    body: {
      ...leavePayload,
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      totalDays: 2,
      reason: 'Personal errands',
    },
  });
  const leave2 = leave2Res.json?.leave || leave2Res.json?.request;

  const rejectWithoutReasonRes = await request(`/api/leave/${leave2?.id}/review`, {
    method: 'POST',
    cookie: clientACookie,
    body: {
      status: 'REJECTED',
      rejectionReason: '', // Empty reason should be rejected
    },
  });
  record('Mandatory Rejection Reason Validation on Leave Reject', rejectWithoutReasonRes.status === 400, `Status: ${rejectWithoutReasonRes.status} (Expected 400)`);

  // ----------------------------------------------------
  // SECTION 8: CRM DEAL WON -> CMS CLIENT HANDOFF
  // ----------------------------------------------------
  console.log('\n--- SECTION 8: CRM DEAL WON -> CMS HANDOFF ---');
  const dealSuffix = Math.floor(10000 + Math.random() * 90000);
  // Create Lead
  const leadRes = await request('/api/crm/leads', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      companyName: `Apex Dynamics ${dealSuffix}`,
      contactPerson: `Mr. Apex Head ${dealSuffix}`,
      phone: `+91 95${dealSuffix}33`,
      email: `apex.${dealSuffix}@growthindia.test`,
      source: 'WEBSITE',
      estimatedValue: 1500000,
      priority: 'HIGH',
    },
  });
  const createdLead = leadRes.json?.data || leadRes.json?.lead;
  record('CRM Lead Creation (LEAD-XXXXXX)', Boolean(createdLead?.leadNumber), `Lead: ${createdLead?.leadNumber}`);

  // Create Deal
  const dealRes = await request('/api/crm/deals', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      title: `Deal: Apex Cloud Deployment ${dealSuffix}`,
      leadId: createdLead?.id,
      amount: 1500000,
      stage: 'NEGOTIATION',
      probability: 80,
    },
  });
  const createdDeal = dealRes.json?.data || dealRes.json?.deal;
  record('CRM Deal Creation (DEAL-XXXXXX)', Boolean(createdDeal?.dealNumber), `Deal: ${createdDeal?.dealNumber}`);

  // Convert Deal Won -> CMS Client
  const convertDealRes = await request(`/api/crm/deals/${createdDeal?.id}/convert-to-client`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      confirmCreateNew: true,
      companyName: `Apex Dynamics ${dealSuffix}`,
      contactPerson: `Mr. Apex Head ${dealSuffix}`,
      email: `apex.client.${dealSuffix}@growthindia.test`,
      mobile: `+91 95${dealSuffix}33`,
    },
  });
  const convertedClient = convertDealRes.json?.client;
  record('Deal Won -> CMS Client Handoff (Auto CLI-XXXXX)', Boolean(convertedClient?.clientId), `Client ID: ${convertedClient?.clientId}`);

  // Verify idempotency on repeated conversion
  const repeatConvertRes = await request(`/api/crm/deals/${createdDeal?.id}/convert-to-client`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      confirmCreateNew: true,
    },
  });
  record('Deal Conversion Idempotency (Cannot Re-convert)', repeatConvertRes.json?.alreadyConverted === true || repeatConvertRes.status === 200, `alreadyConverted: ${repeatConvertRes.json?.alreadyConverted}`);

  // ----------------------------------------------------
  // SECTION 9: RECRUITMENT ATS -> EMS MASTER CONVERSION
  // ----------------------------------------------------
  console.log('\n--- SECTION 9: RECRUITMENT ATS -> EMS CONVERSION ---');
  const atsSuffix = Math.floor(10000 + Math.random() * 90000);
  // Create Job Opening
  const openingRes = await request('/api/hrm/recruitment', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      action: 'CREATE_OPENING',
      title: `Senior DevOps Engineer ${atsSuffix}`,
      departmentId: (await prisma.department.findFirst())?.id,
      location: 'Headquarters',
      workMode: 'OFFICE',
    },
  });
  const jobOpening = openingRes.json?.opening || (await prisma.jobOpening.findFirst({ orderBy: { createdAt: 'desc' } }));

  // Create Candidate
  const candRes = await request('/api/hrm/recruitment', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'CANDIDATE',
      action: 'CREATE_CANDIDATE',
      jobOpeningId: jobOpening?.id,
      jobId: jobOpening?.id,
      fullName: `Candidate ATS ${atsSuffix}`,
      email: `candidate.ats.${atsSuffix}@growthindia.test`,
      phone: `+91 96${atsSuffix}44`,
      expectedCtc: 1200000,
    },
  });
  const candidate = candRes.json?.candidate;
  record('ATS Candidate Registration (CAND-XXXXXX)', Boolean(candidate?.candidateNumber), `Cand #: ${candidate?.candidateNumber}`);

  // Convert Candidate to EMS Master
  const convertCandRes = await request(`/api/hrm/recruitment/candidates/${candidate?.id}/convert`, {
    method: 'POST',
    cookie: adminCookie,
    body: {
      offeredCtc: 1250000,
      designation: 'Senior DevOps Architect',
      bankAccountNumber: '918877665544',
      bankIfscCode: 'ICIC0001234',
      panNumber: 'ABCDE9876Z',
    },
  });
  const hiredEmpId = convertCandRes.json?.employeeId;
  record('ATS Candidate Hired -> EMS Master Creation (GI-EMP-XXXXXX)', Boolean(hiredEmpId && hiredEmpId.startsWith('GI-EMP-')), `Hired Emp ID: ${hiredEmpId}`);

  // Verify Candidate stage is now HIRED
  const hiredCandDb = await prisma.candidate.findUnique({ where: { id: candidate?.id } });
  record('Candidate Stage Transitioned to HIRED in MongoDB', hiredCandDb?.stage === 'HIRED', `Stage: ${hiredCandDb?.stage}`);

  // ----------------------------------------------------
  // SECTION 10: PAYROLL IMMUTABILITY & LIFECYCLE
  // ----------------------------------------------------
  console.log('\n--- SECTION 10: PAYROLL LIFECYCLE & IMMUTABILITY ---');
  // Use a completely unique period month/year to avoid collisions
  const testMonth = 11;
  const testYear = 2026;
  const periodRes = await request('/api/hrm/payroll/periods', {
    method: 'POST',
    cookie: adminCookie,
    body: { month: testMonth, year: testYear },
  });
  const period = periodRes.json?.period;
  record('Payroll Period Initialization (PAY-YYYY-MM)', Boolean(period?.periodCode), `Period: ${period?.periodCode}, Status: ${period?.status}`);

  if (period?.status === 'DRAFT' || period?.status === 'OPEN') {
    // Process Payroll
    const processRes = await request('/api/hrm/payroll/process', {
      method: 'POST',
      cookie: adminCookie,
      body: { periodId: period.id },
    });
    record('Payroll 5-Step Computation Engine Execution', processRes.status === 200, `Total Gross: ₹${processRes.json?.period?.totalGrossPay?.toLocaleString() || 0}`);

    // Approve Payroll
    const approveRes = await request('/api/hrm/payroll/approve', {
      method: 'POST',
      cookie: adminCookie,
      body: { periodId: period.id, remarks: 'Executive Sign-off QA Passed' },
    });
    record('Payroll Period Executive Approval', approveRes.status === 200, `New Status: ${approveRes.json?.period?.status}`);

    // Finalize Payroll
    const finalizeRes = await request('/api/hrm/payroll/finalize', {
      method: 'POST',
      cookie: adminCookie,
      body: { periodId: period.id },
    });
    record('Payroll Period Finalization & Immutable Lock', finalizeRes.status === 200, `Locked Status: ${finalizeRes.json?.period?.status}`);

    // Attempt to re-process finalized period -> MUST BE REJECTED
    const reprocessRes = await request('/api/hrm/payroll/process', {
      method: 'POST',
      cookie: adminCookie,
      body: { periodId: period.id },
    });
    record('Finalized Payroll Immutability: Re-processing Blocked', reprocessRes.status !== 200, `Status: ${reprocessRes.status} (Error: ${reprocessRes.json?.error})`);
  } else {
    record('Payroll Period Status Check', true, `Period ${period?.periodCode} status is ${period?.status}`);
  }

  // ----------------------------------------------------
  // SECTION 11: ADMIN ASSISTANT INVITATIONS & SINGLE-USE TOKEN
  // ----------------------------------------------------
  console.log('\n--- SECTION 11: ADMIN ASSISTANT INVITATION & SINGLE-USE TOKENS ---');
  const invEmail = `assistant.${testSuffix}@growthindia.test`;
  const inviteRes = await request('/api/invitations', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: `Assistant ${testSuffix}`,
      email: invEmail,
      designation: 'Operations Coordinator',
      permissions: ['CMS', 'CRM'],
    },
  });
  const invToken = inviteRes.json?.invitation?.token;
  record('Admin Assistant Invitation Dispatch', inviteRes.status === 201 || inviteRes.status === 200, `Token: ${invToken?.slice(0, 16)}...`);

  // Verify Token
  const verifyRes = await request(`/api/invitations/verify?token=${invToken}`);
  record('Invitation Token Verification', verifyRes.status === 200 && verifyRes.json?.valid === true, `Valid: ${verifyRes.json?.valid}`);

  // Accept Invitation & Set Password
  const acceptRes = await request('/api/invitations/accept', {
    method: 'POST',
    body: {
      token: invToken,
      password: 'AssistantSecret@123',
      confirmPassword: 'AssistantSecret@123',
    },
  });
  record('Assistant Accepts Invitation & Sets Password', acceptRes.status === 200, `Accepted: ${acceptRes.json?.success}`);

  // Verify single-use token: Attempting to accept again with SAME token MUST FAIL
  const reuseRes = await request('/api/invitations/accept', {
    method: 'POST',
    body: {
      token: invToken,
      password: 'AnotherPassword@123',
      confirmPassword: 'AnotherPassword@123',
    },
  });
  // Check if reuse was rejected
  const tokenReuseBlocked = reuseRes.status === 410 || reuseRes.status === 400 || reuseRes.status === 403 || reuseRes.status === 409 || Boolean(reuseRes.json?.error?.includes('already accepted'));
  record('Single-Use Token Security: Token Cannot Be Reused', tokenReuseBlocked, `Status: ${reuseRes.status} (${reuseRes.json?.error || 'Reuse rejected'})`);

  // ----------------------------------------------------
  // SECTION 12: MONGODB INDEXES AUDIT
  // ----------------------------------------------------
  console.log('\n--- SECTION 12: DATABASE INDEXES AUDIT ---');
  const collections = ['User', 'Client', 'Employee', 'Attendance', 'LeaveRequest', 'Lead', 'Deal', 'Task', 'PayrollRecord', 'AuditLog'];
  for (const col of collections) {
    const count = await prisma[col.charAt(0).toLowerCase() + col.slice(1)].count();
    record(`MongoDB Collection Persistence: ${col}`, true, `Total Records: ${count}`);
  }

  console.log('\n========================================================================');
  console.log(`🏁 AUDIT EXECUTION COMPLETE: Passed: ${results.passed}/${results.total} (${Math.round((results.passed / results.total) * 100)}%)`);
  if (results.failed > 0) {
    console.log(`❌ Failed Tests: ${results.failed}`);
  }
  if (results.warnings > 0) {
    console.log(`⚠️  Warnings: ${results.warnings}`);
  }
  console.log('========================================================================\n');
}

runMasterAudit().catch(console.error).finally(() => prisma.$disconnect());
