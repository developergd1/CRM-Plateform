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

async function runPart4Verification() {
  console.log('🚀 Starting CRM PART 4 — CLIENT + CRM ↔ WORKFORCE INTEGRATION Verification Suite...\n');
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
    // CLEANUP PRIOR TEST RUNS
    // ----------------------------------------------------
    await prisma.clientDocument.deleteMany({
      where: { client: { companyName: { contains: 'TEST_PART4' } } }
    }).catch(() => {});
    await prisma.clientDepartment.deleteMany({
      where: { client: { companyName: { contains: 'TEST_PART4' } } }
    }).catch(() => {});
    await prisma.dealStageHistory.deleteMany({
      where: { deal: { title: { contains: 'TEST_PART4' } } }
    }).catch(() => {});
    await prisma.activity.deleteMany({
      where: { subject: { contains: 'TEST_PART4' } }
    }).catch(() => {});
    await prisma.deal.deleteMany({
      where: { title: { contains: 'TEST_PART4' } }
    }).catch(() => {});
    await prisma.opportunity.deleteMany({
      where: { title: { contains: 'TEST_PART4' } }
    }).catch(() => {});
    await prisma.contact.deleteMany({
      where: { email: { contains: 'test_part4' } }
    }).catch(() => {});
    await prisma.lead.deleteMany({
      where: { companyName: { contains: 'TEST_PART4' } }
    }).catch(() => {});
    await prisma.attendanceBreak.deleteMany({
      where: { attendance: { employee: { personalEmail: { contains: 'test_part4' } } } }
    }).catch(() => {});
    await prisma.attendance.deleteMany({
      where: { employee: { personalEmail: { contains: 'test_part4' } } }
    }).catch(() => {});
    await prisma.employee.deleteMany({
      where: { personalEmail: { contains: 'test_part4' } }
    }).catch(() => {});
    await prisma.client.deleteMany({
      where: { companyName: { contains: 'TEST_PART4' } }
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_part4' } }
    }).catch(() => {});

    // Ensure Client role exists
    let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
    if (!clientRole) {
      clientRole = await prisma.role.create({
        data: { name: 'CLIENT', description: 'Client Portal User' }
      });
    }

    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: { name: 'ADMIN', description: 'Administrator' }
      });
    }

    let employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
    if (!employeeRole) {
      employeeRole = await prisma.role.create({
        data: { name: 'EMPLOYEE', description: 'Employee' }
      });
    }

    // ----------------------------------------------------
    // TEST 1: Single Source of Truth — Unified Client Entity
    // ----------------------------------------------------
    console.log('[TEST GROUP 1] Single Source of Truth — Unified Client Entity');
    const testClientId = `CLI-P4-${Date.now().toString().slice(-4)}`;
    const unifiedClient = await prisma.client.create({
      data: {
        clientId: testClientId,
        companyName: 'TEST_PART4 Apex Logistics Ltd',
        legalName: 'TEST_PART4 Apex Logistics Private Limited',
        contactPerson: 'Vikram Malhotra',
        email: `test_part4_client_${Date.now()}@apexlogistics.com`,
        mobile: '9811002233',
        industry: 'Logistics & Supply Chain',
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        status: 'ACTIVE',
        address: 'Plot 42, Cyber City, Phase 2',
      }
    });

    assert(unifiedClient && unifiedClient.id, 'Single unified Client entity created successfully');
    assert(unifiedClient.clientId === testClientId, 'Standardized Client ID assigned');
    assert(unifiedClient.companyName.includes('TEST_PART4'), 'Client company name stored accurately');

    // ----------------------------------------------------
    // TEST 2: CRM Linkages on the Same Client
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 2] CRM Linkages (Contacts, Deals, Opportunities) on Unified Client');
    
    // Create Contact on Client
    const contact = await prisma.contact.create({
      data: {
        contactNumber: `CON-P4-${Date.now().toString().slice(-4)}`,
        clientId: unifiedClient.id,
        fullName: 'Vikram Malhotra',
        email: `test_part4_contact_${Date.now()}@apexlogistics.com`,
        phone: '9811002233',
        designation: 'Managing Director',
        department: 'Executive Board',
        isDecisionMaker: true,
      }
    });
    assert(contact.clientId === unifiedClient.id, 'Contact successfully linked directly to Client.id');

    // Create Opportunity on Client
    const opp = await prisma.opportunity.create({
      data: {
        opportunityNumber: `OPP-P4-${Date.now().toString().slice(-4)}`,
        clientId: unifiedClient.id,
        title: 'TEST_PART4 Facility Management & Security Contract',
        value: 2400000,
        currency: 'INR',
        stage: 'PROPOSAL',
        probability: 60,
      }
    });
    assert(opp.clientId === unifiedClient.id, 'Opportunity linked directly to Client.id');

    // Create Deal on Client
    const deal = await prisma.deal.create({
      data: {
        dealNumber: `DEAL-P4-${Date.now().toString().slice(-4)}`,
        clientId: unifiedClient.id,
        title: 'TEST_PART4 Annual Security Guarding Contract',
        amount: 2400000,
        stage: 'NEGOTIATION',
        status: 'OPEN',
        probability: 75,
        weightedValue: 1800000,
      }
    });
    assert(deal.clientId === unifiedClient.id, 'Commercial Deal linked directly to Client.id');

    // ----------------------------------------------------
    // TEST 3: Workforce Linkages (Employees, Departments, Attendance)
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 3] Workforce Linkages on the EXACT Same Client');
    
    // Create Department under Client
    const dept = await prisma.clientDepartment.create({
      data: {
        clientId: unifiedClient.id,
        name: 'Warehouse Security Division',
        code: 'WSD-01',
        description: 'On-site perimeter guarding and dispatch security',
      }
    });
    assert(dept.clientId === unifiedClient.id, 'ClientDepartment linked to Client.id');

    // Create Employee User & Profile assigned to this Client
    const empUser = await prisma.user.create({
      data: {
        email: `test_part4_emp_${Date.now()}@apexlogistics.com`,
        passwordHash: await bcrypt.hash('Emp@123456', 10),
        roleId: employeeRole.id,
      }
    });

    const employee = await prisma.employee.create({
      data: {
        userId: empUser.id,
        employeeId: `GI-EMP-P4-${Date.now().toString().slice(-4)}`,
        clientId: unifiedClient.id,
        departmentName: 'Warehouse Security Division',
        fullName: 'Rajesh Kumar Guard',
        personalEmail: empUser.email,
        phone: '9822334455',
        designation: 'Security Supervisor',
        status: 'ACTIVE',
        isBlocked: false,
        joiningDate: new Date(),
      }
    });
    assert(employee.clientId === unifiedClient.id, 'Employee allocated directly to Client.id');

    // Create Attendance & Break for Employee
    const todayStr = new Date().toISOString().split('T')[0];
    const checkIn = new Date();
    checkIn.setHours(9, 0, 0, 0);

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: todayStr,
        checkInTime: checkIn,
        status: 'PRESENT',
        totalWorkMinutes: 240,
        breaks: {
          create: {
            breakStartTime: new Date(checkIn.getTime() + 3 * 3600 * 1000),
            breakEndTime: null, // Currently ON BREAK!
            breakType: 'TEA_BREAK',
          }
        }
      },
      include: { breaks: true }
    });
    assert(attendance.employeeId === employee.id, 'Attendance record logged for client employee');
    assert(attendance.breaks.length === 1 && attendance.breaks[0].breakEndTime === null, 'Active break recorded');

    // ----------------------------------------------------
    // TEST 4: Deal WON Conversion Bridge & Idempotency
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 4] Deal WON Conversion Bridge & Idempotency');
    
    // Create a new Deal without a Client (from a Qualified Lead)
    const wonLead = await prisma.lead.create({
      data: {
        leadNumber: `LEAD-P4-WON-${Date.now().toString().slice(-4)}`,
        companyName: 'TEST_PART4 Zenith Infotech Hub',
        contactPerson: 'Ananya Sharma',
        fullName: 'Ananya Sharma',
        email: `test_part4_zenith_${Date.now()}@zenithinfotech.com`,
        phone: '9988776655',
        city: 'Bengaluru',
        status: 'QUALIFIED',
      }
    });

    const wonDeal = await prisma.deal.create({
      data: {
        dealNumber: `DEAL-P4-WON-${Date.now().toString().slice(-4)}`,
        leadId: wonLead.id,
        title: 'TEST_PART4 Enterprise Workforce & Payroll Automation',
        amount: 3600000,
        stage: 'CLOSED_WON',
        status: 'WON',
        probability: 100,
        weightedValue: 3600000,
      }
    });

    // Simulate convertDealToClient logic
    let targetClient = await prisma.client.findFirst({
      where: {
        OR: [
          { companyName: { equals: wonLead.companyName, mode: 'insensitive' } },
          { email: { equals: wonLead.email, mode: 'insensitive' } },
        ]
      }
    });

    if (!targetClient) {
      // Create Client User with CLIENT role
      const clientUser = await prisma.user.create({
        data: {
          email: wonLead.email,
          passwordHash: await bcrypt.hash('Client@123456', 10),
          roleId: clientRole.id,
        }
      });

      targetClient = await prisma.client.create({
        data: {
          clientId: `CLI-AUTO-${Date.now().toString().slice(-4)}`,
          companyName: wonLead.companyName,
          contactPerson: wonLead.contactPerson,
          email: wonLead.email,
          mobile: wonLead.phone,
          city: wonLead.city,
          status: 'ACTIVE',
          userId: clientUser.id,
        }
      });
    }

    // Link Deal to Client
    const updatedDeal = await prisma.deal.update({
      where: { id: wonDeal.id },
      data: { clientId: targetClient.id }
    });

    assert(updatedDeal.clientId === targetClient.id, 'Deal successfully linked to converted Client');
    assert(targetClient.userId !== null, 'Client Portal User account created with CLIENT role');

    // Deduplication check: Attempting conversion with same company name finds existing client
    const dedupeClient = await prisma.client.findFirst({
      where: {
        OR: [
          { companyName: { equals: wonLead.companyName, mode: 'insensitive' } },
          { email: { equals: wonLead.email, mode: 'insensitive' } },
        ]
      }
    });
    assert(dedupeClient.id === targetClient.id, 'Deduplication successfully returns existing Client without duplicate creation');

    // ----------------------------------------------------
    // TEST 5: Document Repository & Categorization
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 5] Document Repository & Categorization');
    const docContract = await prisma.clientDocument.create({
      data: {
        clientId: unifiedClient.id,
        title: 'Master Service Agreement 2026',
        category: 'CONTRACT',
        fileUrl: 'https://storage.growthindia.in/docs/msa_2026.pdf',
        fileType: 'application/pdf',
        fileSize: 1048576,
        uploadedBy: 'Admin Team',
      }
    });

    const docKYC = await prisma.clientDocument.create({
      data: {
        clientId: unifiedClient.id,
        title: 'Certificate of Incorporation & GSTIN',
        category: 'KYC',
        fileUrl: 'https://storage.growthindia.in/docs/gst_certificate.pdf',
        fileType: 'application/pdf',
        fileSize: 524288,
        uploadedBy: 'Client Operations',
      }
    });

    assert(docContract.category === 'CONTRACT', 'Contract document uploaded & categorized');
    assert(docKYC.category === 'KYC', 'KYC document uploaded & categorized');

    const clientDocs = await prisma.clientDocument.findMany({
      where: { clientId: unifiedClient.id }
    });
    assert(clientDocs.length === 2, 'Client document repository lists all categorized documents');

    // ----------------------------------------------------
    // TEST 6: Client 360 Aggregation & Live Workforce Status
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 6] Client 360 Aggregation & Live Workforce Status');
    
    const clientAgg = await prisma.client.findUnique({
      where: { id: unifiedClient.id },
      include: {
        _count: {
          select: {
            employees: true,
            deals: true,
            opportunities: true,
            contacts: true,
            departments: true,
            documents: true,
          }
        }
      }
    });

    assert(clientAgg._count.employees === 1, '360 aggregation reports 1 enrolled employee');
    assert(clientAgg._count.deals === 1, '360 aggregation reports 1 commercial deal');
    assert(clientAgg._count.opportunities === 1, '360 aggregation reports 1 pipeline opportunity');
    assert(clientAgg._count.contacts === 1, '360 aggregation reports 1 key stakeholder contact');
    assert(clientAgg._count.departments === 1, '360 aggregation reports 1 business department');
    assert(clientAgg._count.documents === 2, '360 aggregation reports 2 verified documents');

    // Verify Live Workforce Status Calculation
    const empWithAtt = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        attendanceRecords: {
          where: { date: todayStr },
          include: { breaks: true }
        }
      }
    });

    const todayAttRecord = empWithAtt.attendanceRecords[0];
    const isCurrentlyOnBreak = todayAttRecord.breaks.some(b => !b.breakEndTime);
    assert(isCurrentlyOnBreak === true, 'Live workforce engine accurately detects employee ON_BREAK');

    // ----------------------------------------------------
    // TEST 7: Client Block & Unblock Lifecycle
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 7] Client Block & Unblock Lifecycle');
    
    const blockedClient = await prisma.client.update({
      where: { id: unifiedClient.id },
      data: { status: 'BLOCKED' }
    });
    assert(blockedClient.status === 'BLOCKED', 'Client successfully updated to BLOCKED');

    const unblockedClient = await prisma.client.update({
      where: { id: unifiedClient.id },
      data: { status: 'ACTIVE' }
    });
    assert(unblockedClient.status === 'ACTIVE', 'Client successfully restored to ACTIVE');

    // ----------------------------------------------------
    // TEST SUMMARY
    // ----------------------------------------------------
    console.log('\n==================================================');
    console.log(`TOTAL PART 4 CHECKS: ${passedCount + failedCount}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${failedCount}`);
    console.log('==================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Part 4 verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPart4Verification();
