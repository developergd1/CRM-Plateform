import { prisma } from './prisma';

/**
 * Sequential ID Generators for enterprise CRM models.
 */

export async function generateLeadNumber(): Promise<string> {
  const count = await prisma.lead.count();
  const latest = await prisma.lead.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { leadNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.leadNumber) {
    const parsed = parseInt(latest.leadNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `LEAD-${String(nextNum).padStart(6, '0')}`;
}

export async function generateContactNumber(): Promise<string> {
  const count = await prisma.contact.count();
  const latest = await prisma.contact.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { contactNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.contactNumber) {
    const parsed = parseInt(latest.contactNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `CON-${String(nextNum).padStart(6, '0')}`;
}

export async function generateOpportunityNumber(): Promise<string> {
  const count = await prisma.opportunity.count();
  const latest = await prisma.opportunity.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { opportunityNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.opportunityNumber) {
    const parsed = parseInt(latest.opportunityNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `OPP-${String(nextNum).padStart(6, '0')}`;
}

export async function generateDealNumber(): Promise<string> {
  const count = await prisma.deal.count();
  const latest = await prisma.deal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { dealNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.dealNumber) {
    const parsed = parseInt(latest.dealNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `DEAL-${String(nextNum).padStart(6, '0')}`;
}

export async function generateActivityNumber(): Promise<string> {
  const count = await prisma.activity.count();
  const latest = await prisma.activity.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { activityNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.activityNumber) {
    const parsed = parseInt(latest.activityNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `ACT-${String(nextNum).padStart(6, '0')}`;
}

export async function generateCrmTaskNumber(): Promise<string> {
  const count = await prisma.task.count();
  const latest = await prisma.task.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { taskNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.taskNumber) {
    const parsed = parseInt(latest.taskNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `TSK-${String(nextNum).padStart(6, '0')}`;
}

export async function generateFollowUpNumber(): Promise<string> {
  const count = await prisma.followUp.count();
  const latest = await prisma.followUp.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { followUpNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.followUpNumber) {
    const parsed = parseInt(latest.followUpNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `FLW-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Extracts 3-character uppercase company code from company name.
 * e.g., "Titan Infotech" -> "TIT", "Zenith Logistics" -> "ZEN", "Apex" -> "APE"
 */
export function extractCompanyCode(companyName?: string | null): string {
  if (!companyName || typeof companyName !== 'string') return 'COR';
  const clean = companyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length >= 3) {
    return clean.substring(0, 3);
  }
  if (clean.length > 0) {
    return clean.padEnd(3, 'X');
  }
  return 'COR';
}

/**
 * Sequential Client ID: CLI-[3-LETTER-COMPANY-CODE]-[00001]
 * e.g. CLI-TIT-00001, CLI-ZEN-00002...
 * Sequential counter increases across all clients.
 */
export async function generateClientId(companyName?: string | null): Promise<string> {
  const code = extractCompanyCode(companyName);
  const allClients = await prisma.client.findMany({
    select: { clientId: true },
  });

  let maxNum = 0;
  for (const c of allClients) {
    if (c.clientId) {
      const match = c.clientId.match(/\d+$/);
      if (match) {
        const numPart = parseInt(match[0], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }

  const nextNumber = maxNum + 1;
  return `CLI-${code}-${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Sequential Employee ID: EMP-[3-LETTER-COMPANY-CODE]-[0001]
 * e.g. EMP-TIT-0001 ... EMP-TIT-0010, next client: EMP-ZEN-0011 ...
 * Sequential counter increases globally across all employees.
 */
export async function generateEmployeeId(companyName?: string | null): Promise<string> {
  const code = extractCompanyCode(companyName);
  const allEmployees = await prisma.employee.findMany({
    select: { employeeId: true },
  });

  let maxNum = 0;
  for (const e of allEmployees) {
    if (e.employeeId && e.employeeId !== 'GI-EMP-000001') {
      const match = e.employeeId.match(/\d+$/);
      if (match) {
        const numPart = parseInt(match[0], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
  }

  const nextNumber = maxNum + 1;
  return `EMP-${code}-${nextNumber.toString().padStart(4, '0')}`;
}


