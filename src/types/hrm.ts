// ============================================================
// GROWTH INDIA — HRM & PAYROLL ENTERPRISE TYPES
// ============================================================

export type LeaveDayType = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
export type LeaveStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveTransactionType = 'OPENING' | 'ACCRUAL' | 'USAGE' | 'ADJUSTMENT' | 'ENCASHMENT' | 'LAPSE';

export type JobStatus = 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
export type CandidateStage = 'APPLIED' | 'SCREENING' | 'INTERVIEWING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
export type OfferStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export type GoalCategory = 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATIONAL';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DEFERRED';
export type ReviewCycleStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED';
export type ReviewStatus = 'PENDING_SELF' | 'PENDING_MANAGER' | 'COMPLETED' | 'CANCELLED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_EMPLOYEE' | 'RESOLVED' | 'CLOSED';
export type HrRequestStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSED';

export type PayrollPeriodStatus = 'DRAFT' | 'PROCESSING' | 'UNDER_REVIEW' | 'APPROVED' | 'FINALIZED';
export type SalaryComponentType = 'EARNING' | 'DEDUCTION' | 'BENEFIT';
export type CalculationMethod = 'FIXED' | 'PERCENTAGE_OF_BASIC' | 'FORMULA';
export type ReimbursementStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'PAID' | 'DEFAULTED';

// Policies
export interface HrPolicyItem {
  id: string;
  code: string;
  title: string;
  category: string;
  content: string;
  documentUrl?: string | null;
  version: number;
  isActive: boolean;
  requiresAcknowledgment: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    acknowledgments: number;
  };
}

export interface HrPolicyAcknowledgmentItem {
  id: string;
  policyId: string;
  employeeId: string;
  acknowledgedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  policy?: HrPolicyItem;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
}

// Leaves
export interface LeaveTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isPaid: boolean;
  defaultAnnualQuota: number;
  carryForwardMax: number;
  encashable: boolean;
  colorHex?: string | null;
  isActive: boolean;
  policies?: LeavePolicyItem[];
}

export interface LeavePolicyItem {
  id: string;
  leaveTypeId: string;
  departmentId?: string | null;
  employmentType?: string | null;
  annualQuota: number;
  monthlyAccrualRate: number;
  minServiceDaysRequired: number;
  maxConsecutiveDays: number;
  noticePeriodDays: number;
  allowHalfDay: boolean;
  requiresAttachment: boolean;
  leaveType?: LeaveTypeItem;
}

export interface LeaveBalanceItem {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  accruedDays: number;
  usedDays: number;
  pendingDays: number;
  carriedForward: number;
  encashedDays: number;
  availableDays: number;
  leaveType?: LeaveTypeItem;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName?: string | null;
  };
}

export interface LeaveApplicationItem {
  id: string;
  applicationNumber: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  dayType: LeaveDayType;
  totalDays: number;
  reason: string;
  attachmentUrl?: string | null;
  status: LeaveStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  leaveType?: LeaveTypeItem;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName?: string | null;
  };
}

export interface LeaveLedgerItem {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  transactionType: LeaveTransactionType;
  days: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string | null;
  remarks?: string | null;
  actionBy: string;
  createdAt: string;
  leaveType?: LeaveTypeItem;
}

// Recruitment & ATS
export interface JobRequisitionItem {
  id: string;
  requisitionNumber: string;
  title: string;
  departmentId?: string | null;
  departmentName?: string | null;
  headcountNeeded: number;
  experienceMinYears: number;
  experienceMaxYears: number;
  salaryBudgetMin?: number | null;
  salaryBudgetMax?: number | null;
  businessJustification: string;
  urgency: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  openings?: JobOpeningItem[];
}

export interface JobOpeningItem {
  id: string;
  jobCode: string;
  title: string;
  departmentId?: string | null;
  departmentName?: string | null;
  jobLocation: string;
  employmentType: string;
  experienceLevel: string;
  openPositions: number;
  description: string;
  requirements?: string | null;
  status: JobStatus;
  requisitionId?: string | null;
  targetHireDate?: string | null;
  createdAt: string;
  updatedAt: string;
  requisition?: JobRequisitionItem | null;
  _count?: {
    candidates: number;
  };
}

export interface CandidateItem {
  id: string;
  candidateNumber: string;
  jobOpeningId: string;
  fullName: string;
  email: string;
  phone: string;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperienceYears?: number | null;
  currentCtc?: number | null;
  expectedCtc?: number | null;
  noticePeriodDays?: number | null;
  resumeUrl?: string | null;
  stage: CandidateStage;
  source?: string | null;
  assignedRecruiterId?: string | null;
  notes?: string | null;
  convertedEmployeeId?: string | null;
  createdAt: string;
  updatedAt: string;
  jobOpening?: JobOpeningItem;
  interviews?: InterviewItem[];
  jobOffer?: JobOfferItem | null;
}

export interface InterviewItem {
  id: string;
  interviewNumber: string;
  candidateId: string;
  interviewerId: string;
  roundNumber: number;
  roundName: string;
  scheduledTime: string;
  durationMinutes: number;
  meetingLink?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  candidate?: CandidateItem;
  evaluations?: InterviewEvaluationItem[];
}

export interface InterviewEvaluationItem {
  id: string;
  interviewId: string;
  interviewerId: string;
  interviewerName: string;
  technicalRating: number;
  communicationRating: number;
  culturalFitRating: number;
  overallRating: number;
  feedback: string;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  submittedAt: string;
}

