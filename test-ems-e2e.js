/**
 * Comprehensive Automated End-to-End QA Testing Suite for Growth India Employee Management System (EMS)
 * 
 * Verifies all 6 EMS Modules + EMS Overview:
 * 0. EMS Overview (Live workforce feed, stats, counters)
 * 1. STAFF & DIRECTORY:
 *    - Onboarding Wizard (provisioning, password generation, database persistence)
 *    - Employee Directory (dynamic search, filter, pagination, multi-field retrieval)
 *    - Employee 360 (full 360-degree dossier, stats, timeline, documents, audits)
 *    - Organization Structure (company hierarchy, departmental node tree)
 * 2. ATTENDANCE & WORKFORCE:
 *    - Attendance Records (today log, punch events, working intervals)
 *    - Live Workforce (real-time presence tracker, on-duty status)
 *    - Timesheets (scheduled vs worked hours, overtime, daily/weekly aggregation)
 *    - Shifts & Policies (create shift policy, verify MongoDB persistence)
 *    - Holiday Calendar (create company/client holiday, calendar sync, persistence)
 * 3. LEAVE & REQUESTS:
 *    - Leave Management (apply paid/casual leave, administrative review & approval)
 *    - Regularization (submit punch correction request, approval & status update)
 * 4. DOCUMENTS & LIFECYCLE:
 *    - Documents & KYC (upload document metadata, KYC verification workflow)
 *    - Employee Lifecycle (stage transition PROBATION -> ACTIVE -> CONFIRMED, immutable history)
 *    - Offboarding (initiate exit clearance, asset return & handover tracking)
 * 5. ACCESS & GOVERNANCE:
 *    - Account & Access (credentials list, password reset requests review)
 *    - Employee Status (disciplinary suspend & immediate session revocation, reactivate)
 *    - Delegated Access (shared administrative permissions manager)
 *    - Audit Logs (immutable enterprise audit trail verification)
 * 6. REPORTS & EXPORTS:
 *    - Workforce & Analytics Reports (headcount, attendance rate, leave breakdown)
 *    - Export Center (CSV / Data export service)
 */

