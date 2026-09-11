'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Coffee,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Award,
} from 'lucide-react';
import { formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';
import { clientCache } from '@/lib/client-cache';

export const ClientTimesheetsView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const cacheKey = `client_timesheets_${selectedMonth}`;
  const initialCached = clientCache.get<any>(cacheKey, 2 * 60 * 1000);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(() => !initialCached);
  const [data, setData] = useState<any>(() => initialCached);

  const fetchTimesheets = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = clientCache.get<any>(cacheKey, 2 * 60 * 1000);
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/attendance/history?month=${selectedMonth}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        clientCache.set(cacheKey, json);
      }
    } catch (e) {
      console.error('Error fetching client timesheets:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, cacheKey]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const records = data?.records || [];
  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      r.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No timesheet records available to export.');
      return;
    }

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Designation', 'Check In', 'Check Out', 'Net Work Hours', 'Breaks', 'Status', 'Overtime'];
    const rows = filteredRecords.map((r: any) => [
      r.date,
      r.employee?.employeeId || '',
      `"${r.employee?.fullName || ''}"`,
      `"${r.employee?.designation || ''}"`,
      r.checkInTime ? formatClockTime(r.checkInTime) : '',
      r.checkOutTime ? formatClockTime(r.checkOutTime) : '',
      `${Math.floor((r.totalWorkMinutes || 0) / 60)}h ${(r.totalWorkMinutes || 0) % 60}m`,
      `${r.totalBreakMinutes || 0}m`,
      r.status,
      `${r.overtimeMinutes || 0}m`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: string[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Client_Timesheets_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalLoggedMinutes = filteredRecords.reduce((acc: number, r: any) => acc + (r.totalWorkMinutes || 0), 0);
  const totalOvertimeMinutes = filteredRecords.reduce((acc: number, r: any) => acc + (r.overtimeMinutes || 0), 0);
  const totalBreakMinutes = filteredRecords.reduce((acc: number, r: any) => acc + (r.totalBreakMinutes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="title-interactive-hover text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-growth-teal" />
            <span>Workforce Timesheets & Billable Hours</span>
          </h2>
          <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5">
            Audit daily work hours, break allocations, overtime, and shift check-in/out timestamps
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Timesheet CSV</span>
          </button>

          <button
            onClick={() => fetchTimesheets(true)}
            className="interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium interactive-box-hover bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Timesheet Entries</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{filteredRecords.length}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Records in {selectedMonth}</span>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-teal-200 p-4 rounded-2xl shadow-sm">
          <span className="text-teal-700 text-[10px] uppercase font-bold block">Total Net Work Hours</span>
          <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">
            {Math.floor(totalLoggedMinutes / 60)}h {totalLoggedMinutes % 60}m
          </span>
          <span className="text-[10px] text-teal-600/70 block mt-0.5">Productive hours</span>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-amber-200 p-4 rounded-2xl shadow-sm">
          <span className="text-amber-700 text-[10px] uppercase font-bold block">Total Overtime Logged</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {Math.floor(totalOvertimeMinutes / 60)}h {totalOvertimeMinutes % 60}m
          </span>
          <span className="text-[10px] text-amber-600/70 block mt-0.5">Extended shifts</span>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Break Duration</span>
          <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
            {Math.floor(totalBreakMinutes / 60)}h {totalBreakMinutes % 60}m
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tea & meal breaks</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-premium flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:border-teal-500 font-mono"
        />

        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search timesheets by employee name, ID, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-500 w-full sm:w-auto"
        >
          <option value="ALL">All Attendance Statuses</option>
          <option value="PRESENT">Present (Full Day)</option>
          <option value="LATE">Late Check-In</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="EARLY_EXIT">Early Exit</option>
        </select>
      </div>

      {/* Timesheets Table */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Net Work Hours</th>
                <th className="py-3.5 px-4">Breaks</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r: any) => {
                  const inStr = r.checkInTime ? formatClockTime(r.checkInTime) : '—';
                  const outStr = r.checkOutTime ? formatClockTime(r.checkOutTime) : '—';
                  const workHrs = `${Math.floor((r.totalWorkMinutes || 0) / 60)}h ${(r.totalWorkMinutes || 0) % 60}m`;

                  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (r.status === 'LATE') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (r.status === 'HALF_DAY') badgeColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                  if (r.status === 'EARLY_EXIT') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr key={r.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.date}</td>
                      <td className="py-3.5 px-4">
                        <div className="title-interactive-hover font-bold text-slate-900 inline-block">{r.employee?.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          <span className="text-growth-teal font-bold">{r.employee?.employeeId}</span> • {r.employee?.designation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{inStr}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{outStr}</td>
                      <td className="py-3.5 px-4 font-mono text-teal-700 font-bold">{workHrs}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{r.totalBreakMinutes || 0}m</td>
                      <td className="py-3.5 px-4 font-mono text-amber-700 font-semibold">
                        {r.overtimeMinutes > 0 ? `+${r.overtimeMinutes}m` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No timesheet records found for {selectedMonth}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
