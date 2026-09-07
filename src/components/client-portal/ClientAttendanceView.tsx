'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';

export const ClientAttendanceView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<any>(null);

  // Fetch Attendance History
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/history?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (e) {
      console.error('Error fetching client attendance history:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const exportCSV = () => {
    if (!historyData?.records || historyData.records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Designation', 'Check In', 'Check Out', 'Net Work (mins)', 'Breaks (mins)', 'Status', 'Overtime (mins)'];
    const rows = historyData.records.map((r: any) => [
      r.date,
      r.employee?.employeeId || '',
      `"${r.employee?.fullName || ''}"`,
      `"${r.employee?.designation || ''}"`,
      r.checkInTime ? formatClockTime(r.checkInTime) : '',
      r.checkOutTime ? formatClockTime(r.checkOutTime) : '',
      r.totalWorkMinutes || 0,
      r.totalBreakMinutes || 0,
      r.status,
      r.overtimeMinutes || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: string[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const records = historyData?.records || [];
  const filteredRecords = records.filter((r: any) => {
    const matchesSearch =
      r.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-growth-teal" />
            <span>Workforce Attendance & Governance</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit monthly attendance, shift logs, and real-time workforce time tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchHistory()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Monthly KPI Summary */}
        {historyData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Logged</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{historyData.summary.totalRecords}</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-emerald-600 text-[10px] uppercase font-bold block">Present</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">{historyData.summary.presentCount}</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-amber-600 text-[10px] uppercase font-bold block">Late Check-Ins</span>
              <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">{historyData.summary.lateCount}</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <span className="text-teal-700 text-[10px] uppercase font-bold block">Total Work Hours</span>
              <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">{historyData.summary.totalWorkHours}h</span>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
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
              placeholder="Filter by employee name or ID..."
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
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="EARLY_EXIT">Early Exit</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Net Work Time</th>
                  <th className="py-3.5 px-4">Breaks</th>
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
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.date}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.employee?.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            <span className="text-growth-teal font-bold">{r.employee?.employeeId}</span> • {r.employee?.designation}
                          </div>
                          <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-teal-700 font-bold">
                            <Clock className="w-3 h-3 text-growth-teal" />
                            <span>
                              Shift: {r.employee?.shiftStartTime === 'FLEXIBLE'
                                ? 'Flexible (No Late)'
                                : `${formatTo12Hour(r.employee?.shiftStartTime || '10:00')} - ${formatTo12Hour(r.employee?.shiftEndTime || '19:00')}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{inStr}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{outStr}</td>
                        <td className="py-3.5 px-4 font-mono text-teal-700 font-bold">{workHrs}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{r.totalBreakMinutes || 0}m</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No attendance records found for {selectedMonth}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
