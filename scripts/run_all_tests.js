const BASE_URL = 'http://localhost:3000';

let adminToken = '';
let client1Token = '';
let client2Token = '';
let emp1Token = '';

let client1Id = '';
let client2Id = '';
let emp1Id = '';
let emp1DbId = '';

let passedCount = 0;
let totalCount = 0;

function logHeader(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`🔷  ${title}`);
  console.log('='.repeat(70));
}

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passedCount++;
    console.log(`  ✅ PASSED: ${message}`);
  }
}

async function api(endpoint, options = {}) {
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
  return '';
}

async function main() {
  console.log('🚀 GROWTH INDIA PLATFORM - MASTER END-TO-END QA & SECURITY TEST SUITE\n');

  // =========================================================================
  // SUITE 1: AUTHENTICATION, RBAC & SECURITY VULNERABILITY TESTS
  // =========================================================================
  logHeader('1. SECURITY, RBAC & VULNERABILITY AUDIT');

  // 1.1 Super Admin Login
  const adminLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' },
  });
  assert(adminLogin.status === 200, 'Admin login succeeds with HTTP 200');
  adminToken = extractToken(adminLogin.headers);
  assert(!!adminToken, 'Admin JWT session cookie received');

  // 1.2 Test /api/auth/switch-demo Vulnerability Prevention
  // Attempting to switch without authentication should return 403
  const unauthSwitch = await api('/api/auth/switch-demo', {
    method: 'POST',
    body: { email: 'admin@growthindia.co' },
  });
  assert(unauthSwitch.status === 403, 'Security Guard PASS: Unauthenticated demo switch blocked with HTTP 403 Forbidden');

  // 1.3 Verify Admin Session Guard
  const adminMe = await api('/api/auth/me', { token: adminToken });
  assert(adminMe.status === 200 && adminMe.data.authenticated === true, 'Admin session authenticated via /api/auth/me');
  assert(adminMe.data.user.role === 'ADMIN', 'Admin role verified as ADMIN');

  // =========================================================================
  // SUITE 2: CLIENT ONBOARDING & MULTI-TENANT ISOLATION (BOLA / IDOR)
  // =========================================================================
  logHeader('2. CLIENT ONBOARDING & MULTI-TENANT DATA ISOLATION (BOLA/IDOR)');

  const rand = Math.floor(1000 + Math.random() * 9000);
  const client1Email = `nexus.${rand}@nexusdyn.com`;
  const client2Email = `apex.${rand}@apexlog.com`;

  // Create Client 1 (Nexus)
  const c1Res = await api('/api/clients', {
    method: 'POST',
    token: adminToken,
    body: {
      companyName: `Nexus Dynamics ${rand}`,
      contactPerson: 'Rajesh Verma',
      mobile: `+91 98111 ${rand}`,
      email: client1Email,
      industry: 'Technology',
      customPassword: 'Client@123',
      canBlockEmployees: true,
      canDeleteEmployees: false,
    },
  });
  assert(c1Res.status === 200 || c1Res.status === 201, 'Client 1 created successfully');
  client1Id = c1Res.data.client.id;
  const client1Code = c1Res.data.client.clientId;

  // Create Client 2 (Apex)
  const c2Res = await api('/api/clients', {
    method: 'POST',
    token: adminToken,
    body: {
      companyName: `Apex Logistics ${rand}`,
      contactPerson: 'Sunil Rao',
      mobile: `+91 98222 ${rand}`,
      email: client2Email,
      industry: 'Logistics',
      customPassword: 'Client@123',
    },
  });
  assert(c2Res.status === 200 || c2Res.status === 201, 'Client 2 created successfully');
  client2Id = c2Res.data.client.id;
  const client2Code = c2Res.data.client.clientId;

  // Login as Client 1
  const c1Login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: client1Email, password: 'Client@123', portalType: 'CLIENT' },
  });
  assert(c1Login.status === 200, 'Client 1 logged in successfully');
  client1Token = extractToken(c1Login.headers);

  // Login as Client 2
  const c2Login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: client2Email, password: 'Client@123', portalType: 'CLIENT' },
  });
  assert(c2Login.status === 200, 'Client 2 logged in successfully');
  client2Token = extractToken(c2Login.headers);

  // BOLA / IDOR Verification: Client 1 tries to access Client 2's details
  const crossClientAccess = await api(`/api/clients/${client2Id}`, { token: client1Token });
  assert(crossClientAccess.status === 403, 'BOLA/IDOR Guard PASS: Client 1 blocked from accessing Client 2 profile (HTTP 403)');

  // Client 1 accesses own profile: should succeed
  const ownClientAccess = await api(`/api/clients/${client1Id}`, { token: client1Token });
  assert(ownClientAccess.status === 200, 'Client 1 authorized to access own profile (HTTP 200)');

  // =========================================================================
  // SUITE 3: EMPLOYEE ONBOARDING & PRIVACY (DPDP COMPLIANCE)
  // =========================================================================
  logHeader('3. EMPLOYEE ONBOARDING & DATA SCOPING');

  const empEmail = `aarav.${rand}@nexusdyn.com`;
  const empRes = await api('/api/employees', {
    method: 'POST',
    token: client1Token,
    body: {
      fullName: 'Aarav Sharma',
      personalEmail: empEmail,
      phone: `+91 99111 ${rand}`,
      departmentName: 'Engineering',
      designation: 'Senior Fullstack Engineer',
      employmentType: 'Full-Time',
      panNumber: 'ABCDE1234F',
      aadharNumber: '123456789012',
      customPassword: 'Emp@12345',
      shiftStartTime: '09:30',
      shiftEndTime: '18:30',
    },
  });
  assert(empRes.status === 200 || empRes.status === 201, 'Employee onboarded under Client 1');
  emp1DbId = empRes.data.employee.id;
  emp1Id = empRes.data.employee.employeeId;

  // Verify DPDP masking in returned data
  assert(empRes.data.employee.panMasked === 'ABCDE****F' || empRes.data.employee.panMasked?.includes('****'), 'DPDP Act Compliance: PAN number is masked');

  // Login as Employee
  const empLogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: empEmail, password: 'Emp@12345', portalType: 'EMPLOYEE' },
  });
  assert(empLogin.status === 200, 'Employee logged in successfully');
  emp1Token = extractToken(empLogin.headers);

  // Client 2 tries to access Client 1's employee: Should be blocked
  const crossEmpAccess = await api(`/api/employees/${emp1DbId}`, { token: client2Token });
  assert(crossEmpAccess.status === 403, 'Cross-Tenant Guard PASS: Client 2 cannot view Client 1 employee (HTTP 403)');

  // Employee views own profile: Should succeed
  const ownEmpAccess = await api(`/api/employees/${emp1DbId}`, { token: emp1Token });
  assert(ownEmpAccess.status === 200, 'Employee can view own profile (HTTP 200)');

  // =========================================================================
  // SUITE 4: ATTENDANCE & WORK SESSION CYCLE
  // =========================================================================
  logHeader('4. ATTENDANCE & WORK SESSION CYCLE');

  const checkInRes = await api('/api/attendance/check-in', { method: 'POST', token: emp1Token });
  assert(checkInRes.status === 200, 'Employee Punch In succeeds (HTTP 200)');

  const breakStartRes = await api('/api/attendance/break/start', {
    method: 'POST',
    token: emp1Token,
    body: { breakType: 'TEA_LUNCH' },
  });
  assert(breakStartRes.status === 200, 'Break Start succeeds (HTTP 200)');

  const breakEndRes = await api('/api/attendance/break/end', { method: 'POST', token: emp1Token });
  assert(breakEndRes.status === 200, 'Break End succeeds (HTTP 200)');

  const checkOutRes = await api('/api/attendance/check-out', { method: 'POST', token: emp1Token });
  assert(checkOutRes.status === 200, 'Employee Punch Out succeeds (HTTP 200)');

  // =========================================================================
  // SUITE 5: CRM PIPELINE (LEAD -> DEAL -> CLIENT CONVERSION)
  // =========================================================================
  logHeader('5. CRM PIPELINE & CONNECTED LIFECYCLE');

  // Create Lead
  const leadRes = await api('/api/crm/leads', {
    method: 'POST',
    token: adminToken,
    body: {
      companyName: `Quantum AI Solutions ${rand}`,
      contactPerson: 'Meera Deshmukh',
      email: `meera.${rand}@quantumai.io`,
      phone: `+91 97777 ${rand}`,
      source: 'WEBSITE',
      status: 'QUALIFIED',
      estimatedValue: 1250000,
    },
  });
  assert(leadRes.status === 200 || leadRes.status === 201, 'CRM Lead created');
  const leadId = leadRes.data.data?.id || leadRes.data.lead?.id;

  // Create Deal
  const dealRes = await api('/api/crm/deals', {
    method: 'POST',
    token: adminToken,
    body: {
      title: `Quantum AI Enterprise Expansion ${rand}`,
      leadId: leadId,
      amount: 1250000,
      stage: 'PROPOSAL',
      status: 'OPEN',
      probability: 80,
    },
  });
  assert(dealRes.status === 200 || dealRes.status === 201, 'CRM Deal created');
  const dealId = dealRes.data.data?.id || dealRes.data.deal?.id;

  // Win Deal
  const wonRes = await api(`/api/crm/deals/${dealId}/won`, {
    method: 'POST',
    token: adminToken,
    body: {
      wonReason: 'PRICE_COMPETITIVENESS',
      closingNotes: 'Contract signed for 2-year tenure',
    },
  });
  assert(wonRes.status === 200, 'Deal closed as WON');

  // Convert Won Deal to Client
  const convertRes = await api(`/api/crm/deals/${dealId}/convert-to-client`, {
    method: 'POST',
    token: adminToken,
    body: {
      companyName: `Quantum AI Solutions ${rand}`,
      contactPerson: 'Meera Deshmukh',
      mobile: `+91 97777 ${rand}`,
      email: `client.quantum.${rand}@growthindia.in`,
    },
  });
  assert(convertRes.status === 200, 'Won Deal converted to Corporate Client');

  // =========================================================================
  // SUITE 6: TASK MANAGEMENT, DELIVERABLES & COMMENTS
  // =========================================================================
  logHeader('6. TASK MANAGEMENT & COLLABORATION');

  // Client 1 creates task for Employee 1
  const taskRes = await api('/api/tasks', {
    method: 'POST',
    token: client1Token,
    body: {
      title: 'Deploy High-Availability Reverse Proxy',
      description: 'Configure and stress test multi-region reverse proxies.',
      priority: 'HIGH',
      assignedToId: emp1DbId,
      expectedDeliverable: 'Architecture diagram and performance benchmark',
    },
  });
  assert(taskRes.status === 200 || taskRes.status === 201, 'Task created and assigned to employee');
  const taskId = taskRes.data.id || taskRes.data.task?.id;

  // Employee adds comment
  const commentRes = await api(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    token: emp1Token,
    body: { comment: 'Started benchmarking using k6 load tests.' },
  });
  assert(commentRes.status === 200 || commentRes.status === 201, 'Employee posted comment to task thread');

  // Employee updates workflow status to IN_PROGRESS
  const workflowRes = await api(`/api/tasks/${taskId}/workflow`, {
    method: 'POST',
    token: emp1Token,
    body: { action: 'START' },
  });
  assert(workflowRes.status === 200, 'Task status transitioned to IN_PROGRESS');

  // =========================================================================
  // SUITE 7: GOVERNANCE, BLOCK/UNBLOCK & AUDIT LOGS
  // =========================================================================
  logHeader('7. GOVERNANCE & IMMUTABLE AUDIT LOGGING');

  // Client 1 blocks employee
  const blockRes = await api(`/api/employees/${emp1DbId}/block`, {
    method: 'POST',
    token: client1Token,
    body: { reason: 'Scheduled Compliance Verification', remarks: 'Routine account hold' },
  });
  assert(blockRes.status === 200, 'Client 1 blocked employee profile');

  // Client 1 unblocks employee
  const unblockRes = await api(`/api/employees/${emp1DbId}/unblock`, {
    method: 'POST',
    token: client1Token,
    body: { reason: 'Compliance Verified', remarks: 'Reinstated' },
  });
  assert(unblockRes.status === 200, 'Client 1 unblocked employee profile');

  // Verify Audit Log captured actions
  const auditRes = await api('/api/audit-logs', { token: adminToken });
  assert(auditRes.status === 200, 'Admin fetched immutable audit logs');
  assert(auditRes.data.logs?.length > 0, `Captured ${auditRes.data.logs?.length} immutable audit entries`);

  // =========================================================================
  // FINAL SCORECARD
  // =========================================================================
  logHeader('MASTER QA & TESTING SCORECARD');
  console.log(`\n  🎯 TOTAL TESTS EXECUTED : ${totalCount}`);
  console.log(`  🎉 TESTS PASSED        : ${passedCount}`);
  console.log(`  ❌ TESTS FAILED        : ${totalCount - passedCount}`);
  console.log(`  ⭐ SYSTEM HEALTH SCORE : ${Math.round((passedCount / totalCount) * 100)}%\n`);

  if (passedCount === totalCount) {
    console.log('✅ ALL SYSTEMS, SECURITY GATES, APIS AND FLOWS VERIFIED 100% OPERATIONAL!\n');
  } else {
    throw new Error('Some QA test cases failed.');
  }
}

main().catch((err) => {
  console.error('\n❌ MASTER QA RUN FAILED:', err.message);
  process.exit(1);
});
