'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Building2,
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  Eye,
  LogOut,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Key,
  Edit,
  LayoutDashboard,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  Ban,
  FileText,
  FileBarChart,
  LayoutGrid,
  List,
  Share2,
  Briefcase,
  Layers,
  FolderLock,
  CreditCard,
  Target,
  FileCheck2,
  PieChart,
  LifeBuoy,
  FileSpreadsheet,
} from 'lucide-react';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
import { EmployeeOnboardingWizard } from '@/components/employees/EmployeeOnboardingWizard';
import { EditEmployeeModal } from '@/components/employees/EditEmployeeModal';
import { EmployeeDetailDrawer } from '@/components/employees/EmployeeDetailDrawer';
import { PasswordResetRequestsModal } from '@/components/auth/PasswordResetRequestsModal';
import { ClientAttendanceHub } from './ClientAttendanceHub';
import { ClientRequestsView } from './ClientRequestsView';
import { LeaveView } from '../leave/LeaveView';
import { EmployeeItem } from '@/types';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { TaskManager } from '../tasks/TaskManager';
import { SharedAccessManager } from '../sharing/SharedAccessManager';
import { PresenceTracker } from '../presence/PresenceTracker';
import { ClientDocumentsView } from './ClientDocumentsView';
import { ClientSubscriptionView } from './ClientSubscriptionView';


// HRM Views
import { HrmDashboardView } from '../hrm/dashboard/HrmDashboardView';
import { HrmPayrollView } from '../hrm/payroll/HrmPayrollView';
import { HrmRecruitmentView } from '../hrm/recruitment/HrmRecruitmentView';
import { HrmPerformanceView } from '../hrm/performance/HrmPerformanceView';
import { HrmOrganizationView } from '../hrm/organization/HrmOrganizationView';
import { HrmHelpdeskView } from '../hrm/helpdesk/HrmHelpdeskView';
import { EmployeeLifecycleView } from '../lifecycle/EmployeeLifecycleView';

import { clientCache } from '@/lib/client-cache';

export interface ClientPortalShellProps {
  initialTab?: string;
}

export const normalizeClientTab = (rawTab: string | null | undefined): string => {
  if (!rawTab) return 'overview';
  const t = rawTab.toLowerCase().trim();
  if (t === 'dashboard' || t === 'dash-overview' || t === 'overview') return 'overview';
  if (t === 'employees' || t === 'dash-employees') return 'employees';
  if (t === 'onboarding' || t === 'employee-onboarding' || t === 'onboard-employee') return 'onboarding';
  if (t === 'workforce' || t === 'dash-workforce' || t === 'live-workforce') return 'attendance';
  if (t === 'attendance' || t === 'dash-attendance') return 'attendance';
  if (t === 'timesheets' || t === 'dash-timesheets') return 'attendance';
  if (t === 'reports' || t === 'dash-reports') return 'attendance';
  if (t === 'requests' || t === 'dash-requests' || t === 'password-requests') return 'requests';
  if (t === 'history' || t === 'block-history') return 'history';
  if (t === 'leave' || t === 'leaves' || t === 'dash-leave') return 'leave';
  if (t === 'tasks' || t === 'dash-tasks') return 'tasks';
  if (t === 'shared-access' || t === 'team' || t === 'invite' || t === 'shared') return 'shared-access';
  if (t === 'documents' || t === 'vault' || t === 'docs') return 'documents';
  if (t === 'subscription' || t === 'billing' || t === 'plan') return 'subscription';


  // HRM tabs
  if (t === 'hrm' || t === 'hrm-dashboard') return 'hrm-dashboard';
  if (t === 'hrm-payroll' || t === 'payroll') return 'hrm-payroll';
  if (t === 'hrm-recruitment' || t === 'recruitment') return 'hrm-recruitment';
  if (t === 'hrm-performance' || t === 'performance') return 'hrm-performance';
  if (t === 'hrm-organization' || t === 'organization') return 'hrm-organization';
  if (t === 'hrm-helpdesk' || t === 'helpdesk') return 'hrm-helpdesk';
  if (t === 'hrm-lifecycle' || t === 'lifecycle') return 'hrm-lifecycle';

  return t;
};

export type ClientSectionId = 'GATEWAY' | 'WORKSPACE' | 'EMS' | 'HRM' | 'SECURITY';

export const getSectionForTab = (rawTab: string | null | undefined): ClientSectionId => {
  if (!rawTab) return 'GATEWAY';
  const t = rawTab.toLowerCase().trim();
  if (t === 'gateway') return 'GATEWAY';
  if (['overview', 'employees', 'onboarding'].includes(t)) return 'WORKSPACE';
  if (['attendance', 'timesheets', 'reports', 'workforce', 'leave', 'tasks', 'documents'].includes(t)) return 'EMS';
  if (t.startsWith('hrm-') || t === 'hrm') return 'HRM';
  if (['subscription', 'history', 'requests', 'shared-access'].includes(t)) return 'SECURITY';
  return 'WORKSPACE';
};

