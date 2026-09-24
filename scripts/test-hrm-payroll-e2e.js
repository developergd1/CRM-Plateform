const BASE_URL = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function login(email, password, portalType = 'ADMIN') {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portalType }),
      });
      if (res.status === 200) {
        const data = await res.json();
        const setCookie = res.headers.get('set-cookie');
        return { cookie: setCookie ? setCookie.split(';')[0] : '', user: data.user };
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Login failed for ${email}`);
}

async function runPayrollE2ETests() {
  console.log('💰 PHASE 13: FIRST-CLASS PAYROLL SUBSYSTEM END-TO-END AUDIT\n');

  const adminAuth = await login('admin@growthindia.co', 'Admin@123', 'ADMIN');
  const emp1Auth = await login('qa.emp1@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  const headers = { 'Content-Type': 'application/json', Cookie: adminAuth.cookie };

  const results = { passed: 0, failed: 0 };
  function record(id, name, pass, details) {
    if (pass) {
      results.passed++;
      console.log(`   ✅ [PASS] ${id}: ${name} -> ${details}`);
    } else {
      results.failed++;
      console.log(`   ❌ [FAIL] ${id}: ${name} -> ${details}`);
    }
  }

  // ========================================================
  // PART 1: SALARY STRUCTURES & ASSIGNMENTS
  // ========================================================
  console.log('1️⃣ Auditing Salary Structures & Employee CTC Assignments...');

  const structRes = await fetch(`${BASE_URL}/api/hrm/payroll/structures`, { headers });
  const structData = await structRes.json();
  const structure = structData.structures?.[0];
  record('PAY-01', 'Salary Structures & Components Initialized', structData.structures?.length > 0 && structData.components?.length >= 5, `Found ${structData.structures?.length} structure(s), ${structData.components?.length} components`);

  const emp1 = await prisma.employee.findUnique({ where: { employeeId: 'QA-EMP-001' } });
  const emp2 = await prisma.employee.findUnique({ where: { employeeId: 'QA-EMP-002' } });

  // Assign Salary to QA-EMP-001: Monthly 60,000 / Annual 7,20,000
  await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: emp1.id } });
  const assign1 = await prisma.employeeSalaryAssignment.create({
    data: {
      employeeId: emp1.id,
      structureId: structure.id,
      annualCtc: 720000,
      monthlyCtc: 60000,
      effectiveFrom: new Date('2026-01-01'),
      isCurrent: true,
      bankAccount: '91002003004001',
      bankIfsc: 'HDFC0000123',
      panNumber: 'ABCDE1111A',
    },
  });
  record('PAY-02', 'Salary Package Assigned to Employee 1 (Monthly: ₹60,000)', assign1.monthlyCtc === 60000, `Assigned Monthly CTC: ₹${assign1.monthlyCtc.toLocaleString()}`);

  // Assign Salary to QA-EMP-002: Monthly 40,000 / Annual 4,80,000
  await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: emp2.id } });
  const assign2 = await prisma.employeeSalaryAssignment.create({
    data: {
      employeeId: emp2.id,
      structureId: structure.id,
      annualCtc: 480000,
      monthlyCtc: 40000,
      effectiveFrom: new Date('2026-01-01'),
      isCurrent: true,
      bankAccount: '91002003004002',
      bankIfsc: 'HDFC0000123',
      panNumber: 'ABCDE2222B',
    },
  });
  record('PAY-03', 'Salary Package Assigned to Employee 2 (Monthly: ₹40,000)', assign2.monthlyCtc === 40000, `Assigned Monthly CTC: ₹${assign2.monthlyCtc.toLocaleString()}`);

  // ========================================================
  // PART 2: EXPENSE REIMBURSEMENTS & LOAN DEDUCTIONS
  // ========================================================
  console.log('\n2️⃣ Auditing Reimbursement Claims & Loan Advance Subsystems...');

  // 1. Submit & Approve Reimbursement for Employee 1 (₹3,500)
  await prisma.reimbursementClaim.deleteMany({ where: { employeeId: emp1.id } });
  const reimbRes = await fetch(`${BASE_URL}/api/hrm/payroll/reimbursements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie },
    body: JSON.stringify({
      category: 'TRAVEL',
      title: 'Client Onsite Architectural Consultation Transit',
      amount: 3500,
    }),
  });
  const reimbData = await reimbRes.json();
  const claim = reimbData.claim;

  // Approve reimbursement
  await prisma.reimbursementClaim.update({
    where: { id: claim.id },
    data: { status: 'APPROVED' },
  });
  record('PAY-04', 'Employee 1 Reimbursement Claim Approved (₹3,500)', claim?.amount === 3500, `Claim #: ${claim?.claimNumber}, Amount: ₹${claim?.amount}`);

  // 2. Disburse Loan for Employee 1 (₹20,000 with ₹5,000 Monthly EMI)
  await prisma.employeeLoan.deleteMany({ where: { employeeId: emp1.id } });
  const loan = await prisma.employeeLoan.create({
    data: {
      loanNumber: `LON-QA-${Date.now().toString().slice(-4)}`,
      employeeId: emp1.id,
      principalAmount: 20000,
      monthlyEmi: 5000,
      totalTenureMonths: 4,
      remainingBalance: 20000,
      repaidAmount: 0,
      status: 'ACTIVE',
    },
  });
  record('PAY-05', 'Active Employee Loan Disbursed with Monthly EMI (₹5,000)', loan.monthlyEmi === 5000, `Loan #: ${loan.loanNumber}, EMI: ₹${loan.monthlyEmi}`);

  // ========================================================
  // PART 3: PERIOD 1 (2026-06) 5-STEP CALCULATION ENGINE
  // ========================================================
  console.log('\n3️⃣ Executing 5-Step Payroll Engine for Period 1 (June 2026)...');

  const periodMonth = 6;
  const periodYear = 2026;

  // Clean prior test period 2026-06 to ensure fresh repeatability
  const existingPeriod = await prisma.payrollPeriod.findUnique({
    where: { periodCode: `PAY-2026-06` },
  });
  if (existingPeriod) {
    await prisma.payslip.deleteMany({ where: { periodCode: `PAY-2026-06` } });
    await prisma.payrollRecord.deleteMany({ where: { periodId: existingPeriod.id } });
    await prisma.payrollPeriod.delete({ where: { id: existingPeriod.id } });
  }

  const periodRes = await fetch(`${BASE_URL}/api/hrm/payroll/periods`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ month: periodMonth, year: periodYear }),
  });
  const periodData = await periodRes.json();
  const period1 = periodData.period;
  record('PAY-06', 'Period 1 Initialized (PAY-2026-06)', periodRes.status === 200 && period1?.periodCode === 'PAY-2026-06', `Period: ${period1?.periodCode}, Status: ${period1?.status}`);

  // Execute 5-step processing engine
  const processRes = await fetch(`${BASE_URL}/api/hrm/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period1.id }),
  });
  const processData = await processRes.json();
  record('PAY-07', '5-Step Payroll Calculation Engine Execution', processRes.status === 200, `Status: ${processRes.status}, Total Gross: ₹${processData.period?.totalGrossPay?.toLocaleString()}`);

  // ========================================================
  // PART 4: MATHEMATICAL PRECISION & LINE-ITEM AUDIT
  // ========================================================
  console.log('\n4️⃣ Auditing Exact Mathematical Calculations for Employee 1...');

  const emp1Record = await prisma.payrollRecord.findFirst({
    where: { periodId: period1.id, employeeId: emp1.id },
    include: { earningsItems: true, deductionItems: true },
  });
  record('PAY-08', 'Employee 1 Payroll Record Generated', !!emp1Record, `Record ID: ${emp1Record?.id}`);

  // Expected Math Breakdown for Emp 1 (Base: 60,000, 0 LOP in Aug):
  // Adjusted Gross = 60,000
  // Basic (50%) = 30,000
  // HRA (40% of Basic) = 12,000
  // Special Allowance = 60,000 - 42,000 = 18,000
  // Earnings Total = 60,000
  // Deductions:
  // PF = min(1800, 30000 * 0.12 = 3600) = 1,800
  // PT = 200 (since Gross > 15000)
  // TDS = 60000 * 0.05 = 3,000
  // Loan EMI = 5,000
  // Deductions Total = 1,800 + 200 + 3,000 + 5,000 = 10,000
  // Reimbursement Credit = +3,500
  // Expected Net Pay = 60,000 - 10,000 + 3,500 = 53,500

  const expectedGross = 60000;
  const expectedDeductions = 10000;
  const expectedReimb = 3500;
  const expectedNet = 53500;

  record('PAY-09', 'Gross Pay Exact Math Check', emp1Record?.totalEarnings === expectedGross, `Expected: ₹${expectedGross} | System: ₹${emp1Record?.totalEarnings}`);
  record('PAY-10', 'Total Deductions Exact Math Check (PF + PT + TDS + Loan EMI)', emp1Record?.totalDeductions === expectedDeductions, `Expected: ₹${expectedDeductions} | System: ₹${emp1Record?.totalDeductions}`);
  record('PAY-11', 'Approved Reimbursements Credited in Full', emp1Record?.reimbursements === expectedReimb, `Expected: ₹${expectedReimb} | System: ₹${emp1Record?.reimbursements}`);
  record('PAY-12', 'Net Pay Flawless Mathematical Accuracy', emp1Record?.netPay === expectedNet, `Expected: ₹${expectedNet} | System: ₹${emp1Record?.netPay}`);

  // ========================================================
  // PART 5: ADMINISTRATIVE APPROVAL & FINALIZATION
  // ========================================================
  console.log('\n5️⃣ Auditing Administrative Governance & Sign-Off...');

  const approveRes = await fetch(`${BASE_URL}/api/hrm/payroll/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period1.id, remarks: 'Verified by CFO and Lead Auditor' }),
  });
  const approveData = await approveRes.json();
  record('PAY-13', 'Administrative Sign-Off (Status -> APPROVED)', approveRes.status === 200 && approveData.period?.status === 'APPROVED', `Status: ${approveData.period?.status}`);

  const finalizeRes = await fetch(`${BASE_URL}/api/hrm/payroll/finalize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period1.id }),
  });
  const finalizeData = await finalizeRes.json();
  record('PAY-14', 'Period Finalization & Permanent Lock (Status -> FINALIZED)', finalizeRes.status === 200 && finalizeData.period?.status === 'FINALIZED', `Status: ${finalizeData.period?.status}`);

  // ========================================================
  // PART 6: IMMUTABILITY LOCK VERIFICATION
  // ========================================================
  console.log('\n6️⃣ Auditing Finalized Payroll Immutability & Tamper Resistance...');

  // Attempt 1: Re-process finalized period
  const tamperProcessRes = await fetch(`${BASE_URL}/api/hrm/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period1.id }),
  });
  record('PAY-15', 'Immutability: Re-Processing Finalized Period Strictly Rejected', tamperProcessRes.status >= 400, `Status: ${tamperProcessRes.status} (Correctly Rejected)`);

  // Attempt 2: Delete finalized period
  const tamperDeleteRes = await fetch(`${BASE_URL}/api/hrm/payroll/periods/${period1.id}`, {
    method: 'DELETE',
    headers,
  });
  record('PAY-16', 'Immutability: Deleting Finalized Period Strictly Rejected', tamperDeleteRes.status >= 400, `Status: ${tamperDeleteRes.status} (Correctly Rejected)`);

  // ========================================================
  // PART 7: PAYSLIP ISSUANCE & FORMATTING
  // ========================================================
  console.log('\n7️⃣ Auditing Payslip Issuance & Number-to-Words Compliance...');

  const payslipRes = await fetch(`${BASE_URL}/api/hrm/payroll/payslips?periodCode=PAY-2026-06`, { headers });
  const payslipData = await payslipRes.json();
  const emp1Payslip = payslipData.payslips?.find(p => p.employeeId === emp1.id);
  record('PAY-17', 'Official Payslip Generated for Employee 1', !!emp1Payslip, `Payslip #: ${emp1Payslip?.payslipNumber}`);
  const wordsMatch =
    emp1Payslip?.netSalaryWords?.includes('Fifty Three Thousand') &&
    emp1Payslip?.netSalaryWords?.includes('Five Hundred Rupees Only');
  record('PAY-18', 'Payslip Indian Rupee Words Compliant', wordsMatch, `Rupee Words: "${emp1Payslip?.netSalaryWords}"`);
  record('PAY-19', 'Payslip Download Security Token Assigned', !!emp1Payslip?.downloadToken && emp1Payslip.downloadToken.length >= 24, `Token: ${emp1Payslip?.downloadToken?.slice(0, 10)}...`);

  // ========================================================
  // PART 8: MULTI-PERIOD HISTORY ISOLATION (PERIOD 1 VS PERIOD 2)
  // ========================================================
  console.log('\n8️⃣ Auditing Multi-Period Historical Integrity & Isolation...');

  // Store Period 1 totals
  const p1RecordBefore = await prisma.payrollPeriod.findUnique({ where: { id: period1.id } });

  // Clean prior test period 2026-07
  const existingPeriod2 = await prisma.payrollPeriod.findUnique({
    where: { periodCode: `PAY-2026-07` },
  });
  if (existingPeriod2) {
    await prisma.payslip.deleteMany({ where: { periodCode: `PAY-2026-07` } });
    await prisma.payrollRecord.deleteMany({ where: { periodId: existingPeriod2.id } });
    await prisma.payrollPeriod.delete({ where: { id: existingPeriod2.id } });
  }

  // Initialize and process Period 2 (2026-07)
  const period2Res = await fetch(`${BASE_URL}/api/hrm/payroll/periods`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ month: 7, year: 2026 }),
  });
  const period2Data = await period2Res.json();
  const period2 = period2Data.period;

  await fetch(`${BASE_URL}/api/hrm/payroll/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ periodId: period2.id }),
  });

  // Verify Period 1 is 100% UNCHANGED
  const p1RecordAfter = await prisma.payrollPeriod.findUnique({ where: { id: period1.id } });
  const p1Unchanged =
    p1RecordBefore.totalGross === p1RecordAfter.totalGross &&
    p1RecordBefore.totalNet === p1RecordAfter.totalNet &&
    p1RecordBefore.status === 'FINALIZED';
  record('PAY-20', 'Period 1 Financials Completely Unaltered After Period 2 Processing', p1Unchanged, `Period 1 Net: ₹${p1RecordAfter.totalNet.toLocaleString()} (Verified Untouched)`);

  console.log(`\n============================================================`);
  console.log(`📊 PAYROLL E2E AUDIT SUMMARY: Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log(`============================================================\n`);

  if (results.failed > 0) process.exit(1);
}

runPayrollE2ETests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
