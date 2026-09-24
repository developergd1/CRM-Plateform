'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Clock,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Info,
  CheckCircle2,
  Coffee,
  Moon,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

interface LiveWorkforceViewProps {
  onSelectEmployee?: (empId: string) => void;
}

export const LiveWorkforceView: React.FC<LiveWorkforceViewProps> = ({ onSelectEmployee }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchWorkforce = useCallback(async () => {
    try {
      let url = '/api/workforce/live';
      if (selectedClientId && selectedClientId !== 'ALL') {
        url += `?clientId=${selectedClientId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching live workforce telemetry:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchWorkforce();
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
  }, [fetchWorkforce]);

  // 15-second background heartbeat polling if auto-refresh is toggled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchWorkforce();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchWorkforce]);

  const employees: any[] = data?.employees || [];
  const metrics = data?.metrics || {
    workingCount: 0,
    breakCount: 0,
    missingCheckInCount: 0,
    offlineCount: 0,
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      e.clientName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'WORKING' && e.status === 'WORKING') ||
      (statusFilter === 'BREAK' && e.status === 'BREAK') ||
      (statusFilter === 'MISSING_PUNCH' && e.status === 'MISSING_PUNCH') ||
      (statusFilter === 'OFFLINE' && (e.status === 'OFFLINE' || e.status === 'LOGGED_OUT'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Title & Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Live Workforce Telemetry Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time session presence, shift duty status, and break tracking with privacy governance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer shadow-xs">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 accent-teal-600"
            />
            <span>Auto Heartbeat (15s)</span>
          </label>

          <button
            onClick={() => {
              setLoading(true);
              fetchWorkforce();
            }}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Telemetry Governance Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <strong className="text-white">Privacy-Preserving Telemetry Policy:</strong> Live Workforce records platform presence based on authenticated activity heartbeats and recorded punches. <em>Inactivity threshold represents idle platform session time; it is explicitly decoupled from productivity scoring or invasive surveillance.</em>
        </div>
      </div>

      {/* Real-time Status Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('WORKING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'WORKING' ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Working Right Now</span>
            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-teal-700 mt-2">{metrics.workingCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Active platform sessions</span>
        </div>

        <div
          onClick={() => setStatusFilter('BREAK')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'BREAK' ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">On Break</span>
            <Coffee className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600 mt-2">{metrics.breakCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Break timer recorded</span>
        </div>

        <div
          onClick={() => setStatusFilter('MISSING_PUNCH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'MISSING_PUNCH' ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Missing Check-in</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{metrics.missingCheckInCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">Shift started without punch</span>
        </div>

        <div
          onClick={() => setStatusFilter('OFFLINE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'OFFLINE' ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">Offline / Logged Out</span>
            <Moon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700 mt-2">{metrics.offlineCount}</p>
          <span className="text-[10px] text-slate-500 font-medium">No active session</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 font-semibold cursor-pointer"
        >
          <option value="ALL">All Telemetry States</option>
          <option value="WORKING">Working (Active)</option>
          <option value="BREAK">On Break</option>
          <option value="MISSING_PUNCH">Missing Check-in</option>
          <option value="OFFLINE">Offline / Logged Out</option>
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff, ID, or company..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
          />
        </div>
      </div>

      {/* Live Telemetry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Client / Company</th>
                <th className="py-3 px-4">Scheduled Shift</th>
                <th className="py-3 px-4">Today Punch</th>
                <th className="py-3 px-4">Active Session</th>
                <th className="py-3 px-4">Telemetry Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Synchronizing real-time workforce telemetry...</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No workforce members matching filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const checkIn = emp.checkInTime ? formatClockTime(emp.checkInTime) : null;
                  const isWorking = emp.status === 'WORKING';
                  const isOnBreak = emp.status === 'BREAK';
                  const isMissingPunch = emp.status === 'MISSING_PUNCH';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onSelectEmployee?.(emp.employeeId)}
                          className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                        >
                          {emp.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {emp.employeeId} • {emp.designation}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {emp.clientName || 'Internal Staff'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {emp.shiftStartTime || '10:00'} – {emp.shiftEndTime || '19:00'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {checkIn ? (
                          <span className="text-teal-700 font-bold">Punched at {checkIn}</span>
                        ) : (
                          <span className="text-slate-400">Not punched</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {emp.activeSessionDuration ? (
                          <span>{emp.activeSessionDuration}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isWorking ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Working</span>
                          </span>
                        ) : isOnBreak ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <Coffee className="w-3 h-3 text-amber-600" />
                            <span>On Break</span>
                          </span>
                        ) : isMissingPunch ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Missing Check-in</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            <Moon className="w-3 h-3 text-slate-400" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectEmployee?.(emp.employeeId)}
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
