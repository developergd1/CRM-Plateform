'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Users,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
  PlusCircle,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Activity,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  PieChart,
  Target,
  KeyRound,
  Zap,
  UserCheck,
  UserX,
  ExternalLink,
  FileText,
  CheckSquare,
  Layers,
  Award,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { AddClientModal } from '../crm/AddClientModal';
import { AddEmployeeModal } from '../employees/AddEmployeeModal';
import { CreateLeadModal } from '../crm/leads/CreateLeadModal';

import { clientCache } from '@/lib/client-cache';

export interface ExecutiveDashboardProps {
  onNavigate: (tab: string, id?: string) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [preset, setPreset] = useState<string>('THIS_MONTH');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);

  const cacheKey = `exec_dashboard_${user?.id || 'admin'}_${preset}_${customStart}_${customEnd}`;
  const initialCached = clientCache.get<any>(cacheKey, 15 * 60 * 1000);

  const [stats, setStats] = useState<any>(() => initialCached || null);
  const [loading, setLoading] = useState<boolean>(() => !initialCached);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<'followups' | 'tasks'>('followups');

  // Modals state
  const [showAddLead, setShowAddLead] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const fetchDashboardMetrics = async (
    selectedPreset = preset,
    start = customStart,
    end = customEnd,
    forceRefresh = false
  ) => {
    const currentKey = `exec_dashboard_${user?.id || 'admin'}_${selectedPreset}_${start}_${end}`;
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
          if (!res.ok) throw new Error('Failed to load dashboard metrics');
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
      console.error('Failed to load executive dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (preset !== 'CUSTOM') {
      setShowCustomRange(false);
      fetchDashboardMetrics(preset, '', '', false);
    } else {
      setShowCustomRange(true);
    }
  }, [preset]);

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      fetchDashboardMetrics('CUSTOM', customStart, customEnd, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardMetrics(preset, customStart, customEnd, true);
  };

  const isClientUser = user?.role === 'CLIENT';

  // Resolved metrics fallbacks
  const kpis = stats?.kpis || {
    totalLeads: stats?.crm?.totalLeads ?? 0,
    qualifiedLeads: stats?.crm?.qualifiedLeads ?? 0,
    openOpportunities: stats?.crm?.openOpportunities ?? 0,
    pipelineValue: stats?.crm?.pipelineValue ?? 0,
    wonRevenue: stats?.crm?.monthlyRevenue ?? 0,
    conversionRate: stats?.crm?.conversionRate ?? 0,
    totalClients: stats?.totalClients ?? 0,
    totalEmployees: stats?.totalEmployees ?? 0,
    workingNow: stats?.workingNow ?? 0,
    onBreak: stats?.onBreak ?? 0,
    absentToday: stats?.absentToday ?? 0,
    attendancePercentage: stats?.attendancePercentage ?? 0,
  };

  const crmOverview = stats?.crmOverview || null;
  const workforceOverview = stats?.workforceOverview || {
    workingNow: stats?.workingNow ?? 0,
    onBreak: stats?.onBreak ?? 0,
    offline: 0,
    absent: stats?.absentToday ?? 0,
    lateToday: stats?.lateToday ?? 0,
    attendancePercentage: stats?.attendancePercentage ?? 0,
    currentlyWorkingEmployees: [],
  };

  const tasksAndFollowUps = stats?.tasksAndFollowUps || {
    todayFollowUpsCount: 0,
    overdueFollowUpsCount: 0,
    openTasksCount: 0,
    pendingRequestsCount: 0,
    upcomingFollowUps: [],
    urgentTasks: [],
  };

  const clientOverview = stats?.clientOverview || {
    totalClients: stats?.totalClients ?? 0,
    activeClients: stats?.totalClients ?? 0,
    recentlyAddedClients: stats?.clientsList ?? [],
    clientsWithoutEmployeesCount: 0,
    clientsWithoutEmployeesList: [],
  };

  const alerts = stats?.alerts || {
    passwordRequestsCount: 0,
    overdueFollowUpsCount: 0,
    failedAutomationsCount: 0,
    attendanceAlertsCount: 0,
    securityAlertsCount: 0,
    actionableAlerts: [],
  };

  const recentActivities = stats?.recentActivities || [];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ========================================================================= */}
      {/* SECTION 8 & HEADER: Executive Command Banner & Quick Actions */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-950 via-growth-navy to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-800/80 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-growth-teal/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-growth-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-growth-gold mb-2 border border-white/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
              <span>Growth India • Executive Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.fullName || 'Executive'}!
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              {user?.designation || 'Administrator'} •{' '}
              <span className="font-mono text-growth-gold font-bold">{user?.employeeId}</span> •{' '}
              Unified CRM & Workforce Telemetry
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isClientUser && (
              <button
                onClick={() => setShowAddLead(true)}
                className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                title="Register a new lead inquiry"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Lead</span>
              </button>
            )}

            <button
              onClick={() => setShowAddClient(true)}
              className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2.5 bg-growth-gold hover:bg-growth-goldDark text-slate-950 font-bold text-xs rounded-xl shadow-glow transition-all active:scale-95"
              title="Onboard a new enterprise client"
            >
              <Building2 className="w-4 h-4" />
              <span>Add Client</span>
            </button>

            <button
              onClick={() => setShowAddEmployee(true)}
              className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
              title="Add workforce employee"
            >
              <UserPlus className="w-4 h-4 text-growth-teal" />
              <span>Add Employee</span>
            </button>

            {!isClientUser && (
              <button
                onClick={() => onNavigate('crm-deals')}
                className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
                title="Create or manage deals"
              >
                <Briefcase className="w-4 h-4 text-growth-gold" />
                <span>Create Deal</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('crm-tasks')}
              className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
              title="Create a workflow task"
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9: Filters (Today, This Week, This Month, Custom Range) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            { id: 'CUSTOM', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                preset === item.id
                  ? 'bg-growth-teal text-white shadow-sm ring-2 ring-growth-teal/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}

          {stats?.dateRange?.label && (
            <span className="text-[11px] font-bold text-growth-teal bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 ml-1">
              Active: {stats.dateRange.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showCustomRange && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-growth-teal outline-none"
              />
              <span className="text-xs text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-growth-teal outline-none"
              />
              <button
                onClick={handleApplyCustomRange}
                disabled={!customStart || !customEnd}
                className="px-3 py-1.5 bg-growth-navy hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Apply
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors ml-auto"
            title="Refresh Real-time KPIs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-growth-teal" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Real-time Telemetry...
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* SECTION 1: 12 Executive KPI Cards Grid */}
          {/* ========================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-3.5 px-1">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-growth-teal ring-4 ring-growth-teal/15 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Core Executive Performance Indicators (12 Metrics)
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Real-Time Database Sync
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
              {/* 1. Total Leads */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-leads')}
                  className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-growth-teal/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Total Leads
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.totalLeads}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                    <span>Inquiries</span>
                    <span className="text-growth-teal font-bold group-hover:translate-x-1 transition-transform">
                      View →
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Qualified Leads */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-leads')}
                  className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Qualified Leads
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-700 font-mono tracking-tight">
                    {kpis.qualifiedLeads}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                    <span>High Intent</span>
                    <span className="text-emerald-600 font-bold">Vetted</span>
                  </div>
                </div>
              )}

              {/* 3. Open Deals / Opps */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-pipeline')}
                  className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-amber-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Open Deals
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-200">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.openOpportunities}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                    <span>Active Proposals</span>
                    <span className="text-amber-600 font-bold">In Flight</span>
                  </div>
                </div>
              )}

              {/* 4. Pipeline Value */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-pipeline')}
                  className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-growth-teal/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Pipeline Value
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-growth-teal group-hover:scale-110 group-hover:bg-growth-teal group-hover:text-white transition-all duration-200">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-black text-growth-teal font-mono tracking-tight truncate">
                    ₹{(kpis.pipelineValue || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                    <span>Open Deals</span>
                    <span className="text-teal-700 font-bold">Gross</span>
                  </div>
                </div>
              )}

              {/* 5. Won Revenue */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-deals')}
                  className="card-premium group relative rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-gradient-to-b from-emerald-50/30 to-white hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Won Revenue
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-black text-emerald-700 font-mono tracking-tight truncate">
                    ₹{(kpis.wonRevenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
                    <span>Closed Deals</span>
                    <span className="font-bold text-emerald-800">Realized</span>
                  </div>
                </div>
              )}

              {/* 6. Conversion Rate */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-analytics')}
                  className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-growth-gold/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-growth-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Conversion Rate
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-growth-gold group-hover:scale-110 group-hover:bg-growth-gold group-hover:text-white transition-all duration-200">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.conversionRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                    <span>Leads → Won</span>
                    <span className="text-growth-goldDark font-bold">Efficiency</span>
                  </div>
                </div>
              )}

              {/* 7. Total Clients */}
              <div
                onClick={() => onNavigate('clients')}
                className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-growth-teal/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Clients
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-growth-teal group-hover:scale-110 group-hover:bg-growth-teal group-hover:text-white transition-all duration-200">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {kpis.totalClients}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                  <span>Accounts</span>
                  <span className="text-growth-teal font-bold">Managed</span>
                </div>
              </div>

              {/* 8. Total Employees */}
              <div
                onClick={() => onNavigate('employees')}
                className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-indigo-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Total Employees
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {kpis.totalEmployees}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                  <span>Enrolled Staff</span>
                  <span className="text-indigo-600 font-bold">Roster</span>
                </div>
              </div>

              {/* 9. Working Now */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium group relative rounded-2xl p-4 border border-emerald-200/80 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white hover:border-emerald-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-[10px] font-black uppercase tracking-wider">Working Now</span>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 font-mono tracking-tight">
                  {kpis.workingNow}
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
                  <span>Clocked In</span>
                  <span className="font-bold">Live</span>
                </div>
              </div>

              {/* 10. On Break */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium group relative rounded-2xl p-4 border border-amber-200/80 shadow-xs bg-gradient-to-b from-amber-50/40 to-white hover:border-amber-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-amber-800">
                  <span className="text-[10px] font-black uppercase tracking-wider">On Break</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-amber-600 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-200">
                    <Coffee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-amber-700 font-mono tracking-tight">
                  {kpis.onBreak}
                </div>
                <div className="text-[10px] text-amber-700 mt-1 font-semibold flex items-center justify-between">
                  <span>Tea / Lunch</span>
                  <span className="font-bold">Active</span>
                </div>
              </div>

              {/* 11. Absent Today */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-rose-500/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Absent Today
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-200">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {kpis.absentToday}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                  <span>Not Logged</span>
                  <span className="text-rose-600 font-bold">Unreported</span>
                </div>
              </div>

              {/* 12. Attendance % */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium group relative rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-growth-teal/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Attendance %
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-growth-teal group-hover:scale-110 group-hover:bg-growth-teal group-hover:text-white transition-all duration-200">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-growth-teal font-mono tracking-tight">
                  {kpis.attendancePercentage}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
                  <span>Turnout Ratio</span>
                  <span className="text-teal-700 font-bold">Health</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2 & SECTION 3: CRM Overview & Workforce Overview */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 2: CRM Overview (Visual Analytics) */}
            {/* ----------------------------------------------------------------------- */}
            {!isClientUser && (
              <div className="lg:col-span-7 panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-growth-teal/10 flex items-center justify-center text-growth-teal font-black group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        CRM & Pipeline Visual Analytics
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Funnel drop-off, stage distribution, and deal win performance
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('crm-analytics')}
                    className="interactive-btn-hover text-xs font-bold text-growth-teal hover:text-growth-tealDark flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                  >
                    Deep Dive <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lead Conversion Funnel Progression */}
                <div className="interactive-box-hover bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/80 transition-all duration-200 relative z-10">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-3">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Lead Conversion Drop-Off & Velocity
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">End-to-End Funnel Flow</span>
                  </div>

                  {crmOverview?.funnel && crmOverview.funnel.length > 0 ? (
                    <div className="space-y-3">
                      {crmOverview.funnel.map((step: any, idx: number) => {
                        const colors = [
                          'bg-indigo-500',
                          'bg-blue-500',
                          'bg-amber-500',
                          'bg-growth-teal',
                          'bg-emerald-600',
                        ];
                        const stepColor = colors[idx % colors.length];
                        return (
                          <div key={step.step} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-700 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${stepColor}`} />
                                {step.step}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-mono font-black">{step.count}</span>
                                <span className="text-[10px] text-slate-500 font-medium font-mono">({step.rate}% retention)</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${stepColor} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(100, Math.max(4, step.rate))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl text-center text-xs text-slate-400">
                      No funnel telemetry available for this range.
                    </div>
                  )}
                </div>

                {/* Pipeline by Stage Allocation */}
                <div className="interactive-box-hover bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/80 transition-all duration-200 relative z-10">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2.5">
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#0E8388]" />
                      Deals Pipeline Stage Allocation
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">Value Held by Stage</span>
                  </div>

                  {/* Segmented Value Distribution Bar */}
                  {(() => {
                    const stages = crmOverview?.pipelineByStage || [];
                    const totalVal = stages.reduce((acc: number, s: any) => acc + (s.value || 0), 0);
                    const stageColors: Record<string, string> = {
                      NEW: 'bg-blue-500',
                      QUALIFIED: 'bg-indigo-500',
                      PROPOSAL: 'bg-amber-500',
                      NEGOTIATION: 'bg-orange-500',
                      WON: 'bg-emerald-500',
                      LOST: 'bg-rose-500',
                    };

                    return (
                      <div className="space-y-3">
                        {totalVal > 0 && (
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                            {stages.map((stg: any) => {
                              const pct = (stg.value / totalVal) * 100;
                              if (pct <= 0) return null;
                              return (
                                <div
                                  key={stg.stage}
                                  className={`${stageColors[stg.stage] || 'bg-slate-400'} h-full transition-all`}
                                  style={{ width: `${pct}%` }}
                                  title={`${stg.stage}: ₹${(stg.value || 0).toLocaleString('en-IN')} (${Math.round(pct)}%)`}
                                />
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {stages.map((stg: any) => (
                            <div
                              key={stg.stage}
                              className="interactive-box-hover card-premium p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase text-slate-600 truncate">
                                  {stg.stage}
                                </div>
                                <div className="text-xs font-black text-slate-900 font-mono mt-0.5 truncate">
                                  ₹{(stg.value || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-mono shrink-0 ml-1">
                                {stg.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Won vs Lost Deals & Monthly Won Revenue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 relative z-10">
                  <div className="card-premium group/box p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 flex flex-col justify-between cursor-pointer overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Won vs Lost Outcome</span>
                      <span className="text-emerald-600 font-black">
                        Win Rate: {crmOverview?.wonVsLost?.winRate ?? 0}%
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Won Deals (
                          {crmOverview?.wonVsLost?.wonDeals ?? 0})
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(crmOverview?.wonVsLost?.wonRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Lost Deals (
                          {crmOverview?.wonVsLost?.lostDeals ?? 0})
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(crmOverview?.wonVsLost?.lostRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-premium group/rev p-4 bg-emerald-50/60 hover:bg-emerald-50/90 rounded-2xl border border-emerald-200 flex flex-col justify-between cursor-pointer overflow-hidden">
                    <span className="text-[11px] font-bold uppercase text-emerald-800">
                      Current Month Won Revenue
                    </span>
                    <div className="my-1 text-2xl font-black text-emerald-800 font-mono">
                      ₹{(crmOverview?.monthlyWonRevenue ?? 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Realized closed-won revenue for this calendar month
                    </span>
                  </div>
                </div>

                {/* Lead Source Performance */}
                {crmOverview?.leadSourcePerformance && crmOverview.leadSourcePerformance.length > 0 && (
                  <div className="interactive-box-hover bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/80 transition-all relative z-10">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5">
                        <PieChart className="w-3.5 h-3.5 text-growth-gold" />
                        Lead Source Inflow & Efficiency
                      </span>
                    </div>

                    <div className="space-y-2">
                      {crmOverview.leadSourcePerformance.slice(0, 4).map((src: any) => (
                        <div key={src.source} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-700 uppercase">{src.source}</span>
                            <span className="text-slate-500 font-mono">
                              {src.count} leads • {src.conversionRate}% conv
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-growth-teal h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(8, src.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 3: Workforce Overview & Live Working Staff */}
            {/* ----------------------------------------------------------------------- */}
            <div
              className={`${
                isClientUser ? 'lg:col-span-12' : 'lg:col-span-5'
              } panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Workforce & Attendance Status
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Live shifts, break compliance, and turnout rate
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('attendance')}
                  className="interactive-btn-hover text-xs font-bold text-growth-teal hover:text-growth-tealDark flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Console <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Real-time Workforce Shift Telemetry Bar */}
              <div className="interactive-box-hover bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3 transition-all duration-200 relative z-10">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Live Shift Turnout Health
                  </span>
                  <span className="font-mono text-emerald-700 font-extrabold">{workforceOverview.attendancePercentage}% Logged Today</span>
                </div>

                {/* Segmented Attendance Progress Gauge */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.workingNow / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`Working: ${workforceOverview.workingNow}`}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.onBreak / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`On Break: ${workforceOverview.onBreak}`}
                  />
                  <div
                    className="bg-rose-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.absent / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`Absent: ${workforceOverview.absent}`}
                  />
                </div>

                {/* Inline Status Telemetry Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-bold">
                  <div className="chip-premium-highlight flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 hover:border-emerald-400 rounded-xl text-emerald-800 cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{workforceOverview.workingNow} On Duty</span>
                  </div>
                  <div className="chip-premium-highlight flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 hover:border-amber-400 rounded-xl text-amber-800 cursor-pointer">
                    <Coffee className="w-3 h-3 text-amber-600" />
                    <span>{workforceOverview.onBreak} On Break</span>
                  </div>
                  <div className="chip-premium-highlight flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200/60 hover:border-amber-400 rounded-xl text-amber-900 cursor-pointer">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>{workforceOverview.lateToday} Late</span>
                  </div>
                  <div className="chip-premium-highlight flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 hover:border-rose-400 rounded-xl text-rose-800 cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>{workforceOverview.absent} Absent</span>
                  </div>
                </div>
              </div>

              {/* Small List of Currently Working Staff */}
              <div className="interactive-box-hover bg-slate-50/80 hover:bg-white rounded-2xl p-4 border border-slate-200/80 space-y-3 transition-all relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Currently Clocked-In Staff
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live Telemetry
                  </span>
                </div>

                {workforceOverview.currentlyWorkingEmployees.length === 0 ? (
                  <div className="p-5 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                    No employees currently active on shift.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workforceOverview.currentlyWorkingEmployees.map((emp: any) => (
                      <div
                        key={emp.id}
                        className="interactive-row-hover p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center flex-shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {emp.employeeId} • {emp.designation} • {emp.clientName}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full uppercase">
                            Clocked In
                          </span>
                          {emp.checkInTime && (
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {new Date(emp.checkInTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4 & SECTION 5: Tasks & Follow-ups + Client Overview */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 4: Tasks & Follow-ups */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-black group-hover:scale-110 transition-transform">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Tasks, Follow-ups & Requests
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Deadlines, scheduled callbacks, and pending approvals
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('crm-tasks')}
                  className="interactive-btn-hover text-xs font-bold text-growth-teal hover:text-growth-tealDark flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Manage All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Counter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
                <div className="interactive-box-hover card-premium group/cnt p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-center overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Today&apos;s Follow-ups
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1 group-hover/cnt:text-growth-teal transition-colors">
                    {tasksAndFollowUps.todayFollowUpsCount}
                  </div>
                </div>

                <div
                  className={`interactive-box-hover card-premium group/cnt p-3 rounded-xl border text-center overflow-hidden ${
                    tasksAndFollowUps.overdueFollowUpsCount > 0
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800 hover:border-rose-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    Overdue
                  </span>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${
                      tasksAndFollowUps.overdueFollowUpsCount > 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {tasksAndFollowUps.overdueFollowUpsCount}
                  </div>
                </div>

                <div className="interactive-box-hover card-premium group/cnt p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 text-center overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Open Tasks</span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1 group-hover/cnt:text-blue-600 transition-colors">
                    {tasksAndFollowUps.openTasksCount}
                  </div>
                </div>

                <div
                  className={`interactive-box-hover card-premium group/cnt p-3 rounded-xl border text-center overflow-hidden ${
                    tasksAndFollowUps.pendingRequestsCount > 0
                      ? 'bg-amber-50/80 border-amber-200 text-amber-800 hover:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    Pending Req
                  </span>
                  <div className="text-xl font-black text-amber-700 font-mono mt-1">
                    {tasksAndFollowUps.pendingRequestsCount}
                  </div>
                </div>
              </div>

              {/* Tabs for Follow-ups vs Tasks */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 relative z-10">
                <button
                  onClick={() => setActiveTaskTab('followups')}
                  className={`interactive-btn-hover px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTaskTab === 'followups'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Scheduled Follow-ups ({tasksAndFollowUps.upcomingFollowUps.length})
                </button>
                <button
                  onClick={() => setActiveTaskTab('tasks')}
                  className={`interactive-btn-hover px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTaskTab === 'tasks'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Urgent Tasks ({tasksAndFollowUps.urgentTasks.length})
                </button>
              </div>

              {/* Tab Content */}
              {activeTaskTab === 'followups' ? (
                <div className="space-y-2 relative z-10">
                  {tasksAndFollowUps.upcomingFollowUps.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No pending follow-ups scheduled.
                    </p>
                  ) : (
                    tasksAndFollowUps.upcomingFollowUps.map((item: any) => {
                      const isOverdue = new Date(item.scheduledAt).getTime() < Date.now();
                      return (
                        <div
                          key={item.id}
                          className="interactive-row-hover p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                              {item.title}
                              {isOverdue && (
                                <span className="text-[9px] font-black bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded uppercase">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                              {item.lead?.companyName || item.lead?.contactPerson || 'General Lead'} • Assigned:{' '}
                              {item.assignedTo?.fullName || 'Unassigned'}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                item.priority === 'HIGH' || item.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {item.priority}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              {new Date(item.scheduledAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-2 relative z-10">
                  {tasksAndFollowUps.urgentTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No open tasks recorded.</p>
                  ) : (
                    tasksAndFollowUps.urgentTasks.map((t: any) => (
                      <div
                        key={t.id}
                        className="interactive-row-hover p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{t.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            {t.taskNumber} • Assignee: {t.assignedTo?.fullName || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">
                            {t.status}
                          </span>
                          {t.dueDate && (
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              Due: {new Date(t.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 5: Client Overview */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-growth-teal/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-growth-teal/10 flex items-center justify-center text-growth-teal font-black group-hover:scale-110 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Client Accounts & Roster Status
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Managed corporate accounts and staff deployment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('clients')}
                  className="interactive-btn-hover text-xs font-bold text-growth-teal hover:text-growth-tealDark flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Directory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Client Account Portfolio Operational Readiness */}
              <div className="card-premium group/corp rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between relative z-10 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0E8388] font-bold group-hover/corp:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Corporate Accounts Deployment
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {clientOverview.activeClients} active accounts • {Math.max(0, clientOverview.totalClients - clientOverview.clientsWithoutEmployeesCount)} with assigned staff
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      clientOverview.clientsWithoutEmployeesCount > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    {clientOverview.clientsWithoutEmployeesCount > 0
                      ? `${clientOverview.clientsWithoutEmployeesCount} Need Staffing`
                      : 'Fully Staffed'}
                  </span>
                </div>
              </div>

              {/* Warning: Clients without Employees */}
              {!isClientUser && clientOverview.clientsWithoutEmployeesCount > 0 && (
                <div className="interactive-box-hover p-3 bg-amber-50/70 hover:bg-amber-50 border border-amber-200 hover:border-amber-400 rounded-xl flex items-center justify-between text-xs relative z-10 transition-all">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      {clientOverview.clientsWithoutEmployeesCount} clients currently have 0 employees
                      assigned.
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('employees')}
                    className="interactive-btn-hover px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition-colors flex-shrink-0"
                  >
                    Onboard Staff
                  </button>
                </div>
              )}

              {/* Recently Added Clients */}
              <div className="space-y-2 relative z-10">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Recently Onboarded Accounts
                </div>

                {clientOverview.recentlyAddedClients.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No clients registered yet.</p>
                ) : (
                  clientOverview.recentlyAddedClients.slice(0, 5).map((c: any) => (
                    <div
                      key={c.id}
                      className="interactive-row-hover p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {c.companyName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.clientId} • Enrolled:{' '}
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          {c._count?.employees ?? 0} Staff
                        </span>
                        <div className="text-[9px] text-slate-400 font-mono mt-1">
                          {c._count?.deals ?? 0} Deals
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 6 & SECTION 7: Alerts & Recent Activity */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 6: Alerts & Notifications (Actionable Only) */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 font-black group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Important Actionable Alerts
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Security, overdue follow-ups, and exception queues
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {alerts.actionableAlerts.length} Active
                </span>
              </div>

              {alerts.actionableAlerts.length === 0 ? (
                <div className="p-8 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-center space-y-1 relative z-10">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-bold text-xs text-emerald-900">
                    All Systems Operating Optimally
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    No urgent security, password, or attendance flags detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 relative z-10">
                  {alerts.actionableAlerts.map((alert: any) => {
                    const isHigh = alert.severity === 'HIGH';
                    const isMedium = alert.severity === 'MEDIUM';

                    return (
                      <div
                        key={alert.id}
                        className={`interactive-row-hover p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isHigh
                            ? 'bg-rose-50/80 border-rose-200'
                            : isMedium
                            ? 'bg-amber-50/80 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg mt-0.5 ${
                              isHigh
                                ? 'bg-rose-100 text-rose-700'
                                : isMedium
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {alert.type === 'PASSWORD_REQUEST' ? (
                              <KeyRound className="w-4 h-4" />
                            ) : alert.type === 'FAILED_AUTOMATION' ? (
                              <Zap className="w-4 h-4" />
                            ) : alert.type === 'SECURITY_ALERT' ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-black truncate ${
                                  isHigh ? 'text-rose-900' : isMedium ? 'text-amber-900' : 'text-slate-900'
                                }`}
                              >
                                {alert.title}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/70 border border-current uppercase">
                                {alert.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {alert.description}
                            </p>
                          </div>
                        </div>

                        {alert.actionTab && (
                          <button
                            onClick={() => onNavigate(alert.actionTab)}
                            className={`interactive-btn-hover px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm ${
                              isHigh
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 7: Recent Activity Timeline */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium group relative rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-black group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Recent Chronological Activity
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Live audit logs, deal transitions, and lead creations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('audit-logs')}
                  className="interactive-btn-hover text-xs font-bold text-growth-teal hover:text-growth-tealDark flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Audit Trail <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentActivities.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 relative z-10">
                  No recent activities recorded yet.
                </div>
              ) : (
                <div className="space-y-3 relative z-10 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {recentActivities.map((act: any) => (
                    <div key={act.id} className="relative flex items-start gap-3 pl-1">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 flex-shrink-0 z-10">
                        <Activity className="w-3 h-3 text-growth-teal" />
                      </div>
                      <div className="interactive-row-hover min-w-0 flex-1 p-2.5 bg-white rounded-xl border border-slate-200 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {act.title}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                            {act.timestamp
                              ? new Date(act.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        {act.subtitle && (
                          <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">
                            {act.subtitle}
                          </p>
                        )}
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>By: {act.actor}</span>
                          <span className="font-bold uppercase text-growth-teal">{act.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      <CreateLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSuccess={() => {
          setShowAddLead(false);
          fetchDashboardMetrics(preset);
        }}
      />

      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onClientCreated={() => fetchDashboardMetrics(preset)}
      />

      <AddEmployeeModal
        isOpen={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onEmployeeCreated={() => fetchDashboardMetrics(preset)}
      />
    </div>
  );
};
