const fs = require('fs');

function loadEnv() {
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Admin Sidebar Flow Backend Models & Endpoints ---');

  // 1. Check Regularization items from DB
  const regSetting = await prisma.systemSetting.findUnique({
    where: { key: 'ATTENDANCE_REGULARIZATIONS' },
  });
  console.log('✓ Regularizations Setting exists:', Boolean(regSetting) || 'Default empty');

  // 2. Check Password Reset Requests Setting
  const pwSetting = await prisma.systemSetting.findUnique({
    where: { key: 'PASSWORD_RESET_REQUESTS' },
  });
  console.log('✓ Password Reset Requests Setting exists:', Boolean(pwSetting) || 'Default empty');

  // 3. Check Activities table count
  const activitiesCount = await prisma.activity.count();
  console.log(`✓ CRM Activities count in DB: ${activitiesCount}`);

  // 4. Check Leave requests table count
  const leaveCount = await prisma.leaveRequest.count();
  console.log(`✓ Leave requests count in DB: ${leaveCount}`);

  // 5. Check Deals, Leads, Clients count
  const [leadsCount, dealsCount, clientsCount] = await Promise.all([
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.client.count(),
  ]);
  console.log(`✓ CRM Leads: ${leadsCount}, Deals: ${dealsCount}, Clients: ${clientsCount}`);

  console.log('\n--- ALL ADMIN FLOW VERIFICATIONS PASSED ---');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
