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
  return isAdmin(role) || role === 'CLIENT';
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

export type AdminDelegatedUser = {
  role?: string;
  isDelegated?: boolean;
  delegatedPermissions?: string[] | null;
} | null | undefined;

/**
 * Checks if an administrator has permission for a specific module, feature, or tab.
 * Non-delegated admins and SUPER_ADMIN have full access to all features.
 */
export function hasAdminPermission(
  user: AdminDelegatedUser,
  requiredPermissionOrTab: string
): boolean {
  if (!user) return false;
  // Non-admins do not use admin permissions
  if (!isAdmin(user.role)) return false;
  // Super Admins or non-delegated platform administrators have full unrestricted access
  if (user.role === 'SUPER_ADMIN' || !user.isDelegated) return true;

  const perms = Array.isArray(user.delegatedPermissions) ? user.delegatedPermissions : [];
  if (perms.length === 0) return false;
  if (perms.includes('all_access')) return true;

  // Direct match
  if (perms.includes(requiredPermissionOrTab)) return true;

  // Granular to Scope Mappings:
  // 1. CMS Suite
  const cmsTabs = ['clients', 'clients-onboarding', 'clients-accounts', 'cms-hub', 'cms-dashboard', 'cms-onboarding', 'cms-clients', 'cms-selected-client', 'cms'];
  if (cmsTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('cms_full') || perms.includes('clients') || perms.includes('CMS');
  }

  // 2. Core HRM Suite (Lifecycle, Directory, Recruitment, Organization, Performance, Helpdesk)
  const hrmCoreTabs = [
    'employees', 'hrm-dashboard', 'hrm-lifecycle', 'hrm-employees', 'hrm-organization',
    'hrm-recruitment', 'hrm-performance', 'hrm-helpdesk', 'hrm-self-service', 'lifecycle'
  ];
  if (hrmCoreTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('hrm_full') || perms.includes('HRM') || perms.includes(requiredPermissionOrTab);
  }

  // 3. Workforce & Attendance
  const workforceTabs = [
    'attendance', 'workforce-live', 'workforce-policy', 'workforce-timesheets',
    'leave', 'regularization', 'hrm-attendance', 'hrm-leave', 'hrm-shifts', 'shifts'
  ];
  if (workforceTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('workforce_full') || perms.includes('hrm_full') || perms.includes(requiredPermissionOrTab);
  }

  // 4. Payroll & Compensation
  const payrollTabs = ['payroll', 'hrm-payroll', 'payroll_admin'];
  if (payrollTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('payroll_admin') || perms.includes('hrm-payroll') || perms.includes('payroll');
  }

  // 5. Tasks & Delegation
  const tasksTabs = ['tasks', 'tasks_admin'];
  if (tasksTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('tasks_admin') || perms.includes('tasks');
  }

  // 6. Security & Governance
  const securityTabs = ['security', 'audit-logs', 'block-history', 'password-requests', 'security_audit'];
  if (securityTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('security_audit') || perms.includes('system_settings') || perms.includes(requiredPermissionOrTab);
  }

  // 7. System Administration & Delegated Invites
  const systemTabs = ['admin-invites', 'system_settings', 'hrm-configuration', 'hrm-workflows'];
  if (systemTabs.includes(requiredPermissionOrTab)) {
    return perms.includes('system_settings') || perms.includes('admin-invites') || perms.includes(requiredPermissionOrTab);
  }

  // 8. General Reports
  if (requiredPermissionOrTab === 'reports' || requiredPermissionOrTab === 'hrm-reports') {
    return perms.some(p => ['hrm_full', 'workforce_full', 'security_audit', 'system_settings', 'reports'].includes(p));
  }

  // 9. Dashboard
  if (requiredPermissionOrTab === 'dashboard' || requiredPermissionOrTab === 'executive-dashboard') {
    return perms.length > 0;
  }

  return false;
}

/**
 * Checks if an administrator can access an entire Platform profile (CMS, HRM, CRM).
 */
export function canAdminAccessPlatform(
  user: AdminDelegatedUser,
  platform: 'CMS' | 'HRM' | 'CRM' | 'GATEWAY' | 'EMS' | string
): boolean {
  if (!user) return false;
  if (!isAdmin(user.role)) return false;
  if (user.role === 'SUPER_ADMIN' || !user.isDelegated) return true;

  const perms = Array.isArray(user.delegatedPermissions) ? user.delegatedPermissions : [];
  if (perms.length === 0) return false;
  if (perms.includes('all_access')) return true;

  if (platform === 'GATEWAY') {
    return true;
  }

  if (platform === 'CMS') {
    return perms.some(p => ['cms_full', 'clients', 'CMS'].includes(p));
  }

  if (platform === 'HRM' || platform === 'EMS') {
    return perms.some(p =>
      ['hrm_full', 'workforce_full', 'payroll_admin', 'tasks_admin', 'HRM', 'EMS'].includes(p) ||
      p.startsWith('hrm-') ||
      ['attendance', 'leave', 'employees', 'shifts'].includes(p)
    );
  }

  if (platform === 'CRM') {
    return perms.some(p => p.startsWith('crm') || p.includes('crm') || p === 'CRM');
  }

  return false;
}

/**
 * Checks if an admin can view and manage the Administrator Team & Invitations.
 */
export function canAccessAdminTeam(user: AdminDelegatedUser): boolean {
  if (!user) return false;
  if (!isAdmin(user.role)) return false;
  if (user.role === 'SUPER_ADMIN' || !user.isDelegated) return true;

  const perms = Array.isArray(user.delegatedPermissions) ? user.delegatedPermissions : [];
  return perms.some(p => ['system_settings', 'admin-invites', 'all_access'].includes(p));
}

/**
 * Checks if an admin can access a specific HRM section card.
 */
export function canAccessHrmSection(user: AdminDelegatedUser, sectionId: string): boolean {
  if (!user) return false;
  if (!isAdmin(user.role)) return false;
  if (user.role === 'SUPER_ADMIN' || !user.isDelegated) return true;

  const perms = Array.isArray(user.delegatedPermissions) ? user.delegatedPermissions : [];
  if (perms.length === 0) return false;
  if (perms.includes('all_access')) return true;

  switch (sectionId) {
    case 'dashboard':
      return canAdminAccessPlatform(user, 'HRM');
    case 'workforce':
      return hasAdminPermission(user, 'hrm_full');
    case 'attendance':
      return hasAdminPermission(user, 'workforce_full') || hasAdminPermission(user, 'hrm_full');
    case 'payroll':
      return hasAdminPermission(user, 'payroll_admin');
    case 'performance':
      return hasAdminPermission(user, 'hrm_full');
    case 'governance':
      return hasAdminPermission(user, 'system_settings') || hasAdminPermission(user, 'security_audit') || hasAdminPermission(user, 'hrm_full');
    default:
      return hasAdminPermission(user, sectionId);
  }
}



