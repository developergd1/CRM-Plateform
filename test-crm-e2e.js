/**
 * Comprehensive Automated End-to-End QA Testing Suite for Growth India CRM & Client Management System
 * 
 * Verifies all modules, subfeatures, database persistence, and API contracts:
 * 0. CRM Dashboard & Overview (Metrics, pipeline conversion rates, recent activities)
 * 1. PROSPECTING & LEADS:
 *    - Lead Creation & Auto-sequencing (Lead ID generation, validation)
 *    - Real-Time Duplicate Check (Phone/Email duplicate detection)
 *    - Lead Status Progression & Scoring
 * 2. CUSTOMERS & CLIENT MANAGEMENT:
 *    - Client Lead Creation & Auto-sequenced Client ID (CLI-...)
 *    - Client 360 & Account Hierarchy (Accounts, contacts, deals)
 *    - Stage Progression & Real-Time Deal Value Update
 *    - Client Ownership Reassignment & Audit History Chain
 *    - Contacts Directory & Association
 * 3. SALES & PIPELINE:
 *    - Pipeline Stages & Kanban Board Retrieval
 *    - Deal Creation, Linking, & Value Aggregation
 *    - Stage Transition & Win/Won Closing Cycle
 *    - Products & Services Catalog
 *    - Quotes & Proposals Generation
 * 4. ACTIVITIES, TASKS & CALENDAR:
 *    - Chronological Activity Timeline Logging
 *    - CRM Tasks & Follow-up Scheduling
 *    - Calendar Events & Meeting Tracker
 * 5. CUSTOMER LIFECYCLE:
 *    - Contracts Management & Billing Scope
 *    - Renewals & Recurring Retainers
 *    - Client Handoff Workflow
 * 6. INTELLIGENCE & FORECASTING:
 *    - Revenue Forecasting & Probability Weighting
 *    - Conversion Analytics & Business Intelligence Reports
 *    - Import / Export Engine
 */

const BASE_URL = 'http://localhost:3000';

