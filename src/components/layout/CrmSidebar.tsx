'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  LayoutDashboard,
  UserPlus,
  Compass,
  Award,
  Building2,
  Users,
  Briefcase,
  Package,
  Clock,
  FileCheck2,
  FileSignature,
  RefreshCw,
  TrendingUp,
  LineChart,
  BarChart3,
  Sliders,
  GitBranch,
  FormInput,
  ArrowUpDown,
  Shield,
  History,
  Network,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';

interface CrmSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const CrmSidebar: React.FC<CrmSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    leads: true,
    analytics: false,
    admin: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navItemClass = (isActive: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-[#0D9488]/12 text-[#0D9488] font-bold border border-[#0D9488]/30 shadow-xs'
        : 'text-slate-700 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
    }`;

  const iconClass = (isActive: boolean) =>
    `w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#0D9488]' : 'text-slate-400 group-hover:text-[#0D9488]'}`;

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-[#E2E8F0] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#E2E8F0] bg-white">
        <GrowthIndiaLogo size="sm" />
      </div>

      {/* Nav items — 12 Core CRM Modules */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5 text-slate-700">
        
        {/* Module 1: CRM Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-dashboard')}
          className={navItemClass(activeTab === 'crm-dashboard' || activeTab === 'dashboard')}
        >
          <LayoutDashboard className={iconClass(activeTab === 'crm-dashboard' || activeTab === 'dashboard')} />
          <span>Dashboard</span>
        </button>

        {/* Module 2: Leads */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('crm-leads')}
              className={`${navItemClass(activeTab === 'crm-leads' || activeTab === 'crm-lead-detail')} flex-1`}
            >
              <UserPlus className={iconClass(activeTab === 'crm-leads' || activeTab === 'crm-lead-detail')} />
              <span>Leads</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSection('leads')}
              className="p-1.5 text-slate-400 hover:text-[#0D9488] transition-colors"
              title="Toggle Sub-modules"
            >
              {openSections.leads ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {openSections.leads && (
            <div className="pl-6 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('crm-lead-sources')}
                className={navItemClass(activeTab === 'crm-lead-sources')}
              >
                <Compass className={iconClass(activeTab === 'crm-lead-sources')} />
                <span>Lead Sources</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-lead-scoring')}
                className={navItemClass(activeTab === 'crm-lead-scoring')}
              >
                <Award className={iconClass(activeTab === 'crm-lead-scoring')} />
                <span>Scoring & Assignment</span>
              </button>
            </div>
          )}
        </div>

        {/* Module 3: Contacts */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-contacts')}
          className={navItemClass(activeTab === 'crm-contacts' || activeTab === 'crm-contact-detail')}
        >
          <Users className={iconClass(activeTab === 'crm-contacts' || activeTab === 'crm-contact-detail')} />
          <span>Contacts</span>
        </button>

        {/* Module 4: Accounts / Customer 360 */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-accounts')}
          className={navItemClass(
            activeTab === 'crm-accounts' ||
            activeTab === 'clients' ||
            activeTab === 'client-360' ||
            activeTab === 'crm-account-detail'
          )}
        >
          <Building2 className={iconClass(
            activeTab === 'crm-accounts' ||
            activeTab === 'clients' ||
            activeTab === 'client-360' ||
            activeTab === 'crm-account-detail'
          )} />
          <span>Accounts / Customer 360</span>
        </button>

        {/* Module 5: Deals / Pipeline (Primary Sales Pipeline) */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-deals')}
          className={navItemClass(
            activeTab === 'crm-deals' ||
            activeTab === 'crm-pipeline' ||
            activeTab === 'crm-deal-detail' ||
            activeTab === 'crm-opportunities'
          )}
        >
          <Briefcase className={iconClass(
            activeTab === 'crm-deals' ||
            activeTab === 'crm-pipeline' ||
            activeTab === 'crm-deal-detail' ||
            activeTab === 'crm-opportunities'
          )} />
          <span>Deals / Pipeline</span>
        </button>

        {/* Module 6: Activities (Unified Tracking & Tasks) */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-activities')}
          className={navItemClass(
            activeTab === 'crm-activities' ||
            activeTab === 'crm-tasks' ||
            activeTab === 'crm-followups' ||
            activeTab === 'crm-calendar'
          )}
        >
          <Clock className={iconClass(
            activeTab === 'crm-activities' ||
            activeTab === 'crm-tasks' ||
            activeTab === 'crm-followups' ||
            activeTab === 'crm-calendar'
          )} />
          <span>Activities</span>
        </button>

        {/* Module 7: Products & Services */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-products')}
          className={navItemClass(activeTab === 'crm-products')}
        >
          <Package className={iconClass(activeTab === 'crm-products')} />
          <span>Products & Services</span>
        </button>

        {/* Module 8: Quotes */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-quotes')}
          className={navItemClass(activeTab === 'crm-quotes' || activeTab === 'crm-quote-detail')}
        >
          <FileCheck2 className={iconClass(activeTab === 'crm-quotes' || activeTab === 'crm-quote-detail')} />
          <span>Quotes</span>
        </button>

        {/* Module 9: Contracts */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-contracts')}
          className={navItemClass(activeTab === 'crm-contracts')}
        >
          <FileSignature className={iconClass(activeTab === 'crm-contracts')} />
          <span>Contracts</span>
        </button>

        {/* Module 10: Renewals */}
        <button
          type="button"
          onClick={() => setActiveTab('crm-renewals')}
          className={navItemClass(activeTab === 'crm-renewals')}
        >
          <RefreshCw className={iconClass(activeTab === 'crm-renewals')} />
          <span>Renewals</span>
        </button>

        {/* Module 11: Sales Analytics */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('crm-analytics')}
              className={`${navItemClass(activeTab === 'crm-analytics')} flex-1`}
            >
              <TrendingUp className={iconClass(activeTab === 'crm-analytics')} />
              <span>Sales Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSection('analytics')}
              className="p-1.5 text-slate-400 hover:text-[#0D9488] transition-colors"
              title="Toggle Sub-modules"
            >
              {openSections.analytics ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {openSections.analytics && (
            <div className="pl-6 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('crm-forecast')}
                className={navItemClass(activeTab === 'crm-forecast')}
              >
                <LineChart className={iconClass(activeTab === 'crm-forecast')} />
                <span>Forecasts</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-reports')}
                className={navItemClass(activeTab === 'crm-reports')}
              >
                <BarChart3 className={iconClass(activeTab === 'crm-reports')} />
                <span>Sales Reports</span>
              </button>
            </div>
          )}
        </div>

        {/* Module 12: CRM Administration */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('crm-settings')}
              className={`${navItemClass(activeTab === 'crm-settings')} flex-1`}
            >
              <Sliders className={iconClass(activeTab === 'crm-settings')} />
              <span>CRM Administration</span>
            </button>
            <button
              type="button"
              onClick={() => toggleSection('admin')}
              className="p-1.5 text-slate-400 hover:text-[#0D9488] transition-colors"
              title="Toggle Sub-modules"
            >
              {openSections.admin ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {openSections.admin && (
            <div className="pl-6 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('crm-pipeline-settings')}
                className={navItemClass(activeTab === 'crm-pipeline-settings')}
              >
                <GitBranch className={iconClass(activeTab === 'crm-pipeline-settings')} />
                <span>Pipelines & Stages</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-custom-fields')}
                className={navItemClass(activeTab === 'crm-custom-fields')}
              >
                <FormInput className={iconClass(activeTab === 'crm-custom-fields')} />
                <span>Custom Fields</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-import-export')}
                className={navItemClass(activeTab === 'crm-import-export')}
              >
                <ArrowUpDown className={iconClass(activeTab === 'crm-import-export')} />
                <span>Import / Export</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-roles')}
                className={navItemClass(activeTab === 'crm-roles')}
              >
                <Shield className={iconClass(activeTab === 'crm-roles')} />
                <span>Roles & Permissions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-audit-logs')}
                className={navItemClass(activeTab === 'crm-audit-logs')}
              >
                <History className={iconClass(activeTab === 'crm-audit-logs')} />
                <span>Audit Logs</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crm-integrations')}
                className={navItemClass(activeTab === 'crm-integrations')}
              >
                <Network className={iconClass(activeTab === 'crm-integrations')} />
                <span>Integrations</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Footer Identity & User */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F0FDFA] space-y-2">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
            <span className="text-[11px] font-bold text-slate-800">Admin Sales CRM</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0D9488] text-white">
            Enterprise
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0">
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
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-[#E2E8F0] hover:border-rose-200 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
