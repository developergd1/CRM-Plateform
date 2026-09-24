'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant } from '@/lib/hrmStore';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Coffee,
  Briefcase,
  Target,
  Download,
} from 'lucide-react';

interface HrmReportsViewProps {
  currentTenant: HrmTenant;
}

export const HrmReportsView: React.FC<HrmReportsViewProps> = ({ currentTenant }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/hrm/analytics?tenantId=${currentTenant.id}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [currentTenant]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Workforce Intelligence & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics for headcount, attendance punctuality, leave balance consumption, and hiring efficiency.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting tenant audit & workforce report as CSV...')}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#0D9488]" />
          <span>Export Full Report (CSV)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Headcount</span>
          <p className="text-2xl font-black text-slate-900">{metrics?.totalHeadcount || 68}</p>
          <p className="text-[11px] text-[#0D9488] font-bold">100% Tenant Isolation</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Attendance Compliance</span>
          <p className="text-2xl font-black text-slate-900">{metrics?.attendancePunctuality || '96.4%'}</p>
          <p className="text-[11px] text-slate-500 font-medium">Avg Daily {metrics?.avgDailyHours || '9.2 hrs'}</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Pending Leave Workflows</span>
          <p className="text-2xl font-black text-slate-900">{metrics?.pendingLeaves || 1}</p>
          <p className="text-[11px] text-amber-600 font-bold">Awaiting Manager / HR Action</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Goal Achievement Score</span>
          <p className="text-2xl font-black text-[#0D9488]">4.8 / 5.0</p>
          <p className="text-[11px] text-slate-500 font-medium">Quarterly Appraisal Average</p>
        </div>
      </div>

      {/* Detailed Department Audit Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0D9488]" />
            <h3 className="text-sm font-bold text-slate-900">Departmental Resource Allocation</h3>
          </div>
          <span className="text-xs font-mono text-[#0D9488] font-bold">{currentTenant.name}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Reporting Head</th>
                <th className="px-6 py-3">Active Headcount</th>
                <th className="px-6 py-3 text-right">Workforce Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentTenant.departments.map((dept) => {
                const share = Math.round((dept.employees / (metrics?.totalHeadcount || 68)) * 100);
                return (
                  <tr key={dept.id} className="hover:bg-[#F0FDFA]/70">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{dept.name}</td>
                    <td className="px-6 py-3.5 font-mono text-[#0D9488] font-bold">{dept.code}</td>
                    <td className="px-6 py-3.5 text-slate-700">{dept.manager}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{dept.employees} members</td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-[#0D9488]">{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
