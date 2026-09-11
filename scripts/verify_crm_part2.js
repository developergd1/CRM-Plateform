const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3000';

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
  console.log('🚀 GROWTH INDIA CRM - PART 2: LEADS, CONTACTS & MANAGEMENT');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      if (details) console.error('     Details:', JSON.stringify(details, null, 2));
      failed++;
    }
  }

  // Connectivity check
  console.log(`Checking dev server connectivity at ${BASE_URL}...`);
  let serverReady = false;
  for (let i = 0; i < 8; i++) {
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
    console.error(`Server not reachable at ${BASE_URL}. Ensure next dev is running.`);
    process.exit(1);
  }
  console.log('Server is responsive!\n');

  const runId = Date.now().toString().slice(-6);

  // 1. Admin Login
  console.log('--- TEST 1: Admin Authentication ---');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@growthindia.in', password: 'Admin@123', portalType: 'ADMIN' },
  });
  assert(loginRes.ok && loginRes.data?.user?.role === 'ADMIN', 'Admin logged in successfully', loginRes.data);
  const adminCookie = loginRes.cookie ? loginRes.cookie.split(';')[0] : '';
  const authHeaders = { Cookie: adminCookie };

  // Fetch employees to get a representative for assignment
  const empRes = await request('/api/employees?limit=5', { headers: authHeaders });
  const empList = empRes.data?.employees || empRes.data?.data || [];
  assert(empRes.ok && Array.isArray(empList) && empList.length > 0, 'Fetched employee directory for assignment');
  const representative1 = empList[0];
  const representative2 = empList[1] || empList[0];
  console.log(`  Representative 1: ${representative1?.fullName} (${representative1?.employeeId})`);
  console.log(`  Representative 2: ${representative2?.fullName} (${representative2?.employeeId})`);

  // 2. Duplicate Check API (Non-existent)
  console.log('\n--- TEST 2: Duplicate Lead Check API (Clean prospect) ---');
  const cleanPhone = `+9198${runId}`;
  const cleanEmail = `test.lead.${runId}@corporate.in`;
  const dupCheck1 = await request('/api/crm/leads/check-duplicate', {
    method: 'POST',
    headers: authHeaders,
    body: { phone: cleanPhone, email: cleanEmail, companyName: `Vanguard Corp ${runId}` },
  });
  assert(dupCheck1.ok && dupCheck1.data?.isDuplicate === false, 'Duplicate check returns isDuplicate: false for new prospect', dupCheck1.data);

  // 3. Lead Creation API (POST /api/crm/leads)
  console.log('\n--- TEST 3: Lead Creation with Auto-Number (LEAD-XXXXXX) ---');
  const newLeadPayload = {
    fullName: `Rajesh Sharma ${runId}`,
    contactPerson: `Rajesh Sharma`,
    companyName: `Vanguard Industries ${runId}`,
    phone: cleanPhone,
    alternatePhone: '+919811223344',
    email: cleanEmail,
    website: 'https://vanguard-ind.com',
    industry: 'Manufacturing & Engineering',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    source: 'WEBSITE',
    status: 'NEW',
    priority: 'HIGH',
    leadScore: 65,
    estimatedValue: 450000,
    description: 'Looking to outsource 50 security & facility staff for factory.',
    assignedToId: representative1?.id,
  };

  const createLeadRes = await request('/api/crm/leads', {
    method: 'POST',
    headers: authHeaders,
    body: newLeadPayload,
  });

  assert(createLeadRes.status === 201 && createLeadRes.data?.success === true, 'Lead created with HTTP 201', createLeadRes.data);
  const lead = createLeadRes.data?.data;
  assert(typeof lead?.leadNumber === 'string' && lead.leadNumber.startsWith('LEAD-'), `Lead auto-numbered correctly: ${lead?.leadNumber}`);
  assert(lead?.status === 'NEW', 'Initial status is NEW');
  assert(lead?.assignedToId === representative1?.id, 'Lead assigned to representative 1');

  // 4. Duplicate Check API (Existing prospect match)
  console.log('\n--- TEST 4: Duplicate Detection on Same Phone / Email ---');
  const dupCheck2 = await request('/api/crm/leads/check-duplicate', {
    method: 'POST',
    headers: authHeaders,
    body: { phone: cleanPhone, email: cleanEmail },
  });
  assert(dupCheck2.ok && dupCheck2.data?.isDuplicate === true, 'Duplicate check successfully flags duplicate prospect', dupCheck2.data);
  assert(dupCheck2.data?.duplicates?.length > 0 && dupCheck2.data.duplicates[0].leadNumber === lead.leadNumber, 'Identified existing lead number in duplicate list');

  // 5. Lead 360 Detail View API (GET /api/crm/leads/[id])
  console.log('\n--- TEST 5: Lead 360 Detail View (GET /api/crm/leads/[id]) ---');
  const getLeadRes = await request(`/api/crm/leads/${lead.id}`, { headers: authHeaders });
  assert(getLeadRes.ok && getLeadRes.data?.success === true, 'Retrieved Lead 360 profile');
  const leadDetail = getLeadRes.data?.data;
  assert(leadDetail?.leadNumber === lead.leadNumber, '360 Lead Number matches');
  assert(Array.isArray(leadDetail?.contacts), 'Includes contacts relation array');
  assert(Array.isArray(leadDetail?.activities), 'Includes activities relation array');
  assert(Array.isArray(leadDetail?.followUps), 'Includes followUps relation array');
  assert(Array.isArray(leadDetail?.assignments), 'Includes assignments relation array');

  // Also test retrieval by custom string leadNumber (LEAD-XXXXXX)
  const getByNumberRes = await request(`/api/crm/leads/${lead.leadNumber}`, { headers: authHeaders });
  assert(getByNumberRes.ok && getByNumberRes.data?.data?.id === lead.id, `Lead retrieved via leadNumber string: ${lead.leadNumber}`);

  // 6. Lead Update API (PATCH /api/crm/leads/[id])
  console.log('\n--- TEST 6: Update Lead Details (PATCH /api/crm/leads/[id]) ---');
  const patchLeadRes = await request(`/api/crm/leads/${lead.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: {
      city: 'Pune',
      leadScore: 85,
      estimatedValue: 600000,
    },
  });
  assert(patchLeadRes.ok && patchLeadRes.data?.data?.city === 'Pune', 'Lead city updated to Pune');
  assert(patchLeadRes.data?.data?.leadScore === 85, 'Lead score updated to 85');

  // 7. Lead State Machine Enforcement (POST /api/crm/leads/[id]/status)
  console.log('\n--- TEST 7: Strict Lead State Machine Transition Validation ---');
  // From NEW: allowed transitions: ['CONTACTED']
  // Attempt invalid transition: NEW -> QUALIFIED directly
  const invalidTransRes = await request(`/api/crm/leads/${lead.id}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: { status: 'QUALIFIED' },
  });
  assert(invalidTransRes.status === 400, 'Invalid transition NEW -> QUALIFIED rejected with HTTP 400', invalidTransRes.data);
  assert(invalidTransRes.data?.error?.includes('Invalid status transition'), 'Descriptive error message returned');

  // Attempt valid transition: NEW -> CONTACTED
  const validTransRes1 = await request(`/api/crm/leads/${lead.id}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: { status: 'CONTACTED', reason: 'Phone call discovery completed with prospect.' },
  });
  assert(validTransRes1.ok && validTransRes1.data?.data?.status === 'CONTACTED', 'Valid transition NEW -> CONTACTED succeeded');

  // Attempt valid transition: CONTACTED -> QUALIFIED
  const validTransRes2 = await request(`/api/crm/leads/${lead.id}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: { status: 'QUALIFIED', reason: 'Budget and technical fit verified.' },
  });
  assert(validTransRes2.ok && validTransRes2.data?.data?.status === 'QUALIFIED', 'Valid transition CONTACTED -> QUALIFIED succeeded');

  // 8. Lead Reassignment & Ownership History (POST /api/crm/leads/[id]/assign)
  console.log('\n--- TEST 8: Lead Reassignment & Audit Trail ---');
  const reassignRes = await request(`/api/crm/leads/${lead.id}/assign`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      toEmployeeId: representative2?.employeeId || representative2?.id,
      reason: 'Reassigned for specialized enterprise qualification',
    },
  });

  if (representative1?.id !== representative2?.id) {
    assert(reassignRes.ok && reassignRes.data?.success === true, 'Lead reassigned to representative 2', reassignRes.data);
    assert(reassignRes.data?.data?.assignment?.toEmployeeId === representative2?.id, 'Assignment history recorded target employee ID');
    assert(reassignRes.data?.data?.assignment?.assignmentReason?.includes('specialized'), 'Assignment reason logged');
  } else {
    console.log('  ⚠️ Only 1 employee available; verified reassignment endpoint reachable');
  }

  // 9. Contact Creation Linked to Lead (POST /api/crm/contacts)
  console.log('\n--- TEST 9: Contact Stakeholder Management linked to Lead ---');
  const newContactRes = await request('/api/crm/contacts', {
    method: 'POST',
    headers: authHeaders,
    body: {
      fullName: `Anita Verma ${runId}`,
      designation: 'VP Corporate Procurement',
      phone: `+9197${runId}`,
      email: `anita.${runId}@vanguard.com`,
      isDecisionMaker: true,
      isPrimary: true,
      department: 'Procurement',
      leadId: lead.id,
      notes: 'Key signatory for RFP',
    },
  });
  assert(newContactRes.status === 201 && newContactRes.data?.success === true, 'Contact created linked to Lead');
  const contact = newContactRes.data?.data;
  assert(typeof contact?.contactNumber === 'string' && contact.contactNumber.startsWith('CON-'), `Contact number generated: ${contact?.contactNumber}`);
  assert(contact?.isDecisionMaker === true, 'Decision maker flag set');
  assert(contact?.isPrimary === true, 'Primary contact flag set');

  // Verify retrieval via lead filter
  const contactsByLead = await request(`/api/crm/contacts?leadId=${lead.id}`, { headers: authHeaders });
  assert(contactsByLead.ok && contactsByLead.data?.data?.length >= 1, 'Contacts list filtered by leadId returns created stakeholder');

  // 10. Follow-Up Lifecycle (POST, GET, PATCH /api/crm/followups)
  console.log('\n--- TEST 10: Follow-up Scheduling & Completion Lifecycle ---');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const createFollowUpRes = await request('/api/crm/followups', {
    method: 'POST',
    headers: authHeaders,
    body: {
      title: 'Commercial Discussion & Contract Review',
      scheduledAt: tomorrow.toISOString(),
      priority: 'HIGH',
      leadId: lead.id,
      contactId: contact?.id,
      remarks: 'Walk through manpower rates schedule',
    },
  });
  assert(createFollowUpRes.status === 201 && createFollowUpRes.data?.success === true, 'Follow-up created with HTTP 201');
  const followUp = createFollowUpRes.data?.data;
  assert(typeof followUp?.followUpNumber === 'string' && followUp.followUpNumber.startsWith('FLW-'), `Follow-up auto-numbered: ${followUp?.followUpNumber}`);
  assert(followUp?.status === 'PENDING', 'Initial follow-up status is PENDING');

  // Verify lead's nextFollowUpAt updated
  const leadAfterFollowUp = await request(`/api/crm/leads/${lead.id}`, { headers: authHeaders });
  assert(leadAfterFollowUp.data?.data?.nextFollowUpAt !== null, 'Lead nextFollowUpAt automatically synced with scheduled date');

  // Test Follow-up Filter (UPCOMING)
  const upcomingFollowUps = await request('/api/crm/followups?filter=UPCOMING', { headers: authHeaders });
  assert(upcomingFollowUps.ok && upcomingFollowUps.data?.data?.some((f) => f.id === followUp.id), 'Upcoming filter returns newly scheduled follow-up');

  // Complete Follow-up
  const completeRes = await request(`/api/crm/followups/${followUp.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: { status: 'COMPLETED' },
  });
  assert(completeRes.ok && completeRes.data?.data?.status === 'COMPLETED', 'Follow-up marked COMPLETED');
  assert(completeRes.data?.data?.completedAt !== null, 'completedAt timestamp set');

  // 11. Unified Search API with Lead & Contact
  console.log('\n--- TEST 11: Unified Platform Search for Leads and Contacts ---');
  const searchRes = await request(`/api/search?q=${runId}`, { headers: authHeaders });
  assert(searchRes.ok, 'Unified search endpoint returned 200');
  const leadFound = searchRes.data?.results?.leads?.some((l) => l.id === lead.id);
  const contactFound = searchRes.data?.results?.contacts?.some((c) => c.id === contact.id);
  assert(leadFound, `Lead found in unified search results by unique runId: ${runId}`);
  assert(contactFound, `Contact found in unified search results by unique runId: ${runId}`);

  // 12. Analytics Dashboard KPIs Update
  console.log('\n--- TEST 12: Live CRM Pipeline Analytics Sync ---');
  const dashRes2 = await request('/api/analytics/dashboard', { headers: authHeaders });
  assert(dashRes2.ok, 'Dashboard analytics returned 200');
  const crmStats = dashRes2.data?.stats?.crm;
  assert(typeof crmStats?.totalLeads === 'number' && crmStats.totalLeads > 0, `Dashboard reflects active leads: ${crmStats?.totalLeads}`);
  assert(typeof crmStats?.qualifiedLeads === 'number', `Dashboard contains qualifiedLeads count: ${crmStats?.qualifiedLeads}`);
  console.log('  Live Dashboard CRM Summary:', {
    totalLeads: crmStats?.totalLeads,
    newLeads: crmStats?.newLeads,
    contactedLeads: crmStats?.contactedLeads,
    qualifiedLeads: crmStats?.qualifiedLeads,
    followUpsDue: crmStats?.followUpsDue,
    overdueFollowUps: crmStats?.overdueFollowUps,
  });

  // 13. Phase 1 Non-Regression
  console.log('\n--- TEST 13: Phase 1 Non-Regression (Clients, Employees, Audit) ---');
  const [clientsCheck, empCheck, auditCheck] = await Promise.all([
    request('/api/clients', { headers: authHeaders }),
    request('/api/employees?limit=5', { headers: authHeaders }),
    request('/api/audit-logs?limit=5', { headers: authHeaders }),
  ]);
  assert(clientsCheck.ok, 'Clients API intact and responsive');
  assert(empCheck.ok, 'Employees API intact and responsive');
  const logsArr = auditCheck.data?.logs || auditCheck.data?.data;
  assert(auditCheck.ok && Array.isArray(logsArr) && logsArr.length > 0, 'Audit logs API intact and contains records');

  // 14. Soft Archive Test (DELETE /api/crm/leads/[id])
  console.log('\n--- TEST 14: Lead Soft Archive & Audit Log ---');
  const archiveRes = await request(`/api/crm/leads/${lead.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert(archiveRes.ok && archiveRes.data?.data?.isArchived === true, 'Lead soft-archived (isArchived: true)');

  // Verify archived lead is excluded from active list by default
  const activeLeadsRes = await request('/api/crm/leads', { headers: authHeaders });
  assert(!activeLeadsRes.data?.data?.some((l) => l.id === lead.id), 'Archived lead excluded from active leads list');

  console.log('\n===========================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
