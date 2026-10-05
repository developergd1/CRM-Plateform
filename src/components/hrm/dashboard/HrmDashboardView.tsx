'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Clock,
  Coffee,
  Target,
  Banknote,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Building2,
  BarChart3,
  Calendar,
  AlertCircle,
  Award,
  Sliders,
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
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    onLeave: 0,
    pendingLeaveRequests: 0,
    payrollStatus: 'DRAFT',
    currentPayrollPeriod: 'N/A',
    pendingPayrollExceptions: 0,
    pendingApprovals: 0,
    activeGoals: 0,
    pendingPerformanceReviews: 0,
    attendanceRate: 0,
  };

  const latestPayroll = data?.latestPayroll;
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold border border-[#0D9488]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Growth India — Human Resource, Payroll & Statutory Compliance OS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
              HRM Command Center & Telemetry
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time synchronization across Employee 360, biometric attendance, leave ledgers, deterministic 5-step payroll calculations, statutory compliance (PF/ESI/TDS/PT), and OKR performance reviews.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('hrm-payroll')}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>Payroll Hub</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('hrm-performance')}
              className="px-4 py-2.5 border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>PMS Reviews</span>
            </button>
            <button
              type="button"
              onClick={() => fetchDashboard()}
              className="p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-[#F0FDFA] text-slate-600 transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Employees', tab: 'hrm-employees', icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Attendance', tab: 'hrm-attendance', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Leave', tab: 'hrm-leave', icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Payroll', tab: 'hrm-payroll', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'PMS', tab: 'hrm-performance', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Reports', tab: 'hrm-reports', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.tab}
              type="button"
              onClick={() => onNavigate(link.tab)}
              className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center gap-2.5 hover:border-[#0D9488] hover:shadow-xs transition-all cursor-pointer group text-left"
            >
              <div className={`w-8 h-8 rounded-lg ${link.bg} ${link.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-[#0D9488] truncate">{link.label}</span>
            </button>
          );
        })}
      </div>

      {/* 12 Core Real Database Telemetry Metrics (Section 4 Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total & Active Employees */}
        <div
          onClick={() => onNavigate('hrm-employees')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total / Active Staff</span>
            <div className="w-8 h-8 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{metrics.activeEmployees}</span>
            <span className="text-xs text-slate-500 font-medium">/ {metrics.totalEmployees} enrolled</span>
          </div>
          <p className="text-[11px] text-[#0D9488] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Unified Prisma.Employee Master
          </p>
        </div>

        {/* 2. Present & Late Today */}
        <div
          onClick={() => onNavigate('hrm-attendance')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{metrics.presentToday}</span>
            <span className="text-xs text-amber-600 font-bold">({metrics.lateToday} late arrival)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">
            Attendance rate: <span className="font-bold text-slate-700">{metrics.attendanceRate}%</span>
          </p>
        </div>

        {/* 3. On Leave & Pending Requests */}
        <div
          onClick={() => onNavigate('hrm-leave')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On Leave & Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{metrics.pendingLeaveRequests}</span>
            <span className="text-xs text-slate-500 font-medium">pending ({metrics.onLeave} on leave today)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Approved unpaid leaves route directly into LOP
          </p>
        </div>

        {/* 4. Active Goals & Pending Reviews */}
        <div
          onClick={() => onNavigate('hrm-performance')}
          className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#0D9488] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Goals / OKRs</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-700">{metrics.activeGoals}</span>
            <span className="text-xs text-slate-500 font-medium">({metrics.pendingPerformanceReviews} reviews due)</span>
          </div>
          <p className="text-[11px] text-purple-600 font-semibold mt-2">
            PMS Appraisal decisions bridge to payroll
          </p>
        </div>
      </div>

      {/* Middle Grid: Detailed Payroll Status & Exception Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Payroll Status Card */}
        <div className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#111111] text-sm">Current Payroll Cycle</h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                latestPayroll?.status === 'FINALIZED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : latestPayroll?.status === 'APPROVED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {latestPayroll?.status || metrics.payrollStatus}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-[#111111]">{latestPayroll?.periodCode || metrics.currentPayrollPeriod}</p>
              {metrics.pendingPayrollExceptions > 0 ? (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {metrics.pendingPayrollExceptions} Exceptions
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  No Exceptions
                </span>
              )}
            </div>

            <div className="space-y-2 mt-6 pt-4 border-t border-[#E2E8F0] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gross Payroll:</span>
                <span className="font-bold text-[#111111]">₹{(latestPayroll?.totalGrossPay || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Deductions (PF/ESI/TDS/PT):</span>
                <span className="font-semibold text-rose-600">-₹{(latestPayroll?.totalDeductions || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="font-bold text-[#0D9488]">Net Payable:</span>
                <span className="font-black text-[#0D9488]">₹{(latestPayroll?.totalNetPay || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('hrm-payroll')}
            className="w-full mt-6 py-2.5 bg-[#F0FDFA] hover:bg-[#0D9488] hover:text-white text-[#111111] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Open Payroll Calculation Runs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real-time HR & Compliance Audit Feed */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#111111] text-sm">Real-time HR & Compliance Audit Stream</h3>
              <p className="text-[11px] text-slate-400">Auditable sensitive actions, approvals, statutory adjustments, and reviews</p>
            </div>
            <span className="text-[10px] font-mono text-[#0D9488] font-bold bg-[#0D9488]/10 px-2 py-0.5 rounded">
              Immutable
            </span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent HR audit records found.</p>
            ) : (
              recentActivities.map((log: any) => (
                <div key={log.id} className="p-3 bg-slate-50 hover:bg-[#F0FDFA] rounded-xl border border-slate-100 transition-colors text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] shrink-0" />
                    <span className="font-bold text-slate-800 text-[11px] px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                      {log.action}
                    </span>
                    <span className="text-slate-600 truncate text-[11px]">{log.details}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
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
