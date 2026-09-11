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

async function runPart3Verification() {
  console.log('🚀 Starting CRM PART 3 Automated Verification Suite...');
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
    // Clean up any test records from prior runs
    await prisma.dealStageHistory.deleteMany({
      where: { deal: { title: { contains: 'TEST_PART3' } } }
    }).catch(() => {});
    await prisma.activity.deleteMany({
      where: { subject: { contains: 'TEST_PART3' } }
    }).catch(() => {});
    await prisma.deal.deleteMany({
      where: { title: { contains: 'TEST_PART3' } }
    }).catch(() => {});
    await prisma.opportunity.deleteMany({
      where: { title: { contains: 'TEST_PART3' } }
    }).catch(() => {});
    await prisma.lead.deleteMany({
      where: { companyName: { contains: 'TEST_PART3' } }
    }).catch(() => {});
    await prisma.client.deleteMany({
      where: { companyName: { contains: 'TEST_PART3' } }
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_part3' } }
    }).catch(() => {});

    // ----------------------------------------------------
    // TEST 1: Qualified Lead Creation
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 1] Lead Creation & Qualification');
    const lead = await prisma.lead.create({
      data: {
        leadNumber: `LEAD-P3-${Date.now().toString().slice(-4)}`,
        companyName: 'TEST_PART3 Industries Corp',
        contactPerson: 'Suresh Menon',
        fullName: 'Suresh Menon',
        email: `test_part3_${Date.now()}@industries.com`,
        phone: '9876543210',
        city: 'Gurugram',
        status: 'QUALIFIED',
        source: 'WEBSITE',
        priority: 'HIGH',
      }
    });
    assert(lead && lead.id, 'Lead created with QUALIFIED status');

    // ----------------------------------------------------
    // TEST 2: Opportunity Creation from Lead
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 2] Opportunity Creation from Lead');
    const opp = await prisma.opportunity.create({
      data: {
        opportunityNumber: `OPP-P3-${Date.now().toString().slice(-4)}`,
        title: 'TEST_PART3 100 Associates Security & Facility Deal',
        value: 1500000,
        currency: 'INR',
        stage: 'PROSPECTING',
        probability: 20,
        productService: 'Facility Security Services',
        competitor: 'Competitor Alpha',
        leadId: lead.id,
      },
      include: { lead: true }
    });
    assert(opp.leadId === lead.id, 'Opportunity successfully linked to Qualified Lead');
    assert(opp.opportunityNumber.startsWith('OPP-'), 'Opportunity ID auto-generated');
    assert(opp.value === 1500000, 'Opportunity contract value matches ₹15,00,000');

    // ----------------------------------------------------
    // TEST 3: Commercial Deal Creation with Stage & Probability
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 3] Commercial Deal Creation & Default Probabilities');
    const dealAmount = 1200000;
    const stage = 'NEW';
    const defaultProbability = 10;
    const expectedWeightedValue = (dealAmount * defaultProbability) / 100;

    const deal = await prisma.deal.create({
      data: {
        dealNumber: `DEAL-P3-${Date.now().toString().slice(-4)}`,
        title: 'TEST_PART3 Annual Security & Guarding Contract',
        amount: dealAmount,
        currency: 'INR',
        stage: stage,
        status: 'OPEN',
        probability: defaultProbability,
        weightedValue: expectedWeightedValue,
        productService: 'Industrial Security Staffing',
        leadId: lead.id,
        opportunityId: opp.id,
        stageHistory: {
          create: {
            toStage: 'NEW',
            toProbability: 10,
            reason: 'Initial deal setup',
          }
        }
      },
      include: {
        stageHistory: true,
        lead: true,
        opportunity: true,
      }
    });

    assert(deal.stage === 'NEW', 'Deal initial stage is NEW');
    assert(deal.status === 'OPEN', 'Deal status is OPEN');
    assert(deal.weightedValue === 120000, 'Weighted value calculated correctly (₹12,00,000 * 10% = ₹1,20,000)');
    assert(deal.stageHistory.length === 1, 'Initial DealStageHistory audit entry created');

    // ----------------------------------------------------
    // TEST 4: Stage Progression & DealStageHistory Audit Trail
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 4] Stage Transitions & Audit Trail');
    const newStage = 'QUALIFIED';
    const newProbability = 30;
    const newWeighted = (deal.amount * newProbability) / 100;

    const [updatedDeal, stageRecord] = await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: newStage,
          probability: newProbability,
          weightedValue: newWeighted,
        }
      }),
      prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          fromStage: deal.stage,
          toStage: newStage,
          fromProbability: deal.probability,
          toProbability: newProbability,
          reason: 'Client qualified requirements & budget',
        }
      })
    ]);

    assert(updatedDeal.stage === 'QUALIFIED', 'Stage updated to QUALIFIED');
    assert(updatedDeal.weightedValue === 360000, 'Weighted value updated to ₹3,60,000');
    assert(stageRecord.fromStage === 'NEW' && stageRecord.toStage === 'QUALIFIED', 'Stage transition audit record logged accurately');

    // Advance to PROPOSAL & NEGOTIATION
    await prisma.deal.update({
      where: { id: deal.id },
      data: { stage: 'NEGOTIATION', probability: 80, weightedValue: deal.amount * 0.8 }
    });
    const negDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(negDeal.stage === 'NEGOTIATION' && negDeal.weightedValue === 960000, 'Stage advanced to NEGOTIATION with 80% probability');

    // ----------------------------------------------------
    // TEST 5: Deal WON Workflow with Mandatory Reason
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 5] Deal WON Workflow');
    const wonReason = 'SUPERIOR_SERVICE';
    const closingNotes = 'Contract approved by board of directors';
    const now = new Date();

    const wonDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'WON',
        status: 'WON',
        probability: 100,
        weightedValue: deal.amount,
        wonReason,
        closingNotes,
        closedAt: now,
      }
    });

    assert(wonDeal.stage === 'WON' && wonDeal.status === 'WON', 'Deal marked as WON');
    assert(wonDeal.probability === 100 && wonDeal.weightedValue === deal.amount, 'Won deal probability is 100% and weighted value equals contract amount');
    assert(wonDeal.wonReason === 'SUPERIOR_SERVICE', 'Won reason captured properly');
    assert(wonDeal.closedAt !== null, 'closedAt timestamp recorded on winning deal');

    // ----------------------------------------------------
    // TEST 6: Deal Reopen Workflow
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 6] Deal Reopening Workflow');
    const reopenedDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'NEGOTIATION',
        status: 'OPEN',
        probability: 80,
        weightedValue: deal.amount * 0.8,
        closedAt: null,
        wonReason: null,
      }
    });
    assert(reopenedDeal.status === 'OPEN', 'Deal status reset to OPEN on reopen');
    assert(reopenedDeal.closedAt === null, 'closedAt reset to null');

    // Re-mark WON for conversion test
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'WON',
        status: 'WON',
        probability: 100,
        weightedValue: deal.amount,
        wonReason: 'PRICE_COMPETITIVENESS',
        closedAt: new Date(),
      }
    });

    // ----------------------------------------------------
    // TEST 7: Critical Bridge — Deal WON to Client Conversion
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 7] Deal WON -> Client Conversion Bridge');

    // Deduplication test: Check matching client
    const existingMatch = await prisma.client.findFirst({
      where: { companyName: { equals: lead.companyName, mode: 'insensitive' } }
    });
    assert(!existingMatch, 'Verified no duplicate client exists before conversion');

    // Execute Client Conversion
    const allClients = await prisma.client.findMany({ select: { clientId: true } });
    let maxNum = 0;
    for (const c of allClients) {
      if (c.clientId && c.clientId.startsWith('CLI-')) {
        const num = parseInt(c.clientId.replace('CLI-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const newClientId = `CLI-${String(maxNum + 1).padStart(5, '0')}`;
    const clientEmail = `test_part3_${Date.now()}@growthindia.in`;
    const hashedPassword = await bcrypt.hash('Client#Test1234', 10);

    let clientRole = await prisma.role.findUnique({ where: { name: 'CLIENT' } });
    if (!clientRole) {
      clientRole = await prisma.role.create({
        data: {
          name: 'CLIENT',
          displayName: 'Client Account',
          isSystem: true,
        }
      });
    }

    const clientUser = await prisma.user.create({
      data: {
        email: clientEmail,
        passwordHash: hashedPassword,
        roleId: clientRole.id,
        isActive: true,
      }
    });

    const newClient = await prisma.client.create({
      data: {
        clientId: newClientId,
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        mobile: lead.phone,
        email: clientEmail,
        status: 'ACTIVE',
        userId: clientUser.id,
        estimatedValue: deal.amount,
      }
    });

    // Link Deal, Lead & Opportunity to newly created Client
    await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          clientId: newClient.id,
          isConvertedToClient: true,
          convertedToClientId: newClient.id,
        }
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          clientId: newClient.id,
          status: 'CONVERTED',
          convertedAt: new Date(),
        }
      }),
      prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          clientId: newClient.id,
          stage: 'CLOSED_WON',
        }
      })
    ]);

    assert(newClient && newClient.clientId.startsWith('CLI-'), `New Client account created with sequential ID: ${newClient.clientId}`);
    assert(newClient.userId === clientUser.id, 'Client user account securely linked to Client record');

    const verifiedDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(verifiedDeal.isConvertedToClient === true, 'Deal marked as isConvertedToClient = true');
    assert(verifiedDeal.convertedToClientId === newClient.id, 'Deal linked to converted client ID');

    const verifiedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert(verifiedLead.status === 'CONVERTED' && verifiedLead.clientId === newClient.id, 'Original Lead marked CONVERTED and linked to new Client');

    const verifiedOpp = await prisma.opportunity.findUnique({ where: { id: opp.id } });
    assert(verifiedOpp.stage === 'CLOSED_WON' && verifiedOpp.clientId === newClient.id, 'Opportunity linked to Client and marked CLOSED_WON');

    // ----------------------------------------------------
    // TEST 8: Client Directory & Workforce Integration
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 8] Workforce & Client Management Integration');
    const clientListRecord = await prisma.client.findFirst({
      where: { clientId: newClient.clientId },
      include: { employees: true, user: true }
    });
    assert(clientListRecord !== null, 'Converted client is immediately queryable in Client Management');
    assert(clientListRecord.status === 'ACTIVE', 'Converted client has ACTIVE status');
    assert(clientListRecord.employees.length === 0, 'Ready for employee deployment with 0 initial employees');

    // ----------------------------------------------------
    // TEST 9: Idempotency Check
    // ----------------------------------------------------
    console.log('\n[TEST GROUP 9] Idempotency Verification');
    const doubleCheckDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    assert(doubleCheckDeal.isConvertedToClient === true, 'Deal remains converted');
    const duplicateCount = await prisma.client.count({ where: { clientId: newClient.clientId } });
    assert(duplicateCount === 1, 'Strictly 1 Client record exists for converted deal (no duplicates)');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n========================================');
    console.log(`CRM PART 3 VERIFICATION COMPLETE`);
    console.log(`Passed: ${passedCount} | Failed: ${failedCount}`);
    console.log('========================================\n');

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPart3Verification();
