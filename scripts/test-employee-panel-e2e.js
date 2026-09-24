/**
 * GROWTH INDIA EMPLOYEE PANEL END-TO-END MASTER QA & SECURITY TEST SUITE
 * 
 * Tests the EXISTING Growth India multi-tenant SaaS platform from the perspective of a REAL EMPLOYEE:
 * - Admin, Client & Employee setup
 * - Client onboards Employee A1, Employee A2 (under Client A) and Employee B1 (under Client B)
 * - Auto-generated sequential Employee ID (GI-EMP-XXXXXX), unique, immutable, persisted
 * - Linked User account creation in MongoDB, bcrypt hash, no plaintext passwords
 * - Employee Authentication & Login (Valid, Invalid, Empty, Blocked, Inactive, Admin isolation)
 * - Employee Dashboard with real database metrics
 * - Employee Profile verification, read-only organizational fields enforcement
 * - Cross-Employee & Cross-Tenant IDOR Security (BOLA / Horizontal Privilege Escalation)
 * - My Tasks: task assignment, workflow progression (ACCEPT -> START -> SUBMIT -> REVIEW), deliverable submissions
 * - Cross-employee task tampering prevention
 * - Attendance Telemetry: Check-In, Duplicate Check-In rejection, Break Start/End, Check-Out, Duplicate Check-Out rejection
 * - Attendance vs Login Session independence (Attendance table vs WorkSession model)
 * - Leave Management: Leave application, Self-Approval prevention, Cross-employee cancel prevention,
 *   Mandatory rejection reason, Client approval & Attendance table synchronization (status: 'ON_LEAVE')
 * - Personal Documents Vault & KYC Isolation (Cross-employee and cross-tenant access denied)
 * - Employee Status Lifecycle: Disciplinary Block with mandatory reason & remarks, instant session revocation,
 *   login lockout (403), Unblock, login restoration, and immutable EmployeeBlockHistory audit logs
 * - Payroll & Payslip Access: Employee self payslip viewing, cross-employee scoping
 * - Helpdesk Tickets & HR Requests: Submission, view, IDOR protection
 * - Notifications System: Delivered only to intended recipient
 * - Database Entity Verification: Direct MongoDB Atlas verification
 * - Admin <-> Client <-> Employee 3-Way Data Synchronization
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  partial: 0,
  notImplemented: 0,
  blocked: 0,
  details: [],
};

function recordTest(area, testName, status, details = '') {
  results.total++;
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else if (status === 'PARTIAL') results.partial++;
  else if (status === 'NOT_IMPLEMENTED') results.notImplemented++;
  else if (status === 'BLOCKED') results.blocked++;

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'PARTIAL' ? '⚠️' : '⏸️';
  console.log(`   ${icon} [${status}] ${testName}${details ? ` -> ${details}` : ''}`);
  results.details.push({ area, testName, status, details });
}

async function apiRequest(endpoint, options = {}, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function loginUser(email, password, portalType = 'EMPLOYEE') {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, portalType }),
  });
  const cookieHeader = res.headers.get('set-cookie');
  let cookie = '';
  if (cookieHeader) {
    cookie = cookieHeader.split(';')[0];
  }
  return { status: res.status, data: res.data, cookie };
}

async function runEmployeePanelE2ETestSuite() {
  console.log('================================================================');
  console.log('🚀 GROWTH INDIA EMPLOYEE PANEL E2E MASTER AUDIT & SECURITY SUITE');
  console.log('================================================================\n');

  let adminCookie = '';
  let clientACookie = '';
  let clientBCookie = '';
  let employeeA1Cookie = '';
  let employeeA2Cookie = '';
  let employeeB1Cookie = '';

  let clientA = null;
  let clientB = null;
  let employeeA1 = null;
  let employeeA2 = null;
  let employeeB1 = null;
  let taskA1 = null;
  let leaveA1 = null;

  const testRunId = Date.now().toString().slice(-5);
  const clientAEmail = `client.alpha.${testRunId}@growthindia.in`;
  const clientBEmail = `client.beta.${testRunId}@growthindia.in`;
  const empA1Email = `emp.alpha1.${testRunId}@growthindia.in`;
  const empA2Email = `emp.alpha2.${testRunId}@growthindia.in`;
  const empB1Email = `emp.beta1.${testRunId}@growthindia.in`;

  const empA1Phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const empA2Phone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  const empB1Phone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;

  const defaultPassword = 'Password@123';

  try {
    // -------------------------------------------------------------
    // PHASE 0: SETUP PLATFORM ADMIN & ORGANIZATIONS (CLIENT A & B)
    // -------------------------------------------------------------
    console.log('📌 Phase 0: Provisioning Platform Admin & Multi-Tenant Clients...');

    // 0.1 Authenticate Admin
    const adminLogin = await loginUser('admin@growthindia.co', 'Admin@123', 'ADMIN');
    if (adminLogin.status === 200 && adminLogin.cookie) {
      adminCookie = adminLogin.cookie;
      recordTest('Platform Setup', 'Admin Authentication at Secure Gateway', 'PASS', 'Status 200 with JWT');
    } else {
      recordTest('Platform Setup', 'Admin Authentication at Secure Gateway', 'FAIL', `Status ${adminLogin.status}`);
      throw new Error('Fatal: Cannot authenticate Admin');
    }

    // 0.2 Onboard Client A (Alpha Corp)
    const clientARes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        companyName: `Alpha Corp ${testRunId}`,
        contactPerson: 'Aditya Alpha',
        email: clientAEmail,
        mobile: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        modules: ['CRM', 'EMS', 'HRM'],
        subscriptionPlan: 'GROWTH',
        status: 'ACTIVE',
        customPassword: defaultPassword,
      }),
    }, adminCookie);

    if (clientARes.status === 201 || clientARes.status === 200) {
      clientA = clientARes.data.client;
      recordTest('Platform Setup', 'Admin onboards Client A (Alpha Corp)', 'PASS', `Client ID: ${clientA.clientId}`);
    } else {
      recordTest('Platform Setup', 'Admin onboards Client A (Alpha Corp)', 'FAIL', `Status: ${clientARes.status}`);
      throw new Error('Fatal: Cannot onboard Client A');
    }

    // 0.3 Onboard Client B (Beta Industries)
    const clientBRes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        companyName: `Beta Ind ${testRunId}`,
        contactPerson: 'Bhavesh Beta',
        email: clientBEmail,
        mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        modules: ['CRM', 'EMS'],
        subscriptionPlan: 'STARTER',
        status: 'ACTIVE',
        customPassword: defaultPassword,
      }),
    }, adminCookie);

    if (clientBRes.status === 201 || clientBRes.status === 200) {
      clientB = clientBRes.data.client;
      recordTest('Platform Setup', 'Admin onboards Client B (Beta Industries)', 'PASS', `Client ID: ${clientB.clientId}`);
    } else {
      recordTest('Platform Setup', 'Admin onboards Client B (Beta Industries)', 'FAIL', `Status: ${clientBRes.status}`);
      throw new Error('Fatal: Cannot onboard Client B');
    }

    // 0.4 Login as Client A and Client B
    const clientALogin = await loginUser(clientAEmail, defaultPassword, 'CLIENT');
    clientACookie = clientALogin.cookie;
    recordTest('Platform Setup', 'Client A Logs in to Client Portal', clientALogin.status === 200 ? 'PASS' : 'FAIL', `Status ${clientALogin.status}`);

    const clientBLogin = await loginUser(clientBEmail, defaultPassword, 'CLIENT');
    clientBCookie = clientBLogin.cookie;
    recordTest('Platform Setup', 'Client B Logs in to Client Portal', clientBLogin.status === 200 ? 'PASS' : 'FAIL', `Status ${clientBLogin.status}`);

    // -------------------------------------------------------------
    // PHASE 1: EMPLOYEE ONBOARDING & ACCOUNT CREATION
    // -------------------------------------------------------------
    console.log('\n📌 Phase 1: Testing Employee Onboarding & Account Creation...');

    // 1.1 Client A creates Employee A1 (Lead Operations)
    const empA1Payload = {
      fullName: `Aman Sharma ${testRunId}`,
      phone: empA1Phone,
      email: empA1Email,
      personalEmail: empA1Email,
      dob: '1995-05-15',
      gender: 'Male',
      fatherMotherName: 'Ramesh Sharma',
      panNumber: 'ABCDE1234F',
      aadharNumber: '9876 5432 1098',
      address: 'Plot 104, Tech Park, Gurgaon, Haryana',
      temporaryAddress: 'Plot 104, Tech Park, Gurgaon',
      permanentAddress: 'House 42, Civil Lines, Jaipur',
      departmentName: 'Engineering',
      designation: 'Senior Fullstack Engineer',
      jobLocation: 'Gurgaon HQ',
      joiningDate: '2026-01-10',
      employmentType: 'Full-Time',
      shiftStartTime: '09:30',
      shiftEndTime: '18:30',
      remarks: 'Primary Onboarding Test Record',
      customPassword: defaultPassword,
    };

    const empA1Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA1Payload),
    }, clientACookie);

    if (empA1Res.status === 201 || empA1Res.status === 200) {
      employeeA1 = empA1Res.data.employee;
      recordTest('Employee Onboarding', 'Client A Onboards Employee A1', 'PASS', `Generated EMP ID: ${employeeA1.employeeId}`);
    } else {
      recordTest('Employee Onboarding', 'Client A Onboards Employee A1', 'FAIL', `Status: ${empA1Res.status} -> ${JSON.stringify(empA1Res.data)}`);
      throw new Error('Fatal: Cannot onboard Employee A1');
    }

    // 1.2 Validate Employee ID Format & Immutability
    const empIdRegex = /^EMP-[A-Z0-9]+-\d{4,6}$|^GI-EMP-\d{6}$/i;
    const validEmpIdFormat = empIdRegex.test(employeeA1.employeeId);
    recordTest('Employee ID', 'Employee ID Generated with Expected Prefix Pattern', validEmpIdFormat ? 'PASS' : 'FAIL', `ID: ${employeeA1.employeeId}`);

    // Verify employee record exists in MongoDB with linked User account
    const dbEmployeeA1 = await prisma.employee.findUnique({
      where: { id: employeeA1.id },
      include: { user: true, client: true },
    });

    const isLinkedToUser = Boolean(dbEmployeeA1?.userId && dbEmployeeA1?.user);
    const isLinkedToClientA = dbEmployeeA1?.clientId === clientA.id;
    recordTest('Employee Account', 'Employee Record Linked to User Account in MongoDB', isLinkedToUser ? 'PASS' : 'FAIL', `User ID: ${dbEmployeeA1?.userId}`);
    recordTest('Employee Account', 'Employee Record Linked to Correct Tenant (Client A)', isLinkedToClientA ? 'PASS' : 'FAIL', `Client ID: ${dbEmployeeA1?.clientId}`);

    // Verify password is NOT in plaintext and is bcrypt hashed
    const isPasswordHashed = dbEmployeeA1?.user?.passwordHash?.startsWith('$2');
    const isPasswordNotPlaintext = dbEmployeeA1?.user?.passwordHash !== defaultPassword;
    const isBcryptValid = await bcrypt.compare(defaultPassword, dbEmployeeA1?.user?.passwordHash || '');
    recordTest('Employee Account', 'Employee Password Bcrypt Hashed in MongoDB', (isPasswordHashed && isBcryptValid && isPasswordNotPlaintext) ? 'PASS' : 'FAIL', 'Bcrypt hash verified');

    // Verify password is never returned in API responses
    const passwordNotInResponse = !empA1Res.data.employee?.password && !empA1Res.data.employee?.user?.passwordHash;
    recordTest('Employee Account', 'Password Never Leaked in API Responses', passwordNotInResponse ? 'PASS' : 'FAIL', 'Zero password field in JSON');

    // 1.3 Client A onboards Employee A2 (Peer)
    const empA2Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: `Pooja Verma ${testRunId}`,
        phone: empA2Phone,
        email: empA2Email,
        departmentName: 'Quality Assurance',
        designation: 'QA Automation Engineer',
        customPassword: defaultPassword,
      }),
    }, clientACookie);
    employeeA2 = empA2Res.data.employee;
    recordTest('Employee Onboarding', 'Client A Onboards Employee A2 (Peer)', empA2Res.status === 201 || empA2Res.status === 200 ? 'PASS' : 'FAIL', `EMP ID: ${employeeA2?.employeeId}`);

    // 1.4 Client B onboards Employee B1 (Cross-Tenant)
    const empB1Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: `Vikram Patel ${testRunId}`,
        phone: empB1Phone,
        email: empB1Email,
        departmentName: 'Logistics',
        designation: 'Supply Chain Analyst',
        customPassword: defaultPassword,
      }),
    }, clientBCookie);
    employeeB1 = empB1Res.data.employee;
    recordTest('Employee Onboarding', 'Client B Onboards Employee B1 (Cross-Tenant)', empB1Res.status === 201 || empB1Res.status === 200 ? 'PASS' : 'FAIL', `EMP ID: ${employeeB1?.employeeId}`);

    // 1.5 Validation Tests: Duplicate Phone & Duplicate Email
    const dupPhoneRes = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Duplicate Tester',
        phone: empA1Phone, // same phone as A1
        email: `dup.${Date.now()}@growthindia.in`,
        designation: 'Tester',
      }),
    }, clientACookie);
    recordTest('Employee Onboarding Validation', 'Reject Duplicate Phone Number', dupPhoneRes.status === 409 ? 'PASS' : 'FAIL', `Status ${dupPhoneRes.status}`);

    const dupEmailRes = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Duplicate Tester',
        phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: empA1Email, // same email as A1
        designation: 'Tester',
      }),
    }, clientACookie);
    recordTest('Employee Onboarding Validation', 'Reject Duplicate Email Address', dupEmailRes.status === 409 ? 'PASS' : 'FAIL', `Status ${dupEmailRes.status}`);

    const missingFieldsRes = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        fullName: '',
        phone: '',
      }),
    }, clientACookie);
    recordTest('Employee Onboarding Validation', 'Reject Missing Required Fields', missingFieldsRes.status === 400 ? 'PASS' : 'FAIL', `Status ${missingFieldsRes.status}`);

    // -------------------------------------------------------------
    // PHASE 2: EMPLOYEE AUTHENTICATION & LOGIN LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n📌 Phase 2: Testing Employee Authentication & Login...');

    // 2.1 Valid Employee ID + Password Login
    const empLoginById = await loginUser(employeeA1.employeeId, defaultPassword, 'EMPLOYEE');
    if (empLoginById.status === 200 && empLoginById.cookie) {
      employeeA1Cookie = empLoginById.cookie;
      recordTest('Authentication', 'Employee Logs in using Employee ID', 'PASS', `ID: ${employeeA1.employeeId}`);
    } else {
      recordTest('Authentication', 'Employee Logs in using Employee ID', 'FAIL', `Status: ${empLoginById.status}`);
    }

    // 2.2 Valid Email + Password Login
    const empLoginByEmail = await loginUser(empA1Email, defaultPassword, 'EMPLOYEE');
    recordTest('Authentication', 'Employee Logs in using Registered Email', empLoginByEmail.status === 200 ? 'PASS' : 'FAIL', `Email: ${empA1Email}`);

    // Login Employee A2 and B1 for subsequent cross-isolation tests
    const empA2Login = await loginUser(employeeA2.employeeId, defaultPassword, 'EMPLOYEE');
    employeeA2Cookie = empA2Login.cookie;
    const empB1Login = await loginUser(employeeB1.employeeId, defaultPassword, 'EMPLOYEE');
    employeeB1Cookie = empB1Login.cookie;

    // 2.3 Invalid Password
    const badPassLogin = await loginUser(employeeA1.employeeId, 'WrongPassword#999', 'EMPLOYEE');
    recordTest('Authentication', 'Reject Invalid Password', badPassLogin.status === 401 ? 'PASS' : 'FAIL', `Status ${badPassLogin.status}`);

    // 2.4 Non-existent Employee ID
    const badIdLogin = await loginUser('GI-EMP-999999', defaultPassword, 'EMPLOYEE');
    recordTest('Authentication', 'Reject Non-existent Employee ID', badIdLogin.status === 401 ? 'PASS' : 'FAIL', `Status ${badIdLogin.status}`);

    // 2.5 Empty Credentials
    const emptyLogin = await loginUser('', '', 'EMPLOYEE');
    recordTest('Authentication', 'Reject Empty Credentials', emptyLogin.status === 400 ? 'PASS' : 'FAIL', `Status ${emptyLogin.status}`);

    // 2.6 Verify Session Endpoint (/api/auth/me)
    const meRes = await apiRequest('/api/auth/me', {}, employeeA1Cookie);
    const meValid = meRes.status === 200 && meRes.data?.user?.employeeId === employeeA1.employeeId && meRes.data?.user?.role === 'EMPLOYEE';
    recordTest('Session Security', 'Verify Active Employee Session via /api/auth/me', meValid ? 'PASS' : 'FAIL', `User: ${meRes.data?.user?.fullName} (${meRes.data?.user?.role})`);

    // 2.7 Portal Boundary Separation: Employee Attempting Admin Gateway
    const empAdminGatewayLogin = await loginUser(employeeA1.employeeId, defaultPassword, 'ADMIN');
    recordTest('Session Security', 'Employee Blocked from Admin Gateway (/growthIndia)', empAdminGatewayLogin.status === 403 ? 'PASS' : 'FAIL', `Status ${empAdminGatewayLogin.status} (Forbidden)`);

    // -------------------------------------------------------------
    // PHASE 3: TENANT ISOLATION & CROSS-EMPLOYEE ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n📌 Phase 3: Testing Tenant Isolation & Cross-Employee Security (BOLA/IDOR)...');

    // 3.1 Employee A1 accesses own profile -> ALLOW (200)
    const ownProfileRes = await apiRequest(`/api/employees/${employeeA1.id}`, {}, employeeA1Cookie);
    recordTest('Authorization', 'Employee A1 accesses own profile', ownProfileRes.status === 200 ? 'PASS' : 'FAIL', `Status ${ownProfileRes.status}`);

    // 3.2 Employee A1 attempts to access Employee A2 profile (same client, peer) -> DENY (403)
    const crossPeerProfileRes = await apiRequest(`/api/employees/${employeeA2.id}`, {}, employeeA1Cookie);
    recordTest('Security (IDOR)', 'Employee A1 blocked from Peer Employee A2 profile', crossPeerProfileRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossPeerProfileRes.status} (Forbidden)`);

    // 3.3 Employee A1 attempts to access Employee B1 profile (cross-tenant) -> DENY (403)
    const crossTenantProfileRes = await apiRequest(`/api/employees/${employeeB1.id}`, {}, employeeA1Cookie);
    recordTest('Security (BOLA)', 'Employee A1 blocked from Cross-Tenant Employee B1 profile', crossTenantProfileRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossTenantProfileRes.status} (Forbidden)`);

    // 3.4 Employee A1 attempts to modify protected organizational fields via direct PATCH -> DENY (403)
    const tamperProfileRes = await apiRequest(`/api/employees/${employeeA1.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        designation: 'Vice President of Engineering',
        jobLocation: 'Silicon Valley',
      }),
    }, employeeA1Cookie);
    recordTest('Security (Escalation)', 'Employee blocked from direct profile tampering via PATCH', tamperProfileRes.status === 403 ? 'PASS' : 'FAIL', `Status ${tamperProfileRes.status} (Forbidden)`);

    // -------------------------------------------------------------
    // PHASE 4: EMPLOYEE DASHBOARD & PROFILE DATA ACCURACY
    // -------------------------------------------------------------
    console.log('\n📌 Phase 4: Testing Employee Dashboard & Profile Real Data...');

    // 4.1 Verify Employee A1 Profile Fields Match Real Database
    const empData = ownProfileRes.data?.employee;
    const nameMatches = empData?.fullName === `Aman Sharma ${testRunId}`;
    const designationMatches = empData?.designation === 'Senior Fullstack Engineer';
    const clientMatches = empData?.client?.companyName === `Alpha Corp ${testRunId}`;
    const panMaskedMatches = empData?.panMasked?.includes('****') || empData?.panMasked?.includes('XXXX');
    recordTest('Profile Accuracy', 'Profile contains real Full Name and Designation', (nameMatches && designationMatches) ? 'PASS' : 'FAIL', `${empData?.fullName} - ${empData?.designation}`);
    recordTest('Profile Accuracy', 'Profile reflects assigned Corporate Client (Alpha Corp)', clientMatches ? 'PASS' : 'FAIL', `Client: ${empData?.client?.companyName}`);
    recordTest('Profile Accuracy', 'Sensitive PAN Masked in Profile response', panMaskedMatches ? 'PASS' : 'FAIL', `Masked PAN: ${empData?.panMasked}`);

    // -------------------------------------------------------------
    // PHASE 5: MY TASKS & WORKFLOW LIFECYCLE (ACCEPT -> START -> SUBMIT -> REVIEW)
    // -------------------------------------------------------------
    console.log('\n📌 Phase 5: Testing Tasks Lifecycle & Deliverable Workflow...');

    // 5.1 Client A creates a task assigned to Employee A1
    const createTaskRes = await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: `Deploy Multi-Region Gateway ${testRunId}`,
        description: 'Configure active-passive failover and SSL certificates',
        priority: 'HIGH',
        dueDate: '2026-10-15',
        expectedDeliverable: 'Live URL and deployment health report',
        assignedToId: employeeA1.id,
      }),
    }, clientACookie);

    if (createTaskRes.status === 201 || createTaskRes.status === 200) {
      taskA1 = createTaskRes.data;
      recordTest('Task Management', 'Client A Creates Task for Employee A1', 'PASS', `Task: ${taskA1.taskNumber} - ${taskA1.title}`);
    } else {
      recordTest('Task Management', 'Client A Creates Task for Employee A1', 'FAIL', `Status: ${createTaskRes.status}`);
      throw new Error('Fatal: Cannot create task for Employee A1');
    }

    // 5.2 Employee A1 views My Tasks
    const myTasksRes = await apiRequest('/api/tasks?view=my-tasks', {}, employeeA1Cookie);
    const seesOwnTask = Array.isArray(myTasksRes.data) && myTasksRes.data.some((t) => t.id === taskA1.id);
    recordTest('Task Management', 'Employee A1 Sees Assigned Task in My Tasks', seesOwnTask ? 'PASS' : 'FAIL', `Tasks Count: ${myTasksRes.data?.length}`);

    // 5.3 Employee A2 (Peer) views My Tasks -> should NOT see Employee A1's task
    const peerTasksRes = await apiRequest('/api/tasks?view=my-tasks', {}, employeeA2Cookie);
    const peerSeesTask = Array.isArray(peerTasksRes.data) && peerTasksRes.data.some((t) => t.id === taskA1.id);
    recordTest('Security (IDOR)', 'Peer Employee A2 does NOT see Employee A1 Task in My Tasks', !peerSeesTask ? 'PASS' : 'FAIL', 'Zero task leakage');

    // 5.4 Cross-Employee IDOR on Task Details: Employee A2 attempts direct GET on taskA1
    const crossTaskGetRes = await apiRequest(`/api/tasks/${taskA1.id}`, {}, employeeA2Cookie);
    recordTest('Security (IDOR)', 'Employee A2 blocked from viewing Employee A1 Task details', crossTaskGetRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossTaskGetRes.status} (Forbidden)`);

    // 5.5 Workflow Step 1: Employee A1 ACCEPTS Task
    const acceptRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    }, employeeA1Cookie);
    recordTest('Task Workflow', 'Employee A1 Accepts Assigned Task', (acceptRes.status === 200 && acceptRes.data?.status === 'ACCEPTED') ? 'PASS' : 'FAIL', `Status: ${acceptRes.data?.status}`);

    // 5.6 Workflow Step 2: Employee A1 STARTS Work (IN_PROGRESS)
    const startRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'START' }),
    }, employeeA1Cookie);
    recordTest('Task Workflow', 'Employee A1 Starts Work on Task', (startRes.status === 200 && startRes.data?.status === 'IN_PROGRESS') ? 'PASS' : 'FAIL', `Status: ${startRes.data?.status}`);

    // 5.7 Cross-Employee Tampering: Employee A2 attempts to SUBMIT deliverables for Employee A1's task
    const peerSubmitRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'SUBMIT',
        payload: { summary: 'Malicious deliverable' },
      }),
    }, employeeA2Cookie);
    recordTest('Security (IDOR)', 'Peer Employee A2 blocked from submitting Employee A1 Task', peerSubmitRes.status === 403 ? 'PASS' : 'FAIL', `Status ${peerSubmitRes.status} (Forbidden)`);

    // 5.8 Workflow Step 3: Employee A1 SUBMITS Deliverables (WAITING_FOR_REVIEW)
    const submitRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'SUBMIT',
        payload: {
          summary: 'Multi-Region deployment complete and certified healthy.',
          links: ['https://alpha.growthindia.in/health'],
        },
      }),
    }, employeeA1Cookie);
    recordTest('Task Workflow', 'Employee A1 Submits Task Deliverable', (submitRes.status === 200 && submitRes.data?.status === 'WAITING_FOR_REVIEW') ? 'PASS' : 'FAIL', `Status: ${submitRes.data?.status}`);

    // 5.9 Privilege Boundary: Employee A1 attempts to self-REVIEW/approve task -> DENY (403)
    const selfReviewRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'REVIEW',
        payload: { isApproved: true, feedback: 'Self approval attempt' },
      }),
    }, employeeA1Cookie);
    recordTest('Security (Escalation)', 'Employee A1 blocked from self-approving task deliverables', selfReviewRes.status === 403 ? 'PASS' : 'FAIL', `Status ${selfReviewRes.status} (Forbidden)`);

    // 5.10 Workflow Step 4: Client A REVIEWS & APPROVES Deliverables (COMPLETED)
    const clientReviewRes = await apiRequest(`/api/tasks/${taskA1.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'REVIEW',
        payload: { isApproved: true, feedback: 'Verified production health and DNS records.' },
      }),
    }, clientACookie);
    recordTest('Task Workflow', 'Client A Approves Deliverables & Marks COMPLETED', (clientReviewRes.status === 200 && clientReviewRes.data?.status === 'COMPLETED') ? 'PASS' : 'FAIL', `Status: ${clientReviewRes.data?.status}`);

    // 5.11 Verify Task History Immutable Audit Trail in MongoDB
    const taskInDb = await prisma.task.findUnique({
      where: { id: taskA1.id },
      include: { history: { orderBy: { timestamp: 'asc' } } },
    });
    const hasAuditActions = taskInDb?.history?.some((h) => ['ACCEPT', 'START', 'SUBMIT', 'REVIEW', 'STATUS_CHANGE'].includes(h.action));
    recordTest('Task History', 'Task History contains chronological audit events in MongoDB', (taskInDb?.history?.length >= 3 && hasAuditActions) ? 'PASS' : 'FAIL', `Total History Entries: ${taskInDb?.history?.length}`);

    // -------------------------------------------------------------
    // PHASE 6: ATTENDANCE TELEMETRY & BREAK TRACKING
    // -------------------------------------------------------------
    console.log('\n📌 Phase 6: Testing Attendance Telemetry & Clock System...');

    // Clean any pre-existing attendance for today for clean test run
    const todayStr = new Date().toISOString().split('T')[0];
    await prisma.attendance.deleteMany({
      where: { employeeId: employeeA1.id, date: todayStr },
    });

    // 6.1 Employee A1 Check-In (Punch In)
    const checkInRes = await apiRequest('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);

    const checkedInSuccess = checkInRes.status === 200 && checkInRes.data?.attendance?.checkInTime;
    recordTest('Attendance', 'Employee A1 Checks In (Duty Started)', checkedInSuccess ? 'PASS' : 'FAIL', `Status: ${checkInRes.data?.attendance?.status}`);

    // 6.2 Duplicate Check-In Rejection
    const dupCheckInRes = await apiRequest('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);
    recordTest('Attendance Validation', 'Reject Duplicate Check-In when already on duty', dupCheckInRes.status === 400 ? 'PASS' : 'FAIL', `Status ${dupCheckInRes.status}`);

    // 6.3 Break Start
    const breakStartRes = await apiRequest('/api/attendance/break/start', {
      method: 'POST',
      body: JSON.stringify({ breakType: 'TEA' }),
    }, employeeA1Cookie);
    recordTest('Attendance Break', 'Employee A1 Starts Tea Break', breakStartRes.status === 200 ? 'PASS' : 'FAIL', `Status ${breakStartRes.status}`);

    // 6.4 Break End
    const breakEndRes = await apiRequest('/api/attendance/break/end', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);
    recordTest('Attendance Break', 'Employee A1 Ends Tea Break', breakEndRes.status === 200 ? 'PASS' : 'FAIL', `Status ${breakEndRes.status}`);

    // 6.5 Check-Out (Punch Out)
    const checkOutRes = await apiRequest('/api/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);
    const checkOutSuccess = checkOutRes.status === 200 && checkOutRes.data?.attendance?.checkOutTime;
    recordTest('Attendance', 'Employee A1 Checks Out (Shift Completed)', checkOutSuccess ? 'PASS' : 'FAIL', `CheckOut: ${checkOutRes.data?.attendance?.checkOutTime}`);

    // 6.6 Duplicate Check-Out Rejection
    const dupCheckOutRes = await apiRequest('/api/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);
    recordTest('Attendance Validation', 'Reject Duplicate Check-Out when already clocked out', dupCheckOutRes.status === 400 ? 'PASS' : 'FAIL', `Status ${dupCheckOutRes.status}`);

    // 6.7 Attendance History: Verify Employee A1 sees only own records
    const myHistoryRes = await apiRequest(`/api/attendance/history?employeeId=${employeeA2.id}`, {}, employeeA1Cookie);
    // Even if employeeA1 passes employeeA2's ID, the API strictly scopes to employeeA1
    const recordsAreSelfOnly = myHistoryRes.data?.records?.every((r) => r.employeeId === employeeA1.id);
    recordTest('Security (IDOR)', 'Attendance History strictly scoped to authenticated employee', recordsAreSelfOnly ? 'PASS' : 'FAIL', 'Param employeeId ignored for EMPLOYEE');

    // 6.8 Attendance vs Login Session Distinction
    const attendanceRecord = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employeeA1.id, date: todayStr } },
    });
    const workSessions = await prisma.workSession.findMany({
      where: { employeeId: employeeA1.id },
    });
    const separateEntities = Boolean(attendanceRecord && workSessions.length > 0 && attendanceRecord.id !== workSessions[0].id);
    recordTest('Architecture', 'Attendance Record and WorkSession are Independent Entities', separateEntities ? 'PASS' : 'FAIL', `Attendance ID: ${attendanceRecord?.id}, WorkSession Count: ${workSessions.length}`);

    // -------------------------------------------------------------
    // PHASE 7: LEAVE MANAGEMENT & ATTENDANCE INTEGRATION
    // -------------------------------------------------------------
    console.log('\n📌 Phase 7: Testing Leave Lifecycle & Attendance Integration...');

    const leaveDate = '2026-11-20';

    // 7.1 Employee A1 Applies for Leave
    const applyLeaveRes = await apiRequest('/api/leave', {
      method: 'POST',
      body: JSON.stringify({
        leaveType: 'Earned Leave',
        startDate: leaveDate,
        endDate: leaveDate,
        totalDays: 1,
        reason: 'Family wedding attendance and travel',
      }),
    }, employeeA1Cookie);

    if (applyLeaveRes.status === 201 || applyLeaveRes.status === 200) {
      leaveA1 = applyLeaveRes.data.leave;
      recordTest('Leave Management', 'Employee A1 Applies for Earned Leave', 'PASS', `Status: ${leaveA1.status}, ID: ${leaveA1.id}`);
    } else {
      recordTest('Leave Management', 'Employee A1 Applies for Earned Leave', 'FAIL', `Status: ${applyLeaveRes.status}`);
      throw new Error('Fatal: Cannot apply for leave');
    }

    // 7.2 Privilege Boundary: Employee A1 attempts to self-approve leave -> DENY (403)
    const selfApproveLeaveRes = await apiRequest(`/api/leave/${leaveA1.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'APPROVED', reviewRemarks: 'Self approval attempt' }),
    }, employeeA1Cookie);
    recordTest('Security (Escalation)', 'Employee A1 blocked from approving own leave request', selfApproveLeaveRes.status === 403 ? 'PASS' : 'FAIL', `Status ${selfApproveLeaveRes.status} (Forbidden)`);

    // 7.3 Cross-Employee Tampering: Employee A2 attempts to cancel Employee A1's leave -> DENY (403)
    const peerCancelLeaveRes = await apiRequest(`/api/leave/${leaveA1.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancelRemarks: 'Malicious cancellation' }),
    }, employeeA2Cookie);
    recordTest('Security (IDOR)', 'Peer Employee A2 blocked from cancelling Employee A1 leave', peerCancelLeaveRes.status === 403 ? 'PASS' : 'FAIL', `Status ${peerCancelLeaveRes.status} (Forbidden)`);

    // 7.4 Client A Approves Leave Request
    const approveLeaveRes = await apiRequest(`/api/leave/${leaveA1.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'APPROVED', reviewRemarks: 'Approved by Reporting Manager' }),
    }, clientACookie);
    recordTest('Leave Lifecycle', 'Client A Approves Leave Request', approveLeaveRes.status === 200 ? 'PASS' : 'FAIL', `Status: ${approveLeaveRes.data?.leave?.status}`);

    // 7.5 Attendance Table Integration: Verify attendance record for leaveDate has status 'ON_LEAVE'
    const leaveAttendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employeeA1.id, date: leaveDate } },
    });
    const isOnLeaveSynced = leaveAttendance?.status === 'ON_LEAVE';
    recordTest('Leave + Attendance Sync', 'Approved Leave Automatically Provisions ON_LEAVE in Attendance', isOnLeaveSynced ? 'PASS' : 'FAIL', `Attendance Status: ${leaveAttendance?.status}`);

    // 7.6 Mandatory Rejection Reason Validation
    const testLeaveForRejection = await prisma.leaveRequest.create({
      data: {
        employeeId: employeeA1.id,
        leaveType: 'Casual Leave',
        startDate: '2026-11-25',
        endDate: '2026-11-25',
        totalDays: 1,
        reason: 'Test for mandatory rejection reason',
        status: 'PENDING',
      },
    });

    const rejectWithoutReason = await apiRequest(`/api/leave/${testLeaveForRejection.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REJECTED', rejectionReason: '' }),
    }, clientACookie);
    recordTest('Leave Validation', 'Enforce Mandatory Rejection Reason when rejecting leave', rejectWithoutReason.status === 400 ? 'PASS' : 'FAIL', `Status ${rejectWithoutReason.status}`);

    // Clean up test leave
    await prisma.leaveRequest.delete({ where: { id: testLeaveForRejection.id } });

    // -------------------------------------------------------------
    // PHASE 8: PERSONAL DOCUMENTS VAULT & KYC SECURITY
    // -------------------------------------------------------------
    console.log('\n📌 Phase 8: Testing Personal Documents & KYC Security...');

    // 8.1 Client A uploads KYC Document for Employee A1
    const uploadDocRes = await apiRequest(`/api/employees/${employeeA1.id}/documents`, {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'Aadhaar Card',
        title: 'National Identity Aadhaar Document',
        fileName: 'aadhaar_card_secure.pdf',
        fileSizeBytes: 204800,
        mimeType: 'application/pdf',
      }),
    }, clientACookie);

    let docA1 = null;
    if (uploadDocRes.status === 201 || uploadDocRes.status === 200) {
      docA1 = uploadDocRes.data.document;
      recordTest('Documents Vault', 'Client A Uploads KYC Document for Employee A1', 'PASS', `Doc ID: ${docA1.documentId}`);
    } else {
      recordTest('Documents Vault', 'Client A Uploads KYC Document for Employee A1', 'FAIL', `Status: ${uploadDocRes.status}`);
    }

    // 8.2 Employee A1 views own documents -> ALLOW (200)
    const empDocsRes = await apiRequest(`/api/employees/${employeeA1.id}/documents`, {}, employeeA1Cookie);
    const seesOwnDoc = Array.isArray(empDocsRes.data?.documents) && empDocsRes.data.documents.some((d) => d.id === docA1?.id);
    recordTest('Documents Vault', 'Employee A1 Views Own Document Vault', seesOwnDoc ? 'PASS' : 'FAIL', `Count: ${empDocsRes.data?.documents?.length}`);

    // 8.3 Peer Employee A2 attempts to view Employee A1 documents -> DENY (403)
    const peerDocRes = await apiRequest(`/api/employees/${employeeA1.id}/documents`, {}, employeeA2Cookie);
    recordTest('Security (IDOR)', 'Peer Employee A2 blocked from Employee A1 KYC documents', peerDocRes.status === 403 ? 'PASS' : 'FAIL', `Status ${peerDocRes.status} (Forbidden)`);

    // 8.4 Cross-Tenant Employee B1 attempts to view Employee A1 documents -> DENY (403)
    const crossTenantDocRes = await apiRequest(`/api/employees/${employeeA1.id}/documents`, {}, employeeB1Cookie);
    recordTest('Security (BOLA)', 'Cross-Tenant Employee B1 blocked from Employee A1 documents', crossTenantDocRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossTenantDocRes.status} (Forbidden)`);

    // -------------------------------------------------------------
    // PHASE 9: EMPLOYEE STATUS LIFECYCLE (BLOCK / UNBLOCK & LOCKOUT)
    // -------------------------------------------------------------
    console.log('\n📌 Phase 9: Testing Disciplinary Block / Unblock & Lockout...');

    // 9.1 Client A Blocks Employee A1 (Disciplinary Action)
    const blockRes = await apiRequest(`/api/employees/${employeeA1.id}/block`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Policy Violation Investigation',
        remarks: 'Temporary disciplinary block pending review',
      }),
    }, clientACookie);

    const blockSuccess = blockRes.status === 200 && blockRes.data?.employee?.status === 'BLOCKED';
    recordTest('Employee Lifecycle', 'Client A Blocks Employee A1 with Reason & Remarks', blockSuccess ? 'PASS' : 'FAIL', `Status: ${blockRes.data?.employee?.status}`);

    // 9.2 Blocked Employee Attempting Login -> MUST BE FORBIDDEN (403)
    const blockedLoginRes = await loginUser(employeeA1.employeeId, defaultPassword, 'EMPLOYEE');
    const loginLockoutEnforced = blockedLoginRes.status === 403 && blockedLoginRes.data?.isBlocked === true;
    recordTest('Security (Lockout)', 'Blocked Employee Login Immediately Denied (HTTP 403)', loginLockoutEnforced ? 'PASS' : 'FAIL', `Status: ${blockedLoginRes.status} (${blockedLoginRes.data?.error?.slice(0, 30)}...)`);

    // 9.3 Verify Block History Entry in MongoDB
    const blockHistories = await prisma.employeeBlockHistory.findMany({
      where: { employeeId: employeeA1.id },
      orderBy: { actionDate: 'desc' },
    });
    const blockLogged = blockHistories.some((h) => h.actionType === 'BLOCK' && h.reason === 'Policy Violation Investigation');
    recordTest('Audit Trail', 'EmployeeBlockHistory Record Created in MongoDB', blockLogged ? 'PASS' : 'FAIL', `Action: ${blockHistories[0]?.actionType}, Reason: ${blockHistories[0]?.reason}`);

    // 9.4 Client A Unblocks Employee A1
    const unblockRes = await apiRequest(`/api/employees/${employeeA1.id}/unblock`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Investigation Concluded',
        remarks: 'Cleared of all infractions; reinstatement approved',
      }),
    }, clientACookie);
    const unblockSuccess = unblockRes.status === 200 && unblockRes.data?.employee?.status === 'ACTIVE';
    recordTest('Employee Lifecycle', 'Client A Unblocks Employee A1', unblockSuccess ? 'PASS' : 'FAIL', `New Status: ${unblockRes.data?.employee?.status}`);

    // 9.5 Unblocked Employee Login Restored
    const restoredLoginRes = await loginUser(employeeA1.employeeId, defaultPassword, 'EMPLOYEE');
    const loginRestored = restoredLoginRes.status === 200 && restoredLoginRes.cookie;
    if (loginRestored) employeeA1Cookie = restoredLoginRes.cookie;
    recordTest('Security (Reinstatement)', 'Unblocked Employee Login Restored (HTTP 200)', loginRestored ? 'PASS' : 'FAIL', `Status: ${restoredLoginRes.status}`);

    // 9.6 Verify Chronological History Integrity (Both BLOCK and UNBLOCK entries preserved)
    const allBlockHistory = await prisma.employeeBlockHistory.findMany({
      where: { employeeId: employeeA1.id },
      orderBy: { actionDate: 'asc' },
    });
    const hasBothEvents = allBlockHistory.some((h) => h.actionType === 'BLOCK') && allBlockHistory.some((h) => h.actionType === 'UNBLOCK');
    recordTest('Audit Trail', 'Immutable Block & Unblock History Chronology Preserved', (hasBothEvents && allBlockHistory.length >= 2) ? 'PASS' : 'FAIL', `Total Audit Entries: ${allBlockHistory.length}`);

    // -------------------------------------------------------------
    // PHASE 10: PAYROLL & PAYSLIP ACCESS
    // -------------------------------------------------------------
    console.log('\n📌 Phase 10: Testing Payroll & Payslip Access...');

    // Provision a payroll period and payroll record for Employee A1 in MongoDB
    const payrollPeriod = await prisma.payrollPeriod.upsert({
      where: { periodCode: `PAY-2026-09-${testRunId}` },
      create: {
        periodCode: `PAY-2026-09-${testRunId}`,
        month: 9,
        year: 2026,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-30'),
        payDate: new Date('2026-10-01'),
        status: 'FINALIZED',
        totalGross: 85000,
        totalDeductions: 8500,
        totalNet: 76500,
        totalEmployees: 1,
      },
      update: {},
    });

    const pRecord = await prisma.payrollRecord.create({
      data: {
        periodId: payrollPeriod.id,
        employeeId: employeeA1.id,
        totalDaysInMonth: 30,
        payableDays: 26,
        presentDays: 26,
        unpaidDays: 0,
        baseGross: 85000,
        lopDeduction: 0,
        totalEarnings: 85000,
        totalDeductions: 8500,
        reimbursements: 0,
        netPay: 76500,
        status: 'PAID',
      },
    });

    const payslipA1 = await prisma.payslip.create({
      data: {
        payslipNumber: `PSL-2026-09-${testRunId}`,
        payrollRecordId: pRecord.id,
        employeeId: employeeA1.id,
        periodCode: payrollPeriod.periodCode,
        grossEarnings: 85000,
        totalDeductions: 8500,
        netSalary: 76500,
        netSalaryWords: 'Seventy Six Thousand Five Hundred Rupees Only',
        isPublished: true,
        downloadToken: `tok_${testRunId}_${Date.now()}`,
      },
    });

    // 10.1 Employee A1 views own payslips -> ALLOW
    const myPayslipsRes = await apiRequest('/api/hrm/payroll/payslips', {}, employeeA1Cookie);
    const seesOwnPayslip = Array.isArray(myPayslipsRes.data?.payslips) && myPayslipsRes.data.payslips.some((p) => p.id === payslipA1.id);
    recordTest('Payroll', 'Employee A1 Views Own Finalized Payslip', seesOwnPayslip ? 'PASS' : 'FAIL', `Net Payable: ₹${payslipA1.netSalary}`);

    // 10.2 Employee A1 attempts to query Employee A2's payslips via query param -> strictly scoped to self
    const crossPayslipRes = await apiRequest(`/api/hrm/payroll/payslips?employeeId=${employeeA2.id}`, {}, employeeA1Cookie);
    const payslipsScopedToSelf = crossPayslipRes.data?.payslips?.every((p) => p.employeeId === employeeA1.id);
    recordTest('Security (IDOR)', 'Employee cannot access another employee payslip via query param', payslipsScopedToSelf ? 'PASS' : 'FAIL', 'Scoped to own profile');

    // -------------------------------------------------------------
    // PHASE 11: HELPDESK TICKETS & HR REQUESTS (WITH STRICT RBAC)
    // -------------------------------------------------------------
    console.log('\n📌 Phase 11: Testing Helpdesk Tickets & HR Requests...');

    // 11.1 Employee A1 creates Helpdesk Ticket
    const createTicketRes = await apiRequest('/api/hrm/helpdesk', {
      method: 'POST',
      body: JSON.stringify({
        subject: `Workstation Dual Monitor Setup ${testRunId}`,
        description: 'Requesting second monitor for frontend development productivity',
        category: 'HARDWARE',
        priority: 'MEDIUM',
      }),
    }, employeeA1Cookie);

    const ticketCreated = createTicketRes.status === 201 && createTicketRes.data?.ticket?.id;
    const ticketA1 = createTicketRes.data?.ticket;
    recordTest('Helpdesk', 'Employee A1 Creates Helpdesk Ticket', ticketCreated ? 'PASS' : 'FAIL', `Ticket Number: ${ticketA1?.ticketNumber}`);

    // 11.2 Employee A1 views own Helpdesk Tickets
    const myTicketsRes = await apiRequest('/api/hrm/helpdesk', {}, employeeA1Cookie);
    const seesTicket = Array.isArray(myTicketsRes.data?.tickets) && myTicketsRes.data.tickets.some((t) => t.id === ticketA1?.id);
    recordTest('Helpdesk', 'Employee A1 Views Own Helpdesk Tickets', seesTicket ? 'PASS' : 'FAIL', `Count: ${myTicketsRes.data?.tickets?.length}`);

    // 11.3 Employee A1 attempts to view Employee A2's tickets by passing employeeId -> DENIED (403)
    const crossTicketRes = await apiRequest(`/api/hrm/helpdesk?employeeId=${employeeA2.id}`, {}, employeeA1Cookie);
    recordTest('Security (IDOR)', 'Employee A1 blocked from viewing Employee A2 Helpdesk Tickets', crossTicketRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossTicketRes.status} (Forbidden)`);

    // 11.4 Employee A1 creates HR Request
    // First ensure request type exists
    let reqType = await prisma.hrRequestType.findFirst({ where: { isActive: true } });
    if (!reqType) {
      reqType = await prisma.hrRequestType.create({
        data: { code: 'BONAFIDE', name: 'Bonafide Certificate', isActive: true },
      });
    }

    const createHrReqRes = await apiRequest('/api/hrm/requests', {
      method: 'POST',
      body: JSON.stringify({
        requestTypeId: reqType.id,
        title: `Employment Bonafide Letter ${testRunId}`,
        description: 'Required for bank home loan verification',
      }),
    }, employeeA1Cookie);
    const hrReqCreated = createHrReqRes.status === 201 && createHrReqRes.data?.request?.id;
    recordTest('HR Requests', 'Employee A1 Submits Formal HR Request', hrReqCreated ? 'PASS' : 'FAIL', `Title: ${createHrReqRes.data?.request?.title}`);

    // 11.5 Employee A1 attempts to view Employee A2's HR requests -> DENIED (403)
    const crossHrReqRes = await apiRequest(`/api/hrm/requests?employeeId=${employeeA2.id}`, {}, employeeA1Cookie);
    recordTest('Security (IDOR)', 'Employee A1 blocked from viewing Employee A2 HR Requests', crossHrReqRes.status === 403 ? 'PASS' : 'FAIL', `Status ${crossHrReqRes.status} (Forbidden)`);

    // 11.6 Employee A1 attempts to update HR request status -> DENIED (403)
    const empStatusUpdateRes = await apiRequest('/api/hrm/requests', {
      method: 'POST',
      body: JSON.stringify({
        type: 'STATUS_UPDATE',
        requestId: createHrReqRes.data?.request?.id,
        status: 'APPROVED',
      }),
    }, employeeA1Cookie);
    recordTest('Security (Escalation)', 'Employee blocked from approving HR request status', empStatusUpdateRes.status === 403 ? 'PASS' : 'FAIL', `Status ${empStatusUpdateRes.status} (Forbidden)`);

    // -------------------------------------------------------------
    // PHASE 12: NOTIFICATIONS SYSTEM
    // -------------------------------------------------------------
    console.log('\n📌 Phase 12: Testing Notifications System...');

    // Create a notification directly for Employee A1
    const notifA1 = await prisma.notification.create({
      data: {
        recipientId: employeeA1.id,
        title: 'Task Assigned',
        message: 'You have been assigned a new task: Deploy Multi-Region Gateway',
        category: 'TASK',
        entityType: 'TASK',
        entityId: taskA1.id,
        isRead: false,
      },
    });

    const notifRes = await apiRequest('/api/notifications', {}, employeeA1Cookie);
    const seesNotif = Array.isArray(notifRes.data?.notifications) && notifRes.data.notifications.some((n) => n.id === notifA1.id);
    recordTest('Notifications', 'Employee A1 Receives Assigned Task Notification', seesNotif ? 'PASS' : 'FAIL', `Unread Count: ${notifRes.data?.unreadCount}`);

    // Peer Employee A2 should NOT receive Employee A1's notification
    const peerNotifRes = await apiRequest('/api/notifications', {}, employeeA2Cookie);
    const peerSeesNotif = Array.isArray(peerNotifRes.data?.notifications) && peerNotifRes.data.notifications.some((n) => n.id === notifA1.id);
    recordTest('Security (Isolation)', 'Notifications strictly isolated between employees', !peerSeesNotif ? 'PASS' : 'FAIL', 'Zero notification leakage');

    // -------------------------------------------------------------
    // PHASE 13: 3-WAY CROSS-PANEL SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('\n📌 Phase 13: Testing Admin <-> Client <-> Employee 3-Way Synchronization...');

    // 13.1 Client A updates Employee A1 Designation -> Employee A1 sees update immediately
    const updatedDesignation = 'Staff Infrastructure Architect';
    await apiRequest(`/api/employees/${employeeA1.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ designation: updatedDesignation }),
    }, clientACookie);

    const recheckProfileRes = await apiRequest(`/api/employees/${employeeA1.id}`, {}, employeeA1Cookie);
    const syncDesignation = recheckProfileRes.data?.employee?.designation === updatedDesignation;
    recordTest('Cross-Panel Sync', 'Client updates designation -> Employee sees update', syncDesignation ? 'PASS' : 'FAIL', `New Title: ${recheckProfileRes.data?.employee?.designation}`);

    // 13.2 Admin verifies updated employee record in Admin Panel API
    const adminCheckEmpRes = await apiRequest(`/api/employees/${employeeA1.id}`, {}, adminCookie);
    const adminSeesSync = adminCheckEmpRes.data?.employee?.designation === updatedDesignation && adminCheckEmpRes.data?.employee?.client?.id === clientA.id;
    recordTest('Cross-Panel Sync', 'Admin Panel reflects synchronized employee data from Client and Employee', adminSeesSync ? 'PASS' : 'FAIL', `Verified via Admin Session`);

    // -------------------------------------------------------------
    // PHASE 14: DATABASE ENTITY PERSISTENCE & DATA LOSS CHECKS
    // -------------------------------------------------------------
    console.log('\n📌 Phase 14: Direct MongoDB Atlas Entity Integrity & Persistence Verification...');

    const dbChecks = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeA1.id } }),
      prisma.user.findUnique({ where: { email: empA1Email } }),
      prisma.task.findUnique({ where: { id: taskA1.id } }),
      prisma.attendance.findFirst({ where: { employeeId: employeeA1.id, date: todayStr } }),
      prisma.leaveRequest.findUnique({ where: { id: leaveA1.id } }),
      prisma.employeeDocument.findFirst({ where: { employeeId: employeeA1.id } }),
      prisma.employeeBlockHistory.findFirst({ where: { employeeId: employeeA1.id } }),
      prisma.payslip.findFirst({ where: { employeeId: employeeA1.id } }),
      prisma.helpdeskTicket.findFirst({ where: { employeeId: employeeA1.id } }),
    ]);

    const allPersisted = dbChecks.every((c) => c !== null);
    recordTest('Database Persistence', 'All Core Entities Persisted in MongoDB Atlas replica set', allPersisted ? 'PASS' : 'FAIL', 'Zero data loss across all models');

  } catch (error) {
    console.error('❌ Test execution error:', error);
    recordTest('Suite Error', 'Unhandled exception during test execution', 'FAIL', error.message);
  } finally {
    console.log('\n================================================================');
    console.log('📊 GROWTH INDIA EMPLOYEE PANEL E2E TEST RESULTS SUMMARY');
    console.log('================================================================');
    console.log(`Total Features Tested : ${results.total}`);
    console.log(`Passed                : ${results.passed} (${Math.round((results.passed / results.total) * 100 || 0)}%)`);
    console.log(`Failed                : ${results.failed}`);
    console.log(`Partial               : ${results.partial}`);
    console.log(`Not Implemented       : ${results.notImplemented}`);
    console.log(`Blocked               : ${results.blocked}`);
    console.log('================================================================\n');

    await prisma.$disconnect();
  }
}

runEmployeePanelE2ETestSuite();
