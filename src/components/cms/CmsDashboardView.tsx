'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Compass,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
} from 'lucide-react';

interface CmsDashboardViewProps {
  onNavigateTab: (tab: string, clientId?: string) => void;
}

export const CmsDashboardView: React.FC<CmsDashboardViewProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/cms/dashboard');
      if (!res.ok) {
        throw new Error('Failed to load CMS dashboard statistics');
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error(json.error || 'Failed to load metrics');
      }
    } catch (err: any) {
      console.error('Error fetching CMS metrics:', err);
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0D9488] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Client Management System metrics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    blockedEmployees: 0,
  };

  const moduleDist = data?.moduleDistribution || { EMS: 0, CRM: 0, HRM: 0, totalSubscribedClients: 0 };
  const recentClients = data?.recentClients || [];
  const clientWiseSummary = data?.clientWiseSummary || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Client Management System (CMS)</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              Admin Governance
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized multi-tenant repository of all onboarded organizations, account credentials, and client-specific workforce.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('cms-onboarding')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Onboard New Client</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Clients */}
        <div
          onClick={() => onNavigateTab('cms-clients')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Clients</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">{kpis.totalClients}</div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mt-1">
              <span className="text-emerald-700 font-bold">{kpis.activeClients} Active</span>
              <span>•</span>
              <span className="text-slate-500">{kpis.inactiveClients} Inactive</span>
            </div>
          </div>
        </div>

        {/* Total Workforce */}
        <div
          onClick={() => onNavigateTab('cms-clients')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#0D9488] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Employees</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">{kpis.totalEmployees}</div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mt-1">
              <span className="text-emerald-700 font-bold">{kpis.activeEmployees} Active</span>
              <span>•</span>
              <span className="text-slate-500">{kpis.inactiveEmployees} Inactive</span>
            </div>
          </div>
        </div>

        {/* Active Client Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Clients</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">{kpis.activeClients}</div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">
              {kpis.totalClients > 0 ? Math.round((kpis.activeClients / kpis.totalClients) * 100) : 0}% Active Rate
            </div>
          </div>
        </div>

        {/* Blocked Personnel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Blocked Staff</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-700 font-mono">{kpis.blockedEmployees}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Suspended via governance rules
            </div>
          </div>
        </div>
      </div>

      {/* Module Subscription Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0D9488]" />
              <span>Assigned Module Distribution</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Multi-tenant application entitlements provisioned across active client accounts.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {kpis.totalClients} Total Organizations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* EMS Module */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-900 uppercase tracking-wider">EMS (Employee Mgmt)</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md">
                {moduleDist.EMS} Clients
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Workforce directory, attendance clocking, leave quotas, tasks, and document vault.
            </p>
          </div>

          {/* CRM Module */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider">CRM (Sales Engine)</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                {moduleDist.CRM} Clients
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sales pipeline, leads scoring, contacts directory, deals Kanban, and commercials.
            </p>
          </div>

          {/* HRM Module */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-900 uppercase tracking-wider">HRM (Enterprise Suite)</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                {moduleDist.HRM} Clients
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Recruitment ATS, automated payroll, salary slips, performance OKRs, and requests.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Client Directory Summary & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Client-wise Workforce Summary Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Organizations & Workforce Scale
              </h2>
              <p className="text-[11px] text-slate-500">Top organizations and their provisioned modules.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('cms-clients')}
              className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Clients</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Workforce</th>
                  <th className="py-3 px-4">Modules</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {clientWiseSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No client organizations found. Onboard your first client above.
                    </td>
                  </tr>
                ) : (
                  clientWiseSummary.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.clientId}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.companyName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{c.status}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.industry}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {c.employeeCount} staff
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.assignedModules.map((m: string) => (
                            <span
                              key={m}
                              className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('cms-selected-client', c.id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0D9488] rounded-lg transition-colors cursor-pointer"
                        >
                          Open Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1/3): Recently Onboarded & Activity Feed */}
        <div className="space-y-6">
          {/* Recently Onboarded */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Recently Onboarded
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Last 8</span>
            </div>

            <div className="space-y-3">
              {recentClients.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No recent onboardings.</p>
              ) : (
                recentClients.slice(0, 5).map((rc: any) => (
                  <div
                    key={rc.id}
                    onClick={() => onNavigateTab('cms-selected-client', rc.id)}
                    className="p-3 rounded-xl border border-slate-100 hover:border-[#0D9488]/40 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-900 truncate">{rc.companyName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {rc.clientId} • {rc.contactPerson}
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Logs Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Audit Event Trail
            </h2>
            <div className="space-y-2.5">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No recent audit logs.</p>
              ) : (
                recentActivity.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 truncate">
                      {log.entityType} ID: {log.entityId || 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
