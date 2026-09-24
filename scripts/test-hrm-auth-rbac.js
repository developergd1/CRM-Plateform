const BASE_URL = 'http://localhost:3000';

async function login(email, password, portalType = 'EMPLOYEE') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, portalType }),
  });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : '';
  return { status: res.status, data, cookie };
}

async function runAuthAndRbacTests() {
  console.log('🛡️  PHASE 2 & 3: GROWTH INDIA HRM AUTHENTICATION & RBAC BOUNDARY AUDIT\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  function record(id, name, pass, details) {
    results.tests.push({ id, name, pass, details });
    if (pass) {
      results.passed++;
      console.log(`   ✅ [PASS] ${id}: ${name} -> ${details}`);
    } else {
      results.failed++;
      console.log(`   ❌ [FAIL] ${id}: ${name} -> ${details}`);
    }
  }

  // 1. Authenticate Personas
  console.log('1️⃣ Authenticating All Role Personas...');
  const adminAuth = await login('admin@growthindia.co', 'Admin@123', 'ADMIN');
  record('AUTH-01', 'Platform Admin Login', adminAuth.status === 200, `Status ${adminAuth.status} (User: ${adminAuth.data.user?.fullName})`);

  const hrLeadAuth = await login('qa.hrlead@growthindia.test', 'QaPass#2026', 'ADMIN');
  record('AUTH-02', 'HR Lead Login', hrLeadAuth.status === 200, `Status ${hrLeadAuth.status} (Role: ${hrLeadAuth.data.user?.role})`);

  const mgrAuth = await login('qa.manager@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  record('AUTH-03', 'Team Manager Login', mgrAuth.status === 200, `Status ${mgrAuth.status} (Role: ${mgrAuth.data.user?.role})`);

  const emp1Auth = await login('qa.emp1@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  record('AUTH-04', 'Employee 1 Login', emp1Auth.status === 200, `Status ${emp1Auth.status} (EmpId: ${emp1Auth.data.user?.employeeId})`);

  const emp2Auth = await login('qa.emp2@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  record('AUTH-05', 'Employee 2 Login', emp2Auth.status === 200, `Status ${emp2Auth.status} (EmpId: ${emp2Auth.data.user?.employeeId})`);

  // 2. Unauthenticated Access Protection
  console.log('\n2️⃣ Testing Unauthenticated API Protection...');
  const noAuthRes = await fetch(`${BASE_URL}/api/hrm/dashboard`);
  record('RBAC-01', 'Dashboard API Unauthenticated Access Denied', noAuthRes.status === 401, `Status: ${noAuthRes.status} (Expected: 401)`);

  const noAuthPayroll = await fetch(`${BASE_URL}/api/hrm/payroll/periods`);
  record('RBAC-02', 'Payroll Periods API Unauthenticated Access Denied', noAuthPayroll.status === 401, `Status: ${noAuthPayroll.status} (Expected: 401)`);

  // 3. Employee Privilege Boundaries (Prevent Unauthorized Administrative Actions)
  console.log('\n3️⃣ Testing Employee Role Restrictions (Privilege Escalation Prevention)...');
  
  // Employee 1 attempts to process payroll
  const empPayrollProcess = await fetch(`${BASE_URL}/api/hrm/payroll/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({ periodId: 'dummy-id' }),
  });
  record('RBAC-03', 'Employee Denied Payroll Processing Execution', empPayrollProcess.status === 403 || empPayrollProcess.status === 401, `Status: ${empPayrollProcess.status} (Expected 403)`);

  // Employee 1 attempts to finalize payroll
  const empPayrollFinalize = await fetch(`${BASE_URL}/api/hrm/payroll/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({ periodId: 'dummy-id' }),
  });
  record('RBAC-04', 'Employee Denied Payroll Finalization Execution', empPayrollFinalize.status === 403 || empPayrollFinalize.status === 401, `Status: ${empPayrollFinalize.status} (Expected 403)`);

  // Employee 1 attempts candidate conversion
  const empCandidateConvert = await fetch(`${BASE_URL}/api/hrm/recruitment/candidates/dummy-cand/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({ offeredCtc: 500000 }),
  });
  record('RBAC-05', 'Employee Denied Candidate Conversion', empCandidateConvert.status === 403 || empCandidateConvert.status === 401, `Status: ${empCandidateConvert.status} (Expected 403)`);

  // 4. Employee Privacy & Anti-BOLA / IDOR Testing
  console.log('\n4️⃣ Testing BOLA / IDOR Protection (Employee A vs Employee B Privacy)...');

  // Employee 1 attempts to query Employee 2's payslips directly
  const emp1GetsEmp2Payslips = await fetch(`${BASE_URL}/api/hrm/payroll/payslips?employeeId=QA-EMP-002`, {
    headers: { Cookie: emp1Auth.cookie },
  });
  const emp1PayslipData = await emp1GetsEmp2Payslips.json();
  const emp2PayslipsLeaked = emp1GetsEmp2Payslips.status === 200 && emp1PayslipData.payslips?.length > 0 && emp1PayslipData.payslips.some(p => p.employeeId !== 'QA-EMP-001');
  record('SEC-01', 'Employee 1 Cannot View Employee 2 Payslips (BOLA/IDOR)', !emp2PayslipsLeaked, `Status: ${emp1GetsEmp2Payslips.status}, Leaked: ${emp2PayslipsLeaked}`);

  // Employee 1 attempts to approve leave
  const emp1ApproveLeave = await fetch(`${BASE_URL}/api/hrm/leaves/dummy-app-id/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({ decision: 'APPROVED' }),
  });
  record('RBAC-06', 'Standard Employee Denied Leave Approval Privilege', emp1ApproveLeave.status === 403 || emp1ApproveLeave.status === 401, `Status: ${emp1ApproveLeave.status} (Expected 403)`);

  // 5. Manager Role Scope Testing
  console.log('\n5️⃣ Testing Team Manager Scope & Limits...');
  
  // Manager attempts to finalize payroll (Must be forbidden)
  const mgrFinalize = await fetch(`${BASE_URL}/api/hrm/payroll/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie },
    body: JSON.stringify({ periodId: 'dummy-id' }),
  });
  record('RBAC-07', 'Manager Denied Payroll Finalization (Admin Only)', mgrFinalize.status === 403, `Status: ${mgrFinalize.status} (Expected 403)`);

  // Manager attempts to approve payroll (Must be forbidden)
  const mgrApprove = await fetch(`${BASE_URL}/api/hrm/payroll/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie },
    body: JSON.stringify({ periodId: 'dummy-id' }),
  });
  record('RBAC-08', 'Manager Denied Payroll Sign-Off Approval (Admin Only)', mgrApprove.status === 403, `Status: ${mgrApprove.status} (Expected 403)`);

  // 6. HR Lead Governance Testing
  console.log('\n6️⃣ Testing HR Lead Access...');
  const hrDashRes = await fetch(`${BASE_URL}/api/hrm/dashboard`, {
    headers: { Cookie: hrLeadAuth.cookie },
  });
  record('RBAC-09', 'HR Lead Can Access HRM Dashboard', hrDashRes.status === 200, `Status: ${hrDashRes.status}`);

  console.log(`\n============================================================`);
  console.log(`📊 AUTH & RBAC AUDIT SUMMARY: Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log(`============================================================\n`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAuthAndRbacTests().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
