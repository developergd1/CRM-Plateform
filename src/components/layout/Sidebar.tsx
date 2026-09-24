'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  History,
  ShieldCheck,
  Clock,
  Calendar,
  FileText,
  KeyRound,
  Coffee,
  ChevronDown,
  ChevronUp,
  Share2,
  LogOut,
  TrendingUp,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { user, activeTab, setActiveTab, logout } = useAuth();
  const [pendingResetCount, setPendingResetCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/auth/password-reset-requests');
        if (res.ok) {
          const data = await res.json();
          setPendingResetCount(data.pendingCount || 0);
        }
      } catch (e) {
        // silent
      }
    };
    fetchCount();
  }, [activeTab]);

  // Collapsible state for each section (all expanded by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    crm: true,
    workforce: true,
    security: true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const sections: NavSection[] = [
    {
      id: 'crm',
      title: 'CRM & Sales',
      icon: Building2,
      items: [
        { id: 'crm-dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
        { id: 'crm-leads', label: 'Leads', icon: ShieldAlert },
        { id: 'crm-contacts', label: 'Contacts', icon: Users },
        { id: 'crm-deals', label: 'Deals', icon: Building2 },
        { id: 'crm-pipeline', label: 'Sales Pipeline', icon: TrendingUp },
        { id: 'crm-activities', label: 'Activities', icon: Clock },
        { id: 'crm-followups', label: 'Tasks & Follow-ups', icon: Calendar },
        { id: 'crm-reports', label: 'Reports & Analytics', icon: FileText },
      ],
    },
    {
      id: 'workforce',
      title: 'Workforce Portal',
      icon: Users,
      items: [
        { id: 'employees', label: 'Employees Directory', icon: Users },
        { id: 'attendance', label: 'Live Attendance', icon: Clock },
        { id: 'leave', label: 'Leave Ledger', icon: Coffee },
      ],
    },
    {
      id: 'security',
      title: 'Security & Governance',
      icon: ShieldCheck,
      items: [
        { id: 'block-history', label: 'Block / Unblock Staff', icon: History },
        { id: 'password-requests', label: 'Password Requests', icon: KeyRound },
        { id: 'audit-logs', label: 'Immutable Audit Logs', icon: ShieldCheck },
        { id: 'shared-access', label: 'Shared Team Access', icon: Share2 },
      ],
    },
  ];

  const isAllowed = (tabId: string) => {
    if (!user?.isDelegated) return true;
    if (!user?.delegatedPermissions || user.delegatedPermissions.length === 0) return false;
    if (tabId === 'dashboard') {
      return user.delegatedPermissions.includes('crm-dashboard') || user.delegatedPermissions.includes('dashboard');
    }
    return user.delegatedPermissions.includes(tabId);
  };

  const isDashboardActive = activeTab === 'dashboard';
  const isClientsActive =
    activeTab === 'clients' ||
    activeTab === 'client-360' ||
    activeTab === 'clients-onboarding' ||
    activeTab === 'clients-accounts';

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 select-none">
      {/* Brand Header - Seamlessly matching top header bar height (h-16) */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Navigation Links Area with cursor-pointer and hover text-highlighting */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {/* Dashboard Link */}
        {isAllowed('dashboard') && (
          <div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                isDashboardActive
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/70 hover:font-bold'
              }`}
            >
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isDashboardActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
                }`}
              />
              <span>Dashboard</span>
            </button>
          </div>
        )}

        {/* Collapsible Architecture Sections */}
        {sections.map((section) => {
          const isOpen = Boolean(openSections[section.id]);
          const visibleItems = section.items.filter((item) => isAllowed(item.id));
          const hasVisibleClients = section.id === 'workforce' && isAllowed('clients');

          if (visibleItems.length === 0 && !hasVisibleClients) {
            return null;
          }

          return (
            <React.Fragment key={section.id}>
              {/* Merged Single CLIENTS Navigation Button */}
              {section.id === 'workforce' && isAllowed('clients') && (
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clients')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                      isClientsActive
                        ? 'bg-teal-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/70 hover:font-bold'
                    }`}
                  >
                    <Building2
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isClientsActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
                      }`}
                    />
                    <span>Client Master 360</span>
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {/* Section Header Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{section.title}</span>
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Sub-items List */}
                {isOpen && (
                  <div className="space-y-1 pl-1">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive =
                        item.id === 'attendance'
                          ? activeTab === 'attendance' ||
                            activeTab === 'workforce-live' ||
                            activeTab === 'workforce-policy' ||
                            activeTab === 'workforce-timesheets'
                          : activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
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
                          {item.id === 'password-requests' && pendingResetCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-600 text-white animate-pulse">
                              {pendingResetCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Area: Single Platform Identity Tag + User Profile / Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span className="text-[11px] font-bold text-teal-950">
              {user?.isDelegated ? 'Delegated Portal' : 'Executive Platform'}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-600 text-white">
            {user?.isDelegated ? 'SHARED' : 'ENTERPRISE'}
          </span>
        </div>

        {/* User Details & Sign Out Button */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
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
