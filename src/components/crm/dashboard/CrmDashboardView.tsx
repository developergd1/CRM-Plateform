'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Briefcase,
  Target,
  ArrowUpRight,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import { CreateLeadModal } from '../leads/CreateLeadModal';
import { clientCache } from '@/lib/client-cache';

export interface CrmDashboardProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const CrmDashboardView: React.FC<CrmDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [preset, setPreset] = useState<string>('THIS_MONTH');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);

  const cacheKey = `crm_dashboard_${user?.id || 'admin'}_${preset}_${customStart}_${customEnd}`;
  const initialCached = clientCache.get<any>(cacheKey, 15 * 60 * 1000);

  const [stats, setStats] = useState<any>(() => initialCached || null);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);

  const fetchCrmMetrics = async (
    selectedPreset = preset,
    start = customStart,
    end = customEnd,
    forceRefresh = false
  ) => {
    const currentKey = `crm_dashboard_${user?.id || 'admin'}_${selectedPreset}_${start}_${end}`;
    const cached = !forceRefresh ? clientCache.get<any>(currentKey, 15 * 60 * 1000) : null;

    if (!cached) {
      setLoading(true);
    }

    try {
      let url = `/api/analytics/dashboard?preset=${selectedPreset}`;
      if (selectedPreset === 'CUSTOM' && start && end) {
        url += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      }
      if (forceRefresh) {
        url += `&refresh=true`;
      }

      const fetchedStats = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to load CRM metrics');
          const json = await res.json();
          return json.stats;
        },
        {
          forceRefresh,
          onUpdate: (freshStats) => {
            setStats(freshStats);
          },
        }
      );

      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to load CRM dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (preset !== 'CUSTOM') {
      setShowCustomRange(false);
      fetchCrmMetrics(preset, '', '', false);
    } else {
      setShowCustomRange(true);
    }
  }, [preset]);

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      fetchCrmMetrics('CUSTOM', customStart, customEnd, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCrmMetrics(preset, customStart, customEnd, true);
  };

  const crmMetrics = stats?.crm || {};
  const crmOverview = stats?.crmOverview || {};

  // Safe KPI fallbacks directly wired to live DB telemetry
  const kpis = stats?.kpis || {
    totalLeads: crmMetrics?.totalLeads ?? 0,
    qualifiedLeads: crmMetrics?.qualifiedLeads ?? 0,
    openOpportunities: crmMetrics?.openOpportunities ?? crmMetrics?.openDeals ?? 0,
    pipelineValue: crmMetrics?.pipelineValue ?? 0,
    wonRevenue: crmMetrics?.wonRevenue ?? crmMetrics?.monthlyRevenue ?? 0,
    conversionRate: crmMetrics?.conversionRate ?? 0,
  };

  const funnel = {
    totalLeads: crmMetrics?.totalLeads ?? kpis.totalLeads ?? 0,
    contactedLeads: crmMetrics?.contactedLeads ?? 0,
    qualifiedLeads: crmMetrics?.qualifiedLeads ?? kpis.qualifiedLeads ?? 0,
    openOpportunities: crmMetrics?.openOpportunities ?? kpis.openOpportunities ?? 0,
    activeDeals: crmMetrics?.openDeals ?? crmOverview?.dealsSummary?.total ?? 0,
    wonDeals: crmMetrics?.wonDeals ?? crmOverview?.wonVsLost?.wonDeals ?? 0,
    conversionRate: crmMetrics?.conversionRate ?? kpis.conversionRate ?? 0,
  };

  const pipelineByStage = crmOverview?.pipelineByStage || [];
  const leadSourcePerf = crmOverview?.leadSourcePerformance || [];
  const tasksAndFollowUps = stats?.tasksAndFollowUps || {
    todayFollowUpsCount: 0,
    overdueFollowUpsCount: 0,
    openTasksCount: 0,
    todayFollowUps: [],
    overdueFollowUps: [],
  };

  const alerts = stats?.alerts?.actionableAlerts || [];
  const recentLeads = stats?.recentLeads || [];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ========================================================================= */}
      {/* HERO COMMAND HEADER: CRM Sales Command Center */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0B132B] to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-800 relative overflow-hidden hero-banner-interactive">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-amber-400 mb-2 border border-white/10 backdrop-blur-md chip-premium-highlight cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Growth India CRM • Sales Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hero-title-interactive">
              Sales Pipeline & Revenue Dashboard
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hero-subtitle-interactive">
              Complete end-to-end sales telemetry: Lead Capture ➔ Qualification ➔ Opportunities ➔ Deals ➔ Won Clients.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddLead(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 interactive-btn-hover"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Lead</span>
            </button>

            <button
              onClick={() => onNavigate('crm-deals')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 interactive-btn-hover"
            >
              <DollarSign className="w-4 h-4" />
              <span>New Deal</span>
            </button>

            <button
              onClick={() => onNavigate('crm-pipeline')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95 interactive-btn-hover"
            >
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span>Visual Pipeline</span>
            </button>

            <button
              onClick={() => onNavigate('crm-followups')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95 interactive-btn-hover"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Follow-ups</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER BAR: Preset Range Selector & Refresh */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 panel-premium">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 mr-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Filter:
            </span>
          </div>

          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'THIS_QUARTER', label: 'This Quarter' },
            { id: 'THIS_YEAR', label: 'This Year' },
            { id: 'ALL_TIME', label: 'All Time' },
            { id: 'CUSTOM', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all crm-filter-pill ${
                preset === item.id
                  ? 'bg-slate-900 text-white shadow-sm active-pill'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {showCustomRange && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              />
              <button
                onClick={handleApplyCustomRange}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold interactive-btn-hover"
              >
                Apply
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all interactive-btn-hover"
            title="Refresh CRM metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8 CORE CRM KPI CARDS (Required by Module 1) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Leads */}
        <div
          onClick={() => onNavigate('crm-leads')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Total Leads</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center kpi-icon-container">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">{kpis.totalLeads ?? 0}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Inbound inquiries</span>
              <span className="font-bold text-blue-600 flex items-center gap-0.5 kpi-action-link">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Qualified Leads */}
        <div
          onClick={() => onNavigate('crm-leads')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Qualified Leads</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center kpi-icon-container">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">{kpis.qualifiedLeads ?? 0}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                {kpis.totalLeads > 0 ? Math.round((kpis.qualifiedLeads / kpis.totalLeads) * 100) : 0}% of leads
              </span>
              <span className="font-bold text-teal-600 flex items-center gap-0.5 kpi-action-link">
                Ready to Pitch <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 3. Open Opportunities */}
        <div
          onClick={() => onNavigate('crm-deals')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Open Opportunities</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center kpi-icon-container">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">{kpis.openOpportunities ?? 0}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Active pitches</span>
              <span className="font-bold text-indigo-600 flex items-center gap-0.5 kpi-action-link">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 4. Pipeline Value */}
        <div
          onClick={() => onNavigate('crm-pipeline')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Pipeline Value</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center kpi-icon-container">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">
              ₹{(kpis.pipelineValue || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Unclosed deal pipeline</span>
              <span className="font-bold text-purple-600 flex items-center gap-0.5 kpi-action-link">
                Kanban <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 5. Won Revenue */}
        <div
          onClick={() => onNavigate('crm-deals')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Won Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center kpi-icon-container">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-600 group-hover:text-emerald-500 transition-colors">
              ₹{(kpis.wonRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Closed won revenue</span>
              <span className="font-bold text-emerald-600 flex items-center gap-0.5 kpi-action-link">
                Won Deals <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 6. Conversion Rate */}
        <div
          onClick={() => onNavigate('crm-reports')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Conversion Rate</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center kpi-icon-container">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">{kpis.conversionRate ?? 0}%</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Lead ➔ Won deal ratio</span>
              <span className="font-bold text-amber-600 flex items-center gap-0.5 kpi-action-link">
                Analytics <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 7. Follow-ups / Tasks */}
        <div
          onClick={() => onNavigate('crm-followups')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Follow-ups / Tasks</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center kpi-icon-container">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">
              {tasksAndFollowUps.todayFollowUpsCount ?? 0}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-rose-500 font-semibold">
                {tasksAndFollowUps.overdueFollowUpsCount ?? 0} Overdue
              </span>
              <span className="font-bold text-slate-700 flex items-center gap-0.5 kpi-action-link">
                Check-ins <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 8. Important Alerts */}
        <div
          onClick={() => onNavigate('crm-followups')}
          className="crm-kpi-box p-5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Important Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center kpi-icon-container">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600 group-hover:text-amber-500 transition-colors">{alerts.length}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Requires attention</span>
              <span className="font-bold text-amber-600 flex items-center gap-0.5 kpi-action-link">
                Take Action <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SALES JOURNEY FUNNEL & PIPELINE BY STAGE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Journey Funnel */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm panel-premium">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 title-interactive-hover">Complete Sales Journey Funnel</h2>
              <p className="text-xs text-slate-400 subtitle-interactive-hover">Progression from raw lead inquiry to signed active client</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 chip-premium-highlight cursor-pointer">
              {funnel.conversionRate ?? 0}% Win Rate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'LEAD', count: funnel.totalLeads ?? 0, color: 'bg-blue-500', tab: 'crm-leads' },
              { label: 'CONTACT', count: funnel.contactedLeads ?? 0, color: 'bg-cyan-500', tab: 'crm-contacts' },
              { label: 'QUALIFIED', count: funnel.qualifiedLeads ?? 0, color: 'bg-teal-500', tab: 'crm-leads' },
              { label: 'OPPORTUNITY', count: funnel.openOpportunities ?? 0, color: 'bg-indigo-500', tab: 'crm-deals' },
              { label: 'DEAL', count: funnel.activeDeals ?? 0, color: 'bg-amber-500', tab: 'crm-deals' },
              { label: 'WON CLIENT', count: funnel.wonDeals ?? 0, color: 'bg-emerald-500', tab: 'clients' },
            ].map((step, idx) => (
              <div
                key={step.label}
                onClick={() => onNavigate(step.tab)}
                className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 border border-slate-200/80 transition-all text-center cursor-pointer group interactive-box-hover"
              >
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 group-hover:text-growth-teal transition-colors">
                  Step {idx + 1}
                </div>
                <div className="text-xl font-black text-slate-900 group-hover:text-growth-teal transition-colors">{step.count}</div>
                <div className="text-[11px] font-extrabold text-slate-600 mt-1">{step.label}</div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full ${step.color} rounded-full`} style={{ width: '100%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Navigation to Full Kanban */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Drag-and-drop deals across stages in the Visual Pipeline Kanban
            </span>
            <button
              onClick={() => onNavigate('crm-pipeline')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 interactive-btn-hover"
            >
              Open Pipeline Kanban <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pipeline Stage Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between panel-premium">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1 title-interactive-hover">Active Pipeline by Stage</h2>
            <p className="text-xs text-slate-400 mb-4 subtitle-interactive-hover">Commercial distribution of active negotiations</p>

            <div className="space-y-3">
              {pipelineByStage.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No active pipeline records for this time period.
                </div>
              ) : (
                pipelineByStage.map((st: any) => (
                  <div key={st.stage} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 interactive-row-hover">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">{st.stage}</span>
                      <span className="text-slate-900 font-mono">₹{(st.value || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>{st.count} deal{st.count !== 1 ? 's' : ''}</span>
                      <span className="font-mono">Weighted: ₹{(st.weightedValue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('crm-pipeline')}
            className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors text-center interactive-btn-hover"
          >
            Manage Pipeline Stages
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FOLLOW-UPS, TASKS & ALERTS SECTION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups & Reminders */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm panel-premium">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center kpi-icon-container">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 title-interactive-hover">Today's Follow-ups & Tasks</h3>
                <p className="text-[11px] text-slate-400 subtitle-interactive-hover">Scheduled client calls and sales check-ins</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('crm-followups')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 interactive-btn-hover"
            >
              View All ({tasksAndFollowUps.todayFollowUpsCount})
            </button>
          </div>

          <div className="space-y-2.5">
            {(tasksAndFollowUps.todayFollowUps || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No follow-ups due today. Great job!
              </div>
            ) : (
              (tasksAndFollowUps.todayFollowUps || []).slice(0, 5).map((flw: any) => (
                <div
                  key={flw.id}
                  onClick={() => onNavigate('crm-followups')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-all flex items-center justify-between cursor-pointer interactive-row-hover"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="text-xs font-bold text-slate-900 truncate">{flw.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {flw.lead?.companyName || flw.deal?.title || 'General follow-up'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0 chip-premium-highlight">
                    {flw.scheduledAt ? new Date(flw.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actionable Alerts & Warning Notices */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm panel-premium">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center kpi-icon-container">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 title-interactive-hover">CRM Attention Alerts</h3>
                <p className="text-[11px] text-slate-400 subtitle-interactive-hover">Bottlenecks, overdue deadlines and action triggers</p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 chip-premium-highlight">
              {alerts.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                All sales processes operational. No overdue alerts.
              </div>
            ) : (
              alerts.slice(0, 4).map((alert: any) => (
                <div
                  key={alert.id}
                  onClick={() => onNavigate(alert.actionTab || 'crm-followups')}
                  className="p-3 rounded-2xl bg-rose-50/50 hover:bg-rose-50 border border-rose-100 transition-all flex items-start gap-3 cursor-pointer interactive-row-hover"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">{alert.title}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">{alert.description}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-rose-600 border border-rose-200 shrink-0 chip-premium-highlight">
                    {alert.badge || 'ACTION'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal for Quick Add Lead */}
      {showAddLead && (
        <CreateLeadModal
          isOpen={showAddLead}
          onClose={() => setShowAddLead(false)}
          onSuccess={() => {
            setShowAddLead(false);
            fetchCrmMetrics();
          }}
        />
      )}
    </div>
  );
};
