const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const cookieHeader = res.headers.get('set-cookie');
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json, cookie: cookieHeader };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING GROWTH INDIA CRM PHASE 1 END-TO-END TESTS');
  console.log('====================================================\n');

  // Warmup server ping
  console.log('Warming up server...');
  for (let i = 0; i < 5; i++) {
    try {
      const ping = await request('/api/auth/login', { method: 'POST', body: { email: 'admin@growthindia.in', password: 'Admin@123' } });
      if (ping.status === 200) {
        console.log('Server ready!\n');
        break;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const runId = Date.now().toString().slice(-6);

  // TEST 1: Admin Login
  console.log('--- TEST 1: Super Admin Login ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@growthindia.in', password: 'Admin@123' },
  });
  assert(
    adminLogin.data?.user?.role === 'ADMIN' || adminLogin.data?.user?.role === 'SUPER_ADMIN',
    'Role is ADMIN'
  );
  const adminCookie = adminLogin.cookie?.split(';')[0];
  console.log('  Admin session established:', adminLogin.data?.user?.email);

  // TEST 2: Admin Creates Client with Auto-ID & Generated Credentials
  console.log('\n--- TEST 2: Admin Creates Client & Auto-generates CLI-XXXXX & Credentials ---');
  const newClientRes = await request('/api/clients', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      companyName: `Delta Robotics Ltd ${runId}`,
      contactPerson: 'Vikramaditya Roy',
      mobile: `+91 98${runId}`,
      email: `roy_${runId}@deltarobotics.in`,
      address: 'Electronics City, Bengaluru, Karnataka',
      industry: 'Manufacturing & Industrial',
      canBlockEmployees: true,
      canDeleteEmployees: false,
    },
  });
  assert(newClientRes.ok, 'Client creation API returned 200/201');
  const createdClient = newClientRes.data?.client;
  const clientCreds = newClientRes.data?.credentials;
  assert(createdClient?.clientId?.startsWith('CLI-'), `Generated sequential Client ID: ${createdClient?.clientId}`);
  assert(!!clientCreds?.password, `Generated client login password: ${clientCreds?.password}`);
  console.log('  Created Client:', createdClient?.companyName, '| ID:', createdClient?.clientId, '| Password:', clientCreds?.password);

  // TEST 3: Client Login with Generated Credentials
  console.log('\n--- TEST 3: Client Login with Generated Client ID / Email & Password ---');
  const clientLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: createdClient?.clientId, password: clientCreds?.password },
  });
  assert(clientLogin.ok, 'Client login successful using Client ID');
  assert(clientLogin.data?.user?.role === 'CLIENT', 'User role is CLIENT');
  assert(clientLogin.data?.user?.clientId === createdClient?.clientId, 'Client ID matches');
  const clientCookie = clientLogin.cookie?.split(';')[0];
  console.log('  Client session established for:', clientLogin.data?.user?.companyName);

  // TEST 4: Client Role-Scoping (Can only view own company)
  console.log('\n--- TEST 4: Client Role-Scoping on Clients API ---');
  const clientViewClients = await request('/api/clients', {
    method: 'GET',
    headers: { Cookie: clientCookie },
  });
  assert(clientViewClients.ok, 'Clients API returned 200 for Client');
  assert(clientViewClients.data?.clients?.length === 1, 'Client sees exactly 1 company (their own)');
  assert(clientViewClients.data?.clients?.[0]?.clientId === createdClient?.clientId, 'Scoping restricted to own Client ID');

  // TEST 5: Client Onboards Employee (Auto-ID GI-EMP-XXXXXX & Credentials)
  console.log('\n--- TEST 5: Client Onboards Employee under their Company ---');
  const newEmpRes = await request('/api/employees', {
    method: 'POST',
    headers: { Cookie: clientCookie },
    body: {
      fullName: 'Kavita Sharma',
      fatherMotherName: 'Ramesh Sharma',
      gender: 'Female',
      phone: `+91 97${runId}`,
      email: `kavita_${runId}@deltarobotics.in`,
      departmentName: 'Robotics Engineering',
      designation: 'Automation Engineer',
      jobLocation: 'Bengaluru Facility',
      employmentType: 'Full-Time',
    },
  });
  assert(newEmpRes.ok, 'Employee onboarding API returned 200/201');
  const createdEmp = newEmpRes.data?.employee;
  const empCreds = newEmpRes.data?.credentials;
  assert(createdEmp?.employeeId?.startsWith('GI-EMP-'), `Generated sequential Employee ID: ${createdEmp?.employeeId}`);
  assert(!!empCreds?.password, `Generated employee temporary password: ${empCreds?.password}`);
  console.log('  Created Employee:', createdEmp?.fullName, '| ID:', createdEmp?.employeeId, '| Pass:', empCreds?.password);

  // TEST 6: Employee Login with Generated Credentials
  console.log('\n--- TEST 6: Employee Login with Generated Employee ID & Password ---');
  const empLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: createdEmp?.employeeId, password: empCreds?.password },
  });
  assert(empLogin.ok, 'Employee login successful using Employee ID');
  assert(empLogin.data?.user?.role === 'EMPLOYEE', 'User role is EMPLOYEE');
  assert(empLogin.data?.user?.employeeId === createdEmp?.employeeId, 'Employee ID matches session');
  const empCookie = empLogin.cookie?.split(';')[0];
  console.log('  Employee session established for:', empLogin.data?.user?.fullName);

  // TEST 7: Employee Cannot Onboard Other Employees (Security Restriction)
  console.log('\n--- TEST 7: Employee Cannot Onboard Other Staff ---');
  const empTriesOnboard = await request('/api/employees', {
    method: 'POST',
    headers: { Cookie: empCookie },
    body: { fullName: 'Illegal Hire', phone: '+91 99999 00000', designation: 'Staff' },
  });
  assert(empTriesOnboard.status === 403, 'Employee onboarding attempt blocked with 403 Forbidden');

  // TEST 8: Client Blocks Employee with Reason & Remarks
  console.log('\n--- TEST 8: Client Blocks Employee (canBlockEmployees is True) ---');
  const blockRes = await request(`/api/employees/${createdEmp.id}/block`, {
    method: 'POST',
    headers: { Cookie: clientCookie },
    body: {
      reason: 'Unauthorized Equipment Operation & Safety Violation',
      remarks: 'Suspended pending safety committee hearing',
    },
  });
  assert(blockRes.ok, 'Block employee API returned 200');
  assert(blockRes.data?.employee?.status === 'BLOCKED', 'Employee status is BLOCKED');
  assert(blockRes.data?.employee?.isBlocked === true, 'Employee isBlocked is true');

  // TEST 9: Blocked Employee Login Rejected Immediately
  console.log('\n--- TEST 9: Blocked Employee Login Rejection ---');
  const blockedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: createdEmp?.employeeId, password: empCreds?.password },
  });
  assert(blockedLogin.status === 403, 'Blocked employee login rejected with 403 Forbidden');
  assert(
    blockedLogin.data?.error?.toLowerCase().includes('block') ||
    blockedLogin.data?.error?.toLowerCase().includes('suspend'),
    'Error clearly explains account suspension'
  );
  console.log('  Rejection notice:', blockedLogin.data?.error);

  // TEST 10: Client Unblocks Employee
  console.log('\n--- TEST 10: Client Unblocks Employee & Restores Access ---');
  const unblockRes = await request(`/api/employees/${createdEmp.id}/unblock`, {
    method: 'POST',
    headers: { Cookie: clientCookie },
    body: {
      reason: 'Safety training completed and clearance approved by Client Management',
    },
  });
  assert(unblockRes.ok, 'Unblock employee API returned 200');
  assert(unblockRes.data?.employee?.status === 'ACTIVE', 'Employee status restored to ACTIVE');
  assert(unblockRes.data?.employee?.isBlocked === false, 'Employee isBlocked is false');

  // TEST 11: Unblocked Employee Can Login Again
  console.log('\n--- TEST 11: Reinstated Employee Login Success ---');
  const reLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: createdEmp?.employeeId, password: empCreds?.password },
  });
  assert(reLogin.ok, 'Reinstated employee can successfully login');

  // TEST 12: Block/Unblock Audit History Trail
  console.log('\n--- TEST 12: Block / Unblock Audit Trail Verification ---');
  const historyRes = await request(`/api/employees/block-history?employeeId=${createdEmp.employeeId}`, {
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  assert(historyRes.ok, 'Block history API returned 200');
  const histories = historyRes.data?.histories || [];
  assert(histories.length >= 2, `Recorded ${histories.length} immutable block/unblock history actions`);
  console.log('  History entries recorded:');
  histories.forEach((h) => {
    console.log(`    - Action: [${h.actionType}] by ${h.actionBy} | Reason: ${h.reason}`);
  });

  // TEST 13: Public Client Self-Signup is Disabled (Only Admin Can Onboard Clients)
  console.log('\n--- TEST 13: Verify Public Self-Signup is Disabled ---');
  const signupRes = await request('/api/auth/signup', {
    method: 'POST',
    body: {
      companyName: `Unauthorized Corp ${runId}`,
      contactPerson: 'Attempter',
      mobile: `+91 94${runId}`,
      email: `unauthorized_${runId}@corp.in`,
      password: 'Pass@12345',
    },
  });
  assert(signupRes.status === 403, 'Public self-signup rejected with 403 Forbidden');
  console.log('  Security restriction enforced:', signupRes.data?.error);

  console.log('\n====================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
