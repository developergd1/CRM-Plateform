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
 * Extracts 4-character lowercase company code from company name.
 * e.g., "Google" -> "goog", "Amazon" -> "amaz", "Apex Industrial" -> "apex"
 */
export function extractCompanyCode(companyName?: string | null): string {
  if (!companyName || typeof companyName !== 'string') return 'grow';
  const clean = companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (clean.length >= 4) {
    return clean.substring(0, 4);
  }
  if (clean.length > 0) {
    return clean.padEnd(4, 'x');
  }
  return 'grow';
}

/**
 * Sequential Client ID: cli-[company4]-[00001, 00002...]
 * Format: Starting with 'cli-', followed by 4 letters of company name, followed by global client count starting at 00001.
 * e.g., cli-goog-00001, cli-amaz-00002...
 */
export async function generateClientId(companyName?: string | null): Promise<string> {
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
  const compCode = extractCompanyCode(companyName);
  return `cli-${compCode}-${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Sequential Employee ID: emp-[company4]-[00001, 00002...]
 * Format: Starting with 'emp-', followed by 4 letters of company name, followed by global employee count starting at 00001.
 * Unbroken counter across all companies:
 * e.g., emp-goog-00001, emp-goog-00002, emp-amaz-00003, emp-amaz-00004...
 */
export async function generateEmployeeId(companyName?: string | null): Promise<string> {
  const allEmployees = await prisma.employee.findMany({
    select: { employeeId: true },
  });

  let maxNum = 0;
  for (const e of allEmployees) {
    if (e.employeeId) {
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
  const compCode = extractCompanyCode(companyName || 'Growth India');
  return `emp-${compCode}-${nextNumber.toString().padStart(5, '0')}`;
}

export async function generateAccountNumber(): Promise<string> {
  const count = await prisma.account.count();
  const latest = await prisma.account.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { accountCode: true },
  });

  let nextNum = count + 1;
  if (latest?.accountCode) {
    const parsed = parseInt(latest.accountCode.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `ACC-${String(nextNum).padStart(5, '0')}`;
}

export async function generateProductCode(): Promise<string> {
  const count = await prisma.product.count();
  const latest = await prisma.product.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { productCode: true },
  });

  let nextNum = count + 1;
  if (latest?.productCode) {
    const parsed = parseInt(latest.productCode.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `PRD-${String(nextNum).padStart(5, '0')}`;
}

export async function generateQuoteNumber(): Promise<string> {
  const count = await prisma.quote.count();
  const latest = await prisma.quote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.quoteNumber) {
    const parsed = parseInt(latest.quoteNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `QUO-${String(nextNum).padStart(6, '0')}`;
}

export async function generateContractNumber(): Promise<string> {
  const count = await prisma.contract.count();
  const latest = await prisma.contract.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { contractNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.contractNumber) {
    const parsed = parseInt(latest.contractNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `CONTRACT-${String(nextNum).padStart(6, '0')}`;
}

export async function generateRenewalNumber(): Promise<string> {
  const count = await prisma.renewal.count();
  const latest = await prisma.renewal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { renewalNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.renewalNumber) {
    const parsed = parseInt(latest.renewalNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `REN-${String(nextNum).padStart(5, '0')}`;
}

export async function generateHandoffReference(): Promise<string> {
  const count = await prisma.clientHandoff.count();
  const latest = await prisma.clientHandoff.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { handoffReference: true },
  });

  let nextNum = count + 1;
  if (latest?.handoffReference) {
    const parsed = parseInt(latest.handoffReference.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `HND-${String(nextNum).padStart(5, '0')}`;
}

/**
 * Sequential ID Generators for HRM & Payroll models.
 */

export async function generateRequisitionNumber(): Promise<string> {
  const count = await prisma.jobRequisition.count();
  const latest = await prisma.jobRequisition.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { reqNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.reqNumber) {
    const parsed = parseInt(latest.reqNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `REQ-${String(nextNum).padStart(5, '0')}`;
}

export async function generateJobCode(): Promise<string> {
  const count = await prisma.jobOpening.count();
  const latest = await prisma.jobOpening.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { jobCode: true },
  });

  let nextNum = count + 1;
  if (latest?.jobCode) {
    const parsed = parseInt(latest.jobCode.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `JOB-${String(nextNum).padStart(6, '0')}`;
}

export async function generateCandidateNumber(): Promise<string> {
  const count = await prisma.candidate.count();
  const latest = await prisma.candidate.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { candidateNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.candidateNumber) {
    const parsed = parseInt(latest.candidateNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `CAND-${String(nextNum).padStart(6, '0')}`;
}

export async function generateInterviewNumber(): Promise<string> {
  const count = await prisma.interview.count();
  const latest = await prisma.interview.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { interviewNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.interviewNumber) {
    const parsed = parseInt(latest.interviewNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `INT-${String(nextNum).padStart(6, '0')}`;
}

export async function generateOfferNumber(): Promise<string> {
  const count = await prisma.jobOffer.count();
  const latest = await prisma.jobOffer.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { offerNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.offerNumber) {
    const parsed = parseInt(latest.offerNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `OFF-${String(nextNum).padStart(6, '0')}`;
}

export async function generateGoalNumber(): Promise<string> {
  const count = await prisma.goal.count();
  const latest = await prisma.goal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { goalNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.goalNumber) {
    const parsed = parseInt(latest.goalNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `GOL-${String(nextNum).padStart(6, '0')}`;
}

export async function generateHrRequestNumber(): Promise<string> {
  const count = await prisma.hrRequest.count();
  const latest = await prisma.hrRequest.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { reqNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.reqNumber) {
    const parsed = parseInt(latest.reqNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `HR-REQ-${String(nextNum).padStart(6, '0')}`;
}

export async function generateHelpdeskTicketNumber(): Promise<string> {
  const count = await prisma.helpdeskTicket.count();
  const latest = await prisma.helpdeskTicket.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { ticketNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.ticketNumber) {
    const parsed = parseInt(latest.ticketNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `HR-TKT-${String(nextNum).padStart(6, '0')}`;
}

export async function generatePayrollPeriodCode(year: number, month: number): Promise<string> {
  return `PAY-${year}-${String(month).padStart(2, '0')}`;
}

export async function generateReimbursementNumber(): Promise<string> {
  const count = await prisma.reimbursementClaim.count();
  const latest = await prisma.reimbursementClaim.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { claimNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.claimNumber) {
    const parsed = parseInt(latest.claimNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `RMB-${String(nextNum).padStart(5, '0')}`;
}

export async function generateLoanNumber(): Promise<string> {
  const count = await prisma.employeeLoan.count();
  const latest = await prisma.employeeLoan.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { loanNumber: true },
  });

  let nextNum = count + 1;
  if (latest?.loanNumber) {
    const parsed = parseInt(latest.loanNumber.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `LON-${String(nextNum).padStart(5, '0')}`;
}

export async function generatePayslipNumber(year: number, month: number): Promise<string> {
  const count = await prisma.payslip.count({
    where: { periodCode: `PAY-${year}-${String(month).padStart(2, '0')}` },
  });
  const nextNum = count + 1;
  return `PSL-${year}-${String(month).padStart(2, '0')}-${String(nextNum).padStart(5, '0')}`;
}

export async function generatePolicyCode(): Promise<string> {
  const count = await prisma.hrPolicy.count();
  const latest = await prisma.hrPolicy.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { policyCode: true },
  });

  let nextNum = count + 1;
  if (latest?.policyCode) {
    const parsed = parseInt(latest.policyCode.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= nextNum) {
      nextNum = parsed + 1;
    }
  }
  return `POL-${String(nextNum).padStart(5, '0')}`;
}
