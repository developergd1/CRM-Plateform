export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'FOLLOW_UP',
  'UNQUALIFIED',
  'CONVERTED',
  'LOST',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL',
  'LINKEDIN',
  'ADVERTISEMENT',
  'CAMPAIGN',
  'MANUAL',
  'OTHER',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED'],
  CONTACTED: ['QUALIFIED', 'FOLLOW_UP', 'UNQUALIFIED', 'LOST'],
  FOLLOW_UP: ['CONTACTED', 'QUALIFIED', 'LOST'],
  QUALIFIED: ['CONVERTED', 'LOST'],
  UNQUALIFIED: [],
  CONVERTED: [],
  LOST: [],
};

export function isValidLeadTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = LEAD_STATUS_TRANSITIONS[fromStatus as LeadStatus] || [];
  return allowed.includes(toStatus as LeadStatus);
}

export const OPPORTUNITY_STAGES = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const DEAL_STAGES = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const DEAL_STAGE_DEFAULT_PROBABILITIES: Record<DealStage, number> = {
  NEW: 10,
  QUALIFIED: 30,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0,
};

export const DEAL_STAGE_TRANSITIONS: Record<DealStage, DealStage[]> = {
  NEW: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'WON', 'LOST'],
  NEGOTIATION: ['PROPOSAL', 'WON', 'LOST'],
  WON: ['NEGOTIATION'], // Reopening
  LOST: ['NEW', 'QUALIFIED'], // Reopening
};

export function isValidDealStageTransition(fromStage: string, toStage: string): boolean {
  if (fromStage === toStage) return true;
  const allowed = DEAL_STAGE_TRANSITIONS[fromStage as DealStage] || [];
  return allowed.includes(toStage as DealStage);
}

export const PROPOSAL_STATUSES = [
  'NOT_REQUIRED',
  'DRAFT',
  'PREPARED',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const DEAL_STATUSES = [
  'OPEN',
  'WON',
  'LOST',
  'CANCELLED',
  // Backward compatibility with previous schema
  'DRAFT',
  'ACTIVE',
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const WON_REASONS = [
  'PRICE_COMPETITIVENESS',
  'PRODUCT_FIT',
  'SUPERIOR_SERVICE',
  'RELATIONSHIP',
  'REPUTATION',
  'SPEED_OF_DELIVERY',
  'OTHER',
] as const;

export type WonReason = (typeof WON_REASONS)[number];

export const LOST_REASONS = [
  'PRICE_TOO_HIGH',
  'LOST_TO_COMPETITOR',
  'LACK_OF_BUDGET',
  'PROJECT_CANCELLED',
  'FEATURE_GAP',
  'POOR_RESPONSIVENESS',
  'NO_DECISION',
  'OTHER',
] as const;

export type LostReason = (typeof LOST_REASONS)[number];

export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type CrmTaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;

export type CrmPriority = (typeof TASK_PRIORITIES)[number];

export const ACTIVITY_TYPES = [
  'CALL',
  'EMAIL',
  'MEETING',
  'FOLLOW_UP',
  'NOTE',
  'DEMO',
  'PROPOSAL',
  'OTHER',
] as const;

export type CrmActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = [
  'PLANNED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type CrmActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const FOLLOW_UP_STATUSES = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: 'New', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  CONTACTED: { label: 'Contacted', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  QUALIFIED: { label: 'Qualified', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  FOLLOW_UP: { label: 'Follow Up', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  UNQUALIFIED: { label: 'Unqualified', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
  CONVERTED: { label: 'Converted', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  LOST: { label: 'Lost', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
};

export const LEAD_PRIORITY_CONFIG: Record<LeadPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
  MEDIUM: { label: 'Medium', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  HIGH: { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  URGENT: { label: 'Urgent', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-500/20' },
};

export const OPPORTUNITY_STAGE_CONFIG: Record<OpportunityStage, { label: string; color: string; defaultProbability: number }> = {
  PROSPECTING: { label: 'Prospecting', color: 'text-blue-400', defaultProbability: 15 },
  QUALIFICATION: { label: 'Qualification', color: 'text-indigo-400', defaultProbability: 30 },
  PROPOSAL: { label: 'Proposal Sent', color: 'text-amber-400', defaultProbability: 50 },
  NEGOTIATION: { label: 'Negotiation', color: 'text-orange-400', defaultProbability: 75 },
  CLOSED_WON: { label: 'Closed Won', color: 'text-emerald-400', defaultProbability: 100 },
  CLOSED_LOST: { label: 'Closed Lost', color: 'text-rose-400', defaultProbability: 0 },
};

export const DEAL_STAGE_CONFIG: Record<DealStage, { label: string; color: string; bg: string; defaultProbability: number }> = {
  NEW: { label: 'New / Discovery', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', defaultProbability: 10 },
  QUALIFIED: { label: 'Qualified', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', defaultProbability: 30 },
  PROPOSAL: { label: 'Proposal', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', defaultProbability: 60 },
  NEGOTIATION: { label: 'Negotiation', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', defaultProbability: 80 },
  WON: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', defaultProbability: 100 },
  LOST: { label: 'Lost', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', defaultProbability: 0 },
};

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  NOT_REQUIRED: { label: 'Not Required', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  DRAFT: { label: 'Draft', color: 'text-slate-300', bg: 'bg-slate-400/10 border-slate-400/20' },
  PREPARED: { label: 'Prepared', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  SENT: { label: 'Sent', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  VIEWED: { label: 'Viewed', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  ACCEPTED: { label: 'Accepted', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  REJECTED: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
};

export const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  WON: { label: 'Won', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  LOST: { label: 'Lost', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-600/10 border-slate-600/20' },
  DRAFT: { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  ACTIVE: { label: 'Active', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

export const TASK_PRIORITY_CONFIG: Record<CrmPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  MEDIUM: { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  HIGH: { label: 'High', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  URGENT: { label: 'Urgent', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
};
