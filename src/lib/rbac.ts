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

