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
  X,
} from 'lucide-react';
import { AddClientModal } from '../crm/AddClientModal';
import { AddEmployeeModal } from '../employees/AddEmployeeModal';
import { EmployeeOnboardingWizard } from '../employees/EmployeeOnboardingWizard';
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
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-sm border border-slate-200/80 relative overflow-hidden panel-premium">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back, {user?.fullName || 'Executive'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {user?.designation || 'Administrator'} • <span className="font-mono text-growth-teal font-bold">{user?.employeeId}</span>
            </p>
          </div>

          {/* Quick Action Buttons - Clean text buttons, no icons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isClientUser && (
              <button
                onClick={() => setShowAddLead(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Add Lead
              </button>
            )}

            <button
              onClick={() => setShowAddClient(true)}
              className="px-4 py-2 bg-growth-orange hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Add Client
            </button>

            <button
              onClick={() => setShowAddEmployee(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer"
            >
              Add Employee
            </button>

            {!isClientUser && (
              <button
                onClick={() => onNavigate('crm-deals')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                Create Deal
              </button>
            )}

            <button
              onClick={() => onNavigate('crm-tasks')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0D9488] font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95 cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9: Filters (Today, This Week, This Month, Custom Range) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 mr-2">
            Filter:
          </span>

          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'CUSTOM', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                preset === item.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}

          {stats?.dateRange?.label && (
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 ml-1">
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
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none"
              />
              <span className="text-xs text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-600 outline-none"
              />
              <button
                onClick={handleApplyCustomRange}
                disabled={!customStart || !customEnd}
                className="px-3 py-1.5 bg-slate-950 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Apply
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors ml-auto"
            title="Refresh KPIs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Overview...
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* SECTION 1: 12 Executive KPI Cards Grid */}
          {/* ========================================================================= */}
          <div>
            <div className="flex items-center justify-between mb-3.5 px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Executive Overview
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
              {/* 1. Total Leads */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-leads')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-500">Total Leads</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.totalLeads}
                  </div>
                </div>
              )}

              {/* 2. Qualified Leads */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-leads')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-teal-700">Qualified Leads</div>
                  <div className="mt-2 text-2xl font-black text-teal-700 font-mono tracking-tight">
                    {kpis.qualifiedLeads}
                  </div>
                </div>
              )}

              {/* 3. Open Deals */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-pipeline')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-500">Open Deals</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.openOpportunities}
                  </div>
                </div>
              )}

              {/* 4. Pipeline Value */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-pipeline')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-teal-700">Pipeline Value</div>
                  <div className="mt-2 text-xl font-black text-teal-700 font-mono tracking-tight truncate">
                    ₹{(kpis.pipelineValue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* 5. Won Revenue */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-deals')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-teal-700">Won Revenue</div>
                  <div className="mt-2 text-xl font-black text-teal-700 font-mono tracking-tight truncate">
                    ₹{(kpis.wonRevenue || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* 6. Conversion Rate */}
              {!isClientUser && (
                <div
                  onClick={() => onNavigate('crm-analytics')}
                  className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-500">Conversion Rate</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {kpis.conversionRate}%
                  </div>
                </div>
              )}

              {/* 7. Total Clients */}
              <div
                onClick={() => onNavigate('clients')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-500">Total Clients</div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {kpis.totalClients}
                </div>
              </div>

              {/* 8. Total Employees */}
              <div
                onClick={() => onNavigate('employees')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-500">Total Employees</div>
                <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {kpis.totalEmployees}
                </div>
              </div>

              {/* 9. Working Now */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-teal-700">Working Now</div>
                <div className="mt-2 text-2xl font-black text-teal-700 font-mono tracking-tight">
                  {kpis.workingNow}
                </div>
              </div>

              {/* 10. On Break */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-orange-600">On Break</div>
                <div className="mt-2 text-2xl font-black text-orange-600 font-mono tracking-tight">
                  {kpis.onBreak}
                </div>
              </div>

              {/* 11. Absent Today */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-orange-600">Absent Today</div>
                <div className="mt-2 text-2xl font-black text-orange-600 font-mono tracking-tight">
                  {kpis.absentToday}
                </div>
              </div>

              {/* 12. Attendance % */}
              <div
                onClick={() => onNavigate('attendance')}
                className="card-premium rounded-2xl p-4 border border-slate-200 shadow-xs cursor-pointer"
              >
                <div className="text-xs font-semibold text-teal-700">Attendance %</div>
                <div className="mt-2 text-2xl font-black text-teal-700 font-mono tracking-tight">
                  {kpis.attendancePercentage}%
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2 & SECTION 3: CRM Overview & Workforce Overview */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 2: CRM Overview */}
            {/* ----------------------------------------------------------------------- */}
            {!isClientUser && (
              <div className="lg:col-span-7 panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      CRM & Pipeline Analytics
                    </h3>
                  </div>
                  <button
                    onClick={() => onNavigate('crm-analytics')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                  >
                    Deep Dive <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lead Conversion Funnel Progression */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Lead Conversion Funnel</span>
                    <span className="text-[11px] text-slate-500 font-normal">Retention Rate</span>
                  </div>

                  {crmOverview?.funnel && crmOverview.funnel.length > 0 ? (
                    <div className="space-y-3">
                      {crmOverview.funnel.map((step: any, idx: number) => {
                        const colors = ['bg-slate-900', 'bg-teal-600', 'bg-orange-500', 'bg-teal-700', 'bg-slate-700'];
                        const stepColor = colors[idx % colors.length];
                        return (
                          <div key={step.step} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-slate-800">{step.step}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-mono font-bold">{step.count}</span>
                                <span className="text-[10px] text-slate-500 font-normal">({step.rate}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
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
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Deals Pipeline by Stage</span>
                    <span className="text-[11px] text-slate-500 font-normal">Distribution</span>
                  </div>

                  {(() => {
                    const stages = crmOverview?.pipelineByStage || [];
                    const totalVal = stages.reduce((acc: number, s: any) => acc + (s.value || 0), 0);
                    const stageColors: Record<string, string> = {
                      NEW: 'bg-slate-400',
                      QUALIFIED: 'bg-teal-600',
                      PROPOSAL: 'bg-orange-400',
                      NEGOTIATION: 'bg-orange-500',
                      WON: 'bg-teal-700',
                      LOST: 'bg-slate-600',
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
                                  title={`${stg.stage}: ₹${(stg.value || 0).toLocaleString('en-IN')}`}
                                />
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {stages.map((stg: any) => (
                            <div
                              key={stg.stage}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase text-slate-600 truncate">
                                  {stg.stage}
                                </div>
                                <div className="text-xs font-bold text-slate-900 font-mono mt-0.5 truncate">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Won vs Lost</span>
                      <span className="text-teal-700 font-black">
                        Win Rate: {crmOverview?.wonVsLost?.winRate ?? 0}%
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-teal-800">
                          Won Deals ({crmOverview?.wonVsLost?.wonDeals ?? 0})
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(crmOverview?.wonVsLost?.wonRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-orange-700">
                          Lost Deals ({crmOverview?.wonVsLost?.lostDeals ?? 0})
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{(crmOverview?.wonVsLost?.lostRevenue ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase text-teal-800">
                      Current Month Won Revenue
                    </span>
                    <div className="my-1 text-2xl font-black text-teal-800 font-mono">
                      ₹{(crmOverview?.monthlyWonRevenue ?? 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-teal-700 font-medium">
                      Realized closed-won revenue
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------------- */}
            {/* SECTION 3: Workforce Overview */}
            {/* ----------------------------------------------------------------------- */}
            <div
              className={`${
                isClientUser ? 'lg:col-span-12' : 'lg:col-span-5'
              } panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Workforce & Attendance
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('attendance')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Console <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Real-time Workforce Shift Telemetry Bar */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Shift Turnout</span>
                  <span className="font-mono text-teal-700 font-bold">{workforceOverview.attendancePercentage}% Today</span>
                </div>

                {/* Segmented Attendance Progress Gauge */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-teal-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.workingNow / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`Working: ${workforceOverview.workingNow}`}
                  />
                  <div
                    className="bg-orange-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.onBreak / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`On Break: ${workforceOverview.onBreak}`}
                  />
                  <div
                    className="bg-orange-600 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, (workforceOverview.absent / (kpis.totalEmployees || 1)) * 100))}%` }}
                    title={`Absent: ${workforceOverview.absent}`}
                  />
                </div>

                {/* Status Telemetry Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-800">
                    <span>{workforceOverview.workingNow} On Duty</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-800">
                    <span>{workforceOverview.onBreak} On Break</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50/70 border border-orange-200/60 rounded-xl text-orange-900">
                    <span>{workforceOverview.lateToday} Late</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-800">
                    <span>{workforceOverview.absent} Absent</span>
                  </div>
                </div>
              </div>

              {/* Small List of Currently Working Staff */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Currently Clocked-In Staff
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Live
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
                        className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {emp.employeeId} • {emp.designation}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full uppercase">
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
            <div className="panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Tasks & Follow-ups
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('crm-tasks')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Manage All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Counter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Today&apos;s Follow-ups
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {tasksAndFollowUps.todayFollowUpsCount}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-center ${
                    tasksAndFollowUps.overdueFollowUpsCount > 0
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    Overdue
                  </span>
                  <div className="text-xl font-black font-mono mt-1 text-orange-700">
                    {tasksAndFollowUps.overdueFollowUpsCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Open Tasks</span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {tasksAndFollowUps.openTasksCount}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-center ${
                    tasksAndFollowUps.pendingRequestsCount > 0
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    Pending Req
                  </span>
                  <div className="text-xl font-black text-orange-700 font-mono mt-1">
                    {tasksAndFollowUps.pendingRequestsCount}
                  </div>
                </div>
              </div>

              {/* Tabs for Follow-ups vs Tasks */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  onClick={() => setActiveTaskTab('followups')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTaskTab === 'followups'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Scheduled Follow-ups ({tasksAndFollowUps.upcomingFollowUps.length})
                </button>
                <button
                  onClick={() => setActiveTaskTab('tasks')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                <div className="space-y-2">
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
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                              {item.title}
                              {isOverdue && (
                                <span className="text-[9px] font-black bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded uppercase">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                              {item.lead?.companyName || 'General Lead'} • Assigned:{' '}
                              {item.assignedTo?.fullName || 'Unassigned'}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                item.priority === 'HIGH' || item.priority === 'URGENT'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-700'
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
                <div className="space-y-2">
                  {tasksAndFollowUps.urgentTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No open tasks recorded.</p>
                  ) : (
                    tasksAndFollowUps.urgentTasks.map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{t.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            {t.taskNumber} • Assignee: {t.assignedTo?.fullName || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-[9px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded uppercase">
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
            <div className="panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Client Accounts
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('clients')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Directory <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Client Account Portfolio Operational Readiness */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Corporate Accounts
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {clientOverview.activeClients} active accounts • {Math.max(0, clientOverview.totalClients - clientOverview.clientsWithoutEmployeesCount)} with assigned staff
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      clientOverview.clientsWithoutEmployeesCount > 0
                        ? 'bg-orange-50 border-orange-200 text-orange-800'
                        : 'bg-teal-50 border-teal-200 text-teal-800'
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
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="text-orange-900 font-bold">
                    <span>
                      {clientOverview.clientsWithoutEmployeesCount} clients currently have 0 employees assigned.
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate('employees')}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-[10px] transition-colors flex-shrink-0"
                  >
                    Onboard Staff
                  </button>
                </div>
              )}

              {/* Recently Added Clients */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recently Onboarded Accounts
                </div>

                {clientOverview.recentlyAddedClients.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No clients registered yet.</p>
                ) : (
                  clientOverview.recentlyAddedClients.slice(0, 5).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
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
            {/* SECTION 6: Alerts & Notifications */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Alerts & Notifications
                  </h3>
                </div>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {alerts.actionableAlerts.length} Active
                </span>
              </div>

              {alerts.actionableAlerts.length === 0 ? (
                <div className="p-8 bg-teal-50/50 rounded-2xl border border-teal-200 text-center space-y-1">
                  <div className="font-bold text-xs text-teal-900">
                    All Systems Operating Optimally
                  </div>
                  <p className="text-[11px] text-teal-700">
                    No urgent security, password, or attendance flags detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.actionableAlerts.map((alert: any) => {
                    return (
                      <div
                        key={alert.id}
                        className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-orange-50/70 border-orange-200"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-orange-950 truncate">
                              {alert.title}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white border border-orange-300 text-orange-800 uppercase">
                              {alert.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>

                        {alert.actionTab && (
                          <button
                            onClick={() => onNavigate(alert.actionTab)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shadow-sm bg-orange-600 hover:bg-orange-700 text-white"
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
            {/* SECTION 7: Recent Activity */}
            {/* ----------------------------------------------------------------------- */}
            <div className="panel-premium rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Recent Activity
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate('audit-logs')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg"
                >
                  Audit Trail <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentActivities.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No recent activities recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((act: any) => (
                    <div key={act.id} className="p-2.5 bg-white rounded-xl border border-slate-200">
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
                        <span className="font-bold uppercase text-teal-700">{act.source}</span>
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

      {showAddEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enterprise Staff Onboarding</h3>
                  <p className="text-[11px] text-slate-500">Multi-step employee enrollment & corporate deployment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEmployee(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <EmployeeOnboardingWizard
                onSuccess={() => {
                  setShowAddEmployee(false);
                  fetchDashboardMetrics(preset);
                }}
                onCancel={() => setShowAddEmployee(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
