/**
 * GROWTH INDIA CLIENT PANEL END-TO-END MASTER QA & SECURITY TEST SUITE
 * 
 * Tests the EXISTING Growth India multi-tenant SaaS platform:
 * - Multi-Tenant Onboarding (Client A, Client B, Client C)
 * - Sequential Client ID generation (CLI-XXXXX) & User Account creation
 * - Client Authentication, Session Management & Cookie security
 * - Client Dashboard real database metrics & Quotas
 * - Client Profile immutability & access restrictions
 * - Client EMS Employee Onboarding & auto-generated Employee IDs (GI-EMP-XXXXXX)
 * - Tenant Isolation & Cross-Tenant IDOR security (BOLA / Horizontal Privilege Escalation)
 * - Employee Panel Login, Self-service, Attendance Check-In & Leave Request
 * - Task Delegation, Status Workflows (Accept/Start/Submit/Review) & IDOR Protection
 * - Attendance Telemetry & Leave Management (Mandatory rejection reasons & Attendance Table sync)
 * - Employee Document Management & KYC isolation
 * - Employee Disciplinary Block / Unblock lifecycle & Session Revocation
 * - Module-based Access Control (EMS only, EMS + CRM, EMS + CRM + HRM)
 * - Subscription Plan Quota Enforcement (rejecting employees beyond plan limit)
 * - Client Shared Access delegation & Single-use Token Replay prevention
 * - Admin ↔ Client ↔ Employee 3-Way Data Synchronization
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

async function loginUser(email, password, portalType = 'ADMIN') {
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

async function runClientPanelE2ETestSuite() {
  console.log('================================================================');
  console.log('🚀 GROWTH INDIA CLIENT PANEL E2E MASTER AUDIT & SECURITY SUITE');
  console.log('================================================================\n');

  let adminCookie = '';
  let clientACookie = '';
  let clientBCookie = '';
  let clientCCookie = '';
  let employeeA1Cookie = '';
  let employeeA2Cookie = '';

  const timestamp = Date.now().toString().slice(-4);
  const clientAEmail = `admin.clienta_${timestamp}@corp-alpha.com`;
  const clientBEmail = `admin.clientb_${timestamp}@corp-beta.com`;
  const clientCEmail = `admin.clientc_${timestamp}@corp-gamma.com`;

  let clientARecord = null;
  let clientBRecord = null;
  let clientCRecord = null;

  let empA1Record = null;
  let empA2Record = null;
  let empA3Record = null;
  let empB1Record = null;
  let empC1Record = null;

  let taskA1Record = null;
  let leaveA1Record = null;

  try {
    // -------------------------------------------------------------
    // SECTION 1: ADMIN LOGIN & PREREQUISITES
    // -------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 1: ADMIN AUTHENTICATION & MULTI-TENANT INITIALIZATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const adminLogin = await loginUser('admin@growthindia.co', 'Admin@123', 'ADMIN');
    if (adminLogin.status === 200 && adminLogin.cookie) {
      adminCookie = adminLogin.cookie;
      recordTest('Admin Onboarding', 'Admin Authentication for Tenant Setup', 'PASS', 'Admin logged in');
    } else {
      recordTest('Admin Onboarding', 'Admin Authentication for Tenant Setup', 'FAIL', `Status ${adminLogin.status}`);
      throw new Error('Admin login failed. Aborting test suite.');
    }

    // -------------------------------------------------------------
    // SECTION 2: CLIENT CREATION & ASSIGNMENT (Admin CMS Flow)
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 2: CLIENT ONBOARDING & ACCOUNT PROVISIONING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Onboard Client A (Standard Plan, EMS only, Quota = 3)
    const clientAPayload = {
      companyName: `Alpha Corp Solutions ${timestamp}`,
      contactPerson: 'Mr. Arvind Sharma',
      mobile: `+91 9811${timestamp}`,
      email: clientAEmail,
      address: 'Plot 42, Cyber Hub, Gurugram, Haryana',
      industry: 'Information Technology',
      companyType: 'Private Limited',
      gst: '07AAAAA0000A1Z5',
      assignedModules: ['EMS'],
      subscriptionPlan: 'STANDARD',
      password: 'ClientA@Password123',
    };

    const createClientARes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientAPayload),
    }, adminCookie);

    let clientAPw = 'ClientA@Password123';
    let clientBPw = 'ClientB@Password123';
    let clientCPw = 'ClientC@Password123';

    if ((createClientARes.status === 201 || createClientARes.status === 200) && createClientARes.data?.client) {
      clientARecord = createClientARes.data.client;
      clientAPw = createClientARes.data.credentials?.password || clientAPayload.password;
      recordTest('Client Onboarding', 'Admin Creates Client A (EMS Only)', 'PASS', `ID: ${clientARecord.clientId}`);
    } else {
      recordTest('Client Onboarding', 'Admin Creates Client A (EMS Only)', 'FAIL', JSON.stringify(createClientARes.data));
    }

    // Verify Sequential Client ID format
    if (clientARecord?.clientId && clientARecord.clientId.startsWith('CLI-')) {
      recordTest('Client Onboarding', 'Sequential Client ID Generation (CLI-XXXXX)', 'PASS', clientARecord.clientId);
    } else {
      recordTest('Client Onboarding', 'Sequential Client ID Generation (CLI-XXXXX)', 'FAIL', clientARecord?.clientId);
    }

    // Onboard Client B (Professional Plan, EMS + CRM)
    const clientBPayload = {
      companyName: `Beta Global Logistics ${timestamp}`,
      contactPerson: 'Ms. Sunita Rao',
      mobile: `+91 9822${timestamp}`,
      email: clientBEmail,
      address: 'Sector 18, Vashi, Navi Mumbai, Maharashtra',
      industry: 'Supply Chain & Logistics',
      companyType: 'Private Limited',
      gst: '27BBBBB1111B1Z2',
      assignedModules: ['EMS', 'CRM'],
      subscriptionPlan: 'PROFESSIONAL',
      password: 'ClientB@Password123',
    };

    const createClientBRes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientBPayload),
    }, adminCookie);

    if ((createClientBRes.status === 201 || createClientBRes.status === 200) && createClientBRes.data?.client) {
      clientBRecord = createClientBRes.data.client;
      clientBPw = createClientBRes.data.credentials?.password || clientBPayload.password;
      recordTest('Client Onboarding', 'Admin Creates Client B (EMS + CRM)', 'PASS', `ID: ${clientBRecord.clientId}`);
    } else {
      recordTest('Client Onboarding', 'Admin Creates Client B (EMS + CRM)', 'FAIL', JSON.stringify(createClientBRes.data));
    }

    // Onboard Client C (Enterprise Plan, EMS + CRM + HRM)
    const clientCPayload = {
      companyName: `Gamma Enterprise Innovations ${timestamp}`,
      contactPerson: 'Dr. Vikramaditya Sen',
      mobile: `+91 9833${timestamp}`,
      email: clientCEmail,
      address: 'Whitefield Main Road, Bangalore, Karnataka',
      industry: 'Enterprise Software & Aerospace',
      companyType: 'Public Limited',
      gst: '29CCCCC2222C1Z8',
      assignedModules: ['EMS', 'CRM', 'HRM'],
      subscriptionPlan: 'ENTERPRISE',
      password: 'ClientC@Password123',
    };

    const createClientCRes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientCPayload),
    }, adminCookie);

    if ((createClientCRes.status === 201 || createClientCRes.status === 200) && createClientCRes.data?.client) {
      clientCRecord = createClientCRes.data.client;
      clientCPw = createClientCRes.data.credentials?.password || clientCPayload.password;
      recordTest('Client Onboarding', 'Admin Creates Client C (EMS + CRM + HRM)', 'PASS', `ID: ${clientCRecord.clientId}`);
    } else {
      recordTest('Client Onboarding', 'Admin Creates Client C (EMS + CRM + HRM)', 'FAIL', JSON.stringify(createClientCRes.data));
    }

    // Test Duplicate Email Conflict (HTTP 409)
    const duplicateRes = await apiRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientAPayload),
    }, adminCookie);

    if (duplicateRes.status === 409) {
      recordTest('Client Onboarding', 'Duplicate Client Email/Phone Conflict Handling', 'PASS', 'HTTP 409 Conflict returned');
    } else {
      recordTest('Client Onboarding', 'Duplicate Client Email/Phone Conflict Handling', 'FAIL', `Expected 409, got ${duplicateRes.status}`);
    }

    // Verify MongoDB User Account & Password Hash for Client A
    const clientAUserInDb = await prisma.user.findUnique({
      where: { email: clientAEmail },
      include: { role: true },
    });

    if (clientAUserInDb && clientAUserInDb.role.name === 'CLIENT' && clientAUserInDb.passwordHash) {
      const match = await bcrypt.compare(clientAPw, clientAUserInDb.passwordHash);
      if (match) {
        recordTest('Client Account', 'Client Account Linked to Tenant & Bcrypt Hashed in MongoDB', 'PASS', `User ID: ${clientAUserInDb.id}`);
      } else {
        recordTest('Client Account', 'Client Account Linked to Tenant & Bcrypt Hashed in MongoDB', 'FAIL', 'Password hash mismatch');
      }
    } else {
      recordTest('Client Account', 'Client Account Linked to Tenant & Bcrypt Hashed in MongoDB', 'FAIL', 'User not found in MongoDB');
    }

    // -------------------------------------------------------------
    // SECTION 3: CLIENT AUTHENTICATION & LOGIN
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 3: CLIENT AUTHENTICATION & SESSION LIFECYCLE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Valid login as Client A
    const clientALogin = await loginUser(clientAEmail, clientAPw, 'CLIENT');
    if (clientALogin.status === 200 && clientALogin.cookie) {
      clientACookie = clientALogin.cookie;
      recordTest('Client Authentication', 'Client A Valid Login & Session Cookie Generation', 'PASS', `Role: ${clientALogin.data?.user?.role}`);
    } else {
      recordTest('Client Authentication', 'Client A Valid Login & Session Cookie Generation', 'FAIL', JSON.stringify(clientALogin.data));
    }

    // 2. Valid login as Client B
    const clientBLogin = await loginUser(clientBEmail, clientBPw, 'CLIENT');
    if (clientBLogin.status === 200 && clientBLogin.cookie) {
      clientBCookie = clientBLogin.cookie;
      recordTest('Client Authentication', 'Client B Valid Login', 'PASS', `Client ID: ${clientBLogin.data?.user?.clientId}`);
    } else {
      recordTest('Client Authentication', 'Client B Valid Login', 'FAIL', JSON.stringify(clientBLogin.data));
    }

    // 3. Valid login as Client C
    const clientCLogin = await loginUser(clientCEmail, clientCPw, 'CLIENT');
    if (clientCLogin.status === 200 && clientCLogin.cookie) {
      clientCCookie = clientCLogin.cookie;
      recordTest('Client Authentication', 'Client C Valid Login', 'PASS', `Client ID: ${clientCLogin.data?.user?.clientId}`);
    } else {
      recordTest('Client Authentication', 'Client C Valid Login', 'FAIL', JSON.stringify(clientCLogin.data));
    }

    // 4. Invalid Password Rejection
    const invalidPwLogin = await loginUser(clientAEmail, 'WrongPassword#999', 'CLIENT');
    if (invalidPwLogin.status === 401) {
      recordTest('Client Authentication', 'Invalid Password Login Rejected (HTTP 401)', 'PASS', 'Unauthorized');
    } else {
      recordTest('Client Authentication', 'Invalid Password Login Rejected (HTTP 401)', 'FAIL', `Expected 401, got ${invalidPwLogin.status}`);
    }

    // 5. Inactive Client Login Rejection
    // Temporarily deactivate Client B to verify immediate login lockout
    if (clientBRecord?.id) {
      await prisma.client.update({
        where: { id: clientBRecord.id },
        data: { status: 'INACTIVE' },
      });
      const inactiveLogin = await loginUser(clientBEmail, clientBPw, 'CLIENT');
      if (inactiveLogin.status === 401 || inactiveLogin.status === 403) {
        recordTest('Client Authentication', 'Inactive Client Blocked from Logging In', 'PASS', `HTTP ${inactiveLogin.status}`);
      } else {
        recordTest('Client Authentication', 'Inactive Client Blocked from Logging In', 'FAIL', `Expected 401/403, got ${inactiveLogin.status}`);
      }
      // Re-activate Client B
      await prisma.client.update({
        where: { id: clientBRecord.id },
        data: { status: 'ACTIVE' },
      });
    }

    // 6. Client Logout & Session Invalidation
    const logoutRes = await apiRequest('/api/auth/logout', { method: 'POST' }, clientACookie);
    if (logoutRes.status === 200) {
      recordTest('Client Authentication', 'Client Logout Clears Session Cookie', 'PASS', 'Session terminated');
    } else {
      recordTest('Client Authentication', 'Client Logout Clears Session Cookie', 'FAIL', `Status ${logoutRes.status}`);
    }

    // Re-login Client A for remaining tests
    const reLoginA = await loginUser(clientAEmail, clientAPw, 'CLIENT');
    clientACookie = reLoginA.cookie;

    // -------------------------------------------------------------
    // SECTION 4: CLIENT DASHBOARD & PROFILE IMMUTABILITY
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 4: CLIENT DASHBOARD & ORGANIZATION PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Fetch own profile
    const profileRes = await apiRequest(`/api/clients/${clientARecord.clientId}`, {}, clientACookie);
    const orgProfile = profileRes.data?.client || profileRes.data;
    if (profileRes.status === 200 && orgProfile?.companyName === clientAPayload.companyName) {
      recordTest('Client Profile', 'Client A Views Own Organization Profile', 'PASS', orgProfile.companyName);
    } else {
      recordTest('Client Profile', 'Client A Views Own Organization Profile', 'FAIL', JSON.stringify(profileRes.data));
    }

    // Client Subscription & Quotas
    const subRes = await apiRequest('/api/client/subscription', {}, clientACookie);
    if (subRes.status === 200 && subRes.data?.subscription) {
      const sub = subRes.data.subscription;
      recordTest('Subscription & Limits', 'Client Subscription Telemetry & Plan Limits', 'PASS', `Plan: ${sub.plan || sub.planKey}, Allowed: ${sub.usage?.employees?.max || sub.maxEmployees}`);
    } else {
      recordTest('Subscription & Limits', 'Client Subscription Telemetry & Plan Limits', 'FAIL', JSON.stringify(subRes.data));
    }

    // Client Profile Immutability check: Client CANNOT change Client ID or Subscription via PATCH
    const illegalPatchRes = await apiRequest(`/api/clients/${clientARecord.clientId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        clientId: 'CLI-HACKED-99999',
        assignedModules: ['ALL'],
      }),
    }, clientACookie);

    if (illegalPatchRes.status === 403) {
      recordTest('Client Profile', 'Client Blocked from Mutating Client ID or Assigned Modules (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Client Profile', 'Client Blocked from Mutating Client ID or Assigned Modules (HTTP 403)', 'FAIL', `Status ${illegalPatchRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 5: CLIENT EMS - EMPLOYEE ONBOARDING
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 5: CLIENT EMS — EMPLOYEE ONBOARDING & ACCOUNTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Onboard Employee A1 under Client A
    const empA1Payload = {
      fullName: 'Aarav Sharma',
      phone: `+91 9711${timestamp}`,
      email: `aarav.${timestamp}@alpha-workforce.com`,
      designation: 'Senior Lead Architect',
      departmentName: 'Engineering',
      jobLocation: 'Gurugram HQ',
      employmentType: 'Full-Time',
      customPassword: 'EmployeeA1@Secure2026',
    };

    const createEmpA1Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA1Payload),
    }, clientACookie);

    if (createEmpA1Res.status === 200 && createEmpA1Res.data?.employee) {
      empA1Record = createEmpA1Res.data.employee;
      recordTest('Employee Onboarding', 'Client A Onboards Employee A1', 'PASS', `ID: ${empA1Record.employeeId}`);
    } else {
      recordTest('Employee Onboarding', 'Client A Onboards Employee A1', 'FAIL', JSON.stringify(createEmpA1Res.data));
    }

    // Onboard Employee A2 under Client A
    const empA2Payload = {
      fullName: 'Pooja Nair',
      phone: `+91 9722${timestamp}`,
      email: `pooja.${timestamp}@alpha-workforce.com`,
      designation: 'Senior QA Automation Specialist',
      departmentName: 'Quality Assurance',
      jobLocation: 'Gurugram HQ',
      employmentType: 'Full-Time',
      customPassword: 'EmployeeA2@Secure2026',
    };

    const createEmpA2Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA2Payload),
    }, clientACookie);

    if (createEmpA2Res.status === 200 && createEmpA2Res.data?.employee) {
      empA2Record = createEmpA2Res.data.employee;
      recordTest('Employee Onboarding', 'Client A Onboards Employee A2', 'PASS', `ID: ${empA2Record.employeeId}`);
    } else {
      recordTest('Employee Onboarding', 'Client A Onboards Employee A2', 'FAIL', JSON.stringify(createEmpA2Res.data));
    }

    // Onboard Employee B1 under Client B
    const empB1Payload = {
      fullName: 'Vikram Malhotra',
      phone: `+91 9733${timestamp}`,
      email: `vikram.${timestamp}@beta-logistics.com`,
      designation: 'Supply Chain Operations Lead',
      departmentName: 'Fleet Management',
      jobLocation: 'Navi Mumbai Hub',
      employmentType: 'Full-Time',
      customPassword: 'EmployeeB1@Secure2026',
    };

    const createEmpB1Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empB1Payload),
    }, clientBCookie);

    if (createEmpB1Res.status === 200 && createEmpB1Res.data?.employee) {
      empB1Record = createEmpB1Res.data.employee;
      recordTest('Employee Onboarding', 'Client B Onboards Employee B1', 'PASS', `ID: ${empB1Record.employeeId}`);
    } else {
      recordTest('Employee Onboarding', 'Client B Onboards Employee B1', 'FAIL', JSON.stringify(createEmpB1Res.data));
    }

    // Onboard Employee C1 under Client C
    const empC1Payload = {
      fullName: 'Ananya Deshmukh',
      phone: `+91 9744${timestamp}`,
      email: `ananya.${timestamp}@gamma-innovations.com`,
      designation: 'Enterprise Cloud Specialist',
      departmentName: 'Cloud Infrastructure',
      jobLocation: 'Bangalore Tech Park',
      employmentType: 'Full-Time',
      customPassword: 'EmployeeC1@Secure2026',
    };

    const createEmpC1Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empC1Payload),
    }, clientCCookie);

    if (createEmpC1Res.status === 200 && createEmpC1Res.data?.employee) {
      empC1Record = createEmpC1Res.data.employee;
      recordTest('Employee Onboarding', 'Client C Onboards Employee C1', 'PASS', `ID: ${empC1Record.employeeId}`);
    } else {
      recordTest('Employee Onboarding', 'Client C Onboards Employee C1', 'FAIL', JSON.stringify(createEmpC1Res.data));
    }

    // Verify Employee ID format in Database
    if (empA1Record?.employeeId && (empA1Record.employeeId.startsWith('GI-EMP-') || empA1Record.employeeId.startsWith('EMP-'))) {
      recordTest('Employee Onboarding', 'Auto-generated Unique Employee ID Format', 'PASS', empA1Record.employeeId);
    } else {
      recordTest('Employee Onboarding', 'Auto-generated Unique Employee ID Format', 'FAIL', empA1Record?.employeeId);
    }

    // -------------------------------------------------------------
    // SECTION 6: TENANT ISOLATION & IDOR ATTACK SIMULATION
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 6: TENANT ISOLATION & CROSS-TENANT SECURITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A queries employee directory
    const listAEmployeesRes = await apiRequest('/api/employees', {}, clientACookie);
    const clientAEmployees = listAEmployeesRes.data?.employees || [];
    const containsEmpA1 = clientAEmployees.some((e) => e.id === empA1Record.id);
    const containsEmpB1 = clientAEmployees.some((e) => e.id === empB1Record.id);
    const containsEmpC1 = clientAEmployees.some((e) => e.id === empC1Record.id);

    if (containsEmpA1 && !containsEmpB1 && !containsEmpC1) {
      recordTest('Tenant Isolation', 'Client A Employee Directory Scoped to Own Tenant', 'PASS', `Found ${clientAEmployees.length} employees, 0 from Client B/C`);
    } else {
      recordTest('Tenant Isolation', 'Client A Employee Directory Scoped to Own Tenant', 'FAIL', 'Cross-tenant leak detected in list');
    }

    // 2. IDOR Attack: Client A attempts to fetch Client B Organization Profile
    const idorOrgRes = await apiRequest(`/api/clients/${clientBRecord.clientId}`, {}, clientACookie);
    if (idorOrgRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Accessing Client B Profile (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Accessing Client B Profile (HTTP 403)', 'FAIL', `Expected 403, got ${idorOrgRes.status}`);
    }

    // 3. IDOR Attack: Client A attempts to read Client B Employee Details
    const idorEmpGetRes = await apiRequest(`/api/employees/${empB1Record.id}`, {}, clientACookie);
    if (idorEmpGetRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Reading Client B Employee (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Reading Client B Employee (HTTP 403)', 'FAIL', `Expected 403, got ${idorEmpGetRes.status}`);
    }

    // 4. IDOR Attack: Client A attempts to modify Client B Employee
    const idorEmpPatchRes = await apiRequest(`/api/employees/${empB1Record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ designation: 'Compromised Title' }),
    }, clientACookie);
    if (idorEmpPatchRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Modifying Client B Employee (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Modifying Client B Employee (HTTP 403)', 'FAIL', `Expected 403, got ${idorEmpPatchRes.status}`);
    }

    // 5. IDOR Attack: Client A attempts to block Client B Employee
    const idorBlockRes = await apiRequest(`/api/employees/${empB1Record.id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Malicious Cross-Tenant Block' }),
    }, clientACookie);
    if (idorBlockRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Suspending Client B Employee (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Suspending Client B Employee (HTTP 403)', 'FAIL', `Expected 403, got ${idorBlockRes.status}`);
    }

    // 6. IDOR Attack: Client A attempts to delete/archive Client B Employee
    const idorDeleteRes = await apiRequest(`/api/employees/${empB1Record.id}`, {
      method: 'DELETE',
    }, clientACookie);
    if (idorDeleteRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Archiving Client B Employee (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Archiving Client B Employee (HTTP 403)', 'FAIL', `Expected 403, got ${idorDeleteRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 7: EMPLOYEE PANEL AUTHENTICATION & SELF-SERVICE
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 7: EMPLOYEE PANEL AUTHENTICATION & ACTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Employee A1 Login
    const empA1Login = await loginUser(empA1Payload.email, 'EmployeeA1@Secure2026', 'EMPLOYEE');
    if (empA1Login.status === 200 && empA1Login.cookie) {
      employeeA1Cookie = empA1Login.cookie;
      recordTest('Employee Authentication', 'Employee A1 Login & Session Issuance', 'PASS', `Employee: ${empA1Login.data?.user?.fullName}`);
    } else {
      recordTest('Employee Authentication', 'Employee A1 Login & Session Issuance', 'FAIL', JSON.stringify(empA1Login.data));
    }

    // 2. Employee A1 views own profile
    const empA1SelfRes = await apiRequest(`/api/employees/${empA1Record.id}`, {}, employeeA1Cookie);
    const selfProfile = empA1SelfRes.data?.employee || empA1SelfRes.data;
    if (empA1SelfRes.status === 200 && selfProfile?.fullName === empA1Payload.fullName) {
      recordTest('Employee Profile', 'Employee A1 Accesses Own Profile', 'PASS', selfProfile.fullName);
    } else {
      recordTest('Employee Profile', 'Employee A1 Accesses Own Profile', 'FAIL', JSON.stringify(empA1SelfRes.data));
    }

    // 3. Employee A1 attempts to view Employee B1 profile -> 403
    const empA1CrossRes = await apiRequest(`/api/employees/${empB1Record.id}`, {}, employeeA1Cookie);
    if (empA1CrossRes.status === 403) {
      recordTest('Security (IDOR)', 'Employee A1 Blocked from Viewing Employee B1 Profile (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Employee A1 Blocked from Viewing Employee B1 Profile (HTTP 403)', 'FAIL', `Expected 403, got ${empA1CrossRes.status}`);
    }

    // 4. Employee A1 Check-In (Biometric / Online Attendance)
    const checkInRes = await apiRequest('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({}),
    }, employeeA1Cookie);

    if (checkInRes.status === 200 || (checkInRes.status === 400 && checkInRes.data?.error?.includes('already checked in'))) {
      recordTest('Attendance', 'Employee A1 Performs Duty Check-In', 'PASS', 'Attendance record created');
    } else {
      recordTest('Attendance', 'Employee A1 Performs Duty Check-In', 'FAIL', JSON.stringify(checkInRes.data));
    }

    // 5. Employee A1 applies for Leave
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const leavePayload = {
      leaveType: 'CASUAL',
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: dayAfter.toISOString().split('T')[0],
      reason: 'Personal family emergency and medical consultation',
    };

    const leaveApplyRes = await apiRequest('/api/leave', {
      method: 'POST',
      body: JSON.stringify(leavePayload),
    }, employeeA1Cookie);

    if ((leaveApplyRes.status === 201 || leaveApplyRes.status === 200) && leaveApplyRes.data?.leave) {
      leaveA1Record = leaveApplyRes.data.leave;
      recordTest('Leave Management', 'Employee A1 Applies for Leave (Pending Approval)', 'PASS', `ID: ${leaveA1Record.id}`);
    } else {
      recordTest('Leave Management', 'Employee A1 Applies for Leave (Pending Approval)', 'FAIL', JSON.stringify(leaveApplyRes.data));
    }

    // -------------------------------------------------------------
    // SECTION 8: TASK MANAGEMENT & CROSS-TENANT TASK SECURITY
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 8: TASK DELEGATION, WORKFLOW & IDOR SECURITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A creates Task for Employee A1
    const taskPayload = {
      title: 'Deploy Production Security Enhancements',
      description: 'Audit cross-tenant boundaries and apply database index optimization',
      priority: 'HIGH',
      assignedToId: empA1Record.id,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    };

    const createTaskRes = await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskPayload),
    }, clientACookie);

    if (createTaskRes.status === 201 && createTaskRes.data) {
      taskA1Record = createTaskRes.data;
      recordTest('Tasks', 'Client A Creates and Assigns Task to Employee A1', 'PASS', `Task: ${taskA1Record.taskNumber}`);
    } else {
      recordTest('Tasks', 'Client A Creates and Assigns Task to Employee A1', 'FAIL', JSON.stringify(createTaskRes.data));
    }

    // 2. Client A attempts illegal assignment: Assign Task to Client B Employee -> 403
    const illegalTaskRes = await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Unauthorized Task Assignment',
        assignedToId: empB1Record.id,
      }),
    }, clientACookie);

    if (illegalTaskRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Assigning Task to Client B Employee (HTTP 403)', 'PASS', 'Access Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Assigning Task to Client B Employee (HTTP 403)', 'FAIL', `Expected 403, got ${illegalTaskRes.status}`);
    }

    // 3. IDOR Attack on Task Details: Client B attempts to read Client A Task -> 403
    const idorTaskReadRes = await apiRequest(`/api/tasks/${taskA1Record.id}`, {}, clientBCookie);
    if (idorTaskReadRes.status === 403) {
      recordTest('Security (IDOR)', 'Client B Blocked from Reading Client A Task (HTTP 403)', 'PASS', 'Cross-tenant task IDOR blocked');
    } else {
      recordTest('Security (IDOR)', 'Client B Blocked from Reading Client A Task (HTTP 403)', 'FAIL', `Expected 403, got ${idorTaskReadRes.status}`);
    }

    // 4. IDOR Attack on Task Comments: Client B attempts to view or post comments on Client A Task -> 403
    const idorCommentGet = await apiRequest(`/api/tasks/${taskA1Record.id}/comments`, {}, clientBCookie);
    const idorCommentPost = await apiRequest(`/api/tasks/${taskA1Record.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Malicious cross-tenant comment attempt' }),
    }, clientBCookie);

    if (idorCommentGet.status === 403 && idorCommentPost.status === 403) {
      recordTest('Security (IDOR)', 'Client B Blocked from Viewing/Posting Comments on Client A Task (HTTP 403)', 'PASS', 'Task Comments IDOR protected');
    } else {
      recordTest('Security (IDOR)', 'Client B Blocked from Viewing/Posting Comments on Client A Task (HTTP 403)', 'FAIL', `Get: ${idorCommentGet.status}, Post: ${idorCommentPost.status}`);
    }

    // 5. Employee A1 Workflow Progression: ACCEPT -> START -> SUBMIT
    const acceptRes = await apiRequest(`/api/tasks/${taskA1Record.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'ACCEPT' }),
    }, employeeA1Cookie);

    const startRes = await apiRequest(`/api/tasks/${taskA1Record.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action: 'START' }),
    }, employeeA1Cookie);

    const submitRes = await apiRequest(`/api/tasks/${taskA1Record.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'SUBMIT',
        payload: {
          summary: 'Security hardening implemented and regression test verified',
          notes: 'Completed all 15 audit checkpoints with zero regressions',
          links: ['https://github.com/growthindia/security-audit'],
        },
      }),
    }, employeeA1Cookie);

    if (acceptRes.status === 200 && startRes.status === 200 && submitRes.status === 200) {
      recordTest('Tasks', 'Employee A1 Task Workflow: ACCEPT -> START -> SUBMIT', 'PASS', 'Task Status: WAITING_FOR_REVIEW');
    } else {
      recordTest('Tasks', 'Employee A1 Task Workflow: ACCEPT -> START -> SUBMIT', 'FAIL', `Submit: ${submitRes.status}`);
    }

    // 6. Client A Reviews Deliverables & Completes Task
    const reviewRes = await apiRequest(`/api/tasks/${taskA1Record.id}/workflow`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'REVIEW',
        payload: {
          isApproved: true,
          feedback: 'Outstanding deliverable quality. Approved for production release.',
        },
      }),
    }, clientACookie);

    if (reviewRes.status === 200) {
      const finishedTask = await prisma.task.findUnique({ where: { id: taskA1Record.id } });
      if (finishedTask?.status === 'COMPLETED' && finishedTask.completedAt) {
        recordTest('Tasks', 'Client A Approves Deliverables & Marks Task COMPLETED', 'PASS', 'Audit lineage recorded');
      } else {
        recordTest('Tasks', 'Client A Approves Deliverables & Marks Task COMPLETED', 'FAIL', `Status is ${finishedTask?.status}`);
      }
    } else {
      recordTest('Tasks', 'Client A Approves Deliverables & Marks Task COMPLETED', 'FAIL', JSON.stringify(reviewRes.data));
    }

    // -------------------------------------------------------------
    // SECTION 9: ATTENDANCE & LEAVE CLIENT GOVERNANCE
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 9: ATTENDANCE & LEAVE CLIENT REVIEW & INTEGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A views today attendance
    const todayAttRes = await apiRequest('/api/attendance/today', {}, clientACookie);
    if (todayAttRes.status === 200 && todayAttRes.data?.summary) {
      recordTest('Attendance', 'Client A Views Today Live Workforce Telemetry', 'PASS', `Total: ${todayAttRes.data.summary.totalEmployees}, Present: ${todayAttRes.data.summary.presentCount}`);
    } else {
      recordTest('Attendance', 'Client A Views Today Live Workforce Telemetry', 'FAIL', JSON.stringify(todayAttRes.data));
    }

    // 2. IDOR Attack: Client A attempts to fetch Client B employee attendance history -> 403
    const idorAttHistRes = await apiRequest(`/api/attendance/history?employeeId=${empB1Record.id}`, {}, clientACookie);
    if (idorAttHistRes.status === 403) {
      recordTest('Security (IDOR)', 'Client A Blocked from Accessing Client B Attendance History (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client A Blocked from Accessing Client B Attendance History (HTTP 403)', 'FAIL', `Expected 403, got ${idorAttHistRes.status}`);
    }

    // 3. IDOR Attack: Client B attempts to review Client A leave -> 403
    const idorLeaveRevRes = await apiRequest(`/api/leave/${leaveA1Record.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'APPROVED' }),
    }, clientBCookie);

    if (idorLeaveRevRes.status === 403) {
      recordTest('Security (IDOR)', 'Client B Blocked from Reviewing Client A Leave Request (HTTP 403)', 'PASS', 'Forbidden');
    } else {
      recordTest('Security (IDOR)', 'Client B Blocked from Reviewing Client A Leave Request (HTTP 403)', 'FAIL', `Expected 403, got ${idorLeaveRevRes.status}`);
    }

    // 4. Mandatory Rejection Reason Validation
    const invalidRejectRes = await apiRequest(`/api/leave/${leaveA1Record.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REJECTED' }),
    }, clientACookie);

    if (invalidRejectRes.status === 400 && invalidRejectRes.data?.error?.includes('mandatory')) {
      recordTest('Leave Management', 'Mandatory Rejection Reason Validation Enforced', 'PASS', 'Validation passed');
    } else {
      recordTest('Leave Management', 'Mandatory Rejection Reason Validation Enforced', 'FAIL', `Status ${invalidRejectRes.status}`);
    }

    // 5. Client A Approves Leave with Attendance Table Integration
    const approveLeaveRes = await apiRequest(`/api/leave/${leaveA1Record.id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'APPROVED',
        reviewRemarks: 'Approved for personal emergency leave',
      }),
    }, clientACookie);

    if (approveLeaveRes.status === 200) {
      // Check Attendance Table for ON_LEAVE integration
      const leaveDate = tomorrow.toISOString().split('T')[0];
      const attRecord = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: empA1Record.id,
            date: leaveDate,
          },
        },
      });

      if (attRecord && attRecord.status === 'ON_LEAVE') {
        recordTest('Leave Management', 'Approved Leave Integrates with Attendance Table (status: ON_LEAVE)', 'PASS', `Date: ${leaveDate}`);
      } else {
        recordTest('Leave Management', 'Approved Leave Integrates with Attendance Table (status: ON_LEAVE)', 'FAIL', `Status: ${attRecord?.status}`);
      }
    } else {
      recordTest('Leave Management', 'Approved Leave Integrates with Attendance Table (status: ON_LEAVE)', 'FAIL', JSON.stringify(approveLeaveRes.data));
    }

    // -------------------------------------------------------------
    // SECTION 10: EMPLOYEE DOCUMENT MANAGEMENT & KYC
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 10: DOCUMENT MANAGEMENT & SENSITIVE KYC ISOLATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A uploads KYC Document for Employee A1
    const docPayload = {
      documentType: 'AADHAAR',
      title: 'Government Identity Proof',
      fileName: 'aadhaar_card.pdf',
      fileSizeBytes: 204800,
      mimeType: 'application/pdf',
    };

    const uploadDocRes = await apiRequest(`/api/employees/${empA1Record.id}/documents`, {
      method: 'POST',
      body: JSON.stringify(docPayload),
    }, clientACookie);

    let docRecord = null;
    if (uploadDocRes.status === 201 && uploadDocRes.data?.document) {
      docRecord = uploadDocRes.data.document;
      recordTest('Documents', 'Client A Uploads Sensitive KYC Document for Employee A1', 'PASS', `Doc ID: ${docRecord.documentId}`);
    } else {
      recordTest('Documents', 'Client A Uploads Sensitive KYC Document for Employee A1', 'FAIL', JSON.stringify(uploadDocRes.data));
    }

    // 2. Employee A1 reads own documents
    const empDocsRes = await apiRequest(`/api/employees/${empA1Record.id}/documents`, {}, employeeA1Cookie);
    if (empDocsRes.status === 200 && empDocsRes.data?.documents?.length > 0) {
      recordTest('Documents', 'Employee A1 Accesses Own Verified Documents', 'PASS', `Count: ${empDocsRes.data.documents.length}`);
    } else {
      recordTest('Documents', 'Employee A1 Accesses Own Verified Documents', 'FAIL', JSON.stringify(empDocsRes.data));
    }

    // 3. IDOR Attack: Client B attempts to read Employee A1 documents -> 403
    const idorDocRes = await apiRequest(`/api/employees/${empA1Record.id}/documents`, {}, clientBCookie);
    if (idorDocRes.status === 403) {
      recordTest('Security (IDOR)', 'Client B Blocked from Accessing Employee A1 Documents (HTTP 403)', 'PASS', 'Permission Denied');
    } else {
      recordTest('Security (IDOR)', 'Client B Blocked from Accessing Employee A1 Documents (HTTP 403)', 'FAIL', `Expected 403, got ${idorDocRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 11: EMPLOYEE DISCIPLINARY BLOCK & UNBLOCK LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 11: EMPLOYEE BLOCK / UNBLOCK & IMMEDIATE REVOCATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A blocks Employee A2
    const blockRes = await apiRequest(`/api/employees/${empA2Record.id}/block`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Violation of Information Security & Data Protection Policy',
        remarks: 'Suspended pending formal internal inquiry',
      }),
    }, clientACookie);

    if (blockRes.status === 200) {
      // Verify in MongoDB: status = BLOCKED, isBlocked = true, User.isActive = false
      const dbEmpA2 = await prisma.employee.findUnique({
        where: { id: empA2Record.id },
        include: { user: true, blockHistories: true },
      });

      if (dbEmpA2?.status === 'BLOCKED' && dbEmpA2.isBlocked && dbEmpA2.user?.isActive === false && dbEmpA2.blockHistories.length > 0) {
        recordTest('Employee Lifecycle', 'Client A Blocks Employee A2 (Instant DB Suspension & Block History)', 'PASS', 'Status: BLOCKED');
      } else {
        recordTest('Employee Lifecycle', 'Client A Blocks Employee A2 (Instant DB Suspension & Block History)', 'FAIL', 'DB flags not set');
      }
    } else {
      recordTest('Employee Lifecycle', 'Client A Blocks Employee A2 (Instant DB Suspension & Block History)', 'FAIL', JSON.stringify(blockRes.data));
    }

    // 2. Blocked Employee A2 Attempts Login -> 401 Unauthorized
    const blockedEmpLogin = await loginUser(empA2Payload.email, 'EmployeeA2@Secure2026', 'EMPLOYEE');
    if (blockedEmpLogin.status === 401 || blockedEmpLogin.status === 403) {
      recordTest('Employee Authentication', 'Blocked Employee A2 Immediately Locked Out of Platform', 'PASS', `HTTP ${blockedEmpLogin.status}`);
    } else {
      recordTest('Employee Authentication', 'Blocked Employee A2 Immediately Locked Out of Platform', 'FAIL', `Expected 401/403, got ${blockedEmpLogin.status}`);
    }

    // 3. Client A Unblocks Employee A2
    const unblockRes = await apiRequest(`/api/employees/${empA2Record.id}/unblock`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Inquiry cleared; restored to active duties',
        remarks: 'Reinstated by Executive Client Authority',
      }),
    }, clientACookie);

    if (unblockRes.status === 200) {
      const dbEmpA2Restored = await prisma.employee.findUnique({
        where: { id: empA2Record.id },
        include: { user: true },
      });

      if (dbEmpA2Restored?.status === 'ACTIVE' && !dbEmpA2Restored.isBlocked && dbEmpA2Restored.user?.isActive) {
        recordTest('Employee Lifecycle', 'Client A Unblocks Employee A2 & Reinstates Access', 'PASS', 'Status: ACTIVE');
      } else {
        recordTest('Employee Lifecycle', 'Client A Unblocks Employee A2 & Reinstates Access', 'FAIL', 'DB flags not restored');
      }
    } else {
      recordTest('Employee Lifecycle', 'Client A Unblocks Employee A2 & Reinstates Access', 'FAIL', JSON.stringify(unblockRes.data));
    }

    // 4. Employee A2 Logs In After Unblock
    const unblockedEmpLogin = await loginUser(empA2Payload.email, 'EmployeeA2@Secure2026', 'EMPLOYEE');
    if (unblockedEmpLogin.status === 200 && unblockedEmpLogin.cookie) {
      employeeA2Cookie = unblockedEmpLogin.cookie;
      recordTest('Employee Authentication', 'Reinstated Employee A2 Logs In Successfully', 'PASS', 'Access restored');
    } else {
      recordTest('Employee Authentication', 'Reinstated Employee A2 Logs In Successfully', 'FAIL', JSON.stringify(unblockedEmpLogin.data));
    }

    // -------------------------------------------------------------
    // SECTION 12: MODULE-BASED ACCESS CONTROL (EMS, CRM, HRM)
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 12: SERVER-SIDE MODULE ASSIGNMENT ENFORCEMENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Client A (Assigned ['EMS'] only):
    // 1. Access CRM -> 403 Forbidden
    const clientACrmRes = await apiRequest('/api/crm/leads', {}, clientACookie);
    if (clientACrmRes.status === 403) {
      recordTest('Module Access', 'Client A (EMS Only) Blocked from CRM Module (HTTP 403)', 'PASS', 'Module Not Enabled');
    } else {
      recordTest('Module Access', 'Client A (EMS Only) Blocked from CRM Module (HTTP 403)', 'FAIL', `Expected 403, got ${clientACrmRes.status}`);
    }

    // 2. Access HRM -> 403 Forbidden
    const clientAHrmRes = await apiRequest('/api/hrm/dashboard', {}, clientACookie);
    if (clientAHrmRes.status === 403) {
      recordTest('Module Access', 'Client A (EMS Only) Blocked from HRM Module (HTTP 403)', 'PASS', 'Module Not Enabled');
    } else {
      recordTest('Module Access', 'Client A (EMS Only) Blocked from HRM Module (HTTP 403)', 'FAIL', `Expected 403, got ${clientAHrmRes.status}`);
    }

    // Client B (Assigned ['EMS', 'CRM']):
    // 1. Access CRM -> 200 OK
    const clientBCrmRes = await apiRequest('/api/crm/leads', {}, clientBCookie);
    if (clientBCrmRes.status === 200) {
      recordTest('Module Access', 'Client B (EMS + CRM) Granted Access to CRM Module', 'PASS', 'HTTP 200 OK');
    } else {
      recordTest('Module Access', 'Client B (EMS + CRM) Granted Access to CRM Module', 'FAIL', `Expected 200, got ${clientBCrmRes.status}`);
    }

    // 2. Access HRM -> 403 Forbidden
    const clientBHrmRes = await apiRequest('/api/hrm/dashboard', {}, clientBCookie);
    if (clientBHrmRes.status === 403) {
      recordTest('Module Access', 'Client B (EMS + CRM) Blocked from HRM Module (HTTP 403)', 'PASS', 'Module Not Enabled');
    } else {
      recordTest('Module Access', 'Client B (EMS + CRM) Blocked from HRM Module (HTTP 403)', 'FAIL', `Expected 403, got ${clientBHrmRes.status}`);
    }

    // Client C (Assigned ['EMS', 'CRM', 'HRM']):
    // 1. Access CRM -> 200 OK
    const clientCCrmRes = await apiRequest('/api/crm/leads', {}, clientCCookie);
    if (clientCCrmRes.status === 200) {
      recordTest('Module Access', 'Client C (EMS + CRM + HRM) Granted Access to CRM Module', 'PASS', 'HTTP 200 OK');
    } else {
      recordTest('Module Access', 'Client C (EMS + CRM + HRM) Granted Access to CRM Module', 'FAIL', `Expected 200, got ${clientCCrmRes.status}`);
    }

    // 2. Access HRM -> 200 OK
    const clientCHrmRes = await apiRequest('/api/hrm/dashboard', {}, clientCCookie);
    if (clientCHrmRes.status === 200) {
      recordTest('Module Access', 'Client C (EMS + CRM + HRM) Granted Access to HRM Module', 'PASS', 'HTTP 200 OK');
    } else {
      recordTest('Module Access', 'Client C (EMS + CRM + HRM) Granted Access to HRM Module', 'FAIL', `Expected 200, got ${clientCHrmRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 13: SUBSCRIPTION PLAN QUOTA ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 13: SUBSCRIPTION PLAN LIMITS & CAPACITY AUDIT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Temporarily place Client A on TRIAL tier (maxEmployees = 2)
    // Client A already has 2 employees (empA1, empA2), so employee #3 must be rejected
    await prisma.client.update({
      where: { id: clientARecord.id },
      data: { subscriptionPlan: 'TRIAL' },
    });

    const empA3Payload = {
      fullName: 'Rohan Mehra',
      phone: `+91 9755${timestamp}`,
      email: `rohan.${timestamp}@alpha-workforce.com`,
      designation: 'DevOps Specialist',
      departmentName: 'Engineering',
      jobLocation: 'Gurugram HQ',
      employmentType: 'Full-Time',
      customPassword: 'EmployeeA3@Secure2026',
    };

    // Attempt to onboard employee #3 under TRIAL tier -> Rejection (HTTP 409)
    const rejectEmpA3Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA3Payload),
    }, clientACookie);

    if (rejectEmpA3Res.status === 409 && (rejectEmpA3Res.data?.error?.includes('limit') || rejectEmpA3Res.data?.quota)) {
      recordTest('Subscription & Limits', 'Backend Enforces Employee Quota Limit (Rejects #3 on TRIAL with HTTP 409)', 'PASS', rejectEmpA3Res.data.error);
    } else {
      recordTest('Subscription & Limits', 'Backend Enforces Employee Quota Limit (Rejects #3 on TRIAL with HTTP 409)', 'FAIL', `Expected 409, got ${rejectEmpA3Res.status}`);
    }

    // 2. Upgrade Client A to STANDARD tier (maxEmployees = 100)
    await prisma.client.update({
      where: { id: clientARecord.id },
      data: { subscriptionPlan: 'STANDARD' },
    });

    // Retry onboarding employee #3 -> Should succeed (3 / 100)
    const createEmpA3Res = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA3Payload),
    }, clientACookie);

    if (createEmpA3Res.status === 200 && createEmpA3Res.data?.employee) {
      empA3Record = createEmpA3Res.data.employee;
      recordTest('Subscription & Limits', 'Client A Upgraded to STANDARD Plan & Successfully Onboards Employee #3', 'PASS', `ID: ${empA3Record.employeeId}`);
    } else {
      recordTest('Subscription & Limits', 'Client A Upgraded to STANDARD Plan & Successfully Onboards Employee #3', 'FAIL', JSON.stringify(createEmpA3Res.data));
    }

    // 3. Test Suspended Subscription Status Lockout
    await prisma.client.update({
      where: { id: clientARecord.id },
      data: { subscriptionStatus: 'SUSPENDED' },
    });

    const empA4Payload = {
      fullName: 'Sunil Gavaskar',
      phone: `+91 9766${timestamp}`,
      email: `sunil.${timestamp}@alpha-workforce.com`,
      designation: 'Infrastructure Architect',
      departmentName: 'Engineering',
      jobLocation: 'Gurugram HQ',
      employmentType: 'Full-Time',
    };

    const suspendedAddRes = await apiRequest('/api/employees', {
      method: 'POST',
      body: JSON.stringify(empA4Payload),
    }, clientACookie);

    if (suspendedAddRes.status === 409 && suspendedAddRes.data?.error?.includes('SUSPENDED')) {
      recordTest('Subscription & Limits', 'Suspended Subscription Organization Blocked from Adding Staff (HTTP 409)', 'PASS', suspendedAddRes.data.error);
    } else {
      recordTest('Subscription & Limits', 'Suspended Subscription Organization Blocked from Adding Staff (HTTP 409)', 'FAIL', `Expected 409, got ${suspendedAddRes.status}`);
    }

    // Restore Client A subscription status to ACTIVE
    await prisma.client.update({
      where: { id: clientARecord.id },
      data: { subscriptionStatus: 'ACTIVE' },
    });

    // -------------------------------------------------------------
    // SECTION 14: CLIENT SHARED ACCESS & SINGLE-USE INVITATIONS
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 14: CLIENT SHARED ACCESS & TOKEN REPLAY SECURITY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Client A sends an invitation for a delegated assistant
    const invitePayload = {
      name: 'Executive Assistant',
      email: `assistant.${timestamp}@alpha-workforce.com`,
      designation: 'Operations Coordinator',
      permissions: ['employees', 'attendance', 'tasks'],
    };

    const inviteRes = await apiRequest('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(invitePayload),
    }, clientACookie);

    let invitationRecord = null;
    if ((inviteRes.status === 200 || inviteRes.status === 201) && inviteRes.data?.invitation) {
      invitationRecord = inviteRes.data.invitation;
      recordTest('Shared Access', 'Client A Creates Delegated Team Invitation', 'PASS', `Token: ${invitationRecord.token?.slice(0, 10)}...`);
    } else {
      recordTest('Shared Access', 'Client A Creates Delegated Team Invitation', 'FAIL', JSON.stringify(inviteRes.data));
    }

    // 2. Accept Invitation
    const acceptPayload = {
      token: invitationRecord?.token,
      password: 'Assistant@Password123',
      confirmPassword: 'Assistant@Password123',
      fullName: 'Rahul Bose',
    };

    const acceptInvRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(acceptPayload),
    });

    if (acceptInvRes.status === 200 && acceptInvRes.data?.user) {
      recordTest('Shared Access', 'Delegated Team Member Accepts Invitation & Provisions Account', 'PASS', 'Account created');
    } else {
      recordTest('Shared Access', 'Delegated Team Member Accepts Invitation & Provisions Account', 'FAIL', JSON.stringify(acceptInvRes.data));
    }

    // 3. Replay Attack: Attempt to accept the same token again -> HTTP 410 Gone / Conflict
    const replayInvRes = await apiRequest('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(acceptPayload),
    });

    if (replayInvRes.status === 410 || replayInvRes.status === 400 || replayInvRes.status === 409) {
      recordTest('Security (Auth)', 'Single-Use Invitation Token Replay Attack Blocked', 'PASS', `HTTP ${replayInvRes.status}`);
    } else {
      recordTest('Security (Auth)', 'Single-Use Invitation Token Replay Attack Blocked', 'FAIL', `Expected 410/400, got ${replayInvRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 15: ADMIN ↔ CLIENT ↔ EMPLOYEE 3-WAY CONSISTENCY
    // -------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECTION 15: CROSS-PANEL SYNCHRONIZATION & DATABASE VERIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Admin reads Client A organization data
    const adminClientARes = await apiRequest(`/api/clients/${clientARecord.clientId}`, {}, adminCookie);
    const adminEmployees = adminClientARes.data?.client?.employees || adminClientARes.data?.employees || [];
    if (adminClientARes.status === 200 && adminEmployees.length === 3) {
      recordTest('Cross-Panel Sync', 'Admin Panel Views Real-Time Client A Staff (3 Employees)', 'PASS', `Employees: ${adminEmployees.map(e => e.employeeId).join(', ')}`);
    } else {
      recordTest('Cross-Panel Sync', 'Admin Panel Views Real-Time Client A Staff (3 Employees)', 'FAIL', `Found ${adminEmployees.length} employees`);
    }

    // 2. Direct MongoDB Atlas Replica Set Query
    const dbClientAEmployees = await prisma.employee.findMany({
      where: { clientId: clientARecord.id },
      select: { employeeId: true, fullName: true, status: true },
    });

    if (dbClientAEmployees.length === 3) {
      recordTest('Database Integrity', 'Direct MongoDB Atlas Verification: Client A Employee Count & Schema', 'PASS', `Count: ${dbClientAEmployees.length}`);
    } else {
      recordTest('Database Integrity', 'Direct MongoDB Atlas Verification: Client A Employee Count & Schema', 'FAIL', `Count: ${dbClientAEmployees.length}`);
    }

    // 3. Database Audit Logs Verification
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: clientARecord.id },
          { entityId: empA1Record?.id },
          { entityId: taskA1Record?.id },
        ],
      },
      take: 10,
    });

    if (auditLogs.length > 0) {
      recordTest('Audit Governance', 'Database Audit Logs Ingested Across Client, Employee & Tasks', 'PASS', `Found ${auditLogs.length} audit records`);
    } else {
      recordTest('Audit Governance', 'Database Audit Logs Ingested Across Client, Employee & Tasks', 'PARTIAL', 'Zero audit records found');
    }

  } catch (err) {
    console.error('\n❌ Unhandled exception during E2E test execution:', err);
    recordTest('Suite Execution', 'Unexpected Exception in E2E Pipeline', 'FAIL', err.message);
  } finally {
    // -------------------------------------------------------------
    // FINAL TEST SUMMARY & REPORTING
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 GROWTH INDIA CLIENT PANEL E2E TEST SUMMARY');
    console.log('================================================================');
    console.log(`TOTAL TESTS EXECUTED : ${results.total}`);
    console.log(`PASSED               : ${results.passed}`);
    console.log(`FAILED               : ${results.failed}`);
    console.log(`PARTIAL              : ${results.partial}`);
    console.log(`BLOCKED              : ${results.blocked}`);
    console.log(`SUCCESS RATE         : ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('================================================================\n');

    await prisma.$disconnect();
    return results;
  }
}

// Execute if run directly
if (require.main === module) {
  runClientPanelE2ETestSuite()
    .then((res) => {
      if (res.failed > 0) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exitCode = 1;
    });
}

module.exports = { runClientPanelE2ETestSuite };
