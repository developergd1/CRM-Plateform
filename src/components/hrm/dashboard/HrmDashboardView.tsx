'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Briefcase,
  Clock,
  Coffee,
  LifeBuoy,
  Target,
  Banknote,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  FileText,
} from 'lucide-react';

interface HrmDashboardViewProps {
  currentTenant?: any;
  onNavigate: (tab: string) => void;
}

export const HrmDashboardView: React.FC<HrmDashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hrm/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load HRM dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalHeadcount: 0,
    todayPresent: 0,
    attendanceRate: 0,
    openJobs: 0,
    activeCandidates: 0,
    pendingLeaves: 0,
    openTickets: 0,
  };

  const latestPayroll = data?.latestPayroll;
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-6">
      {/* Executive Welcome Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold border border-[#0D9488]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Growth India — Human Resource & Payroll Operating System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
              Workforce Telemetry & HR Governance
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unified control center connecting EMS employee masters, live attendance punches, recruitment pipelines, leave ledgers, and automated 5-step payroll disbursement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('hrm-payroll')}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>Payroll Hub</span>
            </button>
            <button
              onClick={() => onNavigate('hrm-recruitment')}
              className="px-4 py-2.5 border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Recruitment ATS</span>
            </button>
            <button
              onClick={() => fetchDashboard()}
              className="p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-[#F0FDFA] text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Pillar Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <div
          onClick={() => onNavigate('hrm-lifecycle')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Workforce</span>
            <div className="w-8 h-8 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[#111111]">{metrics.totalHeadcount}</span>
            <span className="text-xs text-slate-500 ml-2">Employees</span>
          </div>
          <p className="text-[11px] text-[#0D9488] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Source of Truth: EMS Master
          </p>
        </div>

        {/* Live Attendance */}
        <div
          onClick={() => onNavigate('hrm-attendance')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Attendance</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[#111111]">{metrics.todayPresent}</span>
            <span className="text-xs text-slate-500 ml-2 font-medium">({metrics.attendanceRate}% present)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Real-time biometric punch sync</p>
        </div>

        {/* Open Recruitment */}
        <div
          onClick={() => onNavigate('hrm-recruitment')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recruitment Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-[#111111]">{metrics.activeCandidates}</span>
            <span className="text-xs text-slate-500 ml-2">Candidates</span>
          </div>
          <p className="text-[11px] text-purple-700 font-semibold mt-2">
            Across {metrics.openJobs} active job openings
          </p>
        </div>

        {/* Pending Actions */}
        <div
          onClick={() => onNavigate('hrm-leave')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Leaves</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-600">{metrics.pendingLeaves}</span>
            <span className="text-xs text-slate-500 ml-2">Awaiting Approval</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {metrics.openTickets} helpdesk tickets open
          </p>
        </div>
      </div>

      {/* Middle Grid: Payroll Banner & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payroll Status Card */}
        <div className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#111111] text-sm">Payroll Cycle Status</h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                latestPayroll?.status === 'FINALIZED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : latestPayroll?.status === 'APPROVED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {latestPayroll?.status || 'NO ACTIVE PERIOD'}
              </span>
            </div>

            <p className="text-2xl font-black text-[#111111]">{latestPayroll?.periodCode || 'PAY-2026-03'}</p>
            <p className="text-xs text-slate-500 mt-1">
              Working Days: <span className="font-bold text-slate-800">{latestPayroll?.workingDays || 26}</span>
            </p>

            <div className="space-y-2 mt-6 pt-4 border-t border-[#E2E8F0] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gross Calculated:</span>
                <span className="font-bold text-[#111111]">₹{(latestPayroll?.totalGrossPay || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Deductions:</span>
                <span className="font-semibold text-red-600">-₹{(latestPayroll?.totalDeductions || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="font-bold text-[#0D9488]">Net Disbursement:</span>
                <span className="font-black text-[#0D9488]">₹{(latestPayroll?.totalNetPay || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('hrm-payroll')}
            className="w-full mt-6 py-2.5 bg-[#F0FDFA] hover:bg-[#0D9488] hover:text-white text-[#111111] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Open Payroll Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Audit Activity Stream */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#111111] text-sm">Real-time HR & Compliance Audit Feed</h3>
            <span className="text-[11px] text-slate-400">Prisma Engine Telemetry</span>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent HR audit records found.</p>
            ) : (
              recentActivities.map((log: any) => (
                <div key={log.id} className="p-3 bg-[#F0FDFA] rounded-xl border border-[#E2E8F0] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white border border-[#E2E8F0] rounded-md text-[#0D9488]">
                      {log.action}
                    </span>
                    <div>
                      <p className="font-semibold text-[#111111]">{log.details}</p>
                      <p className="text-[10px] text-slate-400">{log.resource} • {new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
