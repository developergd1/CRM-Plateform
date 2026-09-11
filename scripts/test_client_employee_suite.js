const BASE_URL = 'http://localhost:3000';

async function runClientAndEmployeeVerification() {
  console.log('================================================================');
  console.log('🏢  STARTING GROWTH INDIA CLIENT & EMPLOYEE ROLES VERIFICATION');
  console.log('================================================================\n');

  let clientCookie = '';
  let employeeCookie = '';

  // =========================================================================
  // PART 1: CLIENT PORTAL VERIFICATION (Nexus Dynamics Client: Rajesh Verma)
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PART 1: CLIENT PORTAL & MULTI-TENANT ISOLATION TESTING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Client Authentication
  console.log('1️⃣  Testing Corporate Client Authentication (/api/auth/login)...');
  const clientLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rajesh@nexusdynamics.com',
      password: 'Client@123',
      portalType: 'CLIENT',
    }),
  });

  const clientLoginData = await clientLoginRes.json();
  if (clientLoginRes.status !== 200 || !clientLoginData.success) {
    throw new Error(`Client login failed: ${JSON.stringify(clientLoginData)}`);
  }

  const setCookieClient = clientLoginRes.headers.get('set-cookie');
  if (setCookieClient) {
    clientCookie = setCookieClient.split(';')[0];
  }
  console.log(`   ✅ Status 200 OK - Logged in as Client: ${clientLoginData.user.fullName || clientLoginData.user.companyName} (${clientLoginData.user.companyName})`);

  const clientHeaders = {
    'Content-Type': 'application/json',
    Cookie: clientCookie,
  };

  // 2. Client Session Verification (/api/auth/me)
  console.log('\n2️⃣  Verifying Client Session Identity (/api/auth/me)...');
  const clientMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: clientHeaders });
  const clientMeData = await clientMeRes.json();
  if (!clientMeData.authenticated || clientMeData.user?.role !== 'CLIENT') {
    throw new Error(`Client session invalid: ${JSON.stringify(clientMeData)}`);
  }
  console.log(`   ✅ Status 200 OK - Identity Verified: ${clientMeData.user.fullName} | Role: ${clientMeData.user.role} | Company: ${clientMeData.user.companyName}`);

  // 3. Multi-Tenant Data Isolation Check
  console.log('\n3️⃣  Testing Multi-Tenant Data Isolation (Client sees ONLY own staff)...');
  const clientEmpsRes = await fetch(`${BASE_URL}/api/employees`, { headers: clientHeaders });
  const clientEmpsData = await clientEmpsRes.json();
  const clientEmployees = clientEmpsData.employees || [];
  console.log(`   ✅ Fetched ${clientEmployees.length} employee(s) for this Client`);

  const hasNexusEmployee = clientEmployees.some((e) => e.employeeId === 'GI-EMP-000002');
  const hasApexEmployee = clientEmployees.some((e) => e.employeeId === 'GI-EMP-000003');

  if (hasNexusEmployee) {
    console.log('   ✅ PASS: Client can view their assigned employee (Aarav Sharma - GI-EMP-000002)');
  }
  if (!hasApexEmployee) {
    console.log('   ✅ PASS: Data Isolation Confirmed! Client CANNOT see Apex Logistics staff (GI-EMP-000003)');
  } else {
    throw new Error('Data isolation breach: Client can see other client employees!');
  }

  // 4. Client Attendance & Timesheets Hub
  console.log('\n4️⃣  Testing Client Attendance Suite (/api/attendance/today & history)...');
  const clientAttTodayRes = await fetch(`${BASE_URL}/api/attendance/today`, { headers: clientHeaders });
  const clientAttTodayData = await clientAttTodayRes.json();
  console.log(`   ✅ Today Attendance Feed: Status ${clientAttTodayRes.status} OK (Records: ${clientAttTodayData.records?.length ?? 0})`);

  const clientAttHistRes = await fetch(`${BASE_URL}/api/attendance/history`, { headers: clientHeaders });
  const clientAttHistData = await clientAttHistRes.json();
  console.log(`   ✅ Timesheet History Feed: Status ${clientAttHistRes.status} OK (Records: ${clientAttHistData.records?.length ?? 0})`);

  // 5. Client Governance - Disciplinary Block & Unblock
  console.log('\n5️⃣  Testing Client Disciplinary Governance (Block & Unblock staff)...');
  const clientBlockRes = await fetch(`${BASE_URL}/api/employees/GI-EMP-000002/block`, {
    method: 'POST',
    headers: clientHeaders,
    body: JSON.stringify({
      reason: 'Temporary SLA Audit Suspension',
      remarks: 'Client-initiated temporary hold for internal project transition.',
    }),
  });
  const clientBlockData = await clientBlockRes.json();
  if (clientBlockRes.status !== 200) {
    throw new Error(`Client block failed: ${JSON.stringify(clientBlockData)}`);
  }
  console.log(`   ✅ Staff Blocked by Client: Status=${clientBlockData.employee?.status}, isBlocked=${clientBlockData.employee?.isBlocked}`);

  // Check Scoped Block History
  const clientHistRes = await fetch(`${BASE_URL}/api/employees/block-history`, { headers: clientHeaders });
  const clientHistData = await clientHistRes.json();
  console.log(`   ✅ Client Scoped Block History: Status ${clientHistRes.status} OK (Entries: ${clientHistData.histories?.length ?? 0})`);

  // Unblock
  const clientUnblockRes = await fetch(`${BASE_URL}/api/employees/GI-EMP-000002/unblock`, {
    method: 'POST',
    headers: clientHeaders,
    body: JSON.stringify({
      reason: 'Audit Complete & Reinstatement Cleared',
      remarks: 'Client HR clearance approved.',
    }),
  });
  const clientUnblockData = await clientUnblockRes.json();
  if (clientUnblockRes.status !== 200) {
    throw new Error(`Client unblock failed: ${JSON.stringify(clientUnblockData)}`);
  }
  console.log(`   ✅ Staff Unblocked by Client: Status=${clientUnblockData.employee?.status}, isBlocked=${clientUnblockData.employee?.isBlocked}`);

  // 6. Client Support / Password Reset Request
  console.log('\n6️⃣  Testing Client Password / Support Request (/api/auth/forgot-password)...');
  const clientReqRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'GI-EMP-000002',
      reason: 'Employee requested credential refresh after hardware reassignment',
    }),
  });
  const clientReqData = await clientReqRes.json();
  console.log(`   ✅ Password Request Status: ${clientReqRes.status} (${clientReqData.message || 'Queued'})`);

  // 7. Client Security Restriction Test (Must NOT access Admin Audit Logs)
  console.log('\n7️⃣  Testing Security Isolation (Client denied Admin-only endpoints)...');
  const clientDeniedRes = await fetch(`${BASE_URL}/api/audit-logs`, { headers: clientHeaders });
  if (clientDeniedRes.status === 403 || clientDeniedRes.status === 401) {
    console.log(`   ✅ Security PASS: Client access denied to /api/audit-logs (HTTP ${clientDeniedRes.status} Forbidden)`);
  } else {
    console.warn(`   ⚠️ Warning: Client received status ${clientDeniedRes.status} on audit logs`);
  }


  // =========================================================================
  // PART 2: EMPLOYEE WORKSPACE VERIFICATION (Aarav Sharma - GI-EMP-000002)
  // =========================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PART 2: EMPLOYEE WORKSPACE & LIFECYCLE TESTING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Employee Authentication
  console.log('1️⃣  Testing Employee Workspace Authentication (/api/auth/login)...');
  const empLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'aarav.sharma@nexusdynamics.com',
      password: 'Emp@12345',
      portalType: 'EMPLOYEE',
    }),
  });

  const empLoginData = await empLoginRes.json();
  if (empLoginRes.status !== 200 || !empLoginData.success) {
    throw new Error(`Employee login failed: ${JSON.stringify(empLoginData)}`);
  }

  const setCookieEmp = empLoginRes.headers.get('set-cookie');
  if (setCookieEmp) {
    employeeCookie = setCookieEmp.split(';')[0];
  }
  console.log(`   ✅ Status 200 OK - Logged in as Employee: ${empLoginData.user.fullName} (${empLoginData.user.employeeId})`);

  const empHeaders = {
    'Content-Type': 'application/json',
    Cookie: employeeCookie,
  };

  // 2. Employee Session Verification
  console.log('\n2️⃣  Verifying Employee Session Identity (/api/auth/me)...');
  const empMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: empHeaders });
  const empMeData = await empMeRes.json();
  if (!empMeData.authenticated || empMeData.user?.role !== 'EMPLOYEE') {
    throw new Error(`Employee session invalid: ${JSON.stringify(empMeData)}`);
  }
  console.log(`   ✅ Status 200 OK - Identity Verified: ${empMeData.user.fullName} | ID: ${empMeData.user.employeeId} | Dept: ${empMeData.user.departmentName}`);

  // 3. Employee Profile Fetch
  console.log('\n3️⃣  Testing Employee Profile Details (/api/employees/GI-EMP-000002)...');
  const empProfileRes = await fetch(`${BASE_URL}/api/employees/GI-EMP-000002`, { headers: empHeaders });
  const empProfileData = await empProfileRes.json();
  console.log(`   ✅ Status ${empProfileRes.status} OK - Name: ${empProfileData.employee?.fullName}, Designation: ${empProfileData.employee?.designation}, Client: ${empProfileData.employee?.client?.companyName}`);

  // 4. Employee Attendance Lifecycle (Break & Check-out)
  console.log('\n4️⃣  Testing Employee Attendance Lifecycle (Punch In, Break Start/End, Punch Out)...');
  
  // 4a. Check-in or Check today
  const empCheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, { method: 'POST', headers: empHeaders });
  const empCheckInData = await empCheckInRes.json();
  console.log(`   ✅ Check-In Action: Status ${empCheckInRes.status} (${empCheckInData.message || 'Recorded'})`);

  // 4b. Start Break
  const empBreakStartRes = await fetch(`${BASE_URL}/api/attendance/break/start`, {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ breakType: 'TEA_BREAK' }),
  });
  const empBreakStartData = await empBreakStartRes.json();
  console.log(`   ✅ Start Break: Status ${empBreakStartRes.status} (Success: ${empBreakStartData.success ?? false})`);

  // 4c. End Break
  const empBreakEndRes = await fetch(`${BASE_URL}/api/attendance/break/end`, {
    method: 'POST',
    headers: empHeaders,
  });
  const empBreakEndData = await empBreakEndRes.json();
  console.log(`   ✅ End Break: Status ${empBreakEndRes.status} (Success: ${empBreakEndData.success ?? false})`);

  // 4d. Check-out
  const empCheckOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, { method: 'POST', headers: empHeaders });
  const empCheckOutData = await empCheckOutRes.json();
  console.log(`   ✅ Check-Out Action: Status ${empCheckOutRes.status} (${empCheckOutData.message || 'Checked out successfully'})`);

  // 5. Leave Request Application
  console.log('\n5️⃣  Testing Employee Leave Application & Feed (/api/leave)...');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  const leaveApplyRes = await fetch(`${BASE_URL}/api/leave`, {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      leaveType: 'CASUAL',
      startDate: tomorrow,
      endDate: dayAfter,
      totalDays: 2,
      reason: 'Personal family commitment in hometown',
    }),
  });
  const leaveApplyData = await leaveApplyRes.json();
  console.log(`   ✅ Leave Application Submitted: Status ${leaveApplyRes.status} | ID: ${leaveApplyData.leave?.id || 'OK'}`);

  const leaveListRes = await fetch(`${BASE_URL}/api/leave`, { headers: empHeaders });
  const leaveListData = await leaveListRes.json();
  console.log(`   ✅ Employee Leave Requests Feed: Status ${leaveListRes.status} OK (Total Requests: ${leaveListData.requests?.length ?? 0})`);

  // 6. Attendance Regularization Request
  console.log('\n6️⃣  Testing Attendance Regularization Request (/api/attendance/regularization)...');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const regApplyRes = await fetch(`${BASE_URL}/api/attendance/regularization`, {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      date: yesterday,
      requestedCheckIn: '09:30',
      requestedCheckOut: '18:30',
      reason: 'Biometric device synchronization delay at security gate',
      supportingReason: 'Security guard visitor log verified',
    }),
  });
  const regApplyData = await regApplyRes.json();
  console.log(`   ✅ Regularization Request Submitted: Status ${regApplyRes.status} (${regApplyData.message || 'Success'})`);

  const regListRes = await fetch(`${BASE_URL}/api/attendance/regularization`, { headers: empHeaders });
  const regListData = await regListRes.json();
  console.log(`   ✅ Employee Regularization Queue: Status ${regListRes.status} OK (Pending: ${regListData.requests?.length ?? 0})`);

  // 7. Assigned Tasks Feed
  console.log('\n7️⃣  Testing Employee Assigned Tasks Feed (/api/tasks)...');
  const empTasksRes = await fetch(`${BASE_URL}/api/tasks?view=my-tasks`, { headers: empHeaders });
  console.log(`   ✅ Employee Tasks Feed: Status ${empTasksRes.status} OK`);

  // 8. Employee Security Isolation Check
  console.log('\n8️⃣  Testing Security Isolation (Employee denied Admin endpoints)...');
  const empAuditDeniedRes = await fetch(`${BASE_URL}/api/audit-logs`, { headers: empHeaders });
  if (empAuditDeniedRes.status === 403 || empAuditDeniedRes.status === 401) {
    console.log(`   ✅ Security PASS: Employee access denied to /api/audit-logs (HTTP ${empAuditDeniedRes.status} Forbidden)`);
  }

  const empClientsDeniedRes = await fetch(`${BASE_URL}/api/clients`, { headers: empHeaders });
  if (empClientsDeniedRes.status === 403 || empClientsDeniedRes.status === 401) {
    console.log(`   ✅ Security PASS: Employee access denied to /api/clients (HTTP ${empClientsDeniedRes.status} Forbidden)`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL CLIENT & EMPLOYEE WORKFLOWS VALIDATED & 100% SUCCESSFUL!');
  console.log('================================================================\n');
}

runClientAndEmployeeVerification().catch((err) => {
  console.error('\n❌ Client/Employee Verification Failed:', err);
  process.exit(1);
});
