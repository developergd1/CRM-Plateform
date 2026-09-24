/**
 * END-TO-END MULTI-TENANT ISOLATION & ADMIN OVERSIGHT TEST SUITE
 * 
 * Verifies:
 * 1. Admin assigns CMS, HRM, CRM, EMS to 3 independent clients:
 *    - Client Alpha: "Alpha Cloud Solutions Pvt Ltd" (CLI-TEST-ALPHA)
 *    - Client Beta:  "Beta Logistics Worldwide Ltd" (CLI-TEST-BETA)
 *    - Client Gamma: "Gamma Retail Superstores Ltd" (CLI-TEST-GAMMA)
 * 2. Each client creates distinct records in CRM, HRM, and EMS.
 * 3. Database & API data isolation:
 *    - Client Alpha sees ONLY Client Alpha's data
 *    - Client Beta sees ONLY Client Beta's data
 *    - Client Gamma sees ONLY Client Gamma's data
 *    - ZERO leakage from Admin platform records (76 staff, 50L payroll, 45L deals)
 *    - ZERO cross-client leakage (IDOR / BOLA protection)
 * 4. Admin read-only oversight:
 *    - Admin can view each client's 360 profile, assigned modules, workforce, and real-time audit logs
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

function recordTest(area, testName, status, details = '') {
  results.total++;
  if (status === 'PASS') results.passed++;
  else results.failed++;

  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`   ${icon} [${status}] ${testName}${details ? ` -> ${details}` : ''}`);
  results.details.push({ area, testName, status, details });
}

async function apiRequest(endpoint, options = {}, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function login(email, password, portalType = 'ADMIN') {
  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, portalType }),
  });
  const cookieHeader = res.headers.get('set-cookie');
  let cookie = '';
  if (cookieHeader) {
    cookie = cookieHeader.split(';')[0];
  }
  return { status: res.status, data: res.data, cookie };
}

async function run() {
  console.log('========================================================================');
  console.log('🛡️  MULTI-TENANT DATA ISOLATION & ADMIN OVERSIGHT VERIFICATION SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Admin Authentication
    // -------------------------------------------------------------------------
    console.log('🔹 STEP 1: Authenticating as Platform Administrator...');
    const adminLogin = await login('admin@growthindia.co', 'Admin@123', 'ADMIN');
    if (adminLogin.status !== 200 || !adminLogin.cookie) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    recordTest('AUTH', 'Admin Login Successful', 'PASS', `Token acquired for ${adminLogin.data?.user?.email}`);
    const adminCookie = adminLogin.cookie;

    // -------------------------------------------------------------------------
    // STEP 2: Setup 3 Distinct Client Organizations with CMS, HRM, CRM, EMS
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 2: Provisioning 3 Independent Clients with CMS, HRM, CRM, EMS features...');
    
    const clientConfigs = [
      {
        key: 'ALPHA',
        clientId: 'CLI-TEST-ALPHA',
        companyName: 'Alpha Cloud Solutions Pvt Ltd',
        email: 'client.alpha@alphacloud.test',
        contactPerson: 'Aditya Birla',
        mobile: '9811122201',
        password: 'Client#Alpha123',
      },
      {
        key: 'BETA',
        clientId: 'CLI-TEST-BETA',
        companyName: 'Beta Logistics Worldwide Ltd',
        email: 'client.beta@betalogistics.test',
        contactPerson: 'Bhavna Sen',
        mobile: '9822233302',
        password: 'Client#Beta123',
      },
      {
        key: 'GAMMA',
        clientId: 'CLI-TEST-GAMMA',
        companyName: 'Gamma Retail Superstores Ltd',
        email: 'client.gamma@gammaretail.test',
        contactPerson: 'Gautam Singhania',
        mobile: '9833344403',
        password: 'Client#Gamma123',
      },
    ];

    let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
    if (!clientRole) {
      clientRole = await prisma.role.create({
        data: { name: 'CLIENT', displayName: 'Client Account', isSystem: true },
      });
    }

    const testEmpEmails = [
      'aarav.sharma@alphacloud.test',
      'priya.verma@betalogistics.test',
      'rohan.mehta@gammaretail.test',
    ];
    const testEmpPhones = ['9811199901', '9822299902', '9833399903'];
    const testLeadEmails = [
      'siddharth@alphafintech.test',
      'rajesh@betafleet.test',
      'kunal@gammahyper.test',
    ];

    // Clean any prior test accounts/records to avoid unique collisions
    await prisma.lead.deleteMany({
      where: { email: { in: testLeadEmails } },
    });

    const existingEmps = await prisma.employee.findMany({
      where: {
        OR: [
          { personalEmail: { in: testEmpEmails } },
          { phone: { in: testEmpPhones } },
        ],
      },
      select: { id: true, userId: true },
    });
    const empIds = existingEmps.map((e) => e.id);
    const userIds = existingEmps.map((e) => e.userId).filter(Boolean);

    if (empIds.length > 0) {
      await prisma.attendance.deleteMany({ where: { employeeId: { in: empIds } } });
      await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: empIds } } });
      await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: testEmpEmails } },
    });

    const clientRecords = {};
    const clientCookies = {};

    for (const cfg of clientConfigs) {
      // Upsert User
      const passwordHash = await bcrypt.hash(cfg.password, 10);
      let user = await prisma.user.findUnique({ where: { email: cfg.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cfg.email,
            passwordHash,
            roleId: clientRole.id,
            isActive: true,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, isActive: true },
        });
      }

      // Upsert Client with CMS, HRM, CRM, EMS features assigned
      let client = await prisma.client.findFirst({
        where: { OR: [{ clientId: cfg.clientId }, { email: cfg.email }] },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            clientId: cfg.clientId,
            companyName: cfg.companyName,
            contactPerson: cfg.contactPerson,
            mobile: cfg.mobile,
            email: cfg.email,
            userId: user.id,
            status: 'ACTIVE',
            subscriptionPlan: 'ENTERPRISE',
            assignedModules: ['CMS', 'HRM', 'CRM', 'EMS', 'ALL'],
          },
        });
      } else {
        client = await prisma.client.update({
          where: { id: client.id },
          data: {
            clientId: cfg.clientId,
            companyName: cfg.companyName,
            contactPerson: cfg.contactPerson,
            mobile: cfg.mobile,
            email: cfg.email,
            userId: user.id,
            status: 'ACTIVE',
            subscriptionPlan: 'ENTERPRISE',
            assignedModules: ['CMS', 'HRM', 'CRM', 'EMS', 'ALL'],
          },
        });
      }

      clientRecords[cfg.key] = client;

      // Clean existing test data for pure isolation testing
      await prisma.deal.deleteMany({ where: { clientId: client.id } });
      await prisma.lead.deleteMany({ where: { clientId: client.id } });
      await prisma.account.deleteMany({ where: { clientId: client.id } });
      await prisma.contact.deleteMany({ where: { clientId: client.id } });
      await prisma.attendance.deleteMany({ where: { employee: { clientId: client.id } } });
      await prisma.leaveRequest.deleteMany({ where: { employee: { clientId: client.id } } });
      await prisma.employee.deleteMany({ where: { clientId: client.id } });
      await prisma.user.deleteMany({ where: { parentClientId: client.id } });

      // Log in as this Client
      const cLogin = await login(cfg.email, cfg.password, 'CLIENT');
      if (cLogin.status !== 200 || !cLogin.cookie) {
        throw new Error(`Failed to login as client ${cfg.key}: ${JSON.stringify(cLogin.data)}`);
      }
      clientCookies[cfg.key] = cLogin.cookie;

      recordTest(
        'PROVISIONING',
        `Client ${cfg.key} Provisioned & Logged In`,
        'PASS',
        `ID: ${client.clientId} (${client.id}), Modules: CMS, HRM, CRM, EMS`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 3: Create Distinct Data for Each Client in CRM, HRM, and EMS
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 3: Creating Distinct Isolated Data for Each Client...');

    // --- CLIENT ALPHA DATA CREATION ---
    console.log('   Creating Alpha CRM, HRM, EMS records...');
    const alphaLeadRes = await apiRequest(
      '/api/crm/leads',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Siddharth Roy',
          companyName: 'Alpha Fintech Solutions',
          email: 'siddharth@alphafintech.test',
          phone: '9811100001',
          estimatedValue: 2000000,
          status: 'QUALIFIED',
          source: 'WEBSITE',
        }),
      },
      clientCookies.ALPHA
    );
    const alphaLeadId = alphaLeadRes.data?.data?.id || alphaLeadRes.data?.id;
    recordTest('CRM_CREATE', 'Client Alpha Creates Lead', alphaLeadRes.status === 201 ? 'PASS' : 'FAIL', `Lead ID: ${alphaLeadId}, Value: ₹20,00,000`);

    const alphaDealRes = await apiRequest(
      '/api/crm/deals',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Alpha Enterprise Cloud Infrastructure Deal',
          amount: 5000000,
          stage: 'PROPOSAL',
          probability: 75,
        }),
      },
      clientCookies.ALPHA
    );
    const alphaDealId = alphaDealRes.data?.data?.id || alphaDealRes.data?.id;
    recordTest('CRM_CREATE', 'Client Alpha Creates Deal', alphaDealRes.status === 201 ? 'PASS' : 'FAIL', `Deal ID: ${alphaDealId}, Value: ₹50,00,000`);

    const alphaEmpRes = await apiRequest(
      '/api/employees',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Aarav Sharma - Alpha Cloud Eng',
          phone: '9811199901',
          email: 'aarav.sharma@alphacloud.test',
          designation: 'Lead Cloud Architect',
          departmentName: 'Cloud Engineering',
          customPassword: 'AlphaEmp#123',
        }),
      },
      clientCookies.ALPHA
    );
    const alphaEmpId = alphaEmpRes.data?.employee?.id;
    recordTest('EMS_CREATE', 'Client Alpha Onboards Employee', alphaEmpRes.status === 200 || alphaEmpRes.status === 201 ? 'PASS' : 'FAIL', `Emp: ${alphaEmpRes.data?.employee?.fullName} (${alphaEmpRes.data?.employee?.employeeId})`);

    // --- CLIENT BETA DATA CREATION ---
    console.log('   Creating Beta CRM, HRM, EMS records...');
    const betaLeadRes = await apiRequest(
      '/api/crm/leads',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Rajesh Khanna',
          companyName: 'Beta Fleet Dynamics',
          email: 'rajesh@betafleet.test',
          phone: '9822200002',
          estimatedValue: 1500000,
          status: 'CONTACTED',
          source: 'REFERRAL',
        }),
      },
      clientCookies.BETA
    );
    const betaLeadId = betaLeadRes.data?.data?.id || betaLeadRes.data?.id;
    recordTest('CRM_CREATE', 'Client Beta Creates Lead', betaLeadRes.status === 201 ? 'PASS' : 'FAIL', `Lead ID: ${betaLeadId}, Value: ₹15,00,000`);

    const betaDealRes = await apiRequest(
      '/api/crm/deals',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Beta Fleet Tracking Expansion Deal',
          amount: 3000000,
          stage: 'NEGOTIATION',
          probability: 60,
        }),
      },
      clientCookies.BETA
    );
    const betaDealId = betaDealRes.data?.data?.id || betaDealRes.data?.id;
    recordTest('CRM_CREATE', 'Client Beta Creates Deal', betaDealRes.status === 201 ? 'PASS' : 'FAIL', `Deal ID: ${betaDealId}, Value: ₹30,00,000`);

    const betaEmpRes = await apiRequest(
      '/api/employees',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Priya Verma - Beta Logistics',
          phone: '9822299902',
          email: 'priya.verma@betalogistics.test',
          designation: 'Logistics Operations Lead',
          departmentName: 'Dispatch & Fleet',
          customPassword: 'BetaEmp#123',
        }),
      },
      clientCookies.BETA
    );
    const betaEmpId = betaEmpRes.data?.employee?.id;
    recordTest('EMS_CREATE', 'Client Beta Onboards Employee', betaEmpRes.status === 200 || betaEmpRes.status === 201 ? 'PASS' : 'FAIL', `Emp: ${betaEmpRes.data?.employee?.fullName} (${betaEmpRes.data?.employee?.employeeId})`);

    // --- CLIENT GAMMA DATA CREATION ---
    console.log('   Creating Gamma CRM, HRM, EMS records...');
    const gammaLeadRes = await apiRequest(
      '/api/crm/leads',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Kunal Kapoor',
          companyName: 'Gamma Hypermarkets Ltd',
          email: 'kunal@gammahyper.test',
          phone: '9833300003',
          estimatedValue: 1000000,
          status: 'NEW',
          source: 'WEBSITE',
        }),
      },
      clientCookies.GAMMA
    );
    const gammaLeadId = gammaLeadRes.data?.data?.id || gammaLeadRes.data?.id;
    recordTest('CRM_CREATE', 'Client Gamma Creates Lead', gammaLeadRes.status === 201 ? 'PASS' : 'FAIL', `Lead ID: ${gammaLeadId}, Value: ₹10,00,000`);

    const gammaDealRes = await apiRequest(
      '/api/crm/deals',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Gamma 50 Hypermarket Retail POS Rollout',
          amount: 4000000,
          stage: 'PROPOSAL',
          probability: 40,
        }),
      },
      clientCookies.GAMMA
    );
    const gammaDealId = gammaDealRes.data?.data?.id || gammaDealRes.data?.id;
    recordTest('CRM_CREATE', 'Client Gamma Creates Deal', gammaDealRes.status === 201 ? 'PASS' : 'FAIL', `Deal ID: ${gammaDealId}, Value: ₹40,00,000`);

    const gammaEmpRes = await apiRequest(
      '/api/employees',
      {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Rohan Mehta - Gamma Retail',
          phone: '9833399903',
          email: 'rohan.mehta@gammaretail.test',
          designation: 'Regional Retail Supervisor',
          departmentName: 'Retail Operations',
          customPassword: 'GammaEmp#123',
        }),
      },
      clientCookies.GAMMA
    );
    const gammaEmpId = gammaEmpRes.data?.employee?.id;
    recordTest('EMS_CREATE', 'Client Gamma Onboards Employee', gammaEmpRes.status === 200 || gammaEmpRes.status === 201 ? 'PASS' : 'FAIL', `Emp: ${gammaEmpRes.data?.employee?.fullName} (${gammaEmpRes.data?.employee?.employeeId})`);

    // -------------------------------------------------------------------------
    // STEP 4: Verify Multi-Tenant CRM Dashboard & Pipeline Isolation
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 4: Verifying CRM Dashboard & List Isolation Across Clients...');

    // Client Alpha CRM Dashboard
    const alphaCrmDash = await apiRequest('/api/crm/dashboard', {}, clientCookies.ALPHA);
    const alphaKpis = alphaCrmDash.data?.data?.kpis;
    const isAlphaCrmIsolated =
      alphaKpis?.openPipelineValue === 5000000 &&
      alphaKpis?.openDealsCount === 1 &&
      alphaKpis?.totalLeads === 1;
    recordTest(
      'CRM_ISOLATION',
      'Client Alpha CRM Dashboard Strictly Isolated',
      isAlphaCrmIsolated ? 'PASS' : 'FAIL',
      `Pipeline: ₹${alphaKpis?.openPipelineValue?.toLocaleString('en-IN') || 0} (Expected 50L), Deals: ${alphaKpis?.openDealsCount || 0} (Expected 1), Leads: ${alphaKpis?.totalLeads || 0} (Expected 1)`
    );

    // Client Beta CRM Dashboard
    const betaCrmDash = await apiRequest('/api/crm/dashboard', {}, clientCookies.BETA);
    const betaKpis = betaCrmDash.data?.data?.kpis;
    const isBetaCrmIsolated =
      betaKpis?.openPipelineValue === 3000000 &&
      betaKpis?.openDealsCount === 1 &&
      betaKpis?.totalLeads === 1;
    recordTest(
      'CRM_ISOLATION',
      'Client Beta CRM Dashboard Strictly Isolated',
      isBetaCrmIsolated ? 'PASS' : 'FAIL',
      `Pipeline: ₹${betaKpis?.openPipelineValue?.toLocaleString('en-IN') || 0} (Expected 30L), Deals: ${betaKpis?.openDealsCount || 0} (Expected 1), Leads: ${betaKpis?.totalLeads || 0} (Expected 1)`
    );

    // Client Gamma CRM Dashboard
    const gammaCrmDash = await apiRequest('/api/crm/dashboard', {}, clientCookies.GAMMA);
    const gammaKpis = gammaCrmDash.data?.data?.kpis;
    const isGammaCrmIsolated =
      gammaKpis?.openPipelineValue === 4000000 &&
      gammaKpis?.openDealsCount === 1 &&
      gammaKpis?.totalLeads === 1;
    recordTest(
      'CRM_ISOLATION',
      'Client Gamma CRM Dashboard Strictly Isolated',
      isGammaCrmIsolated ? 'PASS' : 'FAIL',
      `Pipeline: ₹${gammaKpis?.openPipelineValue?.toLocaleString('en-IN') || 0} (Expected 40L), Deals: ${gammaKpis?.openDealsCount || 0} (Expected 1), Leads: ${gammaKpis?.totalLeads || 0} (Expected 1)`
    );

    // Verify CRM Leads List Isolation
    const alphaLeads = await apiRequest('/api/crm/leads', {}, clientCookies.ALPHA);
    const alphaLeadsList = alphaLeads.data?.data || [];
    const hasOnlyAlphaLeads = alphaLeadsList.length === 1 && alphaLeadsList[0].fullName === 'Siddharth Roy';
    recordTest(
      'CRM_ISOLATION',
      'Client Alpha Leads List Isolated',
      hasOnlyAlphaLeads ? 'PASS' : 'FAIL',
      `Count: ${alphaLeadsList.length}, Name: ${alphaLeadsList[0]?.fullName || 'None'}`
    );

    const betaLeads = await apiRequest('/api/crm/leads', {}, clientCookies.BETA);
    const betaLeadsList = betaLeads.data?.data || [];
    const hasOnlyBetaLeads = betaLeadsList.length === 1 && betaLeadsList[0].fullName === 'Rajesh Khanna';
    recordTest(
      'CRM_ISOLATION',
      'Client Beta Leads List Isolated',
      hasOnlyBetaLeads ? 'PASS' : 'FAIL',
      `Count: ${betaLeadsList.length}, Name: ${betaLeadsList[0]?.fullName || 'None'}`
    );

    const gammaLeads = await apiRequest('/api/crm/leads', {}, clientCookies.GAMMA);
    const gammaLeadsList = gammaLeads.data?.data || [];
    const hasOnlyGammaLeads = gammaLeadsList.length === 1 && gammaLeadsList[0].fullName === 'Kunal Kapoor';
    recordTest(
      'CRM_ISOLATION',
      'Client Gamma Leads List Isolated',
      hasOnlyGammaLeads ? 'PASS' : 'FAIL',
      `Count: ${gammaLeadsList.length}, Name: ${gammaLeadsList[0]?.fullName || 'None'}`
    );

    // Verify CRM Deals List Isolation
    const alphaDeals = await apiRequest('/api/crm/deals', {}, clientCookies.ALPHA);
    const alphaDealsList = alphaDeals.data?.data || [];
    const hasOnlyAlphaDeals = alphaDealsList.length === 1 && alphaDealsList[0].title.includes('Alpha');
    recordTest(
      'CRM_ISOLATION',
      'Client Alpha Deals List Isolated',
      hasOnlyAlphaDeals ? 'PASS' : 'FAIL',
      `Count: ${alphaDealsList.length}, Title: ${alphaDealsList[0]?.title || 'None'}`
    );

    const betaDeals = await apiRequest('/api/crm/deals', {}, clientCookies.BETA);
    const betaDealsList = betaDeals.data?.data || [];
    const hasOnlyBetaDeals = betaDealsList.length === 1 && betaDealsList[0].title.includes('Beta');
    recordTest(
      'CRM_ISOLATION',
      'Client Beta Deals List Isolated',
      hasOnlyBetaDeals ? 'PASS' : 'FAIL',
      `Count: ${betaDealsList.length}, Title: ${betaDealsList[0]?.title || 'None'}`
    );

    const gammaDeals = await apiRequest('/api/crm/deals', {}, clientCookies.GAMMA);
    const gammaDealsList = gammaDeals.data?.data || [];
    const hasOnlyGammaDeals = gammaDealsList.length === 1 && gammaDealsList[0].title.includes('Gamma');
    recordTest(
      'CRM_ISOLATION',
      'Client Gamma Deals List Isolated',
      hasOnlyGammaDeals ? 'PASS' : 'FAIL',
      `Count: ${gammaDealsList.length}, Title: ${gammaDealsList[0]?.title || 'None'}`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Verify Multi-Tenant HRM & EMS Dashboard & Workforce Isolation
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 5: Verifying HRM & EMS Dashboard & Employee List Isolation Across Clients...');

    // Client Alpha HRM Dashboard
    const alphaHrmDash = await apiRequest('/api/hrm/dashboard', {}, clientCookies.ALPHA);
    const alphaHrmMetrics = alphaHrmDash.data?.metrics;
    const isAlphaHrmIsolated =
      alphaHrmMetrics?.totalHeadcount === 1 &&
      alphaHrmDash.data?.latestPayroll === null;
    recordTest(
      'HRM_ISOLATION',
      'Client Alpha HRM Dashboard Isolated (Zero Admin 76 staff or 50L payroll leak)',
      isAlphaHrmIsolated ? 'PASS' : 'FAIL',
      `Headcount: ${alphaHrmMetrics?.totalHeadcount} (Expected 1), Payroll: ${alphaHrmDash.data?.latestPayroll || 'null (Expected null)'}`
    );

    // Client Beta HRM Dashboard
    const betaHrmDash = await apiRequest('/api/hrm/dashboard', {}, clientCookies.BETA);
    const betaHrmMetrics = betaHrmDash.data?.metrics;
    const isBetaHrmIsolated =
      betaHrmMetrics?.totalHeadcount === 1 &&
      betaHrmDash.data?.latestPayroll === null;
    recordTest(
      'HRM_ISOLATION',
      'Client Beta HRM Dashboard Isolated',
      isBetaHrmIsolated ? 'PASS' : 'FAIL',
      `Headcount: ${betaHrmMetrics?.totalHeadcount} (Expected 1), Payroll: ${betaHrmDash.data?.latestPayroll || 'null (Expected null)'}`
    );

    // Client Gamma HRM Dashboard
    const gammaHrmDash = await apiRequest('/api/hrm/dashboard', {}, clientCookies.GAMMA);
    const gammaHrmMetrics = gammaHrmDash.data?.metrics;
    const isGammaHrmIsolated =
      gammaHrmMetrics?.totalHeadcount === 1 &&
      gammaHrmDash.data?.latestPayroll === null;
    recordTest(
      'HRM_ISOLATION',
      'Client Gamma HRM Dashboard Isolated',
      isGammaHrmIsolated ? 'PASS' : 'FAIL',
      `Headcount: ${gammaHrmMetrics?.totalHeadcount} (Expected 1), Payroll: ${gammaHrmDash.data?.latestPayroll || 'null (Expected null)'}`
    );

    // Verify EMS Employee Directory Isolation
    const alphaEmps = await apiRequest('/api/employees', {}, clientCookies.ALPHA);
    const alphaEmpsList = alphaEmps.data?.employees || [];
    const isAlphaEmpsClean = alphaEmpsList.length === 1 && alphaEmpsList[0].fullName.includes('Alpha');
    recordTest(
      'EMS_ISOLATION',
      'Client Alpha Employee List Isolated',
      isAlphaEmpsClean ? 'PASS' : 'FAIL',
      `Count: ${alphaEmpsList.length}, Name: ${alphaEmpsList[0]?.fullName || 'None'}`
    );

    const betaEmps = await apiRequest('/api/employees', {}, clientCookies.BETA);
    const betaEmpsList = betaEmps.data?.employees || [];
    const isBetaEmpsClean = betaEmpsList.length === 1 && betaEmpsList[0].fullName.includes('Beta');
    recordTest(
      'EMS_ISOLATION',
      'Client Beta Employee List Isolated',
      isBetaEmpsClean ? 'PASS' : 'FAIL',
      `Count: ${betaEmpsList.length}, Name: ${betaEmpsList[0]?.fullName || 'None'}`
    );

    const gammaEmps = await apiRequest('/api/employees', {}, clientCookies.GAMMA);
    const gammaEmpsList = gammaEmps.data?.employees || [];
    const isGammaEmpsClean = gammaEmpsList.length === 1 && gammaEmpsList[0].fullName.includes('Gamma');
    recordTest(
      'EMS_ISOLATION',
      'Client Gamma Employee List Isolated',
      isGammaEmpsClean ? 'PASS' : 'FAIL',
      `Count: ${gammaEmpsList.length}, Name: ${gammaEmpsList[0]?.fullName || 'None'}`
    );

    // -------------------------------------------------------------------------
    // STEP 6: Verify Cross-Tenant IDOR Protection
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 6: Verifying Cross-Tenant IDOR Protection (Horizontal Privilege Escalation)...');

    if (alphaDealId) {
      // Client Beta attempts to fetch Client Alpha's Deal by ID
      const idorDealRes = await apiRequest(`/api/crm/deals/${alphaDealId}`, {}, clientCookies.BETA);
      const isDealIdorBlocked = idorDealRes.status === 403 || idorDealRes.status === 404;
      recordTest(
        'IDOR_SECURITY',
        'Client Beta Blocked From Accessing Client Alpha Deal',
        isDealIdorBlocked ? 'PASS' : 'FAIL',
        `HTTP Status: ${idorDealRes.status} (Protected from Cross-Client Leak)`
      );
    }

    if (betaEmpId) {
      // Client Gamma attempts to fetch Client Beta's Employee by ID
      const idorEmpRes = await apiRequest(`/api/employees/${betaEmpId}`, {}, clientCookies.GAMMA);
      const isEmpIdorBlocked = idorEmpRes.status === 403 || idorEmpRes.status === 404;
      recordTest(
        'IDOR_SECURITY',
        'Client Gamma Blocked From Accessing Client Beta Employee',
        isEmpIdorBlocked ? 'PASS' : 'FAIL',
        `HTTP Status: ${idorEmpRes.status} (Protected from Cross-Client Leak)`
      );
    }

    // -------------------------------------------------------------------------
    // STEP 7: Verify Admin Oversight & Read-Only Activity View
    // -------------------------------------------------------------------------
    console.log('\n🔹 STEP 7: Verifying Admin Oversight & Client Activity Monitoring...');

    // 1. Admin can view Client Alpha 360 overview
    const adminAlpha360 = await apiRequest(`/api/clients/${clientRecords.ALPHA.id}`, {}, adminCookie);
    const isAdminAlpha360Ok =
      adminAlpha360.status === 200 &&
      adminAlpha360.data?.client?.clientId === 'CLI-TEST-ALPHA' &&
      adminAlpha360.data?.client?.assignedModules?.includes('HRM') &&
      adminAlpha360.data?.client?.assignedModules?.includes('CRM');
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Inspects Client Alpha Overview & Assigned Modules',
      isAdminAlpha360Ok ? 'PASS' : 'FAIL',
      `Company: ${adminAlpha360.data?.client?.companyName}, Modules: ${adminAlpha360.data?.client?.assignedModules?.join(', ')}`
    );

    // 2. Admin can inspect Client Alpha Workforce
    const adminAlphaWorkforce = await apiRequest(`/api/clients/${clientRecords.ALPHA.id}/workforce`, {}, adminCookie);
    const alphaWorkforceList = adminAlphaWorkforce.data?.employees || [];
    const isAdminAlphaWorkforceOk =
      adminAlphaWorkforce.status === 200 &&
      alphaWorkforceList.some((e) => e.fullName.includes('Aarav Sharma'));
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Inspects Client Alpha Specific Workforce',
      isAdminAlphaWorkforceOk ? 'PASS' : 'FAIL',
      `Staff Count: ${alphaWorkforceList.length}, Staff: ${alphaWorkforceList[0]?.fullName || 'None'}`
    );

    // 3. Admin can inspect Client Beta Workforce
    const adminBetaWorkforce = await apiRequest(`/api/clients/${clientRecords.BETA.id}/workforce`, {}, adminCookie);
    const betaWorkforceList = adminBetaWorkforce.data?.employees || [];
    const isAdminBetaWorkforceOk =
      adminBetaWorkforce.status === 200 &&
      betaWorkforceList.some((e) => e.fullName.includes('Priya Verma'));
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Inspects Client Beta Specific Workforce',
      isAdminBetaWorkforceOk ? 'PASS' : 'FAIL',
      `Staff Count: ${betaWorkforceList.length}, Staff: ${betaWorkforceList[0]?.fullName || 'None'}`
    );

    // 4. Admin can inspect Client Gamma Workforce
    const adminGammaWorkforce = await apiRequest(`/api/clients/${clientRecords.GAMMA.id}/workforce`, {}, adminCookie);
    const gammaWorkforceList = adminGammaWorkforce.data?.employees || [];
    const isAdminGammaWorkforceOk =
      adminGammaWorkforce.status === 200 &&
      gammaWorkforceList.some((e) => e.fullName.includes('Rohan Mehta'));
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Inspects Client Gamma Specific Workforce',
      isAdminGammaWorkforceOk ? 'PASS' : 'FAIL',
      `Staff Count: ${gammaWorkforceList.length}, Staff: ${gammaWorkforceList[0]?.fullName || 'None'}`
    );

    // 5. Admin can inspect Client Audit Logs & Real-time Activity
    const adminAlphaAudit = await apiRequest(`/api/clients/${clientRecords.ALPHA.id}/audit`, {}, adminCookie);
    const alphaAuditLogs = adminAlphaAudit.data?.data || [];
    const isAdminAlphaAuditOk = adminAlphaAudit.status === 200 && alphaAuditLogs.length > 0;
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Reads Client Alpha Real-time Activity Audit Logs',
      isAdminAlphaAuditOk ? 'PASS' : 'FAIL',
      `Total Activity Events Tracked: ${alphaAuditLogs.length}`
    );

    const adminBetaAudit = await apiRequest(`/api/clients/${clientRecords.BETA.id}/audit`, {}, adminCookie);
    const betaAuditLogs = adminBetaAudit.data?.data || [];
    const isAdminBetaAuditOk = adminBetaAudit.status === 200 && betaAuditLogs.length > 0;
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Reads Client Beta Real-time Activity Audit Logs',
      isAdminBetaAuditOk ? 'PASS' : 'FAIL',
      `Total Activity Events Tracked: ${betaAuditLogs.length}`
    );

    const adminGammaAudit = await apiRequest(`/api/clients/${clientRecords.GAMMA.id}/audit`, {}, adminCookie);
    const gammaAuditLogs = adminGammaAudit.data?.data || [];
    const isAdminGammaAuditOk = adminGammaAudit.status === 200 && gammaAuditLogs.length > 0;
    recordTest(
      'ADMIN_OVERSIGHT',
      'Admin Reads Client Gamma Real-time Activity Audit Logs',
      isAdminGammaAuditOk ? 'PASS' : 'FAIL',
      `Total Activity Events Tracked: ${gammaAuditLogs.length}`
    );

    // 6. Verify that Client users CANNOT access Admin audit routes
    const clientAlphaAuditAttempt = await apiRequest(`/api/clients/${clientRecords.ALPHA.id}/audit`, {}, clientCookies.ALPHA);
    const isClientAuditBlocked = clientAlphaAuditAttempt.status === 403;
    recordTest(
      'SECURITY',
      'Client Blocked From Accessing Admin Audit Route',
      isClientAuditBlocked ? 'PASS' : 'FAIL',
      `HTTP Status: ${clientAlphaAuditAttempt.status} (Protected from Client Tampering)`
    );

  } catch (error) {
    console.error('\n❌ Unhandled error in test suite:', error);
    recordTest('GLOBAL', 'Test Suite Execution', 'FAIL', error.message);
  } finally {
    console.log('\n========================================================================');
    console.log('📊 FINAL TEST RESULTS SUMMARY:');
    console.log(`   Total Checks:  ${results.total}`);
    console.log(`   Passed:        ${results.passed}`);
    console.log(`   Failed:        ${results.failed}`);
    console.log(`   Success Rate:  ${Math.round((results.passed / (results.total || 1)) * 100)}%`);
    console.log('========================================================================\n');
    await prisma.$disconnect();
  }
}

run();
