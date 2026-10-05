const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p1 = await prisma.payrollPeriod.findFirst({ where: { periodCode: 'PAY-2026-10' } });
  console.log('find by periodCode only:', p1 ? p1.id : 'null');
  
  const p2 = await prisma.payrollPeriod.findFirst({ where: { periodCode: 'PAY-2026-10', clientId: null } });
  console.log('find with clientId: null:', p2 ? p2.id : 'null');

  const pRaw = await prisma.payrollPeriod.findUnique({ where: { periodCode: 'PAY-2026-10' } });
  console.log('pRaw:', pRaw);
}

main().catch(console.error).finally(() => prisma.$disconnect());
