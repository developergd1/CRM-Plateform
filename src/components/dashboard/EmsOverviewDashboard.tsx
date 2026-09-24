'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Coffee,
  CalendarClock,
  AlertTriangle,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileCheck,
  UserPlus,
} from 'lucide-react';

interface EmsOverviewDashboardProps {
  onNavigateTab: (tab: string, context?: any) => void;
}

export const EmsOverviewDashboard: React.FC<EmsOverviewDashboardProps> = ({ onNavigateTab }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/workforce');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching EMS overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = data?.metrics || {
    totalEmployees: 0,
    activeEmployees: 0,
    onNoticeCount: 0,
    exitedCount: 0,
    blockedEmployees: 0,
    pendingLeaves: 0,
    pendingRegularizations: 0,
    missingCheckins: 0,
    presentToday: 0,
    lateToday: 0,
  };

  const clientDistribution = data?.clientDistribution || [];
  const departmentBreakdown = data?.departmentBreakdown || [];

  return (
    <div className="space-y-6 select-none">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Employee Management Governance Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise workforce distribution, real-time punctuality, lifecycle states, and pending sign-offs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          <button
            onClick={() => onNavigateTab('onboarding')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Employees */}
        <div
          onClick={() => onNavigateTab('employees')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.totalEmployees}</span>
            <span className="text-[11px] font-bold text-teal-700">Enrolled</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>View directory</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Active Staff */}
        <div
          onClick={() => onNavigateTab('employees', { status: 'ACTIVE' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Staff</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.activeEmployees}</span>
            <span className="text-[11px] font-bold text-growth-teal">In Service</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Operational staff</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* On Notice */}
        <div
          onClick={() => onNavigateTab('employee-lifecycle')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">On Notice</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.onNoticeCount}</span>
            <span className="text-[11px] font-bold text-orange-600">Notice Period</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Manage lifecycle</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Exited / Archived */}
        <div
          onClick={() => onNavigateTab('offboarding')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exited / Clearances</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.exitedCount}</span>
            <span className="text-[11px] font-bold text-slate-600">Historical</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>View offboarding</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Present Today */}
        <div
          onClick={() => onNavigateTab('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Punched In Today</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.presentToday}</span>
            <span className="text-[11px] font-bold text-teal-700">Present</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{metrics.lateToday} marked late</span>
          </p>
        </div>

        {/* Missing Check-Ins */}
        <div
          onClick={() => onNavigateTab('live-workforce')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Missing Check-Ins</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.missingCheckins}</span>
            <span className="text-[11px] font-bold text-rose-700">Not Punched</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Live telemetry check</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Pending Leaves */}
        <div
          onClick={() => onNavigateTab('leave')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Leaves</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.pendingLeaves}</span>
            <span className="text-[11px] font-bold text-orange-600">Awaiting Sign-off</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Review requests</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Pending Regularizations */}
        <div
          onClick={() => onNavigateTab('regularization')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Regularizations</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.pendingRegularizations}</span>
            <span className="text-[11px] font-bold text-growth-teal">Corrections</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Approve punches</span>
            <ArrowRight className="w-2.5 h-2.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>
      </div>

      {/* Second Section: Two Column Grid (Attendance & Live Telemetry + Pending Approvals Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance & Live Telemetry Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Workforce Attendance Overview</h3>
                <p className="text-[11px] text-slate-500">Today's punch compliance & live distribution</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Punctuality Rate</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {metrics.presentToday > 0
                  ? `${Math.round(((metrics.presentToday - metrics.lateToday) / metrics.presentToday) * 100)}%`
                  : '100%'}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">On-time check-ins</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Late Check-ins</span>
              <p className="text-xl font-black text-amber-700 mt-1">{metrics.lateToday}</p>
              <span className="text-[10px] text-slate-500 font-medium">Grace threshold exceeded</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Missing Punches</span>
              <p className="text-xl font-black text-rose-700 mt-1">{metrics.missingCheckins}</p>
              <span className="text-[10px] text-slate-500 font-medium">Requires follow-up</span>
            </div>
          </div>

          {/* Quick link buttons to modules */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('live-workforce')}
              className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-teal-600" />
              <span>Live Workforce Board</span>
            </button>
            <button
              onClick={() => onNavigateTab('timesheets')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Monthly Timesheets</span>
            </button>
            <button
              onClick={() => onNavigateTab('shifts-policy')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Shift Policies</span>
            </button>
            <button
              onClick={() => onNavigateTab('holiday-calendar')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5 text-slate-600" />
              <span>Holiday Calendar</span>
            </button>
          </div>
        </div>

        {/* Pending Approvals Quick-Action Hub */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Governance Approvals</h3>
                <p className="text-[11px] text-slate-500">Pending sign-offs requiring admin authorization</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div
                onClick={() => onNavigateTab('leave')}
                className="p-3 rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/40 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Leave Approvals</h4>
                  <p className="text-[11px] text-slate-500">Employee leave requests pending decision</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${metrics.pendingLeaves > 0 ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  {metrics.pendingLeaves}
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('regularization')}
                className="p-3 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/40 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Punch Regularizations</h4>
                  <p className="text-[11px] text-slate-500">Missed punches & anomaly corrections</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${metrics.pendingRegularizations > 0 ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  {metrics.pendingRegularizations}
                </span>
              </div>

              <div
                onClick={() => onNavigateTab('offboarding')}
                className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Offboarding Clearances</h4>
                  <p className="text-[11px] text-slate-500">Exit interviews & asset return signoffs</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-200 text-slate-700">
                  {metrics.onNoticeCount}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Inspect Immutable Audit Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Third Section: Client Workforce Summary & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client-wise Headcount Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Client-Wise Headcount Summary</h3>
                <p className="text-[11px] text-slate-500">Corporate client workforce allocations</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('org-structure')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Org Chart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Client Code</th>
                  <th className="py-2.5 px-3">Company Name</th>
                  <th className="py-2.5 px-3 text-right">Assigned Staff</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientDistribution.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No corporate client assignments found.
                    </td>
                  </tr>
                ) : (
                  clientDistribution.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">{c.clientId}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{c.companyName}</td>
                      <td className="py-2.5 px-3 text-right font-black text-teal-700">{c.employeeCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onNavigateTab('employees', { clientId: c.clientId || c.id })}
                          className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          View Staff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Department Workforce Share</h3>
                <p className="text-[11px] text-slate-500">Operational function distribution</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('workforce-reports')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {departmentBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No department records available.</p>
            ) : (
              departmentBreakdown.map((dept: any) => {
                const total = metrics.totalEmployees || 1;
                const percentage = Math.round((dept.count / total) * 100);
                return (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{dept.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        <strong>{dept.count}</strong> staff ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
