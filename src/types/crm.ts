import {
  LeadStatus,
  LeadSource,
  LeadPriority,
  OpportunityStage,
  DealStatus,
  DealStage,
  ProposalStatus,
  WonReason,
  LostReason,
  CrmTaskStatus,
  CrmPriority,
  CrmActivityType,
  CrmActivityStatus,
  FollowUpStatus,
} from '@/lib/constants/crm';

export interface DealStageHistoryItem {
  id: string;
  dealId: string;
  fromStage?: string | null;
  toStage: string;
  fromProbability?: number | null;
  toProbability: number;
  reason?: string | null;
  changedById?: string | null;
  changedBy?: {
    id?: string;
    employeeId: string;
    fullName: string;
  } | null;
  changedAt: string;
}

export interface LeadAssignmentItem {
  id: string;
  leadId: string;
  fromEmployeeId?: string | null;
  fromEmployee?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  toEmployeeId: string;
  toEmployee: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  };
  assignedById: string;
  assignedBy: {
    id: string;
    employeeId: string;
    fullName: string;
  };
  assignmentReason?: string | null;
  assignedAt: string;
}

export interface FollowUpItem {
  id: string;
  followUpNumber: string;
  title: string;
  remarks?: string | null;
  scheduledAt: string;
  completedAt?: string | null;
  status: FollowUpStatus;
  priority: CrmPriority;
  leadId?: string | null;
  lead?: {
    id: string;
    leadNumber: string;
    companyName: string;
    contactPerson: string;
    phone: string;
  } | null;
  contactId?: string | null;
  contact?: {
    id: string;
    contactNumber: string;
    fullName: string;
    phone: string;
  } | null;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    employeeId: string;
    fullName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadItem {
  id: string;
  leadNumber: string;
  companyName: string;
  contactPerson: string;
  fullName?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  leadScore: number;
  estimatedValue?: number | null;
  description?: string | null;
  isArchived: boolean;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
  createdBy?: string | null;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  convertedAt?: string | null;
  convertedToContactId?: string | null;
  convertedToDealId?: string | null;
  contacts?: ContactItem[];
  assignments?: LeadAssignmentItem[];
  activities?: CrmActivityItem[];
  followUps?: FollowUpItem[];
  notes?: CrmNoteItem[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts?: number;
    activities?: number;
    tasks?: number;
    notes?: number;
    assignments?: number;
    followUps?: number;
  };
}

export interface ContactItem {
  id: string;
  contactNumber: string;
  fullName: string;
  designation?: string | null;
  department?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  isDecisionMaker: boolean;
  isPrimary: boolean;
  status: string;
  notes?: string | null;
  isArchived: boolean;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
  } | null;
  leadId?: string | null;
  lead?: {
    id: string;
    leadNumber: string;
    companyName: string;
    contactPerson: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    opportunities?: number;
    activities?: number;
    tasks?: number;
    notesRel?: number;
    followUps?: number;
  };
}

export interface OpportunityItem {
  id: string;
  opportunityNumber: string;
  title: string;
  description?: string | null;
  value: number;
  currency?: string;
  stage: OpportunityStage | string;
  probability: number;
  productService?: string | null;
  competitor?: string | null;
  proposalStatus?: ProposalStatus | string | null;
  wonReason?: string | null;
  lossReason?: string | null;
  expectedCloseDate?: string | null;
  closedAt?: string | null;
  createdBy?: string | null;
  leadId?: string | null;
  lead?: {
    id: string;
    leadNumber: string;
    companyName: string;
    contactName: string;
    email?: string | null;
    phone?: string | null;
    status?: string;
  } | null;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
    contactPerson?: string;
    email?: string | null;
    mobile?: string;
  } | null;
  primaryContactId?: string | null;
  primaryContact?: {
    id: string;
    contactNumber: string;
    fullName: string;
    phone: string;
    email?: string | null;
    designation?: string | null;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
    officialEmail?: string | null;
  } | null;
  deals?: DealItem[];
  activities?: CrmActivityItem[];
  tasks?: CrmTaskItem[];
  followUps?: FollowUpItem[];
  notes?: CrmNoteItem[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    deals?: number;
    activities?: number;
    tasks?: number;
    notes?: number;
    followUps?: number;
  };
}