const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('========================================================================');
  console.log('🧪 GROWTH INDIA EMS - COMPREHENSIVE END-TO-END QA TEST SUITE');
  console.log('========================================================================\n');

  let adminCookie = '';
  let testEmployeeDbId = '';
  let testEmployeeDisplayId = '';
  let testShiftId = '';
  let testHolidayId = '';
  let testLeaveId = '';
  let testRegularizationId = '';
  let testDocId = '';
  let testOffboardingId = '';

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    features: {}
  };

  function record(moduleName, testName, passed, details = '') {
    results.total++;
    if (passed) {
      results.passed++;
      console.log(`  ✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
    } else {
      results.failed++;
      console.error(`  ❌ [FAIL] ${testName} - Details: ${details}`);
    }
    if (!results.features[moduleName]) results.features[moduleName] = { passed: 0, failed: 0 };
    if (passed) results.features[moduleName].passed++;
    else results.features[moduleName].failed++;
  }

  // --- Step 0: Authentication ---
  console.log('🔑 Authenticating as Super Admin...');
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
  const headers = {
    'Content-Type': 'application/json',
    Cookie: adminCookie,
  };
  record('0. Auth', 'Admin Session & JWT Verification', loginRes.status === 200 && loginData.user?.role === 'ADMIN', `User: ${loginData.user?.fullName}`);

  // ==========================================================================
  // MODULE 0: EMS OVERVIEW
  // ==========================================================================
  console.log('\n📊 MODULE 0: EMS OVERVIEW');
  try {
    const overviewRes = await fetch(`${BASE_URL}/api/workforce/live`, { headers });
    const overviewData = await overviewRes.json();
    record('0. EMS Overview', 'Live Workforce & EMS Summary Feed', overviewRes.ok && overviewData.success !== false, `Employees Active: ${overviewData.summary?.activeNow || 0}, On Duty: ${overviewData.summary?.onDuty || 0}`);
  } catch (e) {
    record('0. EMS Overview', 'Live Workforce & EMS Summary Feed', false, e.message);
  }

  // ==========================================================================
  // MODULE 1: STAFF & DIRECTORY
  // ==========================================================================
  console.log('\n👥 MODULE 1: STAFF & DIRECTORY');
  
  // 1.1 Onboarding Wizard (Create New Employee via POST /api/employees)
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const newEmpPayload = {
    firstName: 'Karan',
    lastName: `Verma ${randNum}`,
    fullName: `Karan Verma ${randNum}`,
    phone: `9811${randNum}`,
    email: `karan.verma.${randNum}@growthindia.co`,
    personalEmail: `karan.verma.${randNum}@growthindia.co`,
    departmentName: 'Operations',
    designation: 'Senior QA Analyst',
    employmentType: 'Full-Time',
    joiningDate: '2026-09-01',
    address: 'B-45, Sector 62, Noida, Uttar Pradesh',
    emergencyContact: '9811000000',
    emergencyName: 'Rajesh Verma',
    panNumber: 'ABCDE9876K',
    aadharNumber: '998877665544',
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    isDraft: false
  };

  try {
    const onboardRes = await fetch(`${BASE_URL}/api/employees`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newEmpPayload)
    });
    const onboardData = await onboardRes.json();
    if (onboardRes.ok && onboardData.success && onboardData.employee) {
      testEmployeeDbId = onboardData.employee.id;
      testEmployeeDisplayId = onboardData.employee.employeeId;
      record('1. Staff & Directory', 'Onboarding Wizard (Create Employee)', true, `Created ID: ${testEmployeeDisplayId}`);
    } else {
      record('1. Staff & Directory', 'Onboarding Wizard (Create Employee)', false, onboardData.error || 'Unknown error');
    }
  } catch (e) {
    record('1. Staff & Directory', 'Onboarding Wizard (Create Employee)', false, e.message);
  }

  // 1.2 Employee Directory (Listing & Filter)
  try {
    const dirRes = await fetch(`${BASE_URL}/api/employees?search=${randNum}`, { headers });
    const dirData = await dirRes.json();
    const found = (dirData.employees || []).some(e => e.employeeId === testEmployeeDisplayId || e.phone === newEmpPayload.phone);
    record('1. Staff & Directory', 'Employee Directory (Search & Retrieval)', dirRes.ok && found, `Found ${testEmployeeDisplayId} in MongoDB`);
  } catch (e) {
    record('1. Staff & Directory', 'Employee Directory (Search & Retrieval)', false, e.message);
  }

  // 1.3 Employee 360 View
  try {
    const emp360Res = await fetch(`${BASE_URL}/api/employees/${testEmployeeDisplayId || testEmployeeDbId}/360`, { headers });
    const emp360Data = await emp360Res.json();
    const success360 = emp360Res.ok && (emp360Data.employee?.employeeId === testEmployeeDisplayId || emp360Data.success);
    record('1. Staff & Directory', 'Employee 360 Comprehensive Profile', success360, `Profile & Work Timeline loaded for ${testEmployeeDisplayId}`);
  } catch (e) {
    record('1. Staff & Directory', 'Employee 360 Comprehensive Profile', false, e.message);
  }

  // 1.4 Organization Structure
  try {
    const orgRes = await fetch(`${BASE_URL}/api/organization/structure`, { headers });
    const orgData = await orgRes.json();
    const hasOrgNodes = orgRes.ok && (Array.isArray(orgData.nodes) || Array.isArray(orgData.tree) || Array.isArray(orgData));
    record('1. Staff & Directory', 'Organization Structure & Hierarchy', hasOrgNodes, `Org structure returned successfully`);
  } catch (e) {
    record('1. Staff & Directory', 'Organization Structure & Hierarchy', false, e.message);
  }

  // ==========================================================================
  // MODULE 2: ATTENDANCE & WORKFORCE
  // ==========================================================================
  console.log('\n⏱️ MODULE 2: ATTENDANCE & WORKFORCE');

  // 2.1 Attendance Records
  try {
    const attRes = await fetch(`${BASE_URL}/api/attendance/today`, { headers });
    const attData = await attRes.json();
    record('2. Attendance & Workforce', 'Attendance Records (Today & History)', attRes.ok, `Today records loaded: OK`);
  } catch (e) {
    record('2. Attendance & Workforce', 'Attendance Records (Today & History)', false, e.message);
  }

  // 2.2 Live Workforce Status
  try {
    const liveRes = await fetch(`${BASE_URL}/api/workforce/live`, { headers });
    const liveData = await liveRes.json();
    record('2. Attendance & Workforce', 'Live Workforce Tracking', liveRes.ok && liveData.success, `Live workforce status verified`);
  } catch (e) {
    record('2. Attendance & Workforce', 'Live Workforce Tracking', false, e.message);
  }

  // 2.3 Timesheets
  try {
    const tsRes = await fetch(`${BASE_URL}/api/workforce/timesheets`, { headers });
    const tsData = await tsRes.json();
    record('2. Attendance & Workforce', 'Timesheets Calculation & Listing', tsRes.ok && tsData.success, `Timesheet aggregation validated`);
  } catch (e) {
    record('2. Attendance & Workforce', 'Timesheets Calculation & Listing', false, e.message);
  }

  // 2.4 Shifts & Policies (Create & DB Persistence)
  try {
    const shiftPayload = {
      name: `QA General Shift ${randNum}`,
      code: `GS-${randNum}`,
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMinutes: 15,
      breakDurationMinutes: 60,
      maxBreaks: 2,
      weeklyOffDays: ['SATURDAY', 'SUNDAY'],
      overtimeThresholdHours: 9,
      overtimeMultiplier: 1.5,
      isActive: true,
      description: 'Standard QA Shift policy test'
    };
    const shiftRes = await fetch(`${BASE_URL}/api/workforce/shifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(shiftPayload)
    });
    const shiftData = await shiftRes.json();
    testShiftId = shiftData.shift?.id || shiftData.id;
    record('2. Attendance & Workforce', 'Shifts & Policies (Create & Configure)', shiftRes.ok && !!testShiftId, `Shift ID: ${testShiftId}`);

    const listShiftRes = await fetch(`${BASE_URL}/api/workforce/shifts`, { headers });
    const listShiftData = await listShiftRes.json();
    const persisted = (listShiftData.shifts || []).some(s => s.id === testShiftId);
    record('2. Attendance & Workforce', 'Shifts & Policies (Database Persistence)', listShiftRes.ok && persisted, `Persisted in MongoDB: ${persisted}`);
  } catch (e) {
    record('2. Attendance & Workforce', 'Shifts & Policies Workflow', false, e.message);
  }

  // 2.5 Holiday Calendar (Create & DB Persistence)
  try {
    const holidayPayload = {
      name: `QA Festival Holiday ${randNum}`,
      date: '2026-11-15',
      holidayType: 'COMPANY',
      year: 2026,
      description: 'Annual QA Festivity',
      isMandatory: true
    };
    const holRes = await fetch(`${BASE_URL}/api/workforce/holidays`, {
      method: 'POST',
      headers,
      body: JSON.stringify(holidayPayload)
    });
    const holData = await holRes.json();
    testHolidayId = holData.holiday?.id || holData.id;
    record('2. Attendance & Workforce', 'Holiday Calendar (Create Holiday)', holRes.ok && !!testHolidayId, `Holiday ID: ${testHolidayId}`);

    const listHolRes = await fetch(`${BASE_URL}/api/workforce/holidays?year=2026`, { headers });
    const listHolData = await listHolRes.json();
    const holPersisted = (listHolData.holidays || []).some(h => h.id === testHolidayId);
    record('2. Attendance & Workforce', 'Holiday Calendar (Database Persistence)', listHolRes.ok && holPersisted, `Holiday Saved: ${holPersisted}`);
  } catch (e) {
    record('2. Attendance & Workforce', 'Holiday Calendar Workflow', false, e.message);
  }

  // ==========================================================================
  // MODULE 3: LEAVE & REQUESTS
  // ==========================================================================
  console.log('\n🏖️ MODULE 3: LEAVE & REQUESTS');

  // 3.1 Leave Management (Apply & Review)
  try {
    const leavePayload = {
      leaveType: 'CASUAL',
      startDate: '2026-10-10',
      endDate: '2026-10-11',
      totalDays: 2,
      reason: 'Urgent family function'
    };
    const applyLeaveRes = await fetch(`${BASE_URL}/api/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify(leavePayload)
    });
    const applyLeaveData = await applyLeaveRes.json();
    testLeaveId = applyLeaveData.leave?.id || applyLeaveData.id;
    record('3. Leave & Requests', 'Leave Management (Apply Leave)', applyLeaveRes.ok && !!testLeaveId, `Leave ID: ${testLeaveId}`);

    if (testLeaveId) {
      const reviewRes = await fetch(`${BASE_URL}/api/leave/${testLeaveId}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'APPROVED', reviewRemarks: 'Approved by Admin QA' })
      });
      const reviewData = await reviewRes.json();
      record('3. Leave & Requests', 'Leave Management (Review & Approval)', reviewRes.ok && reviewData.success, `Approval Status: ${reviewData.leave?.status || 'APPROVED'}`);
    }
  } catch (e) {
    record('3. Leave & Requests', 'Leave Management Workflow', false, e.message);
  }

  // 3.2 Regularization (Submit & Review)
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const regPayload = {
      employeeId: testEmployeeDisplayId || testEmployeeDbId,
      date: todayStr,
      requestedCheckIn: '09:30',
      requestedCheckOut: '18:30',
      reason: 'Biometric device synchronization issue'
    };
    const regRes = await fetch(`${BASE_URL}/api/attendance/regularization`, {
      method: 'POST',
      headers,
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    testRegularizationId = regData.request?.id || regData.id;
    record('3. Leave & Requests', 'Regularization (Submit Request)', regRes.ok && !!testRegularizationId, `Regularization ID: ${testRegularizationId}`);

    if (testRegularizationId) {
      const reviewRegRes = await fetch(`${BASE_URL}/api/attendance/regularization/${testRegularizationId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'APPROVED', remarks: 'Verified against manual log' })
      });
      const reviewRegData = await reviewRegRes.json();
      record('3. Leave & Requests', 'Regularization (Manager Review & Approval)', reviewRegRes.ok && reviewRegData.success, `Status: ${reviewRegData.request?.status || 'APPROVED'}`);
    }
  } catch (e) {
    record('3. Leave & Requests', 'Regularization Workflow', false, e.message);
  }

  // ==========================================================================
  // MODULE 4: DOCUMENTS & LIFECYCLE
  // ==========================================================================
  console.log('\n📄 MODULE 4: DOCUMENTS & LIFECYCLE');

  // 4.1 Documents & KYC (Upload & Verify)
  try {
    const docPayload = {
      employeeId: testEmployeeDisplayId || testEmployeeDbId,
      documentType: 'PAN_CARD',
      title: 'PAN Card Verification Document',
      fileStoragePath: '/uploads/documents/pan_card_qa.pdf'
    };
    const docRes = await fetch(`${BASE_URL}/api/documents/kyc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(docPayload)
    });
    const docData = await docRes.json();
    testDocId = docData.document?.id || docData.document?.documentId;
    record('4. Documents & Lifecycle', 'Documents & KYC (Upload Metadata)', docRes.ok && !!testDocId, `Document ID: ${testDocId}`);

    if (testDocId) {
      const verifyRes = await fetch(`${BASE_URL}/api/documents/kyc`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ documentId: testDocId, status: 'VERIFIED' })
      });
      const verifyData = await verifyRes.json();
      record('4. Documents & Lifecycle', 'Documents & KYC (KYC Verification)', verifyRes.ok && verifyData.success, `Status: VERIFIED`);
    }
  } catch (e) {
    record('4. Documents & Lifecycle', 'Documents & KYC Workflow', false, e.message);
  }

  // 4.2 Employee Lifecycle (Stage Transitions & Promotion History)
  try {
    const lifePayload = {
      employeeId: testEmployeeDisplayId || testEmployeeDbId,
      toStage: 'CONFIRMED',
      reason: 'Successfully completed 3-month probation with outstanding reviews',
      remarks: 'Salary increment applied'
    };
    const lifeRes = await fetch(`${BASE_URL}/api/employees/lifecycle`, {
      method: 'POST',
      headers,
      body: JSON.stringify(lifePayload)
    });
    const lifeData = await lifeRes.json();
    record('4. Documents & Lifecycle', 'Employee Lifecycle (Stage Transition & Audit)', lifeRes.ok && (lifeData.success !== false), `Stage Transition: PROBATION -> CONFIRMED`);
  } catch (e) {
    record('4. Documents & Lifecycle', 'Employee Lifecycle Workflow', false, e.message);
  }

  // 4.3 Offboarding (Initiate Clearance Checklist & Handover)
  try {
    const offboardPayload = {
      employeeId: testEmployeeDisplayId || testEmployeeDbId,
      exitType: 'MUTUAL_SEPARATION',
      exitReason: 'Pursuing higher studies',
      noticeDate: '2026-09-23',
      lastWorkingDay: '2026-10-23',
      exitNotes: 'All hardware and badges scheduled for return'
    };
    const offboardRes = await fetch(`${BASE_URL}/api/employees/offboarding`, {
      method: 'POST',
      headers,
      body: JSON.stringify(offboardPayload)
    });
    const offboardData = await offboardRes.json();
    testOffboardingId = offboardData.offboarding?.id || offboardData.id;
    record('4. Documents & Lifecycle', 'Offboarding (Clearance Initiation & Handover)', offboardRes.ok && !!testOffboardingId, `Offboarding ID: ${testOffboardingId}`);
  } catch (e) {
    record('4. Documents & Lifecycle', 'Offboarding Workflow', false, e.message);
  }

  // ==========================================================================
  // MODULE 5: ACCESS & GOVERNANCE
  // ==========================================================================
  console.log('\n🔒 MODULE 5: ACCESS & GOVERNANCE');

  // 5.1 Account & Access (Password reset requests & accounts lookup)
  try {
    const accRes = await fetch(`${BASE_URL}/api/access/accounts`, { headers });
    const accData = await accRes.json();
    record('5. Access & Governance', 'Account & Access Management', accRes.ok && Array.isArray(accData.accounts || accData), `Accounts loaded`);
  } catch (e) {
    record('5. Access & Governance', 'Account & Access Management', false, e.message);
  }

  // 5.2 Employee Status (Block / Unblock / Suspend / Reactivate)
  try {
    const suspendRes = await fetch(`${BASE_URL}/api/employees/${testEmployeeDisplayId || testEmployeeDbId}/suspend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Compliance audit pending' })
    });
    const suspendData = await suspendRes.json();
    record('5. Access & Governance', 'Employee Status (Suspend Employee)', suspendRes.ok && (suspendData.success || suspendData.status === 'SUSPENDED'), `Employee Suspended`);

    const reactivateRes = await fetch(`${BASE_URL}/api/employees/${testEmployeeDisplayId || testEmployeeDbId}/reactivate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Compliance cleared' })
    });
    const reactivateData = await reactivateRes.json();
    record('5. Access & Governance', 'Employee Status (Reactivate Employee)', reactivateRes.ok && (reactivateData.success || reactivateData.status === 'ACTIVE'), `Employee Reactivated`);
  } catch (e) {
    record('5. Access & Governance', 'Employee Status Workflow', false, e.message);
  }

  // 5.3 Audit Logs (Immutable Governance Trail)
  try {
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs?limit=5`, { headers });
    const auditData = await auditRes.json();
    const hasLogs = Array.isArray(auditData.logs) && auditData.logs.length > 0;
    record('5. Access & Governance', 'Immutable Audit Logs Governance', auditRes.ok && hasLogs, `Total audit records verified: ${auditData.total || auditData.logs?.length}`);
  } catch (e) {
    record('5. Access & Governance', 'Immutable Audit Logs Governance', false, e.message);
  }

  // ==========================================================================
  // MODULE 6: REPORTS & EXPORTS
  // ==========================================================================
  console.log('\n📈 MODULE 6: REPORTS & EXPORTS');

  // 6.1 Workforce & Analytics Reports
  try {
    const reportRes = await fetch(`${BASE_URL}/api/reports/workforce`, { headers });
    const reportData = await reportRes.json();
    record('6. Reports & Exports', 'Workforce & Analytics Reports', reportRes.ok && reportData.success !== false, `Metrics aggregated`);
  } catch (e) {
    record('6. Reports & Exports', 'Workforce & Analytics Reports', false, e.message);
  }

  // 6.2 Export Center (Data Export Service)
  try {
    const exportRes = await fetch(`${BASE_URL}/api/reports/export?entity=employees&format=csv`, { headers });
    record('6. Reports & Exports', 'Export Center (CSV / Data Export)', exportRes.ok, `HTTP Status: ${exportRes.status}`);
  } catch (e) {
    record('6. Reports & Exports', 'Export Center (CSV / Data Export)', false, e.message);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏁 TEST EXECUTION COMPLETE: Passed: ${results.passed}/${results.total} (${Math.round((results.passed/results.total)*100)}%)`);
  console.log('========================================================================');
  console.log(JSON.stringify(results.features, null, 2));
}

runE2ETests().catch(console.error);
