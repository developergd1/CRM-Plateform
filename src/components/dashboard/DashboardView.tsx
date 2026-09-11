'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  PlusCircle,
  UserPlus,
  History,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { AddClientModal } from '../crm/AddClientModal';
import { AddEmployeeModal } from '../employees/AddEmployeeModal';

import { clientCache } from '@/lib/client-cache';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const cacheKey = `dashboard_stats_${user?.role || 'user'}_${user?.id || 'admin'}`;
  const [stats, setStats] = useState<any>(() => clientCache.get<any>(`dashboard_stats_${user?.role || 'user'}_${user?.id || 'admin'}`));
  const [loading, setLoading] = useState(() => !clientCache.get<any>(`dashboard_stats_${user?.role || 'user'}_${user?.id || 'admin'}`));

  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const fetchDashboardData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = clientCache.get<any>(cacheKey);
      if (cached) {
        setStats(cached);
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch('/api/analytics/dashboard');
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats);
        clientCache.set(cacheKey, json.stats);
      }
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-growth-teal"></div>
      </div>
    );
  }

  const recentOnboardings = stats?.recentOnboardings || [];
  const recentBlockHistories = stats?.recentBlockHistories || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-growth-navy via-slate-900 to-growth-navyLight rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-growth-teal/20 to-transparent pointer-events-none" />

        <div className="z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-growth-gold mb-2 border border-white/10 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Growth India CRM • Phase 1 Executive Console</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Welcome, {user?.fullName}!
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {user?.designation} • <span className="font-mono text-growth-gold font-bold">{user?.employeeId}</span> • Phase 1 Client & Employee Block/Unblock Control
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-growth-gold hover:bg-growth-goldDark text-slate-950 font-bold text-xs rounded-xl shadow-glow transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Client / Company</span>
          </button>

          <button
            onClick={() => setShowAddEmployee(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm transition-all transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Phase 1 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-md hover:border-growth-teal transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.totalClients ?? 0}</span>
            <span className="text-xs font-semibold text-growth-teal flex items-center">
              View Directory <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unique CLI-XXXXX records</p>
        </div>

        {/* Total Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card hover:shadow-md hover:border-growth-teal transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Employees</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.totalEmployees ?? 0}</span>
            <span className="text-xs font-semibold text-indigo-600 flex items-center">
              View All <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">GI-EMP-XXXXXX profiles</p>
        </div>

        {/* Active Staff */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-card hover:shadow-md transition-all cursor-pointer group bg-emerald-50/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Employees</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-800">{stats?.activeEmployees ?? 0}</span>
            <span className="text-xs font-bold text-emerald-600">Operational</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1">Active workspace logins enabled</p>
        </div>

        {/* Blocked Staff */}
        <div
          onClick={() => onNavigate('block-history')}
          className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-card hover:shadow-md transition-all cursor-pointer group bg-rose-50/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Blocked Employees</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-800">{stats?.blockedEmployees ?? 0}</span>
            <span className="text-xs font-bold text-rose-600 flex items-center">
              Audit Logs <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1">Access revoked / restricted</p>
        </div>
      </div>

      {/* CRM & Revenue Pipeline Executive Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-growth-gold" />
              <h2 className="text-base font-extrabold tracking-tight">CRM & Pipeline Performance</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-growth-teal/20 text-growth-teal border border-growth-teal/30">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tier corporate client pipeline, inbound inquiries, and deal progress
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('crm-leads')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700"
            >
              Leads
            </button>
            <button
              onClick={() => onNavigate('crm-pipeline')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700"
            >
              Pipeline
            </button>
            <button
              onClick={() => onNavigate('crm-deals')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700"
            >
              Deals
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Leads */}
          <div
            onClick={() => onNavigate('crm-leads')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-growth-teal transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inbound Leads</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats?.crm?.totalLeads ?? 0}</span>
              <span className="text-[11px] text-blue-400 font-semibold">Active Inquiries</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Direct website & campaign intake</p>
          </div>

          {/* Pipeline Opportunities */}
          <div
            onClick={() => onNavigate('crm-pipeline')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-growth-gold transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Opportunities</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-growth-gold">
                ₹{(stats?.crm?.pipelineValue || 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-amber-400 font-semibold">
                ({stats?.crm?.totalOpportunities ?? 0} active)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Proposal & negotiation stage value</p>
          </div>

          {/* Closed Won Deals */}
          <div
            onClick={() => onNavigate('crm-deals')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closed Won Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                ₹{(stats?.crm?.wonDealsValue || 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-500 font-semibold">
                ({stats?.crm?.totalDeals ?? 0} deals)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Total recognized contract value</p>
          </div>

          {/* Pending Tasks */}
          <div
            onClick={() => onNavigate('crm-tasks')}
            className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Tasks & Follow-ups</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-400">{stats?.crm?.openTasksCount ?? 0}</span>
              <span className="text-[11px] text-indigo-400 font-semibold">Action Required</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Pending activities across clients</p>
          </div>
        </div>
      </div>

      {/* 2-Column: Recent Onboardings & Live Block/Unblock History Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Onboardings Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-growth-teal" />
                <span>Recent Employee Onboardings</span>
              </h2>
              <p className="text-xs text-slate-500">
                Latest employees enrolled with auto-generated IDs
              </p>
            </div>
            <button
              onClick={() => onNavigate('employees')}
              className="text-xs font-bold text-growth-teal hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2.5 px-2">Employee ID</th>
                  <th className="pb-2.5 px-2">Name</th>
                  <th className="pb-2.5 px-2">Client</th>
                  <th className="pb-2.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOnboardings.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-growth-teal">
                      {emp.employeeId}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-400">{emp.designation}</div>
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-medium">
                      {emp.client?.companyName || 'Internal'}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          emp.status === 'BLOCKED' || emp.isBlocked
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Block / Unblock Stream */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-rose-600" />
                <span>Recent Block & Unblock Audit Stream</span>
              </h2>
              <p className="text-xs text-slate-500">
                Real-time security actions executed by Administrators
              </p>
            </div>
            <button
              onClick={() => onNavigate('block-history')}
              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentBlockHistories.map((item: any) => {
              const isBlock = item.actionType === 'BLOCK';
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                    isBlock ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isBlock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.actionType}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.employee?.fullName} ({item.employee?.employeeId})
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1">
                      Reason: <span className="font-semibold text-slate-800">{item.reason}</span>
                    </p>

                    <div className="text-[10px] text-slate-400">
                      By: <strong className="text-slate-700">{item.actionBy}</strong> • {new Date(item.actionDate).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {recentBlockHistories.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                No block/unblock actions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onClientCreated={() => fetchDashboardData()}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onEmployeeCreated={() => fetchDashboardData()}
      />
    </div>
  );
};