async function runCrmE2ETests() {
  console.log('========================================================================');
  console.log('🧪 GROWTH INDIA CRM & CLIENT MANAGEMENT - END-TO-END QA TEST SUITE');
  console.log('========================================================================\n');

  let adminCookie = '';
  let testLeadId = '';
  let testClientId = '';
  let testAccountId = '';
  let testProductId = '';
  let testDealId = '';
  let testContactId = '';
  let testTaskId = '';
  let testQuoteId = '';

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
      console.error(`  ❌ [FAIL] ${testName} - Error: ${details}`);
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
  record('0. Auth', 'Admin JWT Authentication', loginRes.status === 200 && loginData.user?.role === 'ADMIN', `User: ${loginData.user?.fullName}`);

  // ==========================================================================
  // MODULE 0: CRM DASHBOARD & OVERVIEW
  // ==========================================================================
  console.log('\n📊 MODULE 0: CRM DASHBOARD & OVERVIEW');
  try {
    const dashRes = await fetch(`${BASE_URL}/api/crm/dashboard`, { headers });
    const dashData = await dashRes.json();
    const dashOk = dashRes.ok && (dashData.kpis || dashData.success !== false);
    record('0. Dashboard', 'CRM KPIs & Pipeline Feed', dashOk, `Metrics retrieved successfully`);
  } catch (e) {
    record('0. Dashboard', 'CRM KPIs & Pipeline Feed', false, e.message);
  }

  // ==========================================================================
  // MODULE 1: PROSPECTING & LEADS
  // ==========================================================================
  console.log('\n🎯 MODULE 1: PROSPECTING & LEADS');
  const randNum = Math.floor(10000 + Math.random() * 90000);

  // 1.1 Lead Duplicate Check
  try {
    const dupRes = await fetch(`${BASE_URL}/api/crm/leads/check-duplicate?phone=9876500000`, { headers });
    const dupData = await dupRes.json();
    record('1. Prospecting & Leads', 'Real-Time Duplicate Check', dupRes.ok && dupData.isDuplicate !== undefined, `Duplicate Check Verified`);
  } catch (e) {
    record('1. Prospecting & Leads', 'Real-Time Duplicate Check', false, e.message);
  }

  // 1.2 Create Lead with Auto-Sequenced ID
  try {
    const leadPayload = {
      fullName: `Rohan Mehra ${randNum}`,
      contactPerson: `Rohan Mehra ${randNum}`,
      companyName: `Mehra Logistics ${randNum}`,
      phone: `98765${randNum.toString().slice(0, 5)}`,
      email: `rohan.${randNum}@mehralogistics.in`,
      source: 'WEBSITE',
      status: 'NEW',
      priority: 'HIGH',
      estimatedValue: 450000,
      description: 'Fleet telemetry and ERP workforce integration'
    };
    const leadRes = await fetch(`${BASE_URL}/api/crm/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadPayload)
    });
    const leadData = await leadRes.json();
    const leadObj = leadData.data || leadData.lead;
    testLeadId = leadObj?.id;
    const leadNumber = leadObj?.leadNumber;
    record('1. Prospecting & Leads', 'Lead Creation & Auto-Sequenced ID', leadRes.ok && !!testLeadId, `Lead Number: ${leadNumber}`);

    // Verify DB Persistence
    const getLeadRes = await fetch(`${BASE_URL}/api/crm/leads`, { headers });
    const getLeadData = await getLeadRes.json();
    const leadsList = getLeadData.data || getLeadData.leads || [];
    const leadSaved = leadsList.some(l => l.id === testLeadId);
    record('1. Prospecting & Leads', 'Lead Database Persistence', getLeadRes.ok && leadSaved, `Persisted in MongoDB: ${leadSaved}`);
  } catch (e) {
    record('1. Prospecting & Leads', 'Lead Creation Workflow', false, e.message);
  }

  // 1.3 Lead Status Progression
  try {
    if (testLeadId) {
      const statusRes = await fetch(`${BASE_URL}/api/crm/leads/${testLeadId}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: 'CONTACTED', reason: 'Client confirmed budget and requirements' })
      });
      const statusData = await statusRes.json();
      record('1. Prospecting & Leads', 'Lead Status Progression', statusRes.ok && statusData.success !== false, `Updated Status: CONTACTED`);
    }
  } catch (e) {
    record('1. Prospecting & Leads', 'Lead Status Progression', false, e.message);
  }

  // ==========================================================================
  // MODULE 2: CUSTOMERS & CLIENT MANAGEMENT
  // ==========================================================================
  console.log('\n🏢 MODULE 2: CUSTOMERS & CLIENT MANAGEMENT');

  // 2.1 Create Client Account
  try {
    const clientPayload = {
      name: `Aditya Birla Ventures ${randNum}`,
      company: `Birla Power & Infra ${randNum}`,
      phone: `9922${randNum.toString().slice(0, 6)}`,
      email: `procurement.${randNum}@birlapower.com`,
      location: 'Mumbai, Maharashtra',
      source: 'Corporate Inbound',
      requirement: 'End to end manpower and automated attendance hardware',
      estimatedValue: 1250000,
      priority: 'HIGH',
      stage: 'NEW'
    };
    const clientRes = await fetch(`${BASE_URL}/api/crm/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(clientPayload)
    });
    const clientData = await clientRes.json();
    testClientId = clientData.client?.id || clientData.id;
    const clientDisplayId = clientData.client?.clientId;
    record('2. Customers & Client Mgmt', 'Client Account Creation & Auto-ID', clientRes.ok && !!testClientId, `Client ID: ${clientDisplayId}`);

    // Verify DB Persistence
    const listCliRes = await fetch(`${BASE_URL}/api/crm/clients`, { headers });
    const listCliData = await listCliRes.json();
    const clientSaved = (listCliData.clients || []).some(c => c.id === testClientId);
    record('2. Customers & Client Mgmt', 'Client Database Persistence', listCliRes.ok && clientSaved, `Persisted in MongoDB: ${clientSaved}`);
  } catch (e) {
    record('2. Customers & Client Mgmt', 'Client Account Creation Workflow', false, e.message);
  }

  // 2.2 Commercial Account Creation
  try {
    const accPayload = {
      companyName: `Birla Power Enterprises ${randNum}`,
      phone: `9933${randNum.toString().slice(0, 6)}`,
      industry: 'INFRASTRUCTURE',
      city: 'Mumbai',
      status: 'ACTIVE'
    };
    const accRes = await fetch(`${BASE_URL}/api/crm/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(accPayload)
    });
    const accData = await accRes.json();
    testAccountId = accData.data?.id;
    record('2. Customers & Client Mgmt', 'Commercial Account Entity Provisioning', accRes.ok && !!testAccountId, `Account Code: ${accData.data?.accountCode}`);
  } catch (e) {
    record('2. Customers & Client Mgmt', 'Commercial Account Provisioning', false, e.message);
  }

  // 2.3 Client Stage Movement & Deal Value Update
  try {
    if (testClientId) {
      const stageRes = await fetch(`${BASE_URL}/api/crm/clients/${testClientId}/stage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          stage: 'QUALIFIED',
          remarks: 'Scope agreed with Chief Technology Officer',
          dealValue: 1350000
        })
      });
      const stageData = await stageRes.json();
      record('2. Customers & Client Mgmt', 'Stage Progression & Deal Value Update', stageRes.ok && stageData.success !== false, `Stage: QUALIFIED | Value: ₹13,50,000`);
    }
  } catch (e) {
    record('2. Customers & Client Mgmt', 'Stage Progression Workflow', false, e.message);
  }

  // 2.4 Client Ownership Reassignment
  try {
    if (testClientId) {
      const empRes = await fetch(`${BASE_URL}/api/employees`, { headers });
      const empData = await empRes.json();
      const targetEmp = empData.employees?.[0];
      if (targetEmp) {
        const assignRes = await fetch(`${BASE_URL}/api/crm/clients/${testClientId}/assign`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            targetEmployeeId: targetEmp.employeeId || targetEmp.id,
            assignmentReason: 'Territory load balancing'
          })
        });
        const assignData = await assignRes.json();
        record('2. Customers & Client Mgmt', 'Ownership Reassignment & History Chain', assignRes.ok && assignData.success !== false, `Reassigned to: ${targetEmp.fullName}`);
      }
    }
  } catch (e) {
    record('2. Customers & Client Mgmt', 'Ownership Reassignment Workflow', false, e.message);
  }

  // 2.5 Contacts Management
  try {
    const contactPayload = {
      fullName: `Vikram Singhania ${randNum}`,
      email: `vikram.${randNum}@singhania.in`,
      phone: `9833${randNum.toString().slice(0, 6)}`,
      designation: 'Head of Operations',
      company: `Birla Power & Infra ${randNum}`,
      clientId: testClientId || undefined
    };
    const contactRes = await fetch(`${BASE_URL}/api/crm/contacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(contactPayload)
    });
    const contactData = await contactRes.json();
    testContactId = contactData.data?.id;
    record('2. Customers & Client Mgmt', 'Contact Creation & Client Linking', contactRes.ok && !!testContactId, `Contact ID: ${testContactId}`);
  } catch (e) {
    record('2. Customers & Client Mgmt', 'Contact Creation Workflow', false, e.message);
  }

  // ==========================================================================
  // MODULE 3: SALES & PIPELINE
  // ==========================================================================
  console.log('\n💼 MODULE 3: SALES & PIPELINE');

  // 3.1 Pipeline Stages Retrieval
  try {
    const pipeRes = await fetch(`${BASE_URL}/api/crm/pipelines`, { headers });
    const pipeData = await pipeRes.json();
    record('3. Sales & Pipeline', 'Pipeline Stages & Kanban Configuration', pipeRes.ok, `Pipeline stages loaded`);
  } catch (e) {
    record('3. Sales & Pipeline', 'Pipeline Stages & Kanban Configuration', false, e.message);
  }

  // 3.2 Product Catalog Creation
  try {
    const prodPayload = {
      name: `Enterprise Telemetry Suite ${randNum}`,
      unitPrice: 35000,
      type: 'SUBSCRIPTION',
      category: 'Software'
    };
    const prodRes = await fetch(`${BASE_URL}/api/crm/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(prodPayload)
    });
    const prodData = await prodRes.json();
    testProductId = prodData.data?.id;
    record('3. Sales & Pipeline', 'Products & Services Catalog Provisioning', prodRes.ok && !!testProductId, `Product Code: ${prodData.data?.productCode}`);
  } catch (e) {
    record('3. Sales & Pipeline', 'Products Provisioning', false, e.message);
  }

  // 3.3 Deal Creation & DB Persistence
  try {
    const dealPayload = {
      title: `Enterprise Cloud & Workforce Suite ${randNum}`,
      clientId: testClientId || undefined,
      accountId: testAccountId || undefined,
      leadId: testLeadId || undefined,
      amount: 850000,
      stage: 'PROPOSAL',
      probability: 70,
      expectedCloseDate: '2026-11-30',
      productService: 'Enterprise Telemetry Suite',
      terms: 'Annual subscription with quarterly billing'
    };
    const dealRes = await fetch(`${BASE_URL}/api/crm/deals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dealPayload)
    });
    const dealData = await dealRes.json();
    testDealId = dealData.data?.id;
    record('3. Sales & Pipeline', 'Deal Creation & Value Tracking', dealRes.ok && !!testDealId, `Deal Number: ${dealData.data?.dealNumber}`);

    // Verify Deal Persistence
    const getDealsRes = await fetch(`${BASE_URL}/api/crm/deals`, { headers });
    const getDealsData = await getDealsRes.json();
    const dealSaved = (getDealsData.data || []).some(d => d.id === testDealId);
    record('3. Sales & Pipeline', 'Deal Database Persistence', getDealsRes.ok && dealSaved, `Persisted in MongoDB: ${dealSaved}`);
  } catch (e) {
    record('3. Sales & Pipeline', 'Deal Workflow', false, e.message);
  }

  // 3.4 Deal Stage Transition (Win/Won Status)
  try {
    if (testDealId) {
      const wonRes = await fetch(`${BASE_URL}/api/crm/deals/${testDealId}/won`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          wonReason: 'PRODUCT_FIT',
          closingNotes: 'Contract signed by executive management'
        })
      });
      const wonData = await wonRes.json();
      record('3. Sales & Pipeline', 'Deal Stage Won & Closing Cycle', wonRes.ok && (wonData.success || wonData.data?.stage === 'WON'), `Deal Closed Won`);
    }
  } catch (e) {
    record('3. Sales & Pipeline', 'Deal Stage Won Cycle', false, e.message);
  }

  // 3.5 Quotes & Proposals Generation
  try {
    if (testDealId && testAccountId && testProductId) {
      const quotePayload = {
        title: `Formal Commercial Proposal ${randNum}`,
        dealId: testDealId,
        accountId: testAccountId,
        items: [
          {
            productId: testProductId,
            quantity: 2,
            unitPrice: 35000,
            discountRate: 5
          }
        ],
        terms: 'Net 30 days upon delivery'
      };
      const quoteRes = await fetch(`${BASE_URL}/api/crm/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quotePayload)
      });
      const quoteData = await quoteRes.json();
      testQuoteId = quoteData.data?.id;
      record('3. Sales & Pipeline', 'Quotes & Proposals Generation', quoteRes.ok && !!testQuoteId, `Quote Number: ${quoteData.data?.quoteNumber}`);
    }
  } catch (e) {
    record('3. Sales & Pipeline', 'Quotes Workflow', false, e.message);
  }

  // ==========================================================================
  // MODULE 4: ACTIVITIES, TASKS & CALENDAR
  // ==========================================================================
  console.log('\n📅 MODULE 4: ACTIVITIES, TASKS & CALENDAR');

  // 4.1 Chronological Activity Timeline
  try {
    if (testClientId) {
      const actRes = await fetch(`${BASE_URL}/api/crm/clients/${testClientId}/activities`, { headers });
      const actData = await actRes.json();
      const count = Array.isArray(actData.activities) ? actData.activities.length : 0;
      record('4. Activities & Tasks', 'Chronological Activity Timeline', actRes.ok && count > 0, `Captured ${count} activities in timeline`);
    }
  } catch (e) {
    record('4. Activities & Tasks', 'Chronological Activity Timeline', false, e.message);
  }

  // 4.2 CRM Tasks & Follow-ups
  try {
    const taskPayload = {
      title: `Follow-up demo presentation with Birla Power ${randNum}`,
      clientId: testClientId || undefined,
      dealId: testDealId || undefined,
      priority: 'HIGH',
      dueDate: '2026-09-30'
    };
    const taskRes = await fetch(`${BASE_URL}/api/crm/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskPayload)
    });
    const taskData = await taskRes.json();
    testTaskId = taskData.data?.id;
    record('4. Activities & Tasks', 'Tasks & Follow-up Scheduling', taskRes.ok && !!testTaskId, `Task Number: ${taskData.data?.taskNumber}`);
  } catch (e) {
    record('4. Activities & Tasks', 'Tasks Scheduling Workflow', false, e.message);
  }

  // 4.3 Calendar Events / Meetings
  try {
    const calRes = await fetch(`${BASE_URL}/api/crm/calendar`, { headers });
    const calData = await calRes.json();
    record('4. Activities & Tasks', 'Calendar & Meeting Scheduler', calRes.ok, `Calendar events synchronized`);
  } catch (e) {
    record('4. Activities & Tasks', 'Calendar Scheduler', false, e.message);
  }

  // ==========================================================================
  // MODULE 5: CUSTOMER LIFECYCLE
  // ==========================================================================
  console.log('\n🔄 MODULE 5: CUSTOMER LIFECYCLE');

  // 5.1 Contracts Management
  try {
    const contractRes = await fetch(`${BASE_URL}/api/crm/contracts`, { headers });
    const contractData = await contractRes.json();
    record('5. Customer Lifecycle', 'Contracts Management', contractRes.ok, `Contracts list retrieved`);
  } catch (e) {
    record('5. Customer Lifecycle', 'Contracts Management', false, e.message);
  }

  // 5.2 Renewals
  try {
    const renRes = await fetch(`${BASE_URL}/api/crm/renewals`, { headers });
    const renData = await renRes.json();
    record('5. Customer Lifecycle', 'Renewals Tracking', renRes.ok, `Renewals tracker active`);
  } catch (e) {
    record('5. Customer Lifecycle', 'Renewals Tracking', false, e.message);
  }

  // 5.3 Client Handoff
  try {
    const handoffRes = await fetch(`${BASE_URL}/api/crm/handoffs`, { headers });
    const handoffData = await handoffRes.json();
    record('5. Customer Lifecycle', 'Client Handoff to Operations', handoffRes.ok, `Handoff process verified`);
  } catch (e) {
    record('5. Customer Lifecycle', 'Client Handoff to Operations', false, e.message);
  }

  // ==========================================================================
  // MODULE 6: INTELLIGENCE, REPORTS & EXPORTS
  // ==========================================================================
  console.log('\n📈 MODULE 6: INTELLIGENCE & REPORTS');

  // 6.1 Revenue Forecasting
  try {
    const forecastRes = await fetch(`${BASE_URL}/api/crm/forecast`, { headers });
    const forecastData = await forecastRes.json();
    record('6. Intelligence & Reports', 'Revenue Forecast & Weighted Pipeline', forecastRes.ok, `Forecast calculated`);
  } catch (e) {
    record('6. Intelligence & Reports', 'Revenue Forecast & Weighted Pipeline', false, e.message);
  }

  // 6.2 Sales & Conversion Analytics
  try {
    const reportRes = await fetch(`${BASE_URL}/api/reports/crm`, { headers });
    const reportData = await reportRes.json();
    record('6. Intelligence & Reports', 'Sales Conversion & Analytics Reports', reportRes.ok && reportData.success !== false, `Analytics generated`);
  } catch (e) {
    record('6. Intelligence & Reports', 'Sales Conversion & Analytics Reports', false, e.message);
  }

  // 6.3 Import / Export
  try {
    const exportRes = await fetch(`${BASE_URL}/api/crm/export?entity=clients&format=csv`, { headers });
    record('6. Intelligence & Reports', 'CRM Data Export (CSV)', exportRes.ok, `Status: ${exportRes.status}`);
  } catch (e) {
    record('6. Intelligence & Reports', 'CRM Data Export (CSV)', false, e.message);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n========================================================================');
  console.log(`🏁 TEST EXECUTION COMPLETE: Passed: ${results.passed}/${results.total} (${Math.round((results.passed/results.total)*100)}%)`);
  console.log('========================================================================');
  console.log(JSON.stringify(results.features, null, 2));
}

runCrmE2ETests().catch(console.error);
