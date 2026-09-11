const fs = require('fs');
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf-8').split('\n').forEach((line) => {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  });
}
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Import service modules directly
const {
  resolveDateRange,
  getExecutiveDashboardMetrics,
  getCrmAnalyticsData,
} = require('../src/lib/services/analytics-service');

const {
  triggerAutomationEvent,
  isAutomationAlreadyExecuted,
} = require('../src/lib/services/automation-service');

const {
  runScheduledAutomation,
  getTimezoneDayBounds,
} = require('../src/lib/services/scheduled-tasks');

const {
  generateCrmReport,
  serializeToCsv,
} = require('../src/lib/services/report-service');

async function runPart5Verification() {
  console.log('🚀 Starting CRM PART 5 — EXECUTIVE DASHBOARD, ANALYTICS & AUTOMATION Verification Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedCount++;
    }
  }

  try {
    // ----------------------------------------------------
    // CLEANUP PRIOR TEST RUN RECORDS
    // ----------------------------------------------------
    await prisma.automationLog.deleteMany({
      where: { metadata: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.notification.deleteMany({
      where: { title: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.followUp.deleteMany({
      where: { title: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.deal.deleteMany({
      where: { title: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.opportunity.deleteMany({
      where: { title: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.lead.deleteMany({
      where: { companyName: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.client.deleteMany({
      where: { companyName: { contains: 'TEST_PART5' } },
    }).catch(() => {});
    await prisma.employee.deleteMany({
      where: { personalEmail: { contains: 'test_part5' } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_part5' } },
    }).catch(() => {});

    // Ensure roles exist
    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'ADMIN', description: 'Admin' } });
    }
    let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
    if (!clientRole) {
      clientRole = await prisma.role.create({ data: { name: 'CLIENT', description: 'Client' } });
    }
    let employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
    if (!employeeRole) {
      employeeRole = await prisma.role.create({ data: { name: 'EMPLOYEE', description: 'Employee' } });
    }

    // Create Test Staff
    const staffUser = await prisma.user.create({
      data: {
        email: `test_part5_staff_${Date.now()}@growthindia.in`,
        passwordHash: await bcrypt.hash('Staff@123', 10),
        roleId: employeeRole.id,
      },
    });

    const testStaff = await prisma.employee.create({
      data: {
        userId: staffUser.id,
        employeeId: `GI-EMP-P5-${Date.now().toString().slice(-4)}`,
        fullName: 'TEST_PART5 Sales Executive',
        personalEmail: staffUser.email,
        phone: '9877665544',
        designation: 'Senior Sales Account Manager',
        status: 'ACTIVE',
      },
    });

    // ----------------------------------------------------
    // TEST 1: Date Range Resolver
    // ----------------------------------------------------
    console.log('[TEST GROUP 1] Date Range Resolver & Timezone Boundaries');
    const boundsToday = resolveDateRange({ preset: 'TODAY' });
    assert(boundsToday.label === 'Today', 'Today preset resolved correctly');
    assert(boundsToday.start <= boundsToday.end, 'Start date is prior to end date');

    const boundsMonth = resolveDateRange({ preset: 'THIS_MONTH' });
    assert(boundsMonth.label === 'This Month', 'This Month preset resolved');
    assert(boundsMonth.start.getDate() === 1, 'First day of month is day 1');

    const tzBounds = getTimezoneDayBounds('Asia/Kolkata');
    assert(tzBounds.dateStr.length === 10, 'Asia/Kolkata timezone boundary returned valid date string');

    // ----------------------------------------------------
    // TEST 2: Real Database-Driven Executive Dashboard
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 2] Real Database-Driven Executive Dashboard');
    
    // Seed a live test client, lead and deal
    const clientUser = await prisma.user.create({
      data: {
        email: `test_part5_clientuser_${Date.now()}@primeindustries.com`,
        passwordHash: await bcrypt.hash('Client@123', 10),
        roleId: clientRole.id,
      },
    });

    const seedClient = await prisma.client.create({
      data: {
        clientId: `CLI-P5-${Date.now().toString().slice(-4)}`,
        companyName: 'TEST_PART5 Prime Industries Ltd',
        contactPerson: 'Aditya Birla',
        email: `test_part5_prime_${Date.now()}@primeindustries.com`,
        mobile: '9822114477',
        status: 'ACTIVE',
        userId: clientUser.id,
      },
    });

    const seedLead = await prisma.lead.create({
      data: {
        leadNumber: `LEAD-P5-${Date.now().toString().slice(-4)}`,
        companyName: 'TEST_PART5 Prime Industries Ltd',
        contactPerson: 'Aditya Birla',
        phone: '9822114477',
        status: 'QUALIFIED',
        source: 'WEBSITE',
        assignedToId: testStaff.id,
      },
    });

    const seedDeal = await prisma.deal.create({
      data: {
        dealNumber: `DEAL-P5-${Date.now().toString().slice(-4)}`,
        title: 'TEST_PART5 Security Contract 2026',
        amount: 1500000,
        stage: 'NEGOTIATION',
        status: 'OPEN',
        probability: 70,
        weightedValue: 1050000,
        assignedToId: testStaff.id,
        clientId: seedClient.id,
      },
    });

    const dashboardMetrics = await getExecutiveDashboardMetrics(
      { preset: 'THIS_MONTH' },
      { id: staffUser.id, role: 'ADMIN' }
    );

    assert(dashboardMetrics.workforce.totalClients >= 1, 'Dashboard dynamically computes total clients count from DB');
    assert(dashboardMetrics.crm.totalLeads >= 1, 'Dashboard dynamically computes leads count from DB');
    assert(dashboardMetrics.crm.pipelineValue >= 1500000, 'Dashboard dynamically aggregates open deals pipeline value');
    assert(dashboardMetrics.crm.weightedPipelineValue >= 1050000, 'Dashboard calculates weighted pipeline value');

    // ----------------------------------------------------
    // TEST 3: Dedicated CRM Analytics Engine Math
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 3] Dedicated CRM Analytics Math & Conversions');

    // Create a WON deal to test revenue & average deal value
    const wonDeal = await prisma.deal.create({
      data: {
        dealNumber: `DEAL-P5-WON-${Date.now().toString().slice(-4)}`,
        title: 'TEST_PART5 Closed Won Enterprise Contract',
        amount: 2000000,
        stage: 'WON',
        status: 'WON',
        probability: 100,
        weightedValue: 2000000,
        assignedToId: testStaff.id,
        clientId: seedClient.id,
      },
    });

    const crmAnalytics = await getCrmAnalyticsData({ preset: 'THIS_MONTH' });

    assert(crmAnalytics.dealMetrics.wonDealsCount >= 1, 'Analytics identifies won deals count');
    assert(crmAnalytics.dealMetrics.totalWonValue >= 2000000, 'Analytics aggregates total won value');
    assert(crmAnalytics.dealMetrics.averageDealValue > 0, 'Analytics calculates non-zero average deal size');
    assert(crmAnalytics.pipeline.stages.length >= 6, 'Analytics provides stage-wise breakdown (NEW, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST)');
    assert(crmAnalytics.sourcePerformance.some((s) => s.source === 'WEBSITE'), 'Analytics aggregates source performance for WEBSITE channel');
    assert(crmAnalytics.salespersonPerformance.some((r) => r.id === testStaff.id), 'Analytics includes test salesperson in leaderboard');

    // ----------------------------------------------------
    // TEST 4: Automation Engine & Strict Idempotency
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 4] Central Automation Engine & Idempotency Guard');

    const testFollowUp = await prisma.followUp.create({
      data: {
        followUpNumber: `FLW-P5-${Date.now().toString().slice(-4)}`,
        title: 'TEST_PART5 Contract Proposal Review Meeting',
        scheduledAt: new Date(),
        status: 'PENDING',
        priority: 'HIGH',
        assignedToId: testStaff.id,
        leadId: seedLead.id,
      },
    });

    // 1st Execution: FOLLOW_UP_DUE
    await triggerAutomationEvent('FOLLOW_UP_DUE', {
      entityType: 'FollowUp',
      entityId: testFollowUp.id,
    });

    const notifsAfterFirst = await prisma.notification.findMany({
      where: { recipientId: testStaff.id, entityId: testFollowUp.id },
    });
    assert(notifsAfterFirst.length === 1, '1st trigger created exactly 1 follow-up notification');

    const logFirst = await prisma.automationLog.findFirst({
      where: { entityId: testFollowUp.id, event: 'FOLLOW_UP_DUE' },
    });
    assert(logFirst && logFirst.status === 'SUCCESS', '1st automation logged with SUCCESS in AutomationLog');

    // 2nd Execution: Immediately re-trigger same event (Idempotency test)
    await triggerAutomationEvent('FOLLOW_UP_DUE', {
      entityType: 'FollowUp',
      entityId: testFollowUp.id,
    });

    const notifsAfterSecond = await prisma.notification.findMany({
      where: { recipientId: testStaff.id, entityId: testFollowUp.id },
    });
    assert(notifsAfterSecond.length === 1, 'Idempotency verified: zero duplicate notifications generated on 2nd trigger');

    const logSecond = await prisma.automationLog.findFirst({
      where: { entityId: testFollowUp.id, event: 'FOLLOW_UP_DUE', status: 'SKIPPED' },
    });
    assert(logSecond !== null, 'Idempotency verified: 2nd execution marked as SKIPPED in AutomationLog');

    // ----------------------------------------------------
    // TEST 5: Scheduled Automation Runner
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 5] Scheduled Automation Runner');
    const runnerStats = await runScheduledAutomation('Asia/Kolkata');
    assert(typeof runnerStats.dueFollowUpsChecked === 'number', 'Scheduled runner inspected due follow-ups');
    assert(typeof runnerStats.overdueFollowUpsChecked === 'number', 'Scheduled runner inspected overdue follow-ups');
    assert(typeof runnerStats.lateAttendancesChecked === 'number', 'Scheduled runner inspected late attendances');
    assert(typeof runnerStats.staleDealsChecked === 'number', 'Scheduled runner inspected stale deals');

    // ----------------------------------------------------
    // TEST 6: CRM Reports & CSV Serializer
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 6] CRM Reports & CSV Serialization');
    const leadReport = await generateCrmReport({ type: 'leads', preset: 'THIS_MONTH' });
    assert(leadReport.rows && leadReport.rows.length >= 1, 'Lead report returned rows');

    const dealsReport = await generateCrmReport({ type: 'deals', preset: 'THIS_MONTH' });
    assert(dealsReport.rows && dealsReport.rows.length >= 1, 'Deals report returned rows');

    const csvOutput = serializeToCsv(leadReport.rows);
    assert(csvOutput.includes('"Lead Number"'), 'CSV serialization generated header line');
    assert(csvOutput.includes('TEST_PART5 Prime Industries Ltd'), 'CSV contains row data');

    // ----------------------------------------------------
    // TEST 7: Strict RBAC & Tenant Isolation
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 7] Strict RBAC & Tenant Isolation for Client Role');
    const clientUserMetrics = await getExecutiveDashboardMetrics(
      { preset: 'THIS_MONTH' },
      { id: clientUser.id, role: 'CLIENT', clientId: seedClient.clientId }
    );
    assert(clientUserMetrics.crm === null, 'CLIENT role receives null for internal CRM pipeline metrics');
    assert(typeof clientUserMetrics.workforce.totalClients === 'number', 'CLIENT role only receives permitted workforce overview');

    // ----------------------------------------------------
    // TEST SUMMARY
    // ----------------------------------------------------
    console.log('\n==================================================');
    console.log(`TOTAL PART 5 CHECKS: ${passedCount + failedCount}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Part 5 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPart5Verification();
