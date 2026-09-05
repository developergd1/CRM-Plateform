'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  History,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, activeTab, setActiveTab } = useAuth();

  const navSections = [
    {
      title: 'PHASE 1 CORE MODULES',
      items: [
        { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Client Management', icon: Building2 },
        { id: 'employees', label: 'Employee Onboarding & List', icon: Users },
        { id: 'block-history', label: 'Block / Unblock History', icon: History },
      ],
    },
    {
      title: 'SECURITY & AUDIT',
      items: [
        { id: 'audit-logs', label: 'System Audit Logs', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/50">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Phase 1 Badge */}
      <div className="mx-4 mt-4 p-2.5 bg-slate-950/70 rounded-xl border border-growth-teal/30 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-growth-teal animate-pulse" />
        <span className="text-[11px] font-bold text-slate-200">Phase 1: Onboarding & Block Control</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 mb-2">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-growth-gold' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-center">
        <div className="text-[11px] font-bold text-slate-300">Growth India CRM Platform</div>
        <div className="text-[9px] text-growth-teal font-medium mt-0.5">Phase 1 Release • Live & Secured</div>
      </div>
    </aside>
  );
};
