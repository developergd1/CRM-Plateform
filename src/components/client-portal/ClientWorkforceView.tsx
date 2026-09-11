'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Activity,
  Clock,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  X,
  Play,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';
import { clientCache } from '@/lib/client-cache';

export const ClientWorkforceView: React.FC = () => {
  const cacheKey = 'client_workforce_live';
  const initialCached = clientCache.get<any>(cacheKey, 5 * 60 * 1000);
  const [loading, setLoading] = useState(() => !initialCached);
  const [data, setData] = useState<any>(() => initialCached);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTimelineEmp, setSelectedTimelineEmp] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchLiveWorkforce = useCallback(async (forceRefresh = false) => {
    const cached = !forceRefresh ? clientCache.get<any>(cacheKey, 5 * 60 * 1000) : null;
    if (!cached) setLoading(true);

    try {
      const freshData = await clientCache.swrFetch(
        cacheKey,
        async () => {
          const res = await fetch('/api/workforce/live');
          if (!res.ok) throw new Error('Failed to load workforce');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (json) => setData(json),
        }
      );
      if (freshData) setData(freshData);
    } catch (err) {
      console.error('Failed to load workforce:', err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchLiveWorkforce(false);
  }, [fetchLiveWorkforce]);

  const fetchTimeline = async (emp: any) => {
    setSelectedTimelineEmp(emp);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/workforce/live?employeeId=${emp.employee.id}`);
      if (res.ok) {
        const json = await res.json();
        setTimelineEvents(json.timelineEvents || []);
      }
    } catch (e) {
      console.error('Error fetching timeline:', e);
    } finally {
      setTimelineLoading(false);
    }
  };

  const workforce = data?.workforce || [];
  const summary = data?.summary || {
    totalEmployees: 0,
    workingCount: 0,
    idleCount: 0,
    onBreakCount: 0,
    missingCheckinCount: 0,
    offlineCount: 0,
  };

  const filteredList = workforce.filter((item: any) => {
    const matchesSearch =
      item.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.liveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>WORKING</span>
          </span>
        );
      case 'IDLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>IDLE (&gt;5M)</span>
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200">
            <Coffee className="w-3 h-3 text-orange-600" />
            <span>ON BREAK</span>
          </span>
        );
      case 'MISSING_CHECKIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>MISSING CHECK-IN</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
            <Moon className="w-3 h-3 text-slate-500" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  const formatSecToHM = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="title-interactive-hover text-xl font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-growth-teal" />
            <span>Live Workforce Activity & Telemetry</span>
          </h2>
          <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5">
            Real-time working state, active hours, and idle detection for assigned personnel
          </p>
        </div>

        <button
          onClick={() => fetchLiveWorkforce(true)}
          className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Total Staff</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
            {summary.totalEmployees}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('WORKING')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'WORKING'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'WORKING' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Working Now
          </span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'WORKING' ? 'text-white' : 'text-emerald-600'}`}>
            {summary.workingCount}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('IDLE')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'IDLE'
              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'IDLE' ? 'text-slate-950' : 'text-amber-600'}`}>
            Idle Staff
          </span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'IDLE' ? 'text-slate-950' : 'text-amber-600'}`}>
            {summary.idleCount}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('ON_BREAK')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'ON_BREAK'
              ? 'bg-orange-500 border-orange-500 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'ON_BREAK' ? 'text-orange-100' : 'text-orange-600'}`}>
            On Break
          </span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'ON_BREAK' ? 'text-white' : 'text-orange-600'}`}>
            {summary.onBreakCount}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('MISSING_CHECKIN')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'MISSING_CHECKIN'
              ? 'bg-rose-600 border-rose-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'MISSING_CHECKIN' ? 'text-rose-100' : 'text-rose-600'}`}>
            Missing Punch
          </span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'MISSING_CHECKIN' ? 'text-white' : 'text-rose-600'}`}>
            {summary.missingCheckinCount}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('OFFLINE')}
          className={`card-premium interactive-box-hover p-3.5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            statusFilter === 'OFFLINE'
              ? 'bg-slate-700 border-slate-700 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block opacity-80">Offline / Out</span>
          <span className={`text-2xl font-black font-mono mt-1 block ${statusFilter === 'OFFLINE' ? 'text-white' : 'text-slate-700'}`}>
            {summary.offlineCount}
          </span>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="panel-premium flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search assigned employee by name or ID..."
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
          <option value="WORKING">Working (Active)</option>
          <option value="IDLE">Idle (&gt;5m)</option>
          <option value="ON_BREAK">On Break</option>
          <option value="MISSING_CHECKIN">Missing Check-In</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      {/* WORKFORCE TABLE */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Live Status</th>
                <th className="py-3.5 px-4">Login Time</th>
                <th className="py-3.5 px-4">Check-In Time</th>
                <th className="py-3.5 px-4">Active Work Time</th>
                <th className="py-3.5 px-4">Idle Time</th>
                <th className="py-3.5 px-4">Breaks</th>
                <th className="py-3.5 px-4 text-right">Activity Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {filteredList.length > 0 ? (
                filteredList.map((item: any) => {
                  const emp = item.employee;
                  const loginStr = item.loginTime ? formatClockTime(item.loginTime) : '—';
                  const checkInStr = item.checkInTime ? formatClockTime(item.checkInTime) : '—';

                  // Calculate ratio of active vs idle for progress bar
                  const totalSec = (item.activeSeconds || 0) + (item.idleSeconds || 0);
                  const activePercent = totalSec > 0 ? Math.round((item.activeSeconds / totalSec) * 100) : 0;

                  return (
                    <tr key={emp.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="title-interactive-hover font-bold text-slate-900 text-xs inline-block">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          <span className="text-growth-teal font-bold">{emp.employeeId}</span> • {emp.designation}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-teal-700 font-bold">
                          <Clock className="w-3 h-3 text-growth-teal" />
                          <span>
                            Shift: {emp.shiftStartTime === 'FLEXIBLE'
                              ? 'Flexible (No Late)'
                              : `${formatTo12Hour(emp.shiftStartTime || '10:00')} - ${formatTo12Hour(emp.shiftEndTime || '19:00')}`}
                          </span>
                        </div>
                      </td>

                      {/* Live Status Badge */}
                      <td className="py-3.5 px-4">{getStatusBadge(item.liveStatus)}</td>

                      {/* Login Time */}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {loginStr !== '—' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                            {loginStr}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Check-In Time */}
                      <td className="py-3.5 px-4 font-mono">
                        {checkInStr !== '—' ? (
                          <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
                            {checkInStr}
                            {item.isLate && (
                              <span className="ml-1.5 text-[9px] text-amber-700 font-sans uppercase font-black">
                                LATE
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-rose-500 italic text-[11px]">Not Punched In</span>
                        )}
                      </td>

                      {/* Active Work Time with Progress */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-emerald-700 font-bold">{formatSecToHM(item.activeSeconds || 0)}</div>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-200">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${activePercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Idle Time */}
                      <td className="py-3.5 px-4 font-mono text-amber-600 font-semibold">
                        {item.idleSeconds > 0 ? formatSecToHM(item.idleSeconds) : '0m'}
                      </td>

                      {/* Breaks */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.totalBreakMinutes > 0 ? `${item.totalBreakMinutes}m` : '0m'}
                        {item.activeBreak && (
                          <span className="block text-[10px] text-orange-600 font-bold">
                            Current: {item.activeBreak.breakType}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => fetchTimeline(item)}
                          className="interactive-btn-hover px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-700 inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3 text-growth-teal" />
                          <span>Timeline</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No workforce members match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TIMELINE DETAIL MODAL */}
      {selectedTimelineEmp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-growth-teal" />
                  <span>Workday Timeline: {selectedTimelineEmp.employee.fullName}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {selectedTimelineEmp.employee.employeeId} • Designation: {selectedTimelineEmp.employee.designation}
                </p>
              </div>
              <button
                onClick={() => setSelectedTimelineEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Login</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatClockTime(selectedTimelineEmp.loginTime)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Check-In</span>
                <span className="font-mono font-bold text-teal-700">
                  {formatClockTime(selectedTimelineEmp.checkInTime)}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Active Time</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatSecToHM(selectedTimelineEmp.activeSeconds || 0)}
                </span>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Today&apos;s Audit & Activity Stream
              </div>

              {timelineLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading timeline events...</div>
              ) : timelineEvents.length > 0 ? (
                <div className="space-y-2 relative border-l-2 border-slate-200 ml-3 pl-4">
                  {timelineEvents.map((evt: any, idx: number) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-growth-teal ring-4 ring-white" />
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">{evt.eventType}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {formatClockTime(evt.timestamp, true)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  No discrete activity events logged for this session yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedTimelineEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
