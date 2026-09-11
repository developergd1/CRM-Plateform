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
  Sparkles,
  Calendar,
  TrendingUp,
  FileText,
  UserPlus,
  KeyRound,
  Activity,
  Sliders,
  Coffee,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const { activeTab, setActiveTab } = useAuth();
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
      title: 'CRM',
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
      title: 'WORKFORCE',
      icon: Users,
      items: [
        { id: 'employees', label: 'Employees', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'leave', label: 'Leave', icon: Coffee },
      ],
    },
    {
      id: 'security',
      title: 'SECURITY',
      icon: ShieldCheck,
      items: [
        { id: 'block-history', label: 'Block / Unblock', icon: History },
        { id: 'password-requests', label: 'Password Requests', icon: KeyRound },
        { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
      ],
    },
  ];

  const isDashboardActive = activeTab === 'dashboard';
  const isClientsActive =
    activeTab === 'clients' ||
    activeTab === 'client-360' ||
    activeTab === 'clients-onboarding' ||
    activeTab === 'clients-accounts';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/50">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Executive Platform Badge */}
      <div className="mx-3 mt-3.5 p-2.5 bg-slate-950/70 rounded-xl border border-growth-teal/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-growth-teal animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200">EXECUTIVE (Admin)</span>
        </div>
        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-growth-teal/20 text-growth-teal border border-growth-teal/40">
          PRO
        </span>
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {/* Dashboard Link */}
        <div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isDashboardActive
                ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 ${isDashboardActive ? 'text-growth-gold' : 'text-slate-400'}`}
            />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Collapsible Architecture Sections */}
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = Boolean(openSections[section.id]);

          return (
            <React.Fragment key={section.id}>
              {/* Merged Single CLIENTS Navigation Button */}
              {section.id === 'workforce' && (
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clients')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isClientsActive
                        ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Building2
                      className={`w-4 h-4 shrink-0 ${
                        isClientsActive ? 'text-growth-gold' : 'text-slate-400'
                      }`}
                    />
                    <span>CLIENTS</span>
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {/* Section Header Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
                >
                <div className="flex items-center gap-2">
                  <SectionIcon className="w-3.5 h-3.5 text-growth-teal" />
                  <span>{section.title}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {/* Sub-items List with Original Icons & Theme */}
              {isOpen && (
                <div className="space-y-1 pl-1">
                  {section.items.map((item) => {
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                              isActive ? 'text-growth-gold scale-110' : 'text-slate-400 group-hover:text-growth-teal'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.id === 'password-requests' && pendingResetCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
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

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-center">
        <div className="text-[11px] font-bold text-slate-300">Growth India CRM Platform</div>
        <div className="text-[9px] text-growth-teal font-medium mt-0.5">
          Phase 1 Release • Live & Secured
        </div>
      </div>
    </aside>
  );
};
