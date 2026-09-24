'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Network,
  Clock,
  Radio,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  Coffee,
  CalendarClock,
  FileCheck,
  GitBranch,
  UserMinus,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  BarChart3,
  TrendingUp,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';

interface EmployeeSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingLeavesCount?: number;
  pendingRegularizationsCount?: number;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingLeavesCount = 0,
  pendingRegularizationsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [counts, setCounts] = useState({
    leaves: pendingLeavesCount,
    regularizations: pendingRegularizationsCount,
  });

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const [leaveRes, regRes] = await Promise.all([
          fetch('/api/leave?status=PENDING'),
          fetch('/api/attendance/regularization'),
        ]);
        if (leaveRes.ok) {
          const lData = await leaveRes.json();
          setCounts((prev) => ({ ...prev, leaves: (lData.leaves || []).length }));
        }
        if (regRes.ok) {
          const rData = await regRes.json();
          const pending = (rData.requests || []).filter((r: any) => r.status === 'PENDING').length;
          setCounts((prev) => ({ ...prev, regularizations: pending }));
        }
      } catch (e) {}
    };
    fetchCounters();
  }, [activeTab]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    staff: true,
    attendance: true,
    leave: true,
    documents: true,
    access: true,
    reports: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (id: string) => {
    if (id === 'workforce-reports') {
      return activeTab === 'workforce-reports' || activeTab === 'attendance-reports' || activeTab === 'leave-reports';
    }
    return activeTab === id;
  };

  const navItemClass = (id: string) => `
    w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
      isItemActive(id)
        ? 'bg-teal-600 text-white font-bold shadow-xs'
        : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/70 hover:font-bold'
    }
  `;

  const iconClass = (id: string) => `
    w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
      isItemActive(id) ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
    }
  `;

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 select-none h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white shrink-0">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Nav items list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3.5 scrollbar-thin">
        {/* Overview Home Button */}
        <div>
          <button
            type="button"
            onClick={() => setActiveTab('ems-overview')}
            className={navItemClass('ems-overview')}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={iconClass('ems-overview')} />
              <span>EMS Overview</span>
            </div>
          </button>
        </div>

        {/* 1. STAFF & DIRECTORY */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('staff')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Staff & Directory</span>
            {openSections.staff ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.staff && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className={navItemClass('employees')}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={iconClass('employees')} />
                  <span>Employee Directory</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employee-360')}
                className={navItemClass('employee-360')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className={iconClass('employee-360')} />
                  <span>Employee 360</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('onboarding')}
                className={navItemClass('onboarding')}
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className={iconClass('onboarding')} />
                  <span>Onboarding Wizard</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('org-structure')}
                className={navItemClass('org-structure')}
              >
                <div className="flex items-center gap-2.5">
                  <Network className={iconClass('org-structure')} />
                  <span>Organization Structure</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 2. ATTENDANCE & WORKFORCE */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('attendance')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Attendance & Workforce</span>
            {openSections.attendance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.attendance && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={navItemClass('attendance')}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={iconClass('attendance')} />
                  <span>Attendance Records</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('live-workforce')}
                className={navItemClass('live-workforce')}
              >
                <div className="flex items-center gap-2.5">
                  <Radio className={iconClass('live-workforce')} />
                  <span>Live Workforce</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timesheets')}
                className={navItemClass('timesheets')}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className={iconClass('timesheets')} />
                  <span>Timesheets</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shifts-policy')}
                className={navItemClass('shifts-policy')}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className={iconClass('shifts-policy')} />
                  <span>Shifts & Policies</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('holiday-calendar')}
                className={navItemClass('holiday-calendar')}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarRange className={iconClass('holiday-calendar')} />
                  <span>Holiday Calendar</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 3. LEAVE & REQUESTS */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('leave')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Leave & Requests</span>
            {openSections.leave ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.leave && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('leave')}
                className={navItemClass('leave')}
              >
                <div className="flex items-center gap-2.5">
                  <Coffee className={iconClass('leave')} />
                  <span>Leave Management</span>
                </div>
                {counts.leaves > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                    {counts.leaves}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('regularization')}
                className={navItemClass('regularization')}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock className={iconClass('regularization')} />
                  <span>Regularization</span>
                </div>
                {counts.regularizations > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs">
                    {counts.regularizations}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 4. DOCUMENTS & LIFECYCLE */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('documents')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Documents & Lifecycle</span>
            {openSections.documents ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.documents && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('documents-kyc')}
                className={navItemClass('documents-kyc')}
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck className={iconClass('documents-kyc')} />
                  <span>Documents & KYC</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employee-lifecycle')}
                className={navItemClass('employee-lifecycle')}
              >
                <div className="flex items-center gap-2.5">
                  <GitBranch className={iconClass('employee-lifecycle')} />
                  <span>Employee Lifecycle</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('offboarding')}
                className={navItemClass('offboarding')}
              >
                <div className="flex items-center gap-2.5">
                  <UserMinus className={iconClass('offboarding')} />
                  <span>Offboarding</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 5. ACCESS & GOVERNANCE */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('access')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Access & Governance</span>
            {openSections.access ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.access && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('account-access')}
                className={navItemClass('account-access')}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className={iconClass('account-access')} />
                  <span>Account & Access</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employee-status')}
                className={navItemClass('employee-status')}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className={iconClass('employee-status')} />
                  <span>Employee Status</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('delegated-access')}
                className={navItemClass('delegated-access')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCog className={iconClass('delegated-access')} />
                  <span>Delegated Access</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit-logs')}
                className={navItemClass('audit-logs')}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className={iconClass('audit-logs')} />
                  <span>Audit Logs</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 6. REPORTS & EXPORT */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('reports')}
            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <span>Reports & Exports</span>
            {openSections.reports ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {openSections.reports && (
            <div className="space-y-0.5 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('workforce-reports')}
                className={navItemClass('workforce-reports')}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={iconClass('workforce-reports')} />
                  <span>Workforce & Analytics Reports</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('export-center')}
                className={navItemClass('export-center')}
              >
                <div className="flex items-center gap-2.5">
                  <Download className={iconClass('export-center')} />
                  <span>Export Center</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Area: Profile Tag + User Profile / Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span className="text-[11px] font-bold text-teal-900">Employee Management</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-600 text-white">
            Profile 1
          </span>
        </div>

        <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {user?.fullName || 'System Administrator'}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate leading-tight">
                {user?.employeeId || 'GI-EMP-000001'} • <span className="font-bold text-teal-700">{user?.role}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
