'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Building2,
  Users,
  Clock,
  Coffee,
  Briefcase,
  Target,
  Sliders,
  LifeBuoy,
  BarChart3,
  Calendar,
  LayoutDashboard,
  LogOut,
  Banknote,
} from 'lucide-react';

interface HrmSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const HrmSidebar: React.FC<HrmSidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'hrm-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'hrm-lifecycle', label: 'Employee Lifecycle & 360', icon: Users },
    { id: 'hrm-recruitment', label: 'Recruitment / ATS', icon: Briefcase },
    { id: 'hrm-attendance', label: 'Attendance & Time', icon: Clock },
    { id: 'hrm-leave', label: 'Leave Management', icon: Coffee },
    { id: 'hrm-shifts', label: 'Shifts & Timesheets', icon: Calendar },
    { id: 'hrm-payroll', label: 'Payroll & Compensation', icon: Banknote },
    { id: 'hrm-performance', label: 'Performance & OKRs', icon: Target },
    { id: 'hrm-helpdesk', label: 'HR Requests & Helpdesk', icon: LifeBuoy },
    { id: 'hrm-reports', label: 'HR Analytics & Reports', icon: BarChart3 },
    { id: 'hrm-organization', label: 'Organization Setup', icon: Building2 },
    { id: 'hrm-workflows', label: 'Workflow & Automation', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-[#E2E8F0] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#E2E8F0] bg-white">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          HRM Enterprise Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'hrm-lifecycle' && activeTab === 'hrm-employees');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                isActive
                  ? 'bg-[#0D9488]/12 text-[#0D9488] font-bold border border-[#0D9488]/30 shadow-xs'
                  : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA] hover:font-bold'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-[#0D9488]' : 'text-slate-400 group-hover:text-[#0D9488]'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.id === 'hrm-workflows' && (
                <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded bg-black/10 text-slate-600">
                  ENGINE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Area: Platform Tag + User Profile / Logout */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F0FDFA]/70 space-y-2.5">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0D9488]/10 border border-[#0D9488]/20">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
            <span className="text-[11px] font-bold text-[#0D9488]">Enterprise HRM</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0D9488] text-white">
            Admin
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {user?.fullName || 'System Administrator'}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate leading-tight">
                {user?.employeeId || 'GI-EMP-000001'} • <span className="font-bold text-[#0D9488]">{user?.role}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
            title="Sign Out to Login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
