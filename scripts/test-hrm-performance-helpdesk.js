/**
 * Performance, OKRs, HR Requests & Helpdesk Systems Automated Test Suite
 * Growth India CRM / HRM Platform
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function loginUser(email, password, portalType = 'EMPLOYEE') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, portalType }),
  });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    cookie = setCookie.split(',').map((c) => c.split(';')[0].trim()).join('; ');
  }
  return { status: res.status, data, cookie, token: data.token };
}

async function runPerformanceHelpdeskTests() {
  console.log('🚀 INITIATING PERFORMANCE, OKRs, HR REQUESTS & HELPDESK TEST SUITE...\n');

  const adminAuth = await loginUser('qa.platformadmin@growthindia.test', 'QaPass#2026', 'ADMIN');
  const hrAuth = await loginUser('qa.hrlead@growthindia.test', 'QaPass#2026', 'ADMIN');
  const mgrAuth = await loginUser('qa.manager@growthindia.test', 'QaPass#2026', 'EMPLOYEE');
  const emp1Auth = await loginUser('qa.emp1@growthindia.test', 'QaPass#2026', 'EMPLOYEE');

  const headersAdmin = { 'Content-Type': 'application/json', Cookie: adminAuth.cookie };
  const headersHR = { 'Content-Type': 'application/json', Cookie: hrAuth.cookie };
  const headersMgr = { 'Content-Type': 'application/json', Cookie: mgrAuth.cookie };
  const headersEmp1 = { 'Content-Type': 'application/json', Cookie: emp1Auth.cookie };

  const emp1 = await prisma.employee.findUnique({ where: { employeeId: 'QA-EMP-001' } });
  const mgr = await prisma.employee.findUnique({ where: { employeeId: 'QA-MGR-001' } });

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
  // PART 1: PERFORMANCE CYCLES & OKR GOALS
  // ========================================================
  console.log('1️⃣ Auditing Performance Cycles & OKR Goal Setup...');

  // 1. Create Performance Cycle
  const cycleTitle = `QA-Cycle-Q3-${Date.now()}`;
  const cycleRes = await fetch(`${BASE_URL}/api/hrm/performance`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      type: 'CYCLE',
      title: cycleTitle,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.000Z',
      description: 'Q3 Enterprise Architecture and Performance Cycle',
    }),
  });
  const cycleData = await cycleRes.json();
  const cycle = cycleData.cycle;
  record('PERF-01', 'Performance Cycle Initialized', cycleRes.status === 200 && cycle?.title === cycleTitle, `Cycle: ${cycle?.title}, ID: ${cycle?.id}`);

  // 2. Create Goal with Key Results for Employee 1
  const goalRes = await fetch(`${BASE_URL}/api/hrm/performance`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      employeeId: emp1.id,
      cycleId: cycle.id,
      title: 'Architect Enterprise Multi-Tenant Caching Subsystem',
      description: 'Deliver Redis caching layer with p99 < 15ms latency response time',
      category: 'INDIVIDUAL',
      targetMetric: 'PERCENT',
      startValue: 0,
      targetValue: 100,
      keyResults: [
        { title: 'Benchmarking & Load Simulation', targetValue: 100, unit: 'PERCENT' },
        { title: 'Cluster Failover Automation', targetValue: 100, unit: 'PERCENT' },
      ],
    }),
  });
  const goalData = await goalRes.json();
  const goal = goalData.goal;
  record('PERF-02', 'Employee OKR Goal with Key Results Created', goalRes.status === 200 && goal?.keyResults?.length === 2, `Goal: ${goal?.title}, Key Results: ${goal?.keyResults?.length}`);

  // 3. Update Progress on Key Result
  const kr1 = goal?.keyResults?.[0];
  const updateRes = await fetch(`${BASE_URL}/api/hrm/performance`, {
    method: 'POST',
    headers: headersEmp1,
    body: JSON.stringify({
      type: 'UPDATE_PROGRESS',
      goalId: goal?.id,
      keyResultId: kr1?.id,
      currentValue: 75,
    }),
  });
  const updateData = await updateRes.json();
  const updatedGoal = await prisma.goal.findUnique({
    where: { id: goal?.id },
    include: { keyResults: true },
  });
  record('PERF-03', 'Goal Progress Tracking & Key Result Mutation', updateRes.status === 200 && updatedGoal?.progress > 0, `Progress: ${updatedGoal?.progress}%, Status: ${updatedGoal?.status}`);

  // ========================================================
  // PART 2: 360-DEGREE PERFORMANCE REVIEWS
  // ========================================================
  console.log('\n2️⃣ Auditing 360-Degree Performance Review Workflow...');

  // Ensure Review record exists
  let review = await prisma.performanceReview.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: emp1.id } },
  });
  if (!review) {
    review = await prisma.performanceReview.create({
      data: {
        cycleId: cycle.id,
        employeeId: emp1.id,
        reviewerId: mgr.id,
        status: 'PENDING_SELF',
      },
    });
  }

  // 1. Employee Submits Self-Review
  const selfRes = await fetch(`${BASE_URL}/api/hrm/performance`, {
    method: 'POST',
    headers: headersEmp1,
    body: JSON.stringify({
      type: 'REVIEW',
      cycleId: cycle.id,
      employeeId: emp1.id,
      selfRating: 4.5,
      selfComments: 'Exceeded all architectural delivery milestones for Q3 with zero defect regressions.',
    }),
  });
  const selfData = await selfRes.json();
  const selfReview = await prisma.performanceReview.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: emp1.id } },
  });
  record('PERF-04', 'Employee Self-Evaluation Submitted', selfRes.status === 200 && selfReview?.selfRating === 4.5 && selfReview?.status === 'PENDING_MANAGER', `Self Rating: ${selfReview?.selfRating}, Status: ${selfReview?.status}`);

  // 2. Manager Submits Manager Review
  const mgrRes = await fetch(`${BASE_URL}/api/hrm/performance`, {
    method: 'POST',
    headers: headersMgr,
    body: JSON.stringify({
      type: 'REVIEW',
      cycleId: cycle.id,
      employeeId: emp1.id,
      managerRating: 4.8,
      managerComments: 'Exceptional engineering leadership and high quality technical execution.',
    }),
  });
  const mgrData = await mgrRes.json();
  const finalReview = await prisma.performanceReview.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: emp1.id } },
  });
  record('PERF-05', 'Manager Evaluation & Final Score Locked', mgrRes.status === 200 && finalReview?.managerRating === 4.8 && finalReview?.status === 'COMPLETED', `Manager Rating: ${finalReview?.managerRating}, Final Status: ${finalReview?.status}`);

  // ========================================================
  // PART 3: HR SERVICE REQUESTS LIFECYCLE
  // ========================================================
  console.log('\n3️⃣ Auditing HR Service Requests Subsystem...');

  // 1. Ensure HR Request Type exists
  let reqType = await prisma.hrRequestType.findFirst({ where: { code: 'LETTER' } });
  if (!reqType) {
    reqType = await prisma.hrRequestType.create({
      data: {
        code: 'LETTER',
        name: 'Official Employment Verification Letter',
        description: 'Formal HR certificate for visa, banking, or credit verification',
        isActive: true,
      },
    });
  }

  // 2. Employee 1 Submits Request
  const reqRes = await fetch(`${BASE_URL}/api/hrm/requests`, {
    method: 'POST',
    headers: headersEmp1,
    body: JSON.stringify({
      requestTypeId: reqType.id,
      title: 'Request for Standard Experience & Designation Certificate',
      description: 'Required for foreign travel business visa application to Germany',
    }),
  });
  const reqData = await reqRes.json();
  const createdReq = reqData.request;
  record('REQ-01', 'Employee HR Service Request Submitted', reqRes.status === 200 && !!createdReq?.reqNumber, `Request #: ${createdReq?.reqNumber}, Status: ${createdReq?.status}`);

  // 3. HR Admin Updates Request Status to IN_REVIEW
  const reviewReqRes = await fetch(`${BASE_URL}/api/hrm/requests`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      type: 'STATUS_UPDATE',
      requestId: createdReq?.id,
      status: 'IN_REVIEW',
      remarks: 'Forwarded to Executive Operations for stamp & signature verification',
    }),
  });
  record('REQ-02', 'HR Executive Moves Request to IN_REVIEW', reviewReqRes.status === 200, `Updated Status: IN_REVIEW`);

  // 4. HR Admin Fulfills & Completes Request
  const completeReqRes = await fetch(`${BASE_URL}/api/hrm/requests`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      type: 'STATUS_UPDATE',
      requestId: createdReq?.id,
      status: 'COMPLETED',
      remarks: 'Certificate generated, digitally signed, and uploaded to employee document vault',
    }),
  });
  const completedReq = await prisma.hrRequest.findUnique({ where: { id: createdReq?.id } });
  record('REQ-03', 'HR Request Completed & Resolution Logged', completeReqRes.status === 200 && completedReq?.status === 'COMPLETED' && !!completedReq?.completedAt, `Final Status: ${completedReq?.status}, Completed At: ${completedReq?.completedAt}`);

  // ========================================================
  // PART 4: INTERNAL HELPDESK & TICKETING LIFECYCLE
  // ========================================================
  console.log('\n4️⃣ Auditing Employee Helpdesk & Ticketing Subsystem...');

  // 1. Employee 1 Creates Helpdesk Ticket
  const tckRes = await fetch(`${BASE_URL}/api/hrm/helpdesk`, {
    method: 'POST',
    headers: headersEmp1,
    body: JSON.stringify({
      category: 'PAYROLL',
      priority: 'HIGH',
      subject: 'Inquiry Regarding Form 16 Part B TDS Reconciliation',
      description: 'Please clarify standard deduction cap applied in recent tax deduction cycle',
    }),
  });
  const tckData = await tckRes.json();
  const ticket = tckData.ticket;
  record('TCK-01', 'High-Priority Employee Helpdesk Ticket Created', tckRes.status === 200 && !!ticket?.ticketNumber, `Ticket #: ${ticket?.ticketNumber}, Priority: ${ticket?.priority}`);

  // 2. HR Admin Adds Official Comment
  const commentRes = await fetch(`${BASE_URL}/api/hrm/helpdesk`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      type: 'COMMENT',
      ticketId: ticket?.id,
      comment: 'Standard deduction of ₹50,000 has been verified and reflects in Annexure 1.',
      isInternal: false,
    }),
  });
  const commentData = await commentRes.json();
  record('TCK-02', 'Support Staff Comment Added to Ticket Thread', commentRes.status === 200 && !!commentData.comment?.id, `Comment ID: ${commentData.comment?.id}, Author: ${commentData.comment?.authorName}`);

  // 3. Employee 1 Replies in Ticket Thread
  const empCommentRes = await fetch(`${BASE_URL}/api/hrm/helpdesk`, {
    method: 'POST',
    headers: headersEmp1,
    body: JSON.stringify({
      type: 'COMMENT',
      ticketId: ticket?.id,
      comment: 'Thank you for the prompt clarification. The numbers match my expectations.',
    }),
  });
  record('TCK-03', 'Employee Response Appended to Conversation Thread', empCommentRes.status === 200, `Thread Updated`);

  // 4. HR Admin Resolves & Closes Ticket
  const closeRes = await fetch(`${BASE_URL}/api/hrm/helpdesk`, {
    method: 'POST',
    headers: headersHR,
    body: JSON.stringify({
      type: 'STATUS_UPDATE',
      ticketId: ticket?.id,
      status: 'RESOLVED',
    }),
  });
  const resolvedTicket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticket?.id },
    include: { comments: true },
  });
  record('TCK-04', 'Helpdesk Ticket Resolved with Complete Thread History', closeRes.status === 200 && resolvedTicket?.status === 'RESOLVED' && resolvedTicket?.comments?.length >= 2, `Status: ${resolvedTicket?.status}, Comments Thread: ${resolvedTicket?.comments?.length} entries`);

  console.log(`\n============================================================`);
  console.log(`📊 PERFORMANCE & HELPDESK SUMMARY: Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log(`============================================================\n`);

  if (results.failed > 0) process.exit(1);
}

runPerformanceHelpdeskTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
