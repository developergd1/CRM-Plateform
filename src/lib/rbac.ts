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

// CRM Permissions
export const CRM_PERMISSIONS = {
  VIEW_CRM: 'crm:view',
  MANAGE_LEADS: 'crm:leads:manage',
  CONVERT_LEAD: 'crm:leads:convert',
  MANAGE_CONTACTS: 'crm:contacts:manage',
  MANAGE_OPPORTUNITIES: 'crm:opportunities:manage',
  MANAGE_DEALS: 'crm:deals:manage',
  MANAGE_ACTIVITIES: 'crm:activities:manage',
  MANAGE_TASKS: 'crm:tasks:manage',
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

export function canDeleteCRMRecord(role?: string): boolean {
  return isAdmin(role);
}

