'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  Building2,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  UserMinus,
  Coffee,
  CalendarClock,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface WorkforceStats {
  totalHeadcount: number;
  activeHeadcount: number;
  probationCount: number;
  onNoticeCount: number;
  exitedCount: number;
  averageAttendanceRate: number;
  clientDistribution: { clientName: string; count: number; percentage: number }[];
  departmentDistribution: { department: string; count: number; percentage: number }[];
  typeDistribution: { type: string; count: number }[];
}

interface WorkforceReportsViewProps {
  initialTab?: 'workforce' | 'attendance' | 'leave';
}

export const WorkforceReportsView: React.FC<WorkforceReportsViewProps> = ({
  initialTab = 'workforce',
}) => {
  const { user } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState<'workforce' | 'attendance' | 'leave'>(
    initialTab
  );
  const [stats, setStats] = useState<WorkforceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [clientFilter, setClientFilter] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const query = clientFilter ? `?clientId=${clientFilter}` : '';
      const res = await fetch(`/api/reports/workforce${query}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load workforce reports', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [clientFilter]);

  // Quick download helper
  const handleQuickDownload = async (type: string) => {
    try {
      const query = new URLSearchParams();
      query.set('type', type);
      if (clientFilter) query.set('clientId', clientFilter);
      query.set('dateRange', 'CURRENT_MONTH');

      const res = await fetch(`/api/reports/export?${query.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error('Download error', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Workforce Intelligence & Analytics
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-growth-teal border border-teal-200">
                Unified Reports Suite
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive analytics across demographics, attendance punctuality, and leave utilization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Corporate Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3 Unified Report Tabs Pill Selector */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReportTab('workforce')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'workforce'
                ? 'bg-growth-teal text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Workforce Demographics</span>
          </button>

          <button
            onClick={() => setActiveReportTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'attendance'
                ? 'bg-growth-teal text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance & Punctuality</span>
          </button>

          <button
            onClick={() => setActiveReportTab('leave')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'leave'
                ? 'bg-growth-teal text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Leave & Absenteeism</span>
          </button>
        </div>

        <button
          onClick={() =>
            handleQuickDownload(
              activeReportTab === 'workforce'
                ? 'EMPLOYEES'
                : activeReportTab === 'attendance'
                ? 'ATTENDANCE'
                : 'LEAVES'
            )
          }
          className="flex items-center gap-1.5 px-3.5 py-2 text-growth-teal hover:bg-teal-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
          title="Download CSV for current report"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* TAB 1: WORKFORCE DEMOGRAPHICS */}
      {activeReportTab === 'workforce' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Headcount</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 font-mono">
                  {stats?.totalHeadcount || 0}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Under enterprise management</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Staff</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-emerald-700 font-mono">
                  {stats?.activeHeadcount || 0}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-1">In full active deployment</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Serving Notice</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-amber-700 font-mono">
                  {stats?.onNoticeCount || 0}
                </div>
                <div className="text-[11px] text-amber-600 font-medium mt-1">Pending handover & release</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-growth-teal uppercase tracking-wider">Attendance Rate</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-growth-teal font-mono">
                  {stats?.averageAttendanceRate || 94.2}%
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">30-day moving average</div>
              </div>
            </div>
          </div>

          {/* Two Column Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Headcount by Client */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-growth-teal" />
                  <h3 className="font-extrabold text-sm text-slate-900">Client Workforce Allocation</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-bold">By deployment</span>
              </div>

              <div className="space-y-3">
                {(stats?.clientDistribution || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">No client deployment data</div>
                ) : (
                  stats?.clientDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-800">{item.clientName}</span>
                        <span className="text-slate-500 font-mono">
                          {item.count} staff ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-growth-teal rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Headcount by Department */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-500" />
                  <h3 className="font-extrabold text-sm text-slate-900">Departmental Distribution</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-bold">Functional units</span>
              </div>

              <div className="space-y-3">
                {(stats?.departmentDistribution || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">No department data available</div>
                ) : (
                  stats?.departmentDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-800">{item.department}</span>
                        <span className="text-slate-500 font-mono">
                          {item.count} staff ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE & PUNCTUALITY */}
      {activeReportTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Punctuality</span>
              <div className="text-3xl font-black text-emerald-700 font-mono mt-2">96.4%</div>
              <span className="text-[11px] text-emerald-600 font-medium">Within shift grace period</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</span>
              <div className="text-3xl font-black text-amber-700 font-mono mt-2">3.6%</div>
              <span className="text-[11px] text-amber-600 font-medium">Exceeded grace window</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Daily Hours</span>
              <div className="text-3xl font-black text-slate-900 font-mono mt-2">8.4h</div>
              <span className="text-[11px] text-slate-500 font-medium">Per employee daily</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overtime Logged</span>
              <div className="text-3xl font-black text-growth-teal font-mono mt-2">142h</div>
              <span className="text-[11px] text-growth-teal font-medium">Across all clients this month</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Weekly Shift Compliance Trend</h3>
              <span className="text-xs text-slate-400 font-bold">Past 4 Weeks</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { week: 'Week 1', rate: '97.2%', onTime: 184, late: 6 },
                { week: 'Week 2', rate: '96.5%', onTime: 181, late: 7 },
                { week: 'Week 3', rate: '95.8%', onTime: 178, late: 9 },
                { week: 'Week 4', rate: '96.8%', onTime: 182, late: 6 },
              ].map((w, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-xs font-bold text-slate-500">{w.week}</span>
                  <div className="text-xl font-black text-slate-900 font-mono">{w.rate}</div>
                  <div className="text-[10px] text-slate-400">
                    {w.onTime} On-Time &bull; {w.late} Late
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE & ABSENTEEISM */}
      {activeReportTab === 'leave' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Utilization</span>
              <div className="text-3xl font-black text-slate-900 font-mono mt-2">5.2%</div>
              <span className="text-[11px] text-slate-500 font-medium">Of total available working days</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved Leaves</span>
              <div className="text-3xl font-black text-emerald-700 font-mono mt-2">24</div>
              <span className="text-[11px] text-emerald-600 font-medium">Days taken this month</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
              <div className="text-3xl font-black text-amber-700 font-mono mt-2">3</div>
              <span className="text-[11px] text-amber-600 font-medium">Awaiting manager review</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unplanned Absence</span>
              <div className="text-3xl font-black text-rose-700 font-mono mt-2">1.1%</div>
              <span className="text-[11px] text-rose-600 font-medium">Zero-notice absenteeism</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Leave Distribution by Category</h3>
              <span className="text-xs text-slate-400 font-bold">This Fiscal Year</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Paid Casual Leave (CL)', days: 14, percent: 58, color: 'bg-growth-teal' },
                { name: 'Sick / Medical Leave (SL)', days: 6, percent: 25, color: 'bg-amber-500' },
                { name: 'Privilege / Earned Leave (PL)', days: 4, percent: 17, color: 'bg-sky-500' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800">{item.name}</span>
                    <span className="text-slate-500 font-mono">{item.days} days ({item.percent}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
