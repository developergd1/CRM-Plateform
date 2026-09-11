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
