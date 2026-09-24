'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Target,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  FileCheck2,
  FileSignature,
  RotateCw,
  Activity,
  Users,
} from 'lucide-react';
import { CreateLeadModal } from '../leads/CreateLeadModal';

export interface CrmDashboardProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const CrmDashboardView: React.FC<CrmDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<string>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddLead, setShowAddLead] = useState<boolean>(false);

  const fetchDashboardData = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/dashboard?timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load CRM dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(timeframe);
  }, [timeframe]);

  const kpis = data?.kpis || {
    openPipelineValue: 0,
    weightedForecastValue: 0,
    wonRevenue: 0,
    winRate: { numerator: 0, denominator: 0, percentage: 0, display: '0 / 0 (0%)' },
    openDealsCount: 0,
    wonDealsCount: 0,
    lostDealsCount: 0,
    totalLeads: 0,
    newLeadsCount: 0,
    qualifiedLeadsCount: 0,
    convertedLeadsCount: 0,
    conversionRate: 0,
    quotesCount: 0,
    contractsCount: 0,
    activeContractsValue: 0,
    renewalsCount: 0,
    upcomingRenewalsCount: 0,
    totalActivitiesCount: 0,
    overdueActivitiesCount: 0,
  };

  const funnel = data?.funnel || {
    total: 0,
    new: 0,
    qualified: 0,
    converted: 0,
    deals: 0,
    won: 0,
  };

  const stageBreakdown = data?.stageBreakdown || {};
  const topDeals = data?.topDeals || [];
  const overdueActivities = data?.overdueActivities || [];

  return (
    <div className="space-y-6 pb-12 font-sans select-none text-slate-800">
      {/* 1. CLEAN ENTERPRISE HEADER */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded">
              Growth India Commercial
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            CRM Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real commercial pipeline performance, sales metrics, and active client lifecycle
          </p>
        </div>

        {/* Action System */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddLead(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('crm-deals')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>New Deal</span>
          </button>

          <button
            type="button"
            onClick={() => fetchDashboardData(timeframe)}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TIMEFRAME FILTER BAR */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
            Timeframe:
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'year', label: 'This Year' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeframe(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                timeframe === item.id
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 font-mono pr-2">
          Scope: <span className="font-bold text-[#0D9488]">{user?.role}</span> (Tenant: Growth India HQ)
        </div>
      </div>

      {/* 3. FOUR PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Open Pipeline */}
        <div
          onClick={() => onNavigate('crm-deals')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-[#0D9488]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Open Pipeline
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              ₹{(kpis.openPipelineValue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {kpis.openDealsCount} Open Deals • Click to View
            </p>
          </div>
        </div>

        {/* 2. Won Revenue */}
        <div
          onClick={() => onNavigate('crm-deals')}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-[#0D9488]/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Won Revenue
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              ₹{(kpis.wonRevenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {kpis.winRate?.numerator || 0} Deals Won to Date
            </p>
          </div>
        </div>

        {/* 3. Weighted Forecast */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Weighted Forecast
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              ₹{Math.round(kpis.weightedForecastValue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Amount × Probability formula
            </p>
          </div>
        </div>

        {/* 4. Win Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Win Rate
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900">
              {kpis.winRate?.percentage ?? 0}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
              {kpis.winRate?.display || '0 / 0 (0%)'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. SECONDARY COMMERCIAL METRICS BAR (Requirement 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Leads */}
        <div
          onClick={() => onNavigate('crm-leads')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Total Leads</span>
            <Users className="w-3.5 h-3.5 text-[#0D9488]" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.totalLeads}</p>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold">
            <span className="text-[#0D9488]">{kpis.newLeadsCount || 0} New</span>
            <span>•</span>
            <span>{kpis.qualifiedLeadsCount || 0} Qual</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div
          onClick={() => onNavigate('crm-leads')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Conv. Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.conversionRate}%</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Lead to Deal Conv.</p>
        </div>

        {/* Quotes */}
        <div
          onClick={() => onNavigate('crm-quotes')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Quotes</span>
            <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.quotesCount || 0}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Proposals & Bids</p>
        </div>

        {/* Contracts */}
        <div
          onClick={() => onNavigate('crm-contracts')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Contracts</span>
            <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.contractsCount || 0}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Active Agreements</p>
        </div>

        {/* Renewals */}
        <div
          onClick={() => onNavigate('crm-renewals')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Renewals</span>
            <RotateCw className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.renewalsCount || 0}</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">
            {kpis.upcomingRenewalsCount || 0} Upcoming
          </p>
        </div>

        {/* Activities */}
        <div
          onClick={() => onNavigate('crm-activities')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">Activities</span>
            <Activity className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1.5">{kpis.totalActivitiesCount || 0}</p>
          <p className="text-[10px] text-rose-600 font-semibold mt-1">
            {kpis.overdueActivitiesCount || 0} Overdue
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECONDARY LAYOUT: FUNNEL & PIPELINE BY STAGE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Commercial Lead Funnel */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Commercial Lifecycle Funnel
            </h2>
            <button
              onClick={() => onNavigate('crm-leads')}
              className="text-[11px] font-semibold text-[#0D9488] hover:underline"
            >
              View Leads
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>1. Inbound Leads</span>
                <span className="font-bold">{funnel.total}</span>
              </div>
              <div className="w-full bg-[#F0FDFA] h-2 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>2. Qualified Prospects</span>
                <span className="font-bold">{funnel.qualified}</span>
              </div>
              <div className="w-full bg-[#F0FDFA] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0D9488]/60 h-2 rounded-full"
                  style={{ width: `${funnel.total > 0 ? (funnel.qualified / funnel.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>3. Converted to Deals</span>
                <span className="font-bold">{funnel.deals}</span>
              </div>
              <div className="w-full bg-[#F0FDFA] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0D9488] h-2 rounded-full"
                  style={{ width: `${funnel.total > 0 ? (funnel.deals / funnel.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>4. Closed Won Accounts</span>
                <span className="font-bold text-[#0D9488]">{funnel.won}</span>
              </div>
              <div className="w-full bg-[#F0FDFA] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0D9488] h-2 rounded-full"
                  style={{ width: `${funnel.total > 0 ? (funnel.won / funnel.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Breakdown by Stage */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Pipeline Stage Distribution
            </h2>
            <button
              onClick={() => onNavigate('crm-deals')}
              className="text-[11px] font-semibold text-[#0D9488] hover:underline"
            >
              Open Pipeline Board
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.keys(stageBreakdown).length === 0 ? (
              <p className="col-span-full text-center text-xs text-slate-400 py-6">
                No active deals in current period.
              </p>
            ) : (
              Object.entries(stageBreakdown).map(([stage, item]: any) => (
                <div key={stage} className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F0FDFA]/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{stage}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-600">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-900 mt-2">
                    ₹{item.value.toLocaleString('en-IN')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. ACTIONABLE ALERTS & TOP DEALS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Overdue / Urgent Activities */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Overdue Activities
              </h2>
            </div>
            <button
              onClick={() => onNavigate('crm-activities')}
              className="text-[11px] font-semibold text-[#0D9488] hover:underline"
            >
              View Activities
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {overdueActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                All scheduled client activities are up to date!
              </p>
            ) : (
              overdueActivities.map((act: any) => (
                <div key={act.id} className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{act.subject}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {act.lead?.companyName || act.deal?.title || 'Commercial Prospect'}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-rose-600 shrink-0">
                    {new Date(act.scheduledAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Active Commercial Deals */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              High-Value Commercial Deals
            </h2>
            <button
              onClick={() => onNavigate('crm-deals')}
              className="text-[11px] font-semibold text-[#0D9488] hover:underline"
            >
              All Deals ({kpis.openDealsCount})
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            {topDeals.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No deals recorded yet. Click "+ New Deal" to create one.
              </p>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2 px-3">Deal Code</th>
                    <th className="py-2 px-3">Title & Account</th>
                    <th className="py-2 px-3">Stage</th>
                    <th className="py-2 px-3">Owner</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {topDeals.map((deal: any) => (
                    <tr key={deal.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {deal.dealNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 truncate max-w-[200px]">{deal.title}</p>
                        <p className="text-[10px] text-slate-500">{deal.account?.companyName || 'Unlinked'}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                          {deal.pipelineStage?.name || deal.stage}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {deal.assignedTo?.fullName || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        ₹{(deal.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onNavigate('crm-deal-detail', deal.id)}
                          className="px-2.5 py-1 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#0D9488] hover:text-white text-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Create Lead Modal */}
      {showAddLead && (
        <CreateLeadModal
          isOpen={showAddLead}
          initialClientId={user?.role === 'CLIENT' ? user.clientId : undefined}
          onClose={() => setShowAddLead(false)}
          onSuccess={() => {
            setShowAddLead(false);
            fetchDashboardData(timeframe);
          }}
        />
      )}
    </div>
  );
};
