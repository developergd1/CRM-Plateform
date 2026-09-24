'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Users,
  Building2,
  Briefcase,
  ArrowRight,
  LogOut,
  Check,
} from 'lucide-react';

export type PlatformProfile = 'GATEWAY' | 'CMS' | 'CRM' | 'HRM';

interface AdminPlatformGatewayProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const AdminPlatformGateway: React.FC<AdminPlatformGatewayProps> = ({ onSelectPlatform }) => {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen max-h-screen bg-white text-slate-900 flex flex-col justify-between p-4 md:px-8 md:py-4 overflow-hidden font-sans select-none">
      {/* Subtle brand ambient accent */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#0D9488]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between border-b border-slate-200 bg-white shrink-0 px-2">
        <div className="flex items-center gap-3">
          <GrowthIndiaLogo size="sm" />
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-0.5 rounded-full border border-[#0D9488]/20">
              Admin Governance Center
            </span>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName || 'System Administrator'}</p>
            <p className="text-[10px] font-mono text-slate-500 leading-tight">{user?.email || 'admin@growthindia.in'}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-2 md:py-4 my-auto overflow-hidden">
        {/* Title & Subtitle */}
        <div className="text-center max-w-xl mx-auto mb-4 md:mb-6 space-y-1 shrink-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Select Operating Platform
          </h1>
          <p className="text-xs md:text-sm text-slate-500 leading-normal">
            Choose a dedicated workspace. Each environment is strictly isolated with specialized workflows.
          </p>
        </div>

        {/* 3 Top-Level Admin Modules Grid (CMS, CRM, HRM) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto w-full">
          
          {/* 1. CMS — CLIENT MANAGEMENT SYSTEM */}
          <div
            onClick={() => onSelectPlatform('CMS')}
            className="group relative bg-white border border-slate-200 hover:border-[#0D9488] rounded-2xl p-5 lg:p-6 transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Icon & Profile Badge */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                  Module 1
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-base lg:text-lg font-black text-slate-900 group-hover:text-[#0D9488] transition-colors">
                  CMS — Client Management
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  Onboarding, Organizations & Client-Specific EMS
                </p>
              </div>

              {/* Capabilities List */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Client Directory & Sequential IDs (CLI-XXXXX)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Module Subscriptions (EMS, CRM, HRM)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Client-Specific Workforce & Tasks</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Multi-Tenant Isolation & Account Auth</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-5">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs flex items-center justify-between transition-all shadow-xs group-hover:shadow-sm cursor-pointer"
              >
                <span>Enter Client Management (CMS)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. CRM PLATFORM */}
          <div
            onClick={() => onSelectPlatform('CRM')}
            className="group relative bg-white border border-slate-200 hover:border-[#0D9488] rounded-2xl p-5 lg:p-6 transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Icon & Profile Badge */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                  Module 2
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-base lg:text-lg font-black text-slate-900 group-hover:text-[#0D9488] transition-colors">
                  CRM Platform
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  Sales Pipeline, Leads, Deals & Client 360
                </p>
              </div>

              {/* Capabilities List */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>8-Stage Interactive Kanban Pipeline</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Lead Scoring & Deduplication</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Deals & Revenue Forecasting</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Client 360 & Activity Timeline</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-5">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs flex items-center justify-between transition-all shadow-xs group-hover:shadow-sm cursor-pointer"
              >
                <span>Enter CRM Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3. ENTERPRISE MULTI-TENANT HRM PLATFORM */}
          <div
            onClick={() => onSelectPlatform('HRM')}
            className="group relative bg-white border border-slate-200 hover:border-[#0D9488] rounded-2xl p-5 lg:p-6 transition-all duration-200 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Icon & Profile Badge */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                  Module 3
                </span>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="text-base lg:text-lg font-black text-slate-900 group-hover:text-[#0D9488] transition-colors">
                  Enterprise HRM Platform
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  Multi-Tenant Workflows, ATS & Appraisals
                </p>
              </div>

              {/* Capabilities List */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Multi-Tenant Organization Isolation</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Automated Workflow Approval Engine</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Recruitment ATS & Talent Pipeline</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                  <span>Performance OKRs & Helpdesk</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-5">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs flex items-center justify-between transition-all shadow-xs group-hover:shadow-sm cursor-pointer"
              >
                <span>Enter HRM Enterprise</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Clean Bottom Bar (Task 3: No clutter, no unnecessary icons) */}
      <footer className="h-10 flex items-center justify-between border-t border-slate-200 text-[11px] text-slate-500 bg-white shrink-0 px-2">
        <span className="font-semibold text-slate-700">Growth India Platform Suite</span>
        <span className="text-slate-500 font-medium">Enterprise Security & Governance Engine</span>
      </footer>
    </div>
  );
};
