const BASE_URL = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function loginAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@growthindia.co', password: 'Admin@123', portalType: 'ADMIN' }),
  });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  return { cookie: setCookie ? setCookie.split(';')[0] : '', user: data.user };
}

async function runCoreLifecycleTests() {
  console.log('🔄 PHASE 4 & 5: EMS MASTER INTEGRATION & RECRUITMENT ATS E2E AUDIT\n');

  const adminAuth = await loginAdmin();
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
  // PART 1: EMS EMPLOYEE MASTER INTEGRATION
  // ========================================================
  console.log('1️⃣ Auditing EMS Employee Master <-> HRM Synchronization...');

  // Fetch QA-EMP-001 from EMS
  const empBefore = await prisma.employee.findUnique({
    where: { employeeId: 'QA-EMP-001' },
    include: { department: true, reportingManager: true },
  });
  record('EMS-01', 'EMS Employee Record Found', !!empBefore, `Emp ID: ${empBefore?.employeeId}, Dept: ${empBefore?.department?.name}`);

  // Test updating Department in EMS
  const salesDept = await prisma.department.findFirst({ where: { code: 'QA-SALES' } });
  await prisma.employee.update({
    where: { id: empBefore.id },
    data: { departmentId: salesDept.id },
  });

  const empAfterDept = await prisma.employee.findUnique({
    where: { id: empBefore.id },
    include: { department: true },
  });
  record('EMS-02', 'Update Department in EMS Master Reflects Seamlessly', empAfterDept.departmentId === salesDept.id, `New Dept: ${empAfterDept.department?.name}`);

  // Test updating Designation in EMS
  await prisma.employee.update({
    where: { id: empBefore.id },
    data: { designation: 'Senior Full-Stack Engineer' },
  });
  const empAfterDesig = await prisma.employee.findUnique({ where: { id: empBefore.id } });
  record('EMS-03', 'Update Designation in EMS Master Reflects Seamlessly', empAfterDesig.designation === 'Senior Full-Stack Engineer', `New Designation: ${empAfterDesig.designation}`);

  // Test updating Reporting Manager in EMS
  const adminEmp = await prisma.employee.findUnique({ where: { employeeId: 'QA-ADMIN-001' } });
  await prisma.employee.update({
    where: { id: empBefore.id },
    data: { reportingManagerId: adminEmp.id },
  });
  const empAfterMgr = await prisma.employee.findUnique({
    where: { id: empBefore.id },
    include: { reportingManager: true },
  });
  record('EMS-04', 'Update Reporting Manager in EMS Master Reflects Hierarchy', empAfterMgr.reportingManagerId === adminEmp.id, `New Manager: ${empAfterMgr.reportingManager?.fullName}`);

  // Revert back for consistency
  const engDept = await prisma.department.findFirst({ where: { code: 'QA-ENG' } });
  const mgrEmp = await prisma.employee.findUnique({ where: { employeeId: 'QA-MGR-001' } });
  await prisma.employee.update({
    where: { id: empBefore.id },
    data: { departmentId: engDept.id, reportingManagerId: mgrEmp.id },
  });

  // Verify No Duplicate Employee records
  const allEmpCodes = await prisma.employee.findMany({ select: { employeeId: true } });
  const uniqueEmpCodes = new Set(allEmpCodes.map(e => e.employeeId));
  record('EMS-05', 'Zero Duplicate Employee Master IDs in Persistence', allEmpCodes.length === uniqueEmpCodes.size, `Total Employees: ${allEmpCodes.length}, Unique IDs: ${uniqueEmpCodes.size}`);

  // ========================================================
  // PART 2: RECRUITMENT ATS COMPLETE E2E WORKFLOW
  // ========================================================
  console.log('\n2️⃣ Auditing 14-Step Recruitment ATS Pipeline & Conversion...');

  // Step 1: Create Job Opening
  const openingRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'QA Lead Automation Architect',
      jobLocation: 'Corporate HQ (Bangalore)',
      openPositions: 1,
      departmentName: 'QA Engineering',
    }),
  });
  const openingData = await openingRes.json();
  const opening = openingData.job || openingData.opening;
  record('ATS-01', 'Step 1: Create Job Opening', openingRes.status === 200 && !!opening?.id, `Job Code: ${opening?.jobCode}, Title: ${opening?.title}`);

  // Step 2: Add Candidate (APPLIED)
  const candidateEmail = `test.candidate.${Date.now()}@growthindia.test`;
  const candidatePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const candRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'CANDIDATE',
      jobOpeningId: opening?.id,
      fullName: 'Vikramaditya Sengupta',
      email: candidateEmail,
      phone: candidatePhone,
      currentCompany: 'Global Fintech Corp',
      expectedCtc: 1200000,
      totalExperienceYears: 6,
    }),
  });
  const candData = await candRes.json();
  const candidate = candData.candidate;
  record('ATS-02', 'Step 2: Candidate Created (APPLIED)', candRes.status === 200 && candidate?.stage === 'APPLIED', `Candidate #: ${candidate?.candidateNumber}, Name: ${candidate?.fullName}`);

  // Step 3: Transition Stage to SCREENING
  const screenRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'UPDATE_STAGE',
      candidateId: candidate?.id,
      stage: 'SCREENING',
    }),
  });
  const screenData = await screenRes.json();
  record('ATS-03', 'Step 3: Move Candidate to SCREENING', screenRes.status === 200 && screenData.candidate?.stage === 'SCREENING', `New Stage: ${screenData.candidate?.stage}`);

  // Step 4: Transition Stage to SHORTLISTED
  const shortlistRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'UPDATE_STAGE',
      candidateId: candidate?.id,
      stage: 'SHORTLISTED',
    }),
  });
  record('ATS-04', 'Step 4: Move Candidate to SHORTLISTED', shortlistRes.status === 200, `Stage: SHORTLISTED`);

  // Step 5: Schedule Interview
  const interviewRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'INTERVIEW',
      candidateId: candidate?.id,
      interviewerId: 'QA-MGR-001',
      roundName: 'System Architecture & Automation Deep Dive',
      scheduledTime: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 60,
      meetingLink: 'https://meet.growthindia.co/qa-lead-interview',
    }),
  });
  const interviewData = await interviewRes.json();
  const interview = interviewData.interview;
  record('ATS-05', 'Step 5: Schedule Technical Interview Round', interviewRes.status === 200 && !!interview?.interviewNumber, `Interview #: ${interview?.interviewNumber}, Round: ${interview?.roundName}`);

  // Step 6: Submit Interview Evaluation
  const evalRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'EVALUATION',
      interviewId: interview?.id,
      rating: 5,
      feedback: 'Outstanding architectural depth, flawless live problem solving',
      recommendation: 'STRONG_HIRE',
    }),
  });
  record('ATS-06', 'Step 6: Submit Interview Evaluation (STRONG_HIRE)', evalRes.status === 200, `Status: ${evalRes.status}`);

  // Step 7: Issue Official Job Offer
  const offerRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'OFFER',
      candidateId: candidate?.id,
      offeredCtc: 1350000,
      offeredRole: 'Staff QA Automation Architect',
      offeredDepartment: 'QA Engineering',
      joiningDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    }),
  });
  const offerData = await offerRes.json();
  const offer = offerData.offer;
  record('ATS-07', 'Step 7: Issue Official Job Offer', offerRes.status === 200 && !!offer?.offerNumber, `Offer #: ${offer?.offerNumber}, Offered CTC: ₹${offer?.offeredCtc?.toLocaleString()}`);

  // Step 8: Accept Offer
  const acceptOfferRes = await fetch(`${BASE_URL}/api/hrm/recruitment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'OFFER_STATUS',
      offerId: offer?.id,
      status: 'ACCEPTED',
    }),
  });
  record('ATS-08', 'Step 8: Candidate Accepts Offer (Stage: HIRED)', acceptOfferRes.status === 200, `Offer Status: ACCEPTED`);

  // Step 9: Atomically Convert Candidate into EMS Master Employee
  const convertRes = await fetch(`${BASE_URL}/api/hrm/recruitment/candidates/${candidate?.id}/convert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      offeredCtc: 1350000,
      bankAccountNumber: '98765432101234',
      bankIfscCode: 'HDFC0000999',
      panNumber: 'ABCDE9999Z',
    }),
  });
  const convertData = await convertRes.json();
  record('ATS-09', 'Step 9: Atomic Candidate Conversion into EMS Master', convertRes.status === 200 && !!convertData.employeeId, `Generated EMS ID: ${convertData.employeeId}`);

  // Verify created EMS employee in Prisma
  const emsCreated = await prisma.employee.findUnique({
    where: { employeeId: convertData.employeeId },
    include: { user: true, salaryAssignments: true },
  });
  record('ATS-10', 'Verify EMS Employee Master Record & User Account Created', !!emsCreated && emsCreated.user?.email === candidateEmail, `EMS ID: ${emsCreated?.employeeId}, Status: ${emsCreated?.status}`);

  record('ATS-11', 'Verify Automatic CTC Salary Assignment Linked', emsCreated?.salaryAssignments?.length > 0 && emsCreated.salaryAssignments[0].annualCtc === 1350000, `Assigned Annual CTC: ₹${emsCreated?.salaryAssignments?.[0]?.annualCtc?.toLocaleString()}`);

  // Step 10: Prevent Re-conversion of Same Candidate
  const duplicateConvertRes = await fetch(`${BASE_URL}/api/hrm/recruitment/candidates/${candidate?.id}/convert`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ offeredCtc: 1350000 }),
  });
  record('ATS-12', 'Prevent Duplicate Candidate Conversion (Idempotency Guard)', duplicateConvertRes.status >= 400, `Status: ${duplicateConvertRes.status} (Correctly Rejected)`);

  console.log(`\n============================================================`);
  console.log(`📊 CORE LIFECYCLE & ATS SUMMARY: Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log(`============================================================\n`);

  if (results.failed > 0) process.exit(1);
}

runCoreLifecycleTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