export interface DealItem {
  id: string;
  dealNumber: string;
  title: string;
  amount: number;
  currency: string;
  stage: DealStage;
  status: DealStatus | string;
  probability: number;
  weightedValue: number;
  proposalStatus?: ProposalStatus | string | null;
  productService?: string | null;
  competitor?: string | null;
  competitorNotes?: string | null;
  wonReason?: string | null;
  lostReason?: string | null;
  closingNotes?: string | null;
  startDate?: string | null;
  expectedCloseDate?: string | null;
  closingDate?: string | null;
  closedAt?: string | null;
  terms?: string | null;
  isConvertedToClient: boolean;
  convertedToClientId?: string | null;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
    contactPerson?: string;
    email?: string | null;
    mobile?: string;
    industry?: string | null;
    status?: string;
  } | null;
  leadId?: string | null;
  lead?: {
    id: string;
    leadNumber: string;
    companyName: string;
    contactName: string;
    email?: string | null;
    phone?: string | null;
    status?: string;
    source?: string;
  } | null;
  opportunityId?: string | null;
  opportunity?: {
    id: string;
    opportunityNumber: string;
    title: string;
    value?: number;
    stage?: string;
  } | null;
  primaryContactId?: string | null;
  primaryContact?: {
    id: string;
    contactNumber: string;
    fullName: string;
    phone: string;
    email?: string | null;
    designation?: string | null;
    department?: string | null;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
    officialEmail?: string | null;
  } | null;
  stageHistory?: DealStageHistoryItem[];
  activities?: CrmActivityItem[];
  tasks?: CrmTaskItem[];
  followUps?: FollowUpItem[];
  notes?: CrmNoteItem[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    activities?: number;
    tasks?: number;
    notes?: number;
    followUps?: number;
  };
}

export interface CrmActivityItem {
  id: string;
  activityNumber: string;
  type: CrmActivityType;
  subject: string;
  description?: string | null;
  durationMinutes?: number | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  status: CrmActivityStatus | string;
  clientId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  performedById?: string | null;
  performedBy?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmTaskItem {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  priority: CrmPriority;
  status: CrmTaskStatus;
  dueDate?: string | null;
  completedAt?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    employeeId: string;
    fullName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmNoteItem {
  id: string;
  content: string;
  isPinned: boolean;
  clientId?: string | null;
  leadId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  authorId?: string | null;
  author?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmPipelineSummary {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  followUpsDue: number;
  overdueFollowUps: number;
  convertedLeads: number;
  lostLeads: number;
  totalOpportunities: number;
  pipelineValue: number;
  totalDeals: number;
  wonDealsValue: number;
  openTasksCount: number;
  recentActivitiesCount: number;
}

export type DecisionRoleType =
  | 'DECISION_MAKER'
  | 'INFLUENCER'
  | 'CHAMPION'
  | 'USER'
  | 'GATEKEEPER'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'OTHER';

export interface AccountItem {
  id: string;
  accountCode: string;
  companyName: string;
  legalName?: string | null;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  email?: string | null;
  phone: string;
  city?: string | null;
  state?: string | null;
  country: string;
  address?: string | null;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'CUSTOMER' | 'FORMER_CUSTOMER';
  accountType: 'COMMERCIAL' | 'ENTERPRISE' | 'SMB' | 'PARTNER';
  source: string;
  annualRevenue?: number | null;
  ownerId?: string | null;
  owner?: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
  } | null;
  clientId?: string | null;
  client?: {
    id: string;
    clientId: string;
    companyName: string;
  } | null;
  tags?: string[];
  contacts?: any[];
  deals?: any[];
  quotes?: any[];
  contracts?: any[];
  _count?: {
    contacts?: number;
    deals?: number;
    quotes?: number;
    contracts?: number;
    activities?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageItem {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  colorToken: string;
  requiredFields: string[];
  isWon: boolean;
  isLost: boolean;
}

export interface PipelineItem {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStageItem[];
}

export interface ProductItem {
  id: string;
  productCode: string;
  name: string;
  type: 'PRODUCT' | 'SERVICE' | 'SUBSCRIPTION';
  category?: string | null;
  description?: string | null;
  unit: string;
  unitPrice: number;
  currency: string;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DealLineItemRecord {
  id: string;
  dealId: string;
  productId: string;
  product?: ProductItem;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface QuoteItemRecord {
  id: string;
  quoteId: string;
  productId: string;
  product?: ProductItem;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  version: number;
  dealId: string;
  deal?: any;
  accountId: string;
  account?: AccountItem;
  status:
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'SENT'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CANCELLED';
  issueDate: string;
  expiryDate?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  terms?: string | null;
  notes?: string | null;
  items?: QuoteItemRecord[];
  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadRecord = LeadItem;

export interface ContractRecord {
  id: string;
  contractNumber: string;
  accountId: string;
  account?: AccountItem;
  dealId: string;
  deal?: any;
  quoteId?: string | null;
  quote?: QuoteRecord | null;
  contractType: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  startDate: string;
  endDate: string;
  renewalDate?: string | null;
  value: number;
  currency: string;
  ownerId?: string | null;
  notes?: string | null;
  terms?: string | null;
  documentName?: string | null;
  renewalTerms?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RenewalRecord {
  id: string;
  renewalNumber: string;
  accountId: string;
  account?: AccountItem;
  contractId: string;
  contract?: ContractRecord;
  previousDealId: string;
  renewalDealId?: string | null;
  renewalDate: string;
  expectedValue: number;
  ownerId?: string | null;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'RENEWED' | 'LOST' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface ClientHandoffRecord {
  id: string;
  handoffReference: string;
  dealId: string;
  deal?: any;
  accountId: string;
  account?: AccountItem;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  dealValue: number;
  notes?: string | null;
  submittedById?: string | null;
  processedById?: string | null;
  processedAt?: string | null;
  rejectionReason?: string | null;
  createdClientId?: string | null;
  createdAt: string;
  updatedAt: string;
}

