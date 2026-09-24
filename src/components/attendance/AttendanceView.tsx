'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Search,
  Building2,
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

interface AttendanceViewProps {
  onSelectEmployee?: (empId: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ onSelectEmployee }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedClientId, setSelectedClientId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Manual adjustment modal state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchAttendanceRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/history?month=${selectedMonth}`;
      if (selectedClientId && selectedClientId !== 'ALL') {
        url += `&clientId=${selectedClientId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRecords(json.history || json.records || []);
      }
    } catch (e) {
      console.error('Error fetching attendance records:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedClientId]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const json = await res.json();
          setClients(json.clients || []);
        }
      } catch (e) {}
    };
    fetchClients();
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Client-side filtering for fast interactive search & status filtering
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !search ||
      r.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.employee?.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      r.date?.includes(search);
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'LATE' && r.isLate) ||
      (statusFilter === 'MISSING_OUT' && r.checkInTime && !r.checkOutTime) ||
      r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPresent = records.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
  const totalLate = records.filter((r) => r.isLate).length;
  const totalMissingOut = records.filter((r) => r.checkInTime && !r.checkOutTime).length;

  return (
    <div className="space-y-6 select-none">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Attendance Records & Monthly Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Punctuality tracking, punch synchronization, anomaly detection, and daily work minutes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/export?type=ATTENDANCE&month=${selectedMonth}${selectedClientId ? '&clientId=' + selectedClientId : ''}`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={fetchAttendanceRecords}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Punches</span>
          <p className="text-xl font-black text-slate-900 mt-1">{records.length}</p>
          <span className="text-[10px] text-slate-500">In {selectedMonth}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Present Records</span>
          <p className="text-xl font-black text-teal-700 mt-1">{totalPresent}</p>
          <span className="text-[10px] text-slate-500">Verified punches</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Late Arrivals</span>
          <p className="text-xl font-black text-amber-700 mt-1">{totalLate}</p>
          <span className="text-[10px] text-slate-500">Beyond shift grace</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Missing Check-outs</span>
          <p className="text-xl font-black text-rose-700 mt-1">{totalMissingOut}</p>
          <span className="text-[10px] text-slate-500">Incomplete records</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        {/* Client Filter */}
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 font-semibold cursor-pointer"
        >
          <option value="">All Corporate Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName} ({c.clientId})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 font-semibold cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late Arrivals</option>
          <option value="MISSING_OUT">Missing Check-Out</option>
          <option value="ABSENT">Absent</option>
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, ID, or date..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
          />
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Client / Company</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Work Minutes</th>
                <th className="py-3 px-4">Punctuality</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading attendance logs for {selectedMonth}...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No attendance records found matching filters for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const checkIn = rec.checkInTime ? formatClockTime(rec.checkInTime) : '—';
                  const checkOut = rec.checkOutTime ? formatClockTime(rec.checkOutTime) : '—';
                  const hours = Math.floor((rec.totalWorkMinutes || 0) / 60);
                  const mins = (rec.totalWorkMinutes || 0) % 60;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onSelectEmployee?.(rec.employee?.employeeId)}
                          className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                        >
                          {rec.employee?.fullName}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold">
                          {rec.employee?.employeeId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {rec.employee?.client?.companyName || 'Internal Staff'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {checkIn}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {checkOut}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {hours}h {mins}m
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rec.isLate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Late</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>On Time</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rec.status === 'PRESENT'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : rec.status === 'HALF_DAY'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectEmployee?.(rec.employee?.employeeId)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