export interface JobOfferItem {
  id: string;
  offerNumber: string;
  candidateId: string;
  designation: string;
  departmentId?: string | null;
  offeredCtc: number;
  joiningDate: string;
  expiryDate: string;
  status: OfferStatus;
  offerLetterUrl?: string | null;
  notes?: string | null;
  candidate?: CandidateItem;
  createdAt: string;
}

// Performance & OKRs
export interface PerformanceCycleItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ReviewCycleStatus;
  description?: string | null;
  createdAt: string;
  _count?: {
    reviews: number;
  };
}

export interface GoalItem {
  id: string;
  goalNumber: string;
  employeeId: string;
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetMetric?: string | null;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  startDate: string;
  targetDate: string;
  status: GoalStatus;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
  keyResults?: KeyResultItem[];
  createdAt: string;
}

export interface KeyResultItem {
  id: string;
  goalId: string;
  title: string;
  metric: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  updatedAt: string;
}

export interface PerformanceReviewItem {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  selfRating?: number | null;
  selfComments?: string | null;
  managerRating?: number | null;
  managerComments?: string | null;
  finalRating?: number | null;
  status: ReviewStatus;
  submittedAt?: string | null;
  cycle?: PerformanceCycleItem;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
}

// HR Service Desk & Requests
export interface HrRequestTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  slaHours: number;
  isActive: boolean;
}

export interface HrRequestItem {
  id: string;
  requestNumber: string;
  requestTypeId: string;
  employeeId: string;
  title: string;
  description: string;
  attachmentUrl?: string | null;
  status: HrRequestStatus;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  resolutionRemarks?: string | null;
  createdAt: string;
  requestType?: HrRequestTypeItem;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
}

export interface HelpdeskTicketItem {
  id: string;
  ticketNumber: string;
  employeeId: string;
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
  comments?: HelpdeskCommentItem[];
}

export interface HelpdeskCommentItem {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

// Payroll Engine
export interface SalaryComponentItem {
  id: string;
  code: string;
  name: string;
  type: SalaryComponentType;
  calculationMethod: CalculationMethod;
  formulaOrRate?: string | null;
  isTaxable: boolean;
  isPartfCtc: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SalaryStructureItem {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  isActive: boolean;
  components?: SalaryStructureComponentItem[];
  _count?: {
    assignments: number;
  };
}

export interface SalaryStructureComponentItem {
  id: string;
  structureId: string;
  componentId: string;
  amount: number;
  percentage?: number | null;
  component?: SalaryComponentItem;
}

export interface EmployeeSalaryAssignmentItem {
  id: string;
  employeeId: string;
  structureId: string;
  baseCtcAnnual: number;
  grossSalaryMonthly: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  customComponents?: Record<string, number> | null;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName?: string | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    panNumber?: string | null;
  };
  structure?: SalaryStructureItem;
}

export interface PayrollPeriodItem {
  id: string;
  periodCode: string; // PAY-YYYY-MM
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: PayrollPeriodStatus;
  processedAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  finalizedAt?: string | null;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  recordsCount: number;
  createdAt: string;
  records?: PayrollRecordItem[];
}

export interface PayrollRecordItem {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  lopDays: number;
  overtimeHours: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  isLocked: boolean;
  hasExceptions: boolean;
  exceptionRemarks?: string | null;
  earnings?: PayrollEarningItem[];
  deductions?: PayrollDeductionItem[];
  adjustments?: PayrollAdjustmentItem[];
  payslip?: PayslipItem | null;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName?: string | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    panNumber?: string | null;
  };
}

export interface PayrollEarningItem {
  id: string;
  payrollRecordId: string;
  componentCode: string;
  componentName: string;
  amount: number;
  isTaxable: boolean;
}

export interface PayrollDeductionItem {
  id: string;
  payrollRecordId: string;
  componentCode: string;
  componentName: string;
  amount: number;
  isStatutory: boolean;
}

export interface PayrollAdjustmentItem {
  id: string;
  payrollRecordId: string;
  type: string;
  amount: number;
  reason: string;
}

export interface ReimbursementClaimItem {
  id: string;
  claimNumber: string;
  employeeId: string;
  category: string;
  title: string;
  amount: number;
  receiptUrl?: string | null;
  claimDate: string;
  status: ReimbursementStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  payrollRecordId?: string | null;
  createdAt: string;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
}

export interface EmployeeLoanItem {
  id: string;
  loanNumber: string;
  employeeId: string;
  principalAmount: number;
  monthlyInstallment: number;
  totalInstallments: number;
  remainingInstallments: number;
  totalBalanceRemaining: number;
  disbursedDate: string;
  status: LoanStatus;
  purpose?: string | null;
  createdAt: string;
  schedules?: LoanRepaymentScheduleItem[];
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
  };
}

export interface LoanRepaymentScheduleItem {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  payrollRecordId?: string | null;
  paidDate?: string | null;
}

export interface PayslipItem {
  id: string;
  payslipNumber: string;
  payrollRecordId: string;
  employeeId: string;
  periodCode: string;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  netPayInWords: string;
  generatedAt: string;
  downloadToken?: string | null;
  downloadTokenExpiresAt?: string | null;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName?: string | null;
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    panNumber?: string | null;
  };
  payrollRecord?: PayrollRecordItem;
}

export interface PayrollApprovalLogItem {
  id: string;
  payrollPeriodId: string;
  action: 'PROCESSED' | 'REVIEWED' | 'APPROVED' | 'FINALIZED' | 'REJECTED';
  actionBy: string;
  actionRole: string;
  timestamp: string;
  remarks?: string | null;
}
