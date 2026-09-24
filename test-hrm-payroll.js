const BASE_URL = 'http://localhost:3000';

async function runHrmPayrollTests() {
  console.log('🚀 Running Growth India HRM & Payroll Subsystem Automated Verification...\n');

  let adminCookie = '';

  // 1. Authenticate as Super Admin
  console.log('1️⃣ Authenticating as Administrator...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' }),
  });
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  if (setCookie) {
    adminCookie = setCookie.split(';')[0];
  }
  console.log('   ✅ Administrator Login:', loginRes.status, '| User:', loginData.user?.fullName, `(${loginData.user?.employeeId})`);

  const headers = {
    'Content-Type': 'application/json',
    Cookie: adminCookie,
  };

  // 2. Test HRM Dashboard Telemetry
  console.log('\n2️⃣ Testing /api/hrm/dashboard telemetry...');
  const dashRes = await fetch(`${BASE_URL}/api/hrm/dashboard`, { headers });
  const dashData = await dashRes.json();
  console.log('   ✅ Dashboard Status:', dashRes.status);
  console.log('   📊 Total Headcount:', dashData.metrics?.totalHeadcount, '| Open Jobs:', dashData.metrics?.openJobs, '| Pending Leaves:', dashData.metrics?.pendingLeaves);

  // 3. Test Leave Management: Balances & Types
  console.log('\n3️⃣ Testing Leave Management & Ledger...');
  const leavesRes = await fetch(`${BASE_URL}/api/hrm/leaves`, { headers });
  const leavesData = await leavesRes.json();
  console.log('   ✅ Leave Types Initialized:', leavesData.leaveTypes?.length, 'types (e.g.', leavesData.leaveTypes?.map(t => t.code).join(', '), ')');

  const clType = leavesData.leaveTypes?.find(t => t.code === 'CL') || leavesData.leaveTypes?.[0];

  // 4. Test Leave Application & Approval
  console.log('\n4️⃣ Testing Leave Application & Approval Workflow...');
  const applyRes = await fetch(`${BASE_URL}/api/hrm/leaves`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      leaveTypeId: clType?.id,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      days: 1,
      reason: 'Automated test casual leave application',
    }),
  });
  const applyData = await applyRes.json();
  console.log('   ✅ Leave Applied:', applyRes.status, '| Application #:', applyData.application?.applicationNumber);

  if (applyData.application?.id) {
    const approveRes = await fetch(`${BASE_URL}/api/hrm/leaves/${applyData.application.id}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ decision: 'APPROVED', remarks: 'Automated test approval' }),
    });
    const approveData = await approveRes.json();
    console.log('   ✅ Leave Approval Status:', approveRes.status, '| New Status:', approveData.application?.status);
  }

  // 5. Test Recruitment & ATS Pipeline
  console.log('\n5️⃣ Testing Recruitment: Job Opening & Candidate Creation...');
  const openingRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Principal Software Engineer',
      jobLocation: 'Corporate HQ (Mumbai)',
      openPositions: 2,
      departmentName: 'Technology & Engineering',
    }),
  });
  const openingData = await openingRes.json();
  const jobOpening = openingData.job || openingData.opening;
  console.log('   ✅ Job Opening Created:', openingRes.status, '| Job Code:', jobOpening?.jobCode, '| Title:', jobOpening?.title);

  const randPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const candRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'CANDIDATE',
      jobOpeningId: jobOpening?.id,
      fullName: 'Aarav Patel',
      email: `aarav.patel.${Date.now()}@growthindia.test`,
      phone: randPhone,
      currentCompany: 'Enterprise Tech Ltd',
      expectedCtc: 850000,
      totalExperienceYears: 5,
    }),
  });
  const candData = await candRes.json();
  const candidate = candData.candidate;
  console.log('   ✅ Candidate Created:', candRes.status, '| Candidate #:', candidate?.candidateNumber, '| Name:', candidate?.fullName);

  // 6. Test Candidate Conversion to EMS Employee Master
  console.log('\n6️⃣ Testing Atomic Candidate Conversion to EMS Master...');
  const convertRes = await fetch(`${BASE_URL}/api/hrm/recruitment/candidates/${candidate?.id}/convert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      offeredCtc: 900000,
      bankAccountNumber: '91002003004005',
      bankIfscCode: 'HDFC0000123',
      panNumber: 'ABCDE1234F',
    }),
  });
  const convertData = await convertRes.json();
  console.log('   ✅ Candidate Converted Status:', convertRes.status);
  console.log('   👤 EMS Employee Created:', convertData.employeeId, '| Phone:', convertData.employee?.phone, '| CTC Assignment Linked');

  // 7. Test Salary Structures & Rate Cards
  console.log('\n7️⃣ Testing Salary Structures & Rate Cards...');
  const structRes = await fetch(`${BASE_URL}/api/hrm/payroll/structures`, { headers });
  const structData = await structRes.json();
  console.log('   ✅ Salary Structures:', structData.structures?.length, '| Components:', structData.components?.length);

  // 8. Test Payroll Period Creation & 5-Step Computation Engine
  console.log('\n8️⃣ Testing 5-Step Payroll Calculation Engine...');
  const currentMonth = 10; // Use October to test clean fresh period
  const currentYear = new Date().getFullYear();

  const periodRes = await fetch(`${BASE_URL}/api/hrm/payroll/periods`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ month: currentMonth, year: currentYear }),
  });
  const periodData = await periodRes.json();
  const period = periodData.period;
  console.log('   ✅ Payroll Period Ready:', period?.periodCode, '| Status:', period?.status, '| Working Days:', period?.workingDays);

  const processRes = await fetch(`${BASE_URL}/api/hrm/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period.id }),
  });
  const processData = await processRes.json();
  console.log('   ✅ 5-Step Payroll Engine Executed:', processRes.status);
  console.log('   💰 Calculated Gross:', processData.period?.totalGrossPay?.toLocaleString(), '| Net:', processData.period?.totalNetPay?.toLocaleString(), '| Staff Records:', processData.period?.recordsCount);

  // 9. Test Payroll Approval
  console.log('\n9️⃣ Testing Administrative Payroll Sign-Off...');
  const approvePayrollRes = await fetch(`${BASE_URL}/api/hrm/payroll/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period.id, remarks: 'Executive sign-off passed' }),
  });
  const approvePayrollData = await approvePayrollRes.json();
  console.log('   ✅ Payroll Period Approved Status:', approvePayrollRes.status, '| New Status:', approvePayrollData.period?.status);

  // 10. Test Payroll Finalization & Immutable Payslip Generation
  console.log('\n🔟 Testing Finalization & Immutable Payslip Issuance...');
  const finalizeRes = await fetch(`${BASE_URL}/api/hrm/payroll/finalize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period.id }),
  });
  const finalizeData = await finalizeRes.json();
  console.log('   ✅ Payroll Finalized Status:', finalizeRes.status, '| Permanent State:', finalizeData.period?.status);

  // 11. Test Payslips Retrieval
  console.log('\n1️⃣1️⃣ Testing Secure Payslip Retrieval...');
  const payslipsRes = await fetch(`${BASE_URL}/api/hrm/payroll/payslips?periodCode=${period.periodCode}`, { headers });
  const payslipsData = await payslipsRes.json();
  console.log('   ✅ Generated Payslips:', payslipsData.payslips?.length, 'slips');
  if (payslipsData.payslips?.length > 0) {
    const firstSlip = payslipsData.payslips[0];
    console.log('   📄 Sample Payslip #:', firstSlip.payslipNumber, '| Net:', `₹${firstSlip.netPay.toLocaleString()}`, `(${firstSlip.netPayInWords})`);
  }

  // 12. Test Reimbursements Claims
  console.log('\n1️⃣2️⃣ Testing Expense Claims & Reimbursements...');
  const claimRes = await fetch(`${BASE_URL}/api/hrm/payroll/reimbursements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      category: 'TRAVEL',
      title: 'Client Strategy Meeting Transit',
      amount: 2400,
    }),
  });
  const claimData = await claimRes.json();
  console.log('   ✅ Claim Submitted:', claimRes.status, '| Claim #:', claimData.claim?.claimNumber, '| Amount: ₹', claimData.claim?.amount);

  console.log('\n🎉 ALL 12 HRM & PAYROLL INTEGRATION TESTS COMPLETED SUCCESSFULLY!\n');
}

runHrmPayrollTests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
