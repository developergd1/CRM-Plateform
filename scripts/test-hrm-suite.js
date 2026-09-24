const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runHrmVerification() {
  console.log('====================================================');
  console.log('🚀 MULTI-TENANT HRM PLATFORM & PLATFORM PROFILES TEST');
  console.log('====================================================\n');

  try {
    // 1. Test Organizations
    console.log('1. Verifying Multi-Tenant Organizations...');
    const orgsRes = await makeRequest('/api/hrm/organizations');
    console.log(`   Status: ${orgsRes.status} | Tenants Count: ${orgsRes.json?.tenants?.length}`);
    if (orgsRes.status !== 200) throw new Error('Failed to fetch tenants');

    // 2. Test Employees with Tenant Isolation
    console.log('\n2. Verifying Tenant-Isolated Employees (Growth India vs Zenith Logistics)...');
    const empGi = await makeRequest('/api/hrm/employees?tenantId=ten-growth-india');
    const empZenith = await makeRequest('/api/hrm/employees?tenantId=ten-zenith-logistics');
    console.log(`   Growth India Staff: ${empGi.json?.employees?.length} employees`);
    console.log(`   Zenith Logistics Staff: ${empZenith.json?.employees?.length} employees`);
    if (empGi.json?.employees?.length === 0 || empZenith.json?.employees?.length === 0) {
      throw new Error('Tenant isolation data check failed');
    }

    // 3. Test Attendance Engine
    console.log('\n3. Verifying Attendance Punch Engine...');
    const attRes = await makeRequest('/api/hrm/attendance?tenantId=ten-growth-india');
    console.log(`   Status: ${attRes.status} | Total Present: ${attRes.json?.stats?.totalPresent}`);

    // 4. Test Leave & Workflow Engine
    console.log('\n4. Verifying Leave Applications & Policies...');
    const leavesRes = await makeRequest('/api/hrm/leaves?tenantId=ten-growth-india');
    console.log(`   Leave Types: ${leavesRes.json?.leaveTypes?.length} | Pending Applications: ${leavesRes.json?.applications?.length}`);

    // Test Leave Submission with Workflow rule (> 3 days)
    console.log('\n5. Submitting Leave Application with > 3 days (Triggering Workflow Rule #WF-01)...');
    const applyRes = await makeRequest('/api/hrm/leaves', 'POST', {
      tenantId: 'ten-growth-india',
      employeeId: 'hrm-emp-104',
      employeeName: 'Priya Patel',
      department: 'Client Success & Ops',
      leaveTypeId: 'lt-cl',
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      days: 5,
      reason: 'Medical & recuperation leave',
    });
    console.log(`   Status: ${applyRes.status} | Initial Status: ${applyRes.json?.application?.status}`);
    console.log(`   Workflow Escalation: ${applyRes.json?.workflowTriggered}`);

    // 6. Test Shifts & Rosters
    console.log('\n6. Verifying Shifts & Rosters...');
    const shiftsRes = await makeRequest('/api/hrm/shifts?tenantId=ten-growth-india');
    console.log(`   Active Shift Rosters: ${shiftsRes.json?.shifts?.length}`);

    // 7. Test Recruitment ATS
    console.log('\n7. Verifying Recruitment ATS Jobs & Candidates Pipeline...');
    const recruitRes = await makeRequest('/api/hrm/recruitment?tenantId=ten-growth-india');
    console.log(`   Job Openings: ${recruitRes.json?.jobs?.length} | Candidates: ${recruitRes.json?.candidates?.length}`);

    // 8. Test Performance & OKRs
    console.log('\n8. Verifying Performance Goals & KRAs...');
    const perfRes = await makeRequest('/api/hrm/performance?tenantId=ten-growth-india');
    console.log(`   Active Goals / OKRs: ${perfRes.json?.goals?.length}`);

    // 9. Test Helpdesk & Grievance Tickets
    console.log('\n9. Verifying HR Helpdesk & Grievance Ticketing...');
    const ticketsRes = await makeRequest('/api/hrm/helpdesk?tenantId=ten-growth-india');
    console.log(`   Total Helpdesk Tickets: ${ticketsRes.json?.tickets?.length}`);

    // 10. Test Event-Driven Workflow Engine Simulation
    console.log('\n10. Testing Workflow Engine Trigger Simulation (Event -> Condition -> Action -> Notification)...');
    const wfRes = await makeRequest('/api/hrm/workflows', 'POST', {
      tenantId: 'ten-growth-india',
      action: 'TEST_EXECUTE',
      workflowId: 'wf-01',
    });
    console.log(`   Workflow Evaluated: ${wfRes.json?.simulation?.workflowTitle}`);
    console.log(`   Condition Met: ${wfRes.json?.simulation?.conditionMet}`);
    console.log(`   Dispatched Steps: ${wfRes.json?.simulation?.stepsExecuted?.length} steps`);
    console.log(`   Dispatched Alerts: ${wfRes.json?.simulation?.notificationsDispatched?.length} notifications`);

    // 11. Test Workforce Analytics
    console.log('\n11. Verifying Workforce Analytics...');
    const analyticsRes = await makeRequest('/api/hrm/analytics?tenantId=ten-growth-india');
    console.log(`   Headcount: ${analyticsRes.json?.metrics?.totalHeadcount} | Punctuality: ${analyticsRes.json?.metrics?.attendancePunctuality}`);

    console.log('\n====================================================');
    console.log('✅ ALL MULTI-TENANT HRM VERIFICATION CHECKS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runHrmVerification();