export const ClientPortalShell: React.FC<ClientPortalShellProps> = ({ initialTab = 'overview' }) => {
  const { user, loading: authLoading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [user, authLoading]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const getInitialSubTab = (): string => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p && ['attendance', 'timesheets', 'reports', 'workforce'].includes(p.toLowerCase())) {
        return p.toLowerCase();
      }
    }
    if (initialTab && ['attendance', 'timesheets', 'reports', 'workforce'].includes(initialTab.toLowerCase())) {
      return initialTab.toLowerCase();
    }
    return 'attendance';
  };

  const getInitialTab = (): string => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (param) return normalizeClientTab(param);
    }
    return normalizeClientTab(initialTab);
  };

  const getInitialSection = (): ClientSectionId => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p) {
        if (p.toLowerCase() === 'gateway') return 'GATEWAY';
        if (!['overview', 'dashboard'].includes(p.toLowerCase())) {
          return getSectionForTab(p);
        }
      }
      try {
        const saved = localStorage.getItem('gi_client_selected_section') as ClientSectionId;
        if (saved && ['WORKSPACE', 'EMS', 'HRM', 'SECURITY'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'GATEWAY';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [selectedSection, setSelectedSection] = useState<ClientSectionId>(getInitialSection);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const sectionDropdownRef = React.useRef<HTMLDivElement>(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState<string>(getInitialSubTab);
  const [empViewMode, setEmpViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(e.target as Node)) {
        setSectionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync tab with browser back and forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') || (e.state && e.state.tab) || initialTab || 'gateway';
      const rawLower = tabParam.toLowerCase();
      if (rawLower === 'gateway') {
        setSelectedSection('GATEWAY');
        return;
      }
      if (['attendance', 'timesheets', 'reports', 'workforce'].includes(rawLower)) {
        setAttendanceSubTab(rawLower);
      }
      const canonical = normalizeClientTab(tabParam);
      setActiveTab(canonical);
      setSelectedSection(getSectionForTab(canonical));
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialTab]);

  const selectTab = (tabId: string, subTab?: string) => {
    const rawLower = tabId.toLowerCase();
    if (rawLower === 'gateway') {
      setSelectedSection('GATEWAY');
      try { localStorage.removeItem('gi_client_selected_section'); } catch {}
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('tab', 'gateway');
        window.history.pushState({ tab: 'gateway' }, '', currentUrl.toString());
      }
      return;
    }
    if (['attendance', 'timesheets', 'reports', 'workforce'].includes(rawLower)) {
      setAttendanceSubTab(subTab || rawLower);
    }
    const canonical = normalizeClientTab(tabId);
    setActiveTab(canonical);
    const targetSec = getSectionForTab(canonical);
    setSelectedSection(targetSec);
    try {
      localStorage.setItem('gi_client_selected_section', targetSec);
    } catch {}
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      const urlTab = subTab || (canonical === 'attendance' ? (subTab || attendanceSubTab || 'attendance') : canonical);
      if (currentUrl.searchParams.get('tab') !== urlTab) {
        currentUrl.searchParams.set('tab', urlTab);
        window.history.pushState({ tab: urlTab }, '', currentUrl.toString());
      }
    }
  };

  const handleSelectSection = (secId: ClientSectionId, defaultTab?: string) => {
    setSelectedSection(secId);
    try {
      localStorage.setItem('gi_client_selected_section', secId);
    } catch {}
    if (defaultTab) {
      selectTab(defaultTab);
    }
  };

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const cacheKey = `client_portal_${user?.clientId || 'cli'}_${search}_${statusFilter}`;
  const initialCached = clientCache.get<any>(`client_portal_${user?.clientId || 'cli'}__`);
  const [employees, setEmployees] = useState<EmployeeItem[]>(() => initialCached?.employees || []);
  const [blockHistories, setBlockHistories] = useState<any[]>(() => initialCached?.histories || []);
  const [loading, setLoading] = useState(() => !initialCached);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Block Modal state
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('Client Workplace Policy Infraction');
  const [blockRemarks, setBlockRemarks] = useState('');

  // Unblock Modal state
  const [unblockTarget, setUnblockTarget] = useState<any | null>(null);
  const [unblockReason, setUnblockReason] = useState('Client clearance and duty reinstatement');
  const [unblockRemarks, setUnblockRemarks] = useState('');

  // Password Reset Requests Modal & Quick Reset state
  const [showResetRequests, setShowResetRequests] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [quickResetEmp, setQuickResetEmp] = useState<any | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [quickResetLoading, setQuickResetLoading] = useState(false);
  const [quickResetResult, setQuickResetResult] = useState<string | null>(null);


  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [sectionRefreshing, setSectionRefreshing] = useState(false);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);

  const fetchResetRequestsCount = async () => {
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const data = await res.json();
        setPendingResetCount(data.pendingCount || 0);
      }
    } catch (e) {
      console.error('Error fetching reset count:', e);
    }
  };

  const fetchPendingLeaveCount = async () => {
    try {
      const res = await fetch('/api/leave?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setPendingLeaveCount((data.requests || []).length);
      }
    } catch (e) {
      console.error('Error fetching pending leave count:', e);
    }
  };

  const handleRefreshCurrentSection = async () => {
    setSectionRefreshing(true);
    try {
      clientCache.clear('client_portal_');
      clientCache.clear('client_attendance_');
      clientCache.clear('client_timesheets_');
      clientCache.clear('client_reports_');
      clientCache.clear('client_workforce_');
      setAttendanceRefreshKey(prev => prev + 1);

      await Promise.all([
        fetchData(true),
        fetchResetRequestsCount(),
        fetchPendingLeaveCount(),
      ]);
      setAlertMsg('Section data refreshed successfully.');
      setTimeout(() => setAlertMsg(null), 3000);
    } catch (e) {
      console.error('Section refresh error:', e);
    } finally {
      setSectionRefreshing(false);
    }
  };

  const fetchData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = clientCache.get<any>(cacheKey, 2 * 60 * 1000);
      if (cached) {
        setEmployees(cached.employees || []);
        setBlockHistories(cached.histories || []);
        setLoading(false);
      }
    } else {
      setLoading(true);
    }

    try {
      const [empRes, histRes] = await Promise.all([
        fetch(`/api/employees?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`),
        fetch('/api/employees/block-history'),
      ]);

      if (empRes.ok && histRes.ok) {
        const [empData, histData] = await Promise.all([empRes.json(), histRes.json()]);
        const emps = empData.employees || [];
        const hists = histData.histories || [];
        setEmployees(emps);
        setBlockHistories(hists);
        clientCache.set(cacheKey, { employees: emps, histories: hists });
      }
    } catch (e) {
      console.error('Error fetching client portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchResetRequestsCount();
    fetchPendingLeaveCount();
  }, []);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${blockTarget.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: blockReason,
          remarks: blockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`${blockTarget.fullName} (${blockTarget.employeeId}) has been BLOCKED.`);
        setBlockTarget(null);
        setBlockRemarks('');
        clientCache.clear('client_portal_');
        await fetchData(true);
        setTimeout(() => setAlertMsg(null), 4500);
      } else {
        setAlertMsg(`Error: ${data.error || 'Failed to block employee'}`);
      }
    } catch (e) {
      setAlertMsg('Network error while blocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unblockTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${unblockTarget.id}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: unblockReason,
          remarks: unblockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`${unblockTarget.fullName} (${unblockTarget.employeeId}) is now UNBLOCKED & ACTIVE.`);
        setUnblockTarget(null);
        setUnblockRemarks('');
        clientCache.clear('client_portal_');
        await fetchData(true);
        setTimeout(() => setAlertMsg(null), 4500);
      } else {
        setAlertMsg(`Error: ${data.error || 'Failed to unblock employee'}`);
      }
    } catch (e) {
      setAlertMsg('Network error while unblocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickResetEmp) return;

    setQuickResetLoading(true);
    setQuickResetResult(null);
    try {
      const generatedPwd = quickPassword.trim() || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch(`/api/employees/${quickResetEmp.employeeId || quickResetEmp.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: generatedPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickResetResult(generatedPwd);
        setAlertMsg(`Password for ${quickResetEmp.fullName} (${quickResetEmp.employeeId}) has been reset.`);
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch (e) {
      alert('Network error resetting password');
    } finally {
      setQuickResetLoading(false);
    }
  };

  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.status === 'ACTIVE' && !e.isBlocked).length;
  const blockedStaff = employees.filter((e) => e.status === 'BLOCKED' || e.isBlocked).length;

  interface ClientNavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    isLive?: boolean;
    badge?: number;
  }

  interface ClientNavSection {
    id: ClientSectionId;
    title: string;
    items: ClientNavItem[];
  }

  // Dynamic module navigation based on client entitlements
  const assigned = ((user as any)?.assignedModules && (user as any).assignedModules.length > 0)
    ? (user as any).assignedModules.map((m: string) => m.toUpperCase())
    : ['EMS'];

  const userDelegatedPerms: string[] = (user as any)?.delegatedPermissions || [];
  const hasEMS = assigned.includes('EMS') || (user?.isDelegated && userDelegatedPerms.some((p) => ['overview', 'employees', 'attendance', 'tasks', 'documents', 'onboarding'].includes(p)));
  const hasHRM = assigned.includes('HRM') || (user?.isDelegated && userDelegatedPerms.some((p) => p.startsWith('hrm-')));

  const navSections: ClientNavSection[] = [
    ...(hasEMS ? [{
      id: 'EMS' as ClientSectionId,
      title: 'TIME & WORKFORCE (EMS)',
      items: [
        { id: 'attendance', label: 'Attendance & Timesheets', icon: Calendar },
        { id: 'leave', label: 'Leave Management', icon: Briefcase, badge: pendingLeaveCount },
        { id: 'tasks', label: 'Tasks & Follow-ups', icon: Activity },
        { id: 'documents', label: 'Employee Documents', icon: FolderLock },
      ],
    }] : []),
    ...(hasHRM ? [{
      id: 'HRM' as ClientSectionId,
      title: 'HUMAN RESOURCES (HRM)',
      items: [
        { id: 'hrm-dashboard', label: 'HRM Dashboard', icon: LayoutDashboard },
        { id: 'hrm-lifecycle', label: 'Staff Lifecycle', icon: Users },
        { id: 'hrm-recruitment', label: 'Recruitment & Jobs', icon: Briefcase },
        { id: 'hrm-payroll', label: 'Payroll & Compensation', icon: CreditCard },
        { id: 'hrm-performance', label: 'Performance & Goals', icon: Target },
        { id: 'hrm-helpdesk', label: 'Employee Helpdesk', icon: LifeBuoy },
        { id: 'hrm-organization', label: 'Organization Units', icon: Building2 },
      ],
    }] : []),
    {
      id: 'WORKSPACE' as ClientSectionId,
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        ...(hasEMS ? [
          { id: 'employees', label: `My Employees (${totalStaff})`, icon: Users },
          { id: 'onboarding', label: 'Employee Onboarding', icon: UserPlus },
        ] : []),
      ],
    },
    {
      id: 'SECURITY' as ClientSectionId,
      title: 'SECURITY & GOVERNANCE',
      items: [
        { id: 'subscription', label: 'Subscription & Quota', icon: CreditCard },
        ...(hasEMS ? [
          { id: 'history', label: `Block History (${blockHistories.length})`, icon: Ban },
          { id: 'requests', label: 'Password Requests', icon: KeyRound, badge: pendingResetCount },
        ] : []),
        { id: 'shared-access', label: 'Shared Access / Team', icon: Share2 },
      ],
    },
  ];

  const availableSections = [
    ...(hasEMS ? [{
      id: 'EMS' as ClientSectionId,
      code: 'EMS',
      title: 'Time & Workforce Management',
      subtitle: 'Attendance, Timesheets, Leaves & Tasks',
      icon: Calendar,
      defaultTab: 'attendance',
      optionsSummary: 'Attendance • Leaves • Tasks • Documents',
    }] : []),
    ...(hasHRM ? [{
      id: 'HRM' as ClientSectionId,
      code: 'HRM',
      title: 'Human Resource Management',
      subtitle: 'Recruitment ATS, Payroll, Lifecycle & PMS',
      icon: Users,
      defaultTab: 'hrm-dashboard',
      optionsSummary: 'HRM Dashboard • Lifecycle • Payroll • ATS',
    }] : []),
    {
      id: 'WORKSPACE' as ClientSectionId,
      code: 'WORKSPACE',
      title: 'Workspace Portal',
      subtitle: 'Overview, Staff Directory & Onboarding',
      icon: Building2,
      defaultTab: 'overview',
      optionsSummary: 'Overview • My Employees • Onboarding',
    },
    {
      id: 'SECURITY' as ClientSectionId,
      code: 'SECURITY',
      title: 'Security & Governance Engine',
      subtitle: 'Subscriptions, Access Control & Logs',
      icon: ShieldCheck,
      defaultTab: 'subscription',
      optionsSummary: 'Subscriptions • Block History • Password Queue',
    },
  ];

  const currentSectionMeta = availableSections.find((s) => s.id === selectedSection) || availableSections[0];
  const activeSectionNav = navSections.find((s) => s.id === selectedSection);

  const isAllowed = (tabId: string) => {
    if (!user?.isDelegated) return true;
    if (!user?.delegatedPermissions || user.delegatedPermissions.length === 0) return false;
    return user.delegatedPermissions.includes(tabId);
  };

  useEffect(() => {
    if (user?.isDelegated && user.delegatedPermissions && user.delegatedPermissions.length > 0) {
      if (!isAllowed(activeTab)) {
        for (const sec of navSections) {
          const firstAllowed = sec.items.find((item) => isAllowed(item.id));
          if (firstAllowed) {
            setActiveTab(firstAllowed.id);
            break;
          }
        }
      }
    }
  }, [user?.isDelegated, user?.delegatedPermissions, activeTab]);

  // 1. GATEWAY MODE: Big, bold Title-based boxes that float in from left and right
  if (selectedSection === 'GATEWAY') {
    return (
      <div className="h-screen max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden font-sans select-none w-full">
        {/* Subtle brand ambient glow */}
        <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#0D9488]/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header Bar */}
        <header className="h-16 flex items-center justify-between border-b border-slate-200 bg-white shrink-0 px-4 md:px-6 z-20">
          <div className="flex items-center gap-3">
            <GrowthIndiaLogo size="sm" />
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-0.5 rounded-full border border-[#0D9488]/20">
                Client Workspace Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Password Reset Requests Button */}
            <button
              type="button"
              onClick={() => setShowResetRequests(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-xs transition-all bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 cursor-pointer"
              title="Password Reset Requests"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="hidden sm:inline">Reset Requests</span>
              {pendingResetCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-xs">
                  {pendingResetCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <NotificationBell variant="light" />

            {/* User details */}
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName || 'Client Administrator'}</p>
              <p className="text-[10px] font-mono text-slate-500 leading-tight">{user?.companyName || user?.clientId}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.fullName?.charAt(0) || 'C'}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center py-4 md:py-6 my-auto overflow-y-auto z-10">
          {/* Title */}
          <div className="text-center max-w-xl mx-auto mb-6 md:mb-10 shrink-0 px-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Select Operating Workspace
            </h1>
          </div>

          {/* Title-Based Boxes Grid (Flows left from left, right from right in a single horizontal line) */}
          <div
            className={`grid gap-4 xl:gap-6 mx-auto w-full px-4 ${
              availableSections.length <= 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                : availableSections.length === 3
                ? 'grid-cols-1 sm:grid-cols-3 max-w-4xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl'
            }`}
          >
            {availableSections.map((sec, idx) => {
              const isLeft = idx < Math.ceil(availableSections.length / 2);
              const SecIcon = sec.icon;
              return (
                <div
                  key={sec.id}
                  onClick={() => handleSelectSection(sec.id, sec.defaultTab)}
                  className={`${
                    isLeft ? 'animate-flow-left' : 'animate-flow-right'
                  } group relative bg-white hover:bg-slate-50/80 border-2 border-slate-200 hover:border-[#0D9488] rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between items-center text-center`}
                >
                  {/* Top Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] group-hover:scale-110 group-hover:bg-[#0D9488] group-hover:text-white transition-all duration-300 shadow-xs mb-3">
                    <SecIcon className="w-6 h-6" />
                  </div>

                  {/* Prominent Bold Letters (Medium Size) */}
                  <div className="my-auto py-2">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-[#0D9488] tracking-tight transition-colors">
                      {sec.code}
                    </h2>
                    <p className="text-xs font-bold text-slate-600 mt-1 transition-colors">
                      {sec.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {sec.optionsSummary}
                    </p>
                  </div>

                  {/* Launch Button */}
                  <div className="w-full pt-3">
                    <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 group-hover:bg-[#0D9488] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 shadow-xs group-hover:shadow-md">
                      <span>Enter {sec.code}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Clean Bottom Footer */}
        <footer className="h-10 flex items-center justify-between border-t border-slate-200 text-[11px] text-slate-500 bg-white shrink-0 px-4 md:px-6">
          <span className="font-semibold text-slate-700">Growth India Platform Suite</span>
          <span className="text-slate-500 font-medium">Enterprise Client Portal</span>
        </footer>

        {/* Password Reset Requests Modal */}
        <PasswordResetRequestsModal
          isOpen={showResetRequests}
          onClose={() => {
            setShowResetRequests(false);
            fetchResetRequestsCount();
          }}
          userRole="CLIENT"
          onPasswordResetSuccess={() => {
            fetchResetRequestsCount();
          }}
        />
      </div>
    );
  }

  // 2. OPERATING SECTION WORKSPACE VIEW
  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <PresenceTracker activeTab={activeTab} />

      {/* LEFT SIDEBAR (Clean Light Theme with Active Section Only) */}
      <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
          <GrowthIndiaLogo size="sm" />
        </div>

        {/* Section Header with Quick Hub Switcher (Replaces the old Client Title Bar) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 min-w-0">
            <currentSectionMeta.icon className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 truncate">
              {currentSectionMeta.code} Suite
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSection('GATEWAY');
              try { localStorage.removeItem('gi_client_selected_section'); } catch {}
            }}
            className="text-[10px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
            title="Return to Workspace Hub"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Hub</span>
          </button>
        </div>

        {/* Navigation Links Area (Filtered strictly to active Title / Section) */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {activeSectionNav?.title || currentSectionMeta.title}
          </div>
          {activeSectionNav?.items.filter((item) => isAllowed(item.id)).map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/70 hover:font-bold'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.isLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      isActive ? 'bg-white text-teal-700' : 'bg-teal-600 text-white animate-pulse'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* DOWN-LEFT PROFILE CARD + QUICK SIGN OUT */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight" title={user?.fullName}>
                  {user?.fullName || 'Client User'}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate leading-tight" title={user?.companyName}>
                  {user?.clientId || 'CLI-0000'} • <span className="font-bold text-teal-700">{user?.companyName || 'Corporate Client'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer disabled:opacity-50"
              title="Sign Out to Login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 text-slate-800">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="title-interactive-hover text-base font-black text-slate-800">
              {activeTab === 'overview' && 'Client Dashboard Overview'}
              {activeTab === 'employees' && 'My Employees Directory & Governance'}
              {activeTab === 'attendance' && 'Attendance, Timesheets & Workforce Suite'}
              {activeTab === 'leave' && 'Employee Leave & Absence Governance'}
              {activeTab === 'tasks' && 'Task & Follow-up Management'}
              {activeTab === 'documents' && 'Corporate Employee Document Vault'}
              {activeTab === 'subscription' && 'Subscription Quotas & Module Entitlements'}
              {activeTab === 'history' && 'Security Block & Audit History'}
              {activeTab === 'requests' && 'Employee Password Reset Queue'}
              {activeTab === 'shared-access' && 'Shared Team Access & Delegated RBAC'}
              {/* HRM tabs */}
              {activeTab === 'hrm-dashboard' && 'Human Resources Intelligence Dashboard'}
              {activeTab === 'hrm-lifecycle' && 'Employee Lifecycle & Governance Board'}
              {activeTab === 'hrm-recruitment' && 'Talent Acquisition & Job Openings'}
              {activeTab === 'hrm-payroll' && 'Payroll, Salary Structures & Slips'}
              {activeTab === 'hrm-performance' && 'Performance & Quarterly OKRs'}
              {activeTab === 'hrm-helpdesk' && 'Employee Helpdesk & Grievance Tickets'}
              {activeTab === 'hrm-organization' && 'Departments & Organization Structure'}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-growth-teal border border-teal-200">
              {user?.companyName}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Section Switcher Dropdown */}
            <div className="relative" ref={sectionDropdownRef}>
              <button
                type="button"
                onClick={() => setSectionDropdownOpen(!sectionDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs hover:border-teal-600 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800 cursor-pointer"
                title="Switch Operating Workspace"
              >
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse shrink-0" />
                <span className="font-bold text-slate-900 hidden sm:inline">{currentSectionMeta.code}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${sectionDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {sectionDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 p-1.5 z-50 animate-fadeIn divide-y divide-slate-100">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSection('GATEWAY');
                        setSectionDropdownOpen(false);
                        try { localStorage.removeItem('gi_client_selected_section'); } catch {}
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors text-left cursor-pointer"
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-black">Workspace Hub</div>
                        <div className="text-[10px] text-slate-400 font-normal">Return to all section boxes</div>
                      </div>
                    </button>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {availableSections.map((sec) => {
                      const SecIcon = sec.icon;
                      const isCurrent = selectedSection === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            handleSelectSection(sec.id, sec.defaultTab);
                            setSectionDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-teal-50 text-teal-800'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <SecIcon className={`w-4 h-4 ${isCurrent ? 'text-teal-600' : 'text-slate-400'}`} />
                            <div>
                              <div className="font-black">{sec.code}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{sec.title}</div>
                            </div>
                          </div>
                          {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRefreshCurrentSection}
              disabled={sectionRefreshing || loading}
              className="interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Refresh Current Section"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sectionRefreshing || loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <NotificationBell variant="light" />

            <button
              onClick={() => selectTab('requests')}
              className={`interactive-btn-hover relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeTab === 'requests'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
              }`}
              title="View Employee Password Reset Requests"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Password Requests</span>
              {pendingResetCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                  {pendingResetCount}
                </span>
              )}
            </button>

            <button
              onClick={() => selectTab('onboarding')}
              className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Staff</span>
            </button>
          </div>
        </header>

        {/* Alert banner */}
        {alertMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 font-bold shadow-sm animate-in fade-in">
            {alertMsg}
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 text-slate-800 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {(activeTab === 'overview' || activeTab === 'dashboard' || activeTab === 'dash-overview') && (
              <div className="space-y-6">
                {/* Welcome Banner */}
                <div className="card-premium interactive-box-hover bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-xs font-semibold text-amber-700 mb-2 border border-amber-200/50">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Corporate Client Workspace</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTab('employees')}
                      className="text-2xl font-black text-left text-slate-900 hover:text-teal-700 transition-all flex items-center gap-2 group/c cursor-pointer"
                      title="Click to view all employees enrolled under your company"
                    >
                      <span className="title-interactive-hover">{user?.companyName}</span>
                      <ArrowUpRight className="w-5 h-5 text-teal-600 opacity-70 group-hover/c:opacity-100 group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5 transition-all" />
                    </button>
                    <p className="subtitle-interactive-hover text-xs text-slate-500 mt-1">
                      Client ID: <span className="font-mono font-bold text-teal-700">{user?.clientId}</span> • Contact Person: {user?.fullName}
                    </p>
                  </div>

                  <button
                    onClick={() => selectTab('onboarding')}
                    className="interactive-btn-hover flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all self-start md:self-auto cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard New Employee</span>
                  </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => selectTab('employees')}
                    className="card-premium interactive-box-hover bg-white border border-slate-200 hover:border-teal-500 rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="text-xs text-slate-500 font-bold group-hover:text-teal-700 transition-colors flex items-center gap-1">
                        <span>Total Onboarded Staff</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-1">{totalStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => selectTab('workforce')}
                    className="card-premium interactive-box-hover bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="text-xs text-emerald-600 font-bold group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                        <span>Active Employees</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-3xl font-black text-emerald-600 mt-1">{activeStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <div
                    onClick={() => selectTab('history')}
                    className="card-premium interactive-box-hover bg-white border border-slate-200 hover:border-rose-400 rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <div className="text-xs text-rose-600 font-bold group-hover:text-rose-700 transition-colors flex items-center gap-1">
                        <span>Blocked Staff</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-3xl font-black text-rose-600 mt-1">{blockedStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Assigned Modules Launchpad */}
                {(() => {
                  const hasEMS = true;
                  const hasCRM = true;
                  const hasHRM = true;
                  return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* EMS Card */}
                  <div
                    onClick={() => hasEMS && selectTab('attendance')}
                    className={`card-premium interactive-box-hover rounded-2xl p-5 border transition-all ${
                      hasEMS
                        ? 'bg-white border-slate-200 hover:border-teal-500 cursor-pointer shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasEMS ? 'bg-teal-50 text-teal-700' : 'bg-slate-200 text-slate-400'}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">Workforce & EMS</h4>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${hasEMS ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {hasEMS ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Track staff attendance, daily timesheets, leave policies, and security governance.
                    </p>
                    {hasEMS && (
                      <div className="text-[11px] font-bold text-teal-700 flex items-center gap-1 group-hover:underline">
                        <span>Launch Attendance Suite</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* CRM Card */}
                  <div
                    onClick={() => hasCRM && selectTab('crm-dashboard')}
                    className={`card-premium interactive-box-hover rounded-2xl p-5 border transition-all ${
                      hasCRM
                        ? 'bg-white border-slate-200 hover:border-amber-500 cursor-pointer shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasCRM ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">Sales & CRM</h4>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${hasCRM ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {hasCRM ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Manage client leads, deal stages, sales pipeline, product catalog, quotes, and contract renewals.
                    </p>
                    {hasCRM && (
                      <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1 group-hover:underline">
                        <span>Open CRM Pipeline</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* HRM Card */}
                  <div
                    onClick={() => hasHRM && selectTab('hrm-dashboard')}
                    className={`card-premium interactive-box-hover rounded-2xl p-5 border transition-all ${
                      hasHRM
                        ? 'bg-white border-slate-200 hover:border-indigo-500 cursor-pointer shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasHRM ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs">Human Resources (HRM)</h4>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${hasHRM ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {hasHRM ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                      Staff lifecycle, talent recruitment, payroll disbursement, performance OKRs, and employee helpdesk.
                    </p>
                    {hasHRM && (
                      <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 group-hover:underline">
                        <span>Open HR Management</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
                  );
                })()}

                {/* Quick Staff Table */}
                <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="title-interactive-hover text-sm font-black text-slate-900">Company Staff Roster</h3>
                      <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5">Recently assigned active personnel</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        className="interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        title="Refresh Staff Roster"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => selectTab('employees')}
                        className="interactive-btn-hover text-xs font-bold text-growth-teal hover:underline cursor-pointer"
                      >
                        View All Employees →
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Employee ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Designation</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Mobile</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {employees.slice(0, 5).map((emp) => (
                          <tr key={emp.id} className="interactive-row-hover hover:bg-teal-50/20 transition-all cursor-pointer">
                            <td className="py-3 px-4 font-mono font-bold text-growth-teal">{emp.employeeId}</td>
                            <td className="py-3 px-4">
                              <span className="title-interactive-hover font-bold text-slate-900 inline-block">{emp.fullName}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{emp.designation}</td>
                            <td className="py-3 px-4 text-slate-500">{emp.departmentName}</td>
                            <td className="py-3 px-4 text-slate-600">{emp.phone}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  emp.status === 'BLOCKED' || emp.isBlocked
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                }`}
                              >
                                {emp.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedEmpId(emp.employeeId)}
                                className="interactive-btn-hover p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                                title="View Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {employees.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No employees onboarded under this company yet. Click &quot;Onboard Staff&quot; to begin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'employees' || activeTab === 'dash-employees') && (
              <div className="space-y-4">
                <div className="panel-premium flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, mobile, designation..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEmpViewMode('grid')}
                        className={`interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          empViewMode === 'grid'
                            ? 'bg-white text-growth-teal shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmpViewMode('table')}
                        className={`interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          empViewMode === 'table'
                            ? 'bg-white text-growth-teal shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>

                    <button
                      onClick={() => fetchData(true)}
                      disabled={loading}
                      className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                      title="Refresh Employees List"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
                      <span>Refresh</span>
                    </button>

                    <button
                      onClick={() => selectTab('onboarding')}
                      className="interactive-btn-hover flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Onboard Staff</span>
                    </button>
                  </div>
                </div>

                {/* Card Grid View */}
                {empViewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((emp) => {
                      const isBlocked = emp.status === 'BLOCKED' || emp.isBlocked;
                      return (
                        <div
                          key={emp.id}
                          className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-teal-500/50 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                                  {emp.fullName?.charAt(0) || 'E'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-mono text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {emp.employeeId}
                                  </span>
                                  <h4 className="title-interactive-hover text-sm font-black text-slate-900 mt-1 truncate">
                                    {emp.fullName}
                                  </h4>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                  isBlocked
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                }`}
                              >
                                {emp.status}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Designation:</span>
                                <span className="font-bold text-slate-800 truncate ml-2">{emp.designation || '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Department:</span>
                                <span className="font-semibold text-slate-700 truncate ml-2">{emp.departmentName || 'General'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Mobile:</span>
                                <a href={`tel:${emp.phone}`} className="font-mono text-teal-700 hover:underline font-bold">
                                  {emp.phone || '—'}
                                </a>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-medium">Joined:</span>
                                <span className="font-medium text-slate-500">
                                  {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedEmpId(emp.employeeId)}
                                className="interactive-btn-hover p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition cursor-pointer"
                                title="View Profile Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingEmployee(emp)}
                                className="interactive-btn-hover p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-200 transition cursor-pointer"
                                title="Edit Profile"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setQuickResetEmp(emp);
                                  setQuickPassword(`Emp#${Math.floor(1000 + Math.random() * 9000)}`);
                                  setQuickResetResult(null);
                                }}
                                className="interactive-btn-hover p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition cursor-pointer"
                                title="Reset Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {isBlocked ? (
                              <button
                                onClick={() => setUnblockTarget(emp)}
                                className="interactive-btn-hover px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition shadow-sm cursor-pointer"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => setBlockTarget(emp)}
                                className="interactive-btn-hover px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-xl transition shadow-sm cursor-pointer"
                              >
                                Block Staff
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {employees.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        No employees found matching criteria.
                      </div>
                    )}
                  </div>
                )}

                {/* Table View */}
                {empViewMode === 'table' && (
                  <div className="panel-premium bg-white border border-slate-200 rounded-3xl shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3.5 px-4">Employee ID</th>
                            <th className="py-3.5 px-4">Full Name</th>
                            <th className="py-3.5 px-4">Mobile</th>
                            <th className="py-3.5 px-4">Department</th>
                            <th className="py-3.5 px-4">Designation</th>
                            <th className="py-3.5 px-4">Joining Date</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {employees.map((emp) => {
                            const isBlocked = emp.status === 'BLOCKED' || emp.isBlocked;
                            return (
                              <tr key={emp.id} className="interactive-row-hover hover:bg-teal-50/20 transition-all cursor-pointer">
                                <td className="py-3.5 px-4">
                                  <button
                                    onClick={() => setSelectedEmpId(emp.employeeId)}
                                    className="font-mono font-bold text-growth-teal hover:underline text-left cursor-pointer"
                                  >
                                    {emp.employeeId}
                                  </button>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="title-interactive-hover font-bold text-slate-900 inline-block">{emp.fullName}</span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">{emp.phone}</td>
                                <td className="py-3.5 px-4 text-slate-500">{emp.departmentName}</td>
                                <td className="py-3.5 px-4 text-slate-600">{emp.designation}</td>
                                <td className="py-3.5 px-4 text-slate-500">
                                  {new Date(emp.joiningDate).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                      isBlocked
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    }`}
                                  >
                                    {emp.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedEmpId(emp.employeeId)}
                                      className="interactive-btn-hover p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 cursor-pointer"
                                      title="View Profile & History"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => setEditingEmployee(emp)}
                                      className="interactive-btn-hover p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-all cursor-pointer"
                                      title="Edit Employee Details & Password"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setQuickResetEmp(emp);
                                        setQuickPassword(`Emp#${Math.floor(1000 + Math.random() * 9000)}`);
                                        setQuickResetResult(null);
                                      }}
                                      className="interactive-btn-hover p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-all cursor-pointer"
                                      title="Quick Reset Password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    {isBlocked ? (
                                      <button
                                        onClick={() => setUnblockTarget(emp)}
                                        className="interactive-btn-hover px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                      >
                                        Unblock
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => setBlockTarget(emp)}
                                        className="interactive-btn-hover px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                      >
                                        Block
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {employees.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                No employees found matching criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'onboarding' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 font-bold flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                    <span>
                      Onboarding employee directly to: <strong>{user?.companyName || 'My Organization'}</strong> ({user?.clientId})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTab('employees')}
                    className="text-xs text-teal-800 hover:text-teal-950 underline font-bold cursor-pointer"
                  >
                    Back to Staff List
                  </button>
                </div>
                <EmployeeOnboardingWizard
                  initialClientId={user?.clientId}
                  initialClientName={user?.companyName}
                  onSuccess={() => {
                    clientCache.clear('client_portal_');
                    fetchData(true);
                    selectTab('employees');
                  }}
                  onCancel={() => selectTab('employees')}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="title-interactive-hover text-sm font-black text-slate-900">Employee Block / Unblock Audit Log</h3>
                    <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5">Historical governance and security action records</p>
                  </div>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm self-start sm:self-auto cursor-pointer"
                    title="Refresh History Logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
                    <span>Refresh History</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Employee ID</th>
                        <th className="py-3.5 px-4">Employee Name</th>
                        <th className="py-3.5 px-4">Action</th>
                        <th className="py-3.5 px-4">Reason</th>
                        <th className="py-3.5 px-4">Remarks</th>
                        <th className="py-3.5 px-4">Action By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {blockHistories.map((h) => (
                        <tr key={h.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                          <td className="py-3.5 px-4 text-slate-500">{new Date(h.actionDate).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-growth-teal">
                            {h.employee?.employeeId || h.employeeId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="title-interactive-hover font-bold text-slate-900 inline-block">{h.employee?.fullName || '—'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                h.actionType === 'BLOCK'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              {h.actionType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium">{h.reason}</td>
                          <td className="py-3.5 px-4 text-slate-500">{h.remarks || '—'}</td>
                          <td className="py-3.5 px-4 text-amber-700 font-bold">{h.actionBy}</td>
                        </tr>
                      ))}
                      {blockHistories.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No block/unblock actions recorded for this company.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <ClientAttendanceHub
                key={`hub-${attendanceRefreshKey}`}
                initialSubTab={attendanceSubTab}
                onSubTabChange={(sub) => {
                  setAttendanceSubTab(sub);
                  if (typeof window !== 'undefined') {
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set('tab', sub);
                    window.history.pushState({ tab: sub }, '', currentUrl.toString());
                  }
                }}
              />
            )}
            {activeTab === 'leave' && <LeaveView />}
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'requests' && <ClientRequestsView key="client-requests" />}
            {activeTab === 'shared-access' && <SharedAccessManager role="CLIENT" />}
            {activeTab === 'documents' && (
              <ClientDocumentsView
                employees={employees}
                onRefresh={() => fetchData(true)}
              />
            )}
            {activeTab === 'subscription' && <ClientSubscriptionView />}


            {/* HRM VIEWS */}
            {activeTab === 'hrm-dashboard' && (
              <HrmDashboardView
                onNavigate={(tab) => selectTab(tab)}
              />
            )}
            {activeTab === 'hrm-lifecycle' && (
              <EmployeeLifecycleView />
            )}
            {activeTab === 'hrm-recruitment' && (
              <HrmRecruitmentView />
            )}
            {activeTab === 'hrm-payroll' && (
              <HrmPayrollView />
            )}
            {activeTab === 'hrm-performance' && (
              <HrmPerformanceView
                currentTenant={{
                  id: user?.clientId || 'default',
                  name: user?.companyName || 'My Organization',
                  departments: [],
                  designations: [],
                } as any}
              />
            )}
            {activeTab === 'hrm-helpdesk' && (
              <HrmHelpdeskView
                currentTenant={{
                  id: user?.clientId || 'default',
                  name: user?.companyName || 'My Organization',
                  slug: (user?.companyName || 'org').toLowerCase().replace(/\s+/g, '-'),
                  industry: 'Enterprise Client',
                  plan: 'Enterprise Suite',
                  contactEmail: user?.email || 'client@growthindia.in',
                  timezone: 'Asia/Kolkata (IST)',
                  currency: 'INR (₹)',
                  locations: ['Headquarters (Primary)', 'Regional Center'],
                  workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                  departments: [],
                  designations: [],
                } as any}
              />
            )}
            {activeTab === 'hrm-organization' && (
              <HrmOrganizationView
                currentTenant={{
                  id: user?.clientId || 'default',
                  name: user?.companyName || 'My Organization',
                  slug: (user?.companyName || 'org').toLowerCase().replace(/\s+/g, '-'),
                  industry: 'Enterprise Client',
                  plan: 'Enterprise Suite',
                  contactEmail: user?.email || 'client@growthindia.in',
                  timezone: 'Asia/Kolkata (IST)',
                  currency: 'INR (₹)',
                  locations: ['Headquarters (Primary)', 'Regional Center'],
                  workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                  departments: [],
                  designations: [],
                } as any}
              />
            )}
          </div>
        </main>
      </div>

      {/* Block Confirmation Modal */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Block Employee Account</h3>
                <p className="text-xs text-slate-500">{blockTarget.fullName} ({blockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to block this employee? Their login will be immediately disabled and active sessions revoked.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Block Reason *</label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Client Workplace Policy Infraction">Client Workplace Policy Infraction</option>
                  <option value="Absence without Prior Notice">Absence without Prior Notice</option>
                  <option value="Performance & Compliance Review">Performance & Compliance Review</option>
                  <option value="Temporary Security Suspension">Temporary Security Suspension</option>
                  <option value="Contract Termination / Hold">Contract Termination / Hold</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Specific details regarding this block action..."
                  value={blockRemarks}
                  onChange={(e) => setBlockRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Blocking...' : 'Confirm Block'}
                </button>
                <button
                  type="button"
                  onClick={() => setBlockTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unblock Confirmation Modal */}
      {unblockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Unblock Employee Account</h3>
                <p className="text-xs text-slate-500">{unblockTarget.fullName} ({unblockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to unblock this employee? Their status will return to ACTIVE and login will be restored.
            </p>

            <form onSubmit={handleUnblockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unblock Reason / Remarks *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance verified and reinstated by client"
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Unblocking...' : 'Confirm Unblock'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnblockTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Password Reset Modal for Staff */}
      {quickResetEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Employee Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">{quickResetEmp.fullName} • <span className="font-mono text-teal-700 font-bold">{quickResetEmp.employeeId}</span></p>
              </div>
            </div>

            {quickResetResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                  <p className="text-emerald-800 font-bold">Password successfully updated!</p>
                  <p className="text-slate-600">Share this new credential with the employee:</p>
                  <div className="p-2.5 bg-white border border-teal-200 rounded-xl font-mono text-teal-800 font-bold text-sm tracking-wider flex items-center justify-between shadow-xs">
                    <span>{quickResetResult}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(quickResetResult)}
                      className="text-xs text-teal-700 hover:text-teal-900 hover:underline font-bold cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickResetEmp(null);
                    setQuickResetResult(null);
                  }}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickPasswordReset} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700">New Password *</label>
                    <button
                      type="button"
                      onClick={() => setQuickPassword(`Emp#${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={quickPassword}
                    onChange={(e) => setQuickPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    placeholder="Enter new password (min 4 chars)"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Employee will use this password alongside their Employee ID or Email to sign in.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={quickResetLoading || !quickPassword.trim()}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {quickResetLoading ? 'Updating...' : 'Set & Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickResetEmp(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Requests Manager Modal */}
      <PasswordResetRequestsModal
        isOpen={showResetRequests}
        onClose={() => {
          setShowResetRequests(false);
          fetchResetRequestsCount();
        }}
        userRole="CLIENT"
        onPasswordResetSuccess={() => {
          fetchResetRequestsCount();
          fetchData();
        }}
      />

      {/* Add Employee Modal for Client */}
      <AddEmployeeModal
        isOpen={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onEmployeeCreated={() => {
          clientCache.clear('client_portal_');
          fetchData(true);
        }}
        preselectedClientId={user?.clientId}
        defaultClientId={user?.clientId}
      />

      {/* Edit Employee Modal for Client */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={true}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onEmployeeUpdated={() => {
            clientCache.clear('client_portal_');
            fetchData(true);
          }}
        />
      )}

      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        employeeId={selectedEmpId}
        onClose={() => setSelectedEmpId(null)}
        onRefresh={() => {
          clientCache.clear('client_portal_');
          fetchData(true);
        }}
      />
    </div>
  );
};
