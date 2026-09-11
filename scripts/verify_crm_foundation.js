const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3001';

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
  console.log('===========================================================');
  console.log('🚀 GROWTH INDIA CRM - PART 1 ARCHITECTURE & VERIFICATION');
  console.log('===========================================================\n');

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

  // 1. Warmup / Check Server
  console.log('Checking dev server connectivity at ' + BASE_URL + '...');
  let serverReady = false;
  for (let i = 0; i < 6; i++) {
    try {
      const ping = await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'admin@growthindia.in', password: 'Admin@123', portalType: 'ADMIN' },
      });
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!serverReady) {
    console.error('Server not reachable at ' + BASE_URL);
    process.exit(1);
  }
  console.log('Server is responsive!\n');

  const runId = Date.now().toString().slice(-5);

  // STEP 1: Admin Login
  console.log('--- TEST 1: Admin Authentication ---');
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@growthindia.in', password: 'Admin@123', portalType: 'ADMIN' },
  });
  assert(adminLogin.ok && adminLogin.data?.user?.role === 'ADMIN', 'Admin logged in successfully');
  const adminCookie = adminLogin.cookie?.split(';')[0];

  // STEP 2: Executive Dashboard Stats (Workforce + CRM KPIs)
  console.log('\n--- TEST 2: Executive Dashboard Analytics with Live CRM KPIs ---');
  const dashRes = await request('/api/analytics/dashboard', {
    headers: { Cookie: adminCookie },
  });
  assert(dashRes.ok, 'Dashboard analytics returned 200');
  assert(dashRes.data?.stats?.totalClients !== undefined, 'Contains totalClients');
  assert(dashRes.data?.stats?.crm !== undefined, 'Contains CRM stats object');
  assert(typeof dashRes.data?.stats?.crm?.totalLeads === 'number', 'CRM totalLeads is numeric');
  assert(typeof dashRes.data?.stats?.crm?.pipelineValue === 'number', 'CRM pipelineValue is numeric');
  console.log('  Live CRM Pipeline Stats:', dashRes.data?.stats?.crm);

  // STEP 3: Create Client (CLI-XXXXX)
  console.log('\n--- TEST 3: Create Client Organization (CLI-XXXXX) ---');
  const clientRes = await request('/api/clients', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      companyName: `Apex Enterprise ${runId}`,
      contactPerson: 'Sunil Mehta',
      mobile: `+91 97${runId}01`,
      email: `apex_${runId}@growthindia.test`,
      industry: 'Finance & Banking',
      address: 'Nariman Point, Mumbai',
      canBlockEmployees: true,
      canDeleteEmployees: false,
    },
  });
  assert(clientRes.ok, 'Client creation succeeded');
  const createdClient = clientRes.data?.client;
  assert(createdClient?.clientId?.startsWith('CLI-'), `Generated Client ID: ${createdClient?.clientId}`);

  // STEP 4: Create Lead (LEAD-XXXXXX)
  console.log('\n--- TEST 4: Create Inbound CRM Lead ---');
  const leadRes = await request('/api/crm/leads', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      fullName: `Harish Verma ${runId}`,
      companyName: `Verma Logistics Ltd`,
      phone: `+91 98${runId}22`,
      email: `harish_${runId}@vermalogistics.test`,
      source: 'WEBSITE',
      status: 'QUALIFIED',
      estimatedValue: 750000,
      clientId: createdClient?.clientId,
    },
  });
  assert(leadRes.ok, 'Lead created successfully');
  const createdLead = leadRes.data?.data;
  assert(createdLead?.leadNumber?.startsWith('LEAD-'), `Generated Lead ID: ${createdLead?.leadNumber}`);
  assert(createdLead?.estimatedValue === 750000, 'Estimated value recorded accurately');

  // STEP 5: Create Contact (CON-XXXXXX)
  console.log('\n--- TEST 5: Create Corporate Contact for Organization ---');
  const contactRes = await request('/api/crm/contacts', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      fullName: 'Sunil Mehta (VP Procurement)',
      designation: 'VP Procurement',
      email: `sunil_${runId}@apex.test`,
      phone: `+91 97${runId}01`,
      isPrimary: true,
      clientId: createdClient?.clientId,
    },
  });
  assert(contactRes.ok, 'Contact created successfully');
  const createdContact = contactRes.data?.data;
  assert(createdContact?.contactNumber?.startsWith('CON-'), `Generated Contact ID: ${createdContact?.contactNumber}`);

  // STEP 6: Create Pipeline Opportunity (OPP-XXXXXX)
  console.log('\n--- TEST 6: Create Pipeline Opportunity ---');
  const oppRes = await request('/api/crm/opportunities', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      title: 'Q4 Enterprise Staffing Package (50 FTEs)',
      value: 1500000,
      stage: 'PROPOSAL',
      probability: 60,
      clientId: createdClient?.clientId,
      primaryContactId: createdContact?.id,
    },
  });
  assert(oppRes.ok, 'Opportunity created successfully');
  const createdOpp = oppRes.data?.data;
  assert(createdOpp?.opportunityNumber?.startsWith('OPP-'), `Generated Opportunity ID: ${createdOpp?.opportunityNumber}`);
  assert(createdOpp?.value === 1500000, 'Opportunity value correctly recorded');

  // STEP 7: Create Deal (DEAL-XXXXXX)
  console.log('\n--- TEST 7: Create Signed Deal ---');
  const dealRes = await request('/api/crm/deals', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      title: 'Annual Security & Workforce Deployment Contract',
      amount: 1800000,
      status: 'ACTIVE',
      clientId: createdClient?.id || createdClient?.clientId,
      opportunityId: createdOpp?.id,
    },
  });
  if (!dealRes.ok) {
    console.error('  Deal creation failed:', dealRes.data);
  }
  assert(dealRes.ok, 'Deal created successfully');
  const createdDeal = dealRes.data?.data;
  assert(createdDeal?.dealNumber?.startsWith('DEAL-'), `Generated Deal ID: ${createdDeal?.dealNumber}`);

  // STEP 8: Log Activity (ACT-XXXXXX)
  console.log('\n--- TEST 8: Log CRM Activity Interaction ---');
  const actRes = await request('/api/crm/activities', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      type: 'MEETING',
      subject: 'Contract signing & SLA finalization demo',
      durationMinutes: 45,
      clientId: createdClient?.clientId,
      dealId: createdDeal?.id,
    },
  });
  assert(actRes.ok, 'Activity logged successfully');
  const createdAct = actRes.data?.data;
  assert(createdAct?.activityNumber?.startsWith('ACT-'), `Generated Activity ID: ${createdAct?.activityNumber}`);

  // STEP 9: Create Generalized CRM Task (TSK-XXXXXX)
  console.log('\n--- TEST 9: Create CRM Task ---');
  const taskRes = await request('/api/crm/tasks/v2', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      title: 'Prepare onboarding documentation & badge allocation',
      priority: 'HIGH',
      status: 'PENDING',
      clientId: createdClient?.clientId,
      dealId: createdDeal?.id,
    },
  });
  assert(taskRes.ok, 'CRM Task created successfully');
  const createdTask = taskRes.data?.data;
  assert(createdTask?.taskNumber?.startsWith('TSK-'), `Generated Task ID: ${createdTask?.taskNumber}`);

  // STEP 10: Global Unified Search API
  console.log('\n--- TEST 10: Global Unified Search API ---');
  const searchRes = await request(`/api/search?q=${encodeURIComponent(runId)}`, {
    headers: { Cookie: adminCookie },
  });
  assert(searchRes.ok, 'Search API returned 200');
  assert(searchRes.data?.totalMatches > 0, `Search matched ${searchRes.data?.totalMatches} records across entities`);
  console.log('  Search results found across:', Object.keys(searchRes.data?.results || {}).filter(k => searchRes.data.results[k].length > 0));

  // STEP 11: Client 360 Architecture API Verification
  console.log('\n--- TEST 11: Client 360 Details with Unified CRM & Workforce Relations ---');
  const clientDetailRes = await request(`/api/crm/clients/${createdClient?.clientId}`, {
    headers: { Cookie: adminCookie },
  });
  assert(clientDetailRes.ok, 'Client 360 detail API returned 200');
  const detail = clientDetailRes.data?.client;
  assert(detail?.contacts?.length > 0, `360 loaded ${detail?.contacts?.length} contacts`);
  assert(detail?.opportunities?.length > 0, `360 loaded ${detail?.opportunities?.length} opportunities`);
  assert(detail?.deals?.length > 0, `360 loaded ${detail?.deals?.length} deals`);

  // STEP 12: Employee Onboarding & Block/Unblock Continuity Check
  console.log('\n--- TEST 12: Employee Onboarding & Block Control Continuity ---');
  const uniqueEmpPhone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
  const empRes = await request('/api/employees', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      fullName: `Kavita Sen ${runId}`,
      phone: uniqueEmpPhone,
      personalEmail: `kavita_${runId}@gmail.test`,
      designation: 'Account Manager',
      departmentName: 'Client Operations',
      employmentType: 'Full-Time',
      jobLocation: 'Headquarters',
      clientId: createdClient?.id || createdClient?.clientId,
    },
  });
  if (!empRes.ok) {
    console.error('  Employee onboarding failed:', empRes.data);
  }
  assert(empRes.ok, 'Employee onboarded successfully');
  const createdEmp = empRes.data?.employee;
  assert(createdEmp?.employeeId?.startsWith('GI-EMP-'), `Generated Employee ID: ${createdEmp?.employeeId}`);

  // Block employee (passing ObjectId or EmployeeId)
  const targetEmpId = createdEmp?.id || createdEmp?.employeeId;
  const blockRes = await request(`/api/employees/${targetEmpId}/block`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { reason: 'Compliance Audit Review', remarks: 'Routine check' },
  });
  if (!blockRes.ok) {
    console.error('  Block failed:', blockRes.data);
  }
  assert(blockRes.ok, 'Employee blocked successfully with reason');

  // Unblock employee
  const unblockRes = await request(`/api/employees/${targetEmpId}/unblock`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { reason: 'Compliance Cleared', remarks: 'Ready for active shift' },
  });
  if (!unblockRes.ok) {
    console.error('  Unblock failed:', unblockRes.data);
  }
  assert(unblockRes.ok, 'Employee unblocked successfully');

  console.log('\n===========================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
