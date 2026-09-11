const BASE_URL = 'http://localhost:3000';

let adminToken = '';
let client1Token = '';
let client2Token = '';
let emp1Token = '';

let client1Data = null;
let client2Data = null;
let emp1Data = null;
let emp2Data = null;
let emp3Data = null;

function logSection(title) {
  console.log('\n================================================================');
  console.log(`📌 ${title}`);
  console.log('================================================================');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Cookie'] = `growth_session_token=${options.token}`;
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return { status: res.status, headers: res.headers, data: json };
}

function extractToken(headers) {
  const setCookie = headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/growth_session_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

async function runE2ETests() {
  console.log('🚀 Starting Comprehensive Multi-Role Platform E2E Verification...\n');

  // -------------------------------------------------------------------------
  // PHASE 1: ADMIN LOGIN & PERMISSIONS
  // -------------------------------------------------------------------------
  logSection('1. ADMIN LOGIN & AUTHENTICATION');
  const adminLoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@growthindia.in',
      password: 'Admin@123',
      portalType: 'ADMIN',
    },
  });

  assert(adminLoginRes.status === 200, `Admin Login HTTP Status 200 (Got ${adminLoginRes.status})`);
  assert(adminLoginRes.data.success === true, 'Admin Login Success flag is true');
  assert(adminLoginRes.data.user.role === 'ADMIN', 'Admin User role is ADMIN');
  
  adminToken = extractToken(adminLoginRes.headers);
  assert(!!adminToken, 'Admin Session JWT Token received');

  // Verify Admin Session via /api/auth/me
  const adminMeRes = await apiRequest('/api/auth/me', { token: adminToken });
  assert(adminMeRes.status === 200, 'Admin /api/auth/me returns 200');
  assert(adminMeRes.data.user.email === 'admin@growthindia.in', 'Admin session identity verified');

  // -------------------------------------------------------------------------
  // PHASE 2: ADMIN CREATES 2 CORPORATE CLIENTS
  // -------------------------------------------------------------------------
  logSection('2. ADMIN CREATES 2 CLIENTS');

  // Client 1: Nexus Dynamics Pvt Ltd
  const client1Payload = {
    companyName: 'Nexus Dynamics Pvt Ltd',
    contactPerson: 'Rajesh Verma',
    mobile: '+91 98111 22233',
    email: 'rajesh@nexusdynamics.com',
    industry: 'IT & Software Services',
    address: 'DLF Cyber City, Tower B, Gurugram, Haryana',
    canBlockEmployees: true,
    canDeleteEmployees: false,
    customPassword: 'Client@123',
    gstNumber: '07AAAAA0000A1Z5',
    panNumber: 'AAACN1234F',
  };

  const createClient1Res = await apiRequest('/api/clients', {
    method: 'POST',
    token: adminToken,
    body: client1Payload,
  });

  assert(createClient1Res.status === 201 || createClient1Res.status === 200, `Client 1 Created (${createClient1Res.status})`);
  assert(createClient1Res.data.success === true, 'Client 1 creation success flag true');
  client1Data = createClient1Res.data.client;
  assert(!!client1Data.clientId, `Client 1 assigned sequential Client ID: ${client1Data.clientId}`);

  // Client 2: Apex Logistics & Supply Chain
  const client2Payload = {
    companyName: 'Apex Logistics & Supply Chain',
    contactPerson: 'Sunita Kapoor',
    mobile: '+91 98222 33344',
    email: 'sunita@apexlogistics.in',
    industry: 'Logistics & Supply Chain',
    address: 'Bhiwandi Cargo Complex, Mumbai, Maharashtra',
    canBlockEmployees: true,
    canDeleteEmployees: false,
    customPassword: 'Client@123',
    gstNumber: '27BBBBB1111B2Z6',
    panNumber: 'BBBCN5678G',
  };

  const createClient2Res = await apiRequest('/api/clients', {
    method: 'POST',
    token: adminToken,
    body: client2Payload,
  });

  assert(createClient2Res.status === 201 || createClient2Res.status === 200, `Client 2 Created (${createClient2Res.status})`);
  client2Data = createClient2Res.data.client;
  assert(!!client2Data.clientId, `Client 2 assigned sequential Client ID: ${client2Data.clientId}`);

  // Fetch all clients as Admin
  const listClientsRes = await apiRequest('/api/clients', { token: adminToken });
  assert(listClientsRes.status === 200, 'Admin /api/clients returns 200');
  assert(listClientsRes.data.clients.length >= 2, `Admin sees ${listClientsRes.data.clients.length} corporate clients`);

  // -------------------------------------------------------------------------
  // PHASE 3: ADMIN ONBOARDS EMPLOYEES FOR BOTH CLIENTS
  // -------------------------------------------------------------------------
  logSection('3. ADMIN ONBOARDS EMPLOYEES FOR BOTH CLIENTS');

  // Employee 1 for Client 1 (Nexus Dynamics)
  const emp1Payload = {
    clientId: client1Data.id,
    fullName: 'Aarav Sharma',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@nexusdynamics.com',
    departmentName: 'Engineering',
    designation: 'Senior Full-Stack Engineer',
    employmentType: 'Full-Time',
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    jobLocation: 'Gurugram Facility',
    customPassword: 'Emp@12345',
  };

  const createEmp1Res = await apiRequest('/api/employees', {
    method: 'POST',
    token: adminToken,
    body: emp1Payload,
  });

  assert(createEmp1Res.status === 201 || createEmp1Res.status === 200, `Employee 1 (Aarav Sharma) Created (${createEmp1Res.status})`);
  assert(createEmp1Res.data.success === true, 'Employee 1 creation success flag true');
  emp1Data = createEmp1Res.data.employee;
  assert(!!emp1Data.employeeId, `Employee 1 assigned ID: ${emp1Data.employeeId}`);

  // Employee 2 for Client 2 (Apex Logistics)
  const emp2Payload = {
    clientId: client2Data.id,
    fullName: 'Priya Nair',
    phone: '+91 98765 43211',
    email: 'priya.nair@apexlogistics.in',
    departmentName: 'Fleet Operations',
    designation: 'Logistics Coordinator',
    employmentType: 'Full-Time',
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    jobLocation: 'Mumbai Hub',
    customPassword: 'Emp@12345',
  };

  const createEmp2Res = await apiRequest('/api/employees', {
    method: 'POST',
    token: adminToken,
    body: emp2Payload,
  });

  assert(createEmp2Res.status === 201 || createEmp2Res.status === 200, `Employee 2 (Priya Nair) Created (${createEmp2Res.status})`);
  emp2Data = createEmp2Res.data.employee;
  assert(!!emp2Data.employeeId, `Employee 2 assigned ID: ${emp2Data.employeeId}`);

  // -------------------------------------------------------------------------
  // PHASE 4: ADMIN CRM OPERATIONS (LEADS, DEALS, TASKS)
  // -------------------------------------------------------------------------
  logSection('4. ADMIN CRM PIPELINE OPERATIONS');

  // Create Lead
  const leadRes = await apiRequest('/api/crm/leads', {
    method: 'POST',
    token: adminToken,
    body: {
      fullName: 'Manish Malhotra',
      companyName: 'IndoTech Global Solutions',
      contactPerson: 'Manish Malhotra',
      email: 'manish@indotech.com',
      phone: '+91 98999 11111',
      source: 'WEBSITE',
      status: 'QUALIFIED',
      estimatedValue: 450000,
    },
  });
  assert(leadRes.status === 200 || leadRes.status === 201, `Lead Created successfully (${leadRes.status})`);

  // Create Deal
  const dealRes = await apiRequest('/api/crm/deals', {
    method: 'POST',
    token: adminToken,
    body: {
      title: 'Annual Managed Workforce Contract',
      amount: 1250000,
      stage: 'PROPOSAL',
      probability: 70,
      clientId: client1Data.id,
      closingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
  });
  assert(dealRes.status === 200 || dealRes.status === 201, `Deal Created successfully (${dealRes.status})`);

  // Create Task
  const taskRes = await apiRequest('/api/crm/tasks', {
    method: 'POST',
    token: adminToken,
    body: {
      title: 'Finalize SLA & Rate Cards with Nexus Dynamics',
      priority: 'HIGH',
      status: 'PENDING',
      clientId: client1Data.id,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
  });
  assert(taskRes.status === 200 || taskRes.status === 201, `CRM Task Created successfully (${taskRes.status})`);

  // -------------------------------------------------------------------------
  // PHASE 5: CLIENT 1 LOGIN & DATA ISOLATION VERIFICATION
  // -------------------------------------------------------------------------
  logSection('5. CLIENT 1 LOGIN & DATA ISOLATION VERIFICATION');

  const client1LoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'rajesh@nexusdynamics.com',
      password: 'Client@123',
      portalType: 'CLIENT',
    },
  });

  assert(client1LoginRes.status === 200, `Client 1 Login HTTP 200 (Got ${client1LoginRes.status})`);
  assert(client1LoginRes.data.user.role === 'CLIENT', 'Client User role is CLIENT');
  assert(client1LoginRes.data.user.companyName === 'Nexus Dynamics Pvt Ltd', 'Client Company is Nexus Dynamics Pvt Ltd');
  client1Token = extractToken(client1LoginRes.headers);
  assert(!!client1Token, 'Client 1 Session Token received');

  // Verify Data Isolation: Client 1 must see Aarav Sharma, but NEVER Priya Nair
  const client1EmpsRes = await apiRequest('/api/employees', { token: client1Token });
  assert(client1EmpsRes.status === 200, 'Client 1 /api/employees returns 200');
  const client1EmpList = client1EmpsRes.data.employees || [];
  
  const hasAarav = client1EmpList.some((e) => e.employeeId === emp1Data.employeeId);
  const hasPriya = client1EmpList.some((e) => e.employeeId === emp2Data.employeeId);

  assert(hasAarav === true, 'Data Isolation PASS: Client 1 sees their employee Aarav Sharma');
  assert(hasPriya === false, 'Data Isolation PASS: Client 1 CANNOT see Apex Logistics employee Priya Nair');

  // Client 1 onboards another employee (Vikram Patel)
  const emp3Payload = {
    fullName: 'Vikram Patel',
    phone: '+91 98765 43212',
    email: 'vikram.patel@nexusdynamics.com',
    departmentName: 'Quality Assurance',
    designation: 'QA Automation Engineer',
    employmentType: 'Full-Time',
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    customPassword: 'Emp@12345',
  };

  const createEmp3Res = await apiRequest('/api/employees', {
    method: 'POST',
    token: client1Token,
    body: emp3Payload,
  });

  assert(createEmp3Res.status === 201 || createEmp3Res.status === 200, `Client 1 Onboarded Staff Vikram Patel (${createEmp3Res.status})`);
  emp3Data = createEmp3Res.data.employee;
  assert(!!emp3Data.employeeId, `Staff assigned ID: ${emp3Data.employeeId}`);

  // -------------------------------------------------------------------------
  // PHASE 6: CLIENT 1 GOVERNANCE (BLOCK, UNBLOCK, PASSWORD RESET REQUEST)
  // -------------------------------------------------------------------------
  logSection('6. CLIENT 1 GOVERNANCE & SECURITY AUDIT');

  // Block Vikram Patel
  const blockRes = await apiRequest(`/api/employees/${emp3Data.id}/block`, {
    method: 'POST',
    token: client1Token,
    body: {
      reason: 'Workplace Policy Violation',
      remarks: 'Suspended pending internal security audit',
    },
  });
  assert(blockRes.status === 200, `Client 1 successfully blocked employee (${blockRes.status})`);
  assert(blockRes.data.employee.status === 'BLOCKED', 'Employee status transitioned to BLOCKED');

  // Verify Audit Log in Block History
  const historyRes = await apiRequest('/api/employees/block-history', { token: client1Token });
  assert(historyRes.status === 200, 'Block history returns 200');
  const latestAudit = historyRes.data.histories?.[0];
  assert(latestAudit?.actionType === 'BLOCK', 'Audit log records BLOCK action');
  assert(latestAudit?.reason === 'Workplace Policy Violation', 'Audit log reason matches');

  // Unblock Vikram Patel
  const unblockRes = await apiRequest(`/api/employees/${emp3Data.id}/unblock`, {
    method: 'POST',
    token: client1Token,
    body: {
      reason: 'Audit Complete - Cleared for Active Service',
      remarks: 'Reinstated by Client HR',
    },
  });
  assert(unblockRes.status === 200, `Client 1 successfully unblocked employee (${unblockRes.status})`);
  assert(unblockRes.data.employee.status === 'ACTIVE', 'Employee status reinstated to ACTIVE');

  // Client submits Password Reset Request for Vikram via forgot-password endpoint
  const passReqRes = await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: {
      identifier: emp3Data.employeeId,
      reason: 'Employee forgot workstation credentials after system upgrade',
    },
  });
  assert(passReqRes.status === 200 || passReqRes.status === 201, `Password Reset Request Submitted (${passReqRes.status})`);

  // -------------------------------------------------------------------------
  // PHASE 7: EMPLOYEE LOGIN & ATTENDANCE LIFECYCLE
  // -------------------------------------------------------------------------
  logSection('7. EMPLOYEE LOGIN & ATTENDANCE LIFECYCLE');

  // Employee 1 (Aarav Sharma) logs in
  const emp1LoginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'aarav.sharma@nexusdynamics.com',
      password: 'Emp@12345',
      portalType: 'EMPLOYEE',
    },
  });

  assert(emp1LoginRes.status === 200, `Employee 1 Login HTTP 200 (Got ${emp1LoginRes.status})`);
  assert(emp1LoginRes.data.user.role === 'EMPLOYEE', 'User role is EMPLOYEE');
  assert(emp1LoginRes.data.user.fullName === 'Aarav Sharma', 'User name is Aarav Sharma');
  emp1Token = extractToken(emp1LoginRes.headers);
  assert(!!emp1Token, 'Employee 1 Session Token received');

  // Employee Check-In (Punch In)
  const checkInRes = await apiRequest('/api/attendance/check-in', {
    method: 'POST',
    token: emp1Token,
  });
  assert(checkInRes.status === 200, `Employee Punch In HTTP 200 (${checkInRes.status})`);
  assert(checkInRes.data.success === true, 'Punch in recorded successfully');
  assert(!!checkInRes.data.attendance?.checkInTime, `Check-in timestamp recorded: ${checkInRes.data.attendance?.checkInTime}`);

  // Employee Start Break
  const breakStartRes = await apiRequest('/api/attendance/break/start', {
    method: 'POST',
    token: emp1Token,
    body: {
      breakType: 'LUNCH',
    },
  });
  assert(breakStartRes.status === 200, 'Break Start HTTP 200');

  // Employee End Break
  const breakEndRes = await apiRequest('/api/attendance/break/end', {
    method: 'POST',
    token: emp1Token,
  });
  assert(breakEndRes.status === 200, 'Break End HTTP 200');

  // Employee Check-Out (Punch Out)
  const checkOutRes = await apiRequest('/api/attendance/check-out', {
    method: 'POST',
    token: emp1Token,
  });
  assert(checkOutRes.status === 200, `Employee Punch Out HTTP 200 (${checkOutRes.status})`);
  assert(!!checkOutRes.data.attendance?.checkOutTime, `Check-out timestamp recorded: ${checkOutRes.data.attendance?.checkOutTime}`);

  // -------------------------------------------------------------------------
  // PHASE 8: CROSS-ROLE REFLECTION & FINAL ADMIN VERIFICATION
  // -------------------------------------------------------------------------
  logSection('8. CROSS-ROLE REFLECTION & FINAL VERIFICATION');

  // As Client 1: Check Attendance Suite -> Aarav's attendance should be present
  const clientAttRes = await apiRequest('/api/attendance/history', { token: client1Token });
  assert(clientAttRes.status === 200, 'Client 1 Attendance History returns 200');
  const clientAttRecords = clientAttRes.data.records || [];
  const foundAaravRecord = clientAttRecords.some((r) => r.employee?.employeeId === emp1Data.employeeId || r.employeeId === emp1Data.id);
  assert(foundAaravRecord === true, 'Cross-Role Reflection PASS: Client 1 sees Aarav punch record in Attendance Suite');

  // As Admin: Check Password Reset Requests queue
  const adminPassRes = await apiRequest('/api/auth/password-reset-requests', { token: adminToken });
  assert(adminPassRes.status === 200, 'Admin Password Reset Requests returns 200');
  const passRequests = adminPassRes.data.requests || [];
  const foundRequest = passRequests.some((r) => r.requesterId === emp3Data.employeeId || r.employeeId === emp3Data.employeeId);
  assert(foundRequest === true, 'Cross-Role Reflection PASS: Admin sees Client password reset request in queue');

  // As Admin: Approve Password Reset Request
  const targetReq = passRequests.find((r) => r.requesterId === emp3Data.employeeId || r.employeeId === emp3Data.employeeId);
  if (targetReq) {
    const approveRes = await apiRequest(`/api/auth/password-reset-requests`, {
      method: 'POST',
      token: adminToken,
      body: {
        requestId: targetReq.id,
        action: 'RESOLVE',
        newPassword: 'Vikram@NewPassword123',
      },
    });
    assert(approveRes.status === 200, 'Admin approved Password Reset Request and updated credentials');
  }

  logSection('🎉 ALL E2E MULTI-ROLE TESTS PASSED WITH 100% SUCCESS!');
  console.log('\nPlatform Summary:');
  console.log(`  🏢 Clients Created: 2 (Nexus Dynamics, Apex Logistics)`);
  console.log(`  👥 Employees Onboarded: 3 (Aarav Sharma, Priya Nair, Vikram Patel)`);
  console.log(`  🛡️ Governance Actions Tested: Block, Unblock, Audit History, Password Reset Requests`);
  console.log(`  ⏱️ Attendance Lifecycle Tested: Check-in, Break Start/End, Check-out, History`);
  console.log(`  📊 CRM Workflows Tested: Leads, Deals, Tasks`);
  console.log(`  🔒 Security & Multi-Tenancy: Strict Data Isolation between Clients verified\n`);
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E Test Suite Error:', err);
  process.exit(1);
});
