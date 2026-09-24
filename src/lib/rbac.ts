import { UserRoleType } from '@/types';

export function isAdmin(role?: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN_HR';
}

export function isSuperAdmin(role?: string): boolean {
  return isAdmin(role);
}

export function isAdminOrHR(role?: string): boolean {
  return isAdmin(role);
}

export function isClient(role?: string): boolean {
  return role === 'CLIENT';
}

export function isEmployee(role?: string): boolean {
  return role === 'EMPLOYEE';
}

export function isManagerOrAbove(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canReassignClients(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canManageEmployees(role?: string): boolean {
  return isAdmin(role);
}

export function canViewAuditLogs(role?: string): boolean {
  return isAdmin(role);
}

// CRM Action-based Permissions
export const CRM_PERMISSIONS = {
  VIEW_CRM: 'crm:view',
  LEADS_VIEW: 'crm:leads:view',
  LEADS_CREATE: 'crm:leads:create',
  LEADS_EDIT: 'crm:leads:edit',
  LEADS_ASSIGN: 'crm:leads:assign',
  LEADS_EXPORT: 'crm:leads:export',
  LEADS_CONVERT: 'crm:leads:convert',
  ACCOUNTS_VIEW: 'crm:accounts:view',
  ACCOUNTS_CREATE: 'crm:accounts:create',
  ACCOUNTS_EDIT: 'crm:accounts:edit',
  ACCOUNTS_MANAGE: 'crm:accounts:manage',
  CONTACTS_VIEW: 'crm:contacts:view',
  CONTACTS_MANAGE: 'crm:contacts:manage',
  DEALS_VIEW: 'crm:deals:view',
  DEALS_CREATE: 'crm:deals:create',
  DEALS_EDIT: 'crm:deals:edit',
  DEALS_CLOSE: 'crm:deals:close',
  DEALS_APPROVE: 'crm:deals:approve',
  QUOTES_VIEW: 'crm:quotes:view',
  QUOTES_CREATE: 'crm:quotes:create',
  QUOTES_EDIT: 'crm:quotes:edit',
  QUOTES_APPROVE: 'crm:quotes:approve',
  CONTRACTS_VIEW: 'crm:contracts:view',
  CONTRACTS_CREATE: 'crm:contracts:create',
  CONTRACTS_EDIT: 'crm:contracts:edit',
  CONTRACTS_RENEW: 'crm:contracts:renew',
  ACTIVITIES_VIEW: 'crm:activities:view',
  ACTIVITIES_MANAGE: 'crm:activities:manage',
  REPORTS_VIEW: 'crm:reports:view',
  REPORTS_EXPORT: 'crm:reports:export',
  WORKFLOWS_MANAGE: 'crm:workflows:manage',
  SETTINGS_MANAGE: 'crm:settings:manage',
} as const;

export function canAccessCRM(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL' || role === 'EMPLOYEE' || role === 'CLIENT';
}

export function canManageCRM(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canConvertLeads(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canApproveQuotes(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canManageContracts(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canExportCRMData(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canImportCRMData(role?: string): boolean {
  return isAdmin(role);
}

export function canDeleteCRMRecord(role?: string): boolean {
  return isAdmin(role);
}

export type ResourceScope = 'GLOBAL' | 'TEAM' | 'OWN' | 'CLIENT';

export function getCrmResourceScope(role?: string): ResourceScope {
  if (isAdmin(role)) return 'GLOBAL';
  if (role === 'MANAGER_TL') return 'TEAM';
  if (role === 'CLIENT') return 'CLIENT';
  return 'OWN';
}

// HRM & Payroll Action-based Permissions
export const HRM_PERMISSIONS = {
  VIEW_HRM: 'hrm:view',
  POLICIES_VIEW: 'hrm:policies:view',
  POLICIES_MANAGE: 'hrm:policies:manage',
  LEAVES_VIEW: 'hrm:leaves:view',
  LEAVES_APPLY: 'hrm:leaves:apply',
  LEAVES_APPROVE: 'hrm:leaves:approve',
  LEAVES_MANAGE_LEDGER: 'hrm:leaves:manage_ledger',
  RECRUITMENT_VIEW: 'hrm:recruitment:view',
  RECRUITMENT_MANAGE: 'hrm:recruitment:manage',
  CANDIDATE_CONVERT: 'hrm:candidate:convert',
  PERFORMANCE_VIEW: 'hrm:performance:view',
  PERFORMANCE_MANAGE: 'hrm:performance:manage',
  PERFORMANCE_REVIEW: 'hrm:performance:review',
  HELPDESK_VIEW: 'hrm:helpdesk:view',
  HELPDESK_MANAGE: 'hrm:helpdesk:manage',
  REQUESTS_VIEW: 'hrm:requests:view',
  REQUESTS_MANAGE: 'hrm:requests:manage',
} as const;

export const PAYROLL_PERMISSIONS = {
  VIEW_PAYROLL: 'payroll:view',
  PERIODS_MANAGE: 'payroll:periods:manage',
  PROCESS_PAYROLL: 'payroll:process',
  APPROVE_PAYROLL: 'payroll:approve',
  FINALIZE_PAYROLL: 'payroll:finalize',
  STRUCTURES_MANAGE: 'payroll:structures:manage',
  ASSIGNMENTS_MANAGE: 'payroll:assignments:manage',
  REIMBURSEMENTS_MANAGE: 'payroll:reimbursements:manage',
  LOANS_MANAGE: 'payroll:loans:manage',
  VIEW_ANY_PAYSLIP: 'payroll:payslip:view_any',
} as const;

export function canAccessHRM(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL' || role === 'EMPLOYEE' || role === 'CLIENT';
}

export function canManageHRM(role?: string): boolean {
  return isAdmin(role);
}

export function canApproveLeave(role?: string): boolean {
  return isAdmin(role) || role === 'MANAGER_TL';
}

export function canProcessPayroll(role?: string): boolean {
  return isAdmin(role);
}

export function canApprovePayroll(role?: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function canFinalizePayroll(role?: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function canManageSalaryStructure(role?: string): boolean {
  return isAdmin(role);
}

export function canConvertCandidate(role?: string): boolean {
  return isAdmin(role);
}

export function canViewEmployeePayslip(currentUserRole?: string, currentEmployeeId?: string, targetEmployeeId?: string): boolean {
  if (isAdmin(currentUserRole)) return true;
  if (!targetEmployeeId || !currentEmployeeId) return false;
  return currentEmployeeId === targetEmployeeId;
}

export function getHrmResourceScope(role?: string): ResourceScope {
  if (isAdmin(role)) return 'GLOBAL';
  if (role === 'MANAGER_TL') return 'TEAM';
  return 'OWN';
}


