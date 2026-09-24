import bcrypt from 'bcryptjs';
import { prisma, resolveEmployeeObjectId } from '@/lib/prisma';
import {
  generateRequisitionNumber,
  generateJobCode,
  generateCandidateNumber,
  generateInterviewNumber,
  generateOfferNumber,
  generateEmployeeId,
} from '@/lib/id-generator';
import { logAuditEvent } from '@/lib/audit';

export async function createJobRequisition(
  input: {
    title: string;
    departmentId?: string | null;
    designation: string;
    headcount?: number;
    budgetMin?: number | null;
    budgetMax?: number | null;
    reason?: string;
  },
  user: { id: string; fullName: string }
) {
  const reqNumber = await generateRequisitionNumber();

  // Find or create default department if not provided
  let deptId = input.departmentId;
  if (!deptId) {
    const defaultDept = await prisma.department.findFirst();
    deptId = defaultDept ? defaultDept.id : (await prisma.department.create({
      data: { name: 'Engineering & Technology', code: 'ENG' },
    })).id;
  }

  const requisition = await prisma.jobRequisition.create({
    data: {
      reqNumber,
      title: input.title,
      departmentId: deptId,
      designation: input.designation || input.title,
      headcount: input.headcount || 1,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      reason: input.reason || 'EXPANSION',
      status: 'APPROVED',
      requestedById: user.id,
    },
    include: {
      openings: true,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: requisition.id,
    reason: `Created requisition ${reqNumber}: ${input.title}`,
  });

  return requisition;
}

export async function getJobRequisitions(requestedById?: string) {
  const where: any = {};
  if (requestedById) where.requestedById = requestedById;
  return prisma.jobRequisition.findMany({
    where,
    include: {
      openings: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createJobOpening(
  input: {
    title: string;
    description?: string;
    requirements?: string | null;
    location?: string;
    jobLocation?: string;
    openPositions?: number;
    requisitionId?: string | null;
  },
  user: { id: string; fullName: string }
) {
  const jobCode = await generateJobCode();

  // Ensure requisition exists
  let reqId = input.requisitionId;
  if (!reqId) {
    const defaultReq = await prisma.jobRequisition.findFirst();
    if (defaultReq) {
      reqId = defaultReq.id;
    } else {
      const createdReq = await createJobRequisition(
        { title: input.title, designation: input.title },
        user
      );
      reqId = createdReq.id;
    }
  }

  const opening = await prisma.jobOpening.create({
    data: {
      jobCode,
      requisitionId: reqId,
      title: input.title,
      description: input.description || input.title,
      requirements: input.requirements,
      location: input.location || input.jobLocation || 'Headquarters',
      status: 'OPEN',
    },
    include: {
      requisition: true,
      _count: { select: { candidates: true } },
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: opening.id,
    reason: `Created job opening ${jobCode}: ${input.title}`,
  });

  return {
    ...opening,
    openPositions: input.openPositions || 1,
    jobLocation: opening.location,
  };
}

export async function getJobOpenings(filters?: { status?: string; requestedById?: string }) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.requestedById) {
    where.requisition = { requestedById: filters.requestedById };
  }

  const openings = await prisma.jobOpening.findMany({
    where,
    include: {
      requisition: true,
      _count: { select: { candidates: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return openings.map((o) => ({
    ...o,
    openPositions: o.requisition?.headcount || 1,
    jobLocation: o.location,
  }));
}

export async function createCandidate(
  input: {
    jobOpeningId: string;
    fullName: string;
    email: string;
    phone: string;
    currentCompany?: string | null;
    expectedCtc?: number | null;
    totalExperienceYears?: number | null;
    source?: string | null;
  },
  user: { id: string; fullName: string }
) {
  const candidateNumber = await generateCandidateNumber();

  const candidate = await prisma.candidate.create({
    data: {
      candidateNumber,
      openingId: input.jobOpeningId,
      fullName: input.fullName,
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),
      currentCompany: input.currentCompany,
      expectedCtc: input.expectedCtc,
      source: input.source || 'PORTAL',
      stage: 'APPLIED',
    },
    include: {
      opening: true,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: candidate.id,
    reason: `Added candidate ${candidateNumber} (${input.fullName})`,
  });

  return {
    ...candidate,
    jobOpening: candidate.opening,
  };
}

export async function getCandidates(filters?: { jobOpeningId?: string; stage?: string; requestedById?: string }) {
  const where: any = {};
  if (filters?.jobOpeningId) where.openingId = filters.jobOpeningId;
  if (filters?.stage) where.stage = filters.stage;
  if (filters?.requestedById) {
    where.opening = { requisition: { requestedById: filters.requestedById } };
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      opening: true,
      interviews: {
        include: { evaluations: true },
        orderBy: { scheduledAt: 'asc' },
      },
      offers: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return candidates.map((c) => ({
    ...c,
    jobOpening: c.opening,
    jobOpeningId: c.openingId,
    jobOffer: c.offers[0] || null,
  }));
}

export async function updateCandidateStage(
  candidateId: string,
  stage: string,
  user: { id: string; fullName: string }
) {
  const candidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: { stage },
    include: { opening: true },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'UPDATE',
    entityType: 'SYSTEM',
    entityId: candidateId,
    reason: `Updated candidate ${candidate.candidateNumber} stage to ${stage}`,
  });

  return {
    ...candidate,
    jobOpening: candidate.opening,
  };
}

export async function scheduleInterview(
  input: {
    candidateId: string;
    interviewerId: string;
    roundName: string;
    scheduledTime: string;
    durationMinutes?: number;
    meetingLink?: string | null;
  },
  user: { id: string; fullName: string }
) {
  const interviewNumber = await generateInterviewNumber();

  // Resolve interviewer employee ID
  const resolvedInterviewerId = await resolveEmployeeObjectId(input.interviewerId) || input.interviewerId;

  const interview = await prisma.interview.create({
    data: {
      interviewNumber,
      candidateId: input.candidateId,
      roundName: input.roundName,
      scheduledAt: new Date(input.scheduledTime),
      durationMins: input.durationMinutes || 45,
      interviewerId: resolvedInterviewerId,
      meetingLink: input.meetingLink,
      status: 'SCHEDULED',
    },
    include: {
      candidate: true,
    },
  });

  await prisma.candidate.update({
    where: { id: input.candidateId },
    data: { stage: 'INTERVIEW' },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'SYSTEM',
    entityId: interview.id,
    reason: `Scheduled interview ${interviewNumber} (${input.roundName})`,
  });

  return interview;
}

export async function submitInterviewEvaluation(
  input: {
    interviewId: string;
    rating: number;
    feedback: string;
    recommendation: string;
  },
  user: { id: string; fullName: string }
) {
  const evaluation = await prisma.interviewEvaluation.create({
    data: {
      interviewId: input.interviewId,
      rating: input.rating,
      feedback: input.feedback,
      recommendation: input.recommendation,
      submittedById: user.id,
    },
  });

  await prisma.interview.update({
    where: { id: input.interviewId },
    data: { status: 'COMPLETED' },
  });

  return evaluation;
}

export async function createJobOffer(
  input: {
    candidateId: string;
    offeredCtc: number;
    offeredRole: string;
    offeredDepartment: string;
    joiningDate: string;
    expiryDate: string;
    offerLetterUrl?: string | null;
  },
  user: { id: string; fullName: string }
) {
  const offerNumber = await generateOfferNumber();

  const offer = await prisma.jobOffer.create({
    data: {
      offerNumber,
      candidateId: input.candidateId,
      offeredCtc: input.offeredCtc,
      offeredRole: input.offeredRole,
      offeredDepartment: input.offeredDepartment,
      joiningDate: new Date(input.joiningDate),
      expiryDate: new Date(input.expiryDate),
      offerLetterUrl: input.offerLetterUrl,
      status: 'ISSUED',
      approvedById: user.id,
      issuedAt: new Date(),
    },
    include: { candidate: true },
  });

  await prisma.candidate.update({
    where: { id: input.candidateId },
    data: { stage: 'OFFER' },
  });

  return offer;
}

export async function updateOfferStatus(
  offerId: string,
  status: string,
  user: { id: string; fullName: string }
) {
  const offer = await prisma.jobOffer.update({
    where: { id: offerId },
    data: {
      status,
      acceptedAt: status === 'ACCEPTED' ? new Date() : undefined,
    },
    include: { candidate: true },
  });

  if (status === 'ACCEPTED') {
    await prisma.candidate.update({
      where: { id: offer.candidateId },
      data: { stage: 'HIRED' },
    });
  }

  return offer;
}

/**
 * ATOMIC CANDIDATE CONVERSION TO EMS EMPLOYEE
 */
export async function convertCandidateToEmployee(
  candidateId: string,
  options: {
    joiningDate?: string;
    departmentId?: string | null;
    designation?: string | null;
    offeredCtc?: number | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    panNumber?: string | null;
    defaultPassword?: string | null;
  },
  adminUser: { id: string; fullName: string }
) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      opening: true,
      offers: true,
    },
  });

  if (!candidate) {
    throw new Error('Candidate not found');
  }

  if (candidate.convertedEmployeeId) {
    throw new Error(`Candidate already converted (ID: ${candidate.convertedEmployeeId})`);
  }

  const latestOffer = candidate.offers[0];
  const finalDesignation = options.designation || latestOffer?.offeredRole || candidate.opening?.title || 'Associate';
  const finalCtc = options.offeredCtc || latestOffer?.offeredCtc || candidate.expectedCtc || 600000;
  const finalJoiningDate = options.joiningDate ? new Date(options.joiningDate) : (latestOffer?.joiningDate || new Date());

  // Check unique phone number in Employee table
  const existingWithPhone = await prisma.employee.findUnique({
    where: { phone: candidate.phone },
  });

  if (existingWithPhone) {
    throw new Error(`Employee with phone ${candidate.phone} already exists in EMS (${existingWithPhone.employeeId})`);
  }

  // Create User account if not existing
  let userAccount = await prisma.user.findUnique({
    where: { email: candidate.email },
  });

  if (!userAccount) {
    let empRole = await prisma.role.findFirst({
      where: { name: 'EMPLOYEE' },
    });
    if (!empRole) {
      empRole = await prisma.role.create({
        data: {
          name: 'EMPLOYEE',
          displayName: 'Employee',
          description: 'Employee workspace',
          isSystem: true,
        },
      });
    }

    const defaultPwd = options.defaultPassword || `GI#Emp${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(defaultPwd, 10);

    userAccount = await prisma.user.create({
      data: {
        email: candidate.email,
        passwordHash: hashedPassword,
        roleId: empRole.id,
        isActive: true,
        isSuspended: false,
      },
    });
  }

  // Generate official EMS Employee ID: GI-EMP-XXXXXX
  const newEmpIdCode = await generateEmployeeId();

  // Create EMS Employee Master Record
  const newEmployee = await prisma.employee.create({
    data: {
      employeeId: newEmpIdCode,
      userId: userAccount.id,
      fullName: candidate.fullName,
      phone: candidate.phone,
      personalEmail: candidate.email,
      designation: finalDesignation,
      departmentId: options.departmentId,
      jobLocation: candidate.opening?.location || 'Headquarters',
      location: candidate.opening?.location || 'Headquarters',
      joiningDate: finalJoiningDate,
      employmentType: 'Full-Time',
      status: 'ACTIVE',
      isBlocked: false,
      panNumber: options.panNumber,
    },
  });

  // Link candidate and mark stage HIRED
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      convertedEmployeeId: newEmployee.id,
      stage: 'HIRED',
    },
  });

  // Ensure default salary structure exists
  let defaultStructure = await prisma.salaryStructure.findFirst({
    where: { isActive: true },
  });

  if (!defaultStructure) {
    defaultStructure = await prisma.salaryStructure.create({
      data: {
        code: 'STR-STANDARD',
        name: 'Standard Executive Grade Structure',
        description: 'Standard corporate structure with PF, PT, and HRA allowances',
        isActive: true,
      },
    });
  }

  const monthlyGross = Math.round(finalCtc / 12);
  await prisma.employeeSalaryAssignment.create({
    data: {
      employeeId: newEmployee.id,
      structureId: defaultStructure.id,
      annualCtc: finalCtc,
      monthlyCtc: monthlyGross,
      effectiveFrom: finalJoiningDate,
      isCurrent: true,
      bankAccount: options.bankAccountNumber,
      bankIfsc: options.bankIfscCode,
      panNumber: options.panNumber,
      assignedById: adminUser.id,
    },
  });

  await logAuditEvent({
    actorUserId: adminUser.id,
    action: 'CREATE',
    entityType: 'EMPLOYEE',
    entityId: newEmployee.id,
    reason: `Converted candidate ${candidate.candidateNumber} (${candidate.fullName}) to EMS Employee ${newEmpIdCode}`,
  });

  return {
    success: true,
    employee: newEmployee,
    employeeId: newEmpIdCode,
    candidateId: candidate.id,
  };
}
