'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Settings,
  Users,
  Building2,
  Coffee,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Check,
  X,
  Eye,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Moon,
  Send,
  FileText,
} from 'lucide-react';
import { TimePicker12, formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';
import { clientCache } from '@/lib/client-cache';

export interface AdminAttendanceViewProps {
  initialTab?: 'workforce' | 'logs' | 'policy';
}

export const AdminAttendanceView: React.FC<AdminAttendanceViewProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<'workforce' | 'logs' | 'policy'>(initialTab || 'workforce');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const cachedClients = clientCache.get<any[]>('crm_clients_list', 15 * 60 * 1000);
  const [clients, setClients] = useState<any[]>(() => cachedClients || []);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const workforceCacheKey = `workforce_live_${selectedClientId || 'all'}`;
  const cachedWorkforce = clientCache.get<any>(workforceCacheKey, 5 * 60 * 1000);
  const [workforceData, setWorkforceData] = useState<any>(() => cachedWorkforce || null);
  const [loading, setLoading] = useState(() => !cachedWorkforce);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTimelineEmp, setSelectedTimelineEmp] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Logs state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [historyData, setHistoryData] = useState<any>(null);

  // Policy editor state
  const [policyTargetType, setPolicyTargetType] = useState<'GLOBAL' | 'CLIENT'>('GLOBAL');
  const [policyTargetClientId, setPolicyTargetClientId] = useState<string>('');
  const [policyConfig, setPolicyConfig] = useState<any>({
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    gracePeriodMinutes: 15,
    lateThresholdMinutes: 45,
    halfDayThresholdHours: 4.5,
    minFullDayHours: 8.0,
    idleThresholdMinutes: 5,
    autoCheckoutEnabled: true,
    autoCheckoutTime: '23:59',
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Clients list for filtering
  useEffect(() => {
    clientCache.swrFetch('crm_clients_list', async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const json = await res.json();
      return json.clients || [];
    }, { onUpdate: (data) => setClients(data) }).then(data => data && setClients(data));
  }, []);

  // Fetch Live Workforce
  const fetchWorkforce = useCallback(async (forceRefresh = false) => {
    const currentKey = `workforce_live_${selectedClientId || 'all'}`;
    const cachedData = !forceRefresh ? clientCache.get<any>(currentKey, 5 * 60 * 1000) : null;
    if (!cachedData) setLoading(true);

    try {
      const url = selectedClientId
        ? `/api/workforce/live?clientId=${selectedClientId}`
        : '/api/workforce/live';

      const result = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Error fetching live workforce');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (json) => setWorkforceData(json),
        }
      );
      if (result) setWorkforceData(result);
    } catch (e) {
      console.error('Error fetching live workforce:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  // Fetch History Logs
  const fetchHistory = useCallback(async () => {
    try {
      let url = `/api/attendance/history?month=${selectedMonth}`;
      if (selectedClientId) url += `&clientId=${selectedClientId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setHistoryData(json);
      }
    } catch (e) {
      console.error('Error fetching attendance history:', e);
    }
  }, [selectedMonth, selectedClientId]);

  // Fetch Policy
  const fetchPolicy = useCallback(async () => {
    try {
      let url = '/api/attendance/policy';
      if (policyTargetType === 'CLIENT' && policyTargetClientId) {
        url += `?clientId=${policyTargetClientId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.policy) setPolicyConfig(json.policy);
      }
    } catch (e) {
      console.error('Error fetching policy:', e);
    }
  }, [policyTargetType, policyTargetClientId]);

  useEffect(() => {
    fetchWorkforce();
    fetchHistory();
  }, [fetchWorkforce, fetchHistory]);

  useEffect(() => {
    if (activeTab === 'policy') {
      fetchPolicy();
    }
  }, [activeTab, fetchPolicy]);

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



  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaving(true);
    setPolicyMessage(null);
    try {
      const targetId = policyTargetType === 'CLIENT' ? policyTargetClientId : undefined;
      if (policyTargetType === 'CLIENT' && !targetId) {
        throw new Error('Please select a client to apply client-level policy override');
      }

      const res = await fetch('/api/attendance/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: policyTargetType,
          targetId,
          policy: policyConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save policy');

      setPolicyMessage({ type: 'success', text: 'Shift & Attendance Policy saved successfully.' });
      setTimeout(() => setPolicyMessage(null), 3000);
    } catch (err: any) {
      setPolicyMessage({ type: 'error', text: err.message });
    } finally {
      setPolicySaving(false);
    }
  };

  const exportCSV = () => {
    if (!historyData?.records || historyData.records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Date', 'Client', 'Employee ID', 'Name', 'Designation', 'Check In', 'Check Out', 'Net Work (m)', 'Breaks (m)', 'Status', 'Overtime (m)'];
    const rows = historyData.records.map((r: any) => [
      r.date,
      `"${r.employee?.client?.companyName || 'Internal'}"`,
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
    link.setAttribute('download', `Admin_Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const workforce = (workforceData?.workforce || []).filter(
    (item: any) =>
      item.employee.employeeId !== 'GI-EMP-000001' &&
      item.employee.designation !== 'Platform Head'
  );
  const summary = workforceData?.summary || {
    totalEmployees: 0,
    workingCount: 0,
    idleCount: 0,
    onBreakCount: 0,
    missingCheckinCount: 0,
    offlineCount: 0,
  };

  const filteredWorkforce = workforce.filter((item: any) => {
    const matchesSearch =
      item.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.employee.client?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.liveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatSecToHM = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>WORKING</span>
          </span>
        );
      case 'IDLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>IDLE (&gt;5M)</span>
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200 shadow-xs">
            <Coffee className="w-3 h-3 text-orange-600" />
            <span>ON BREAK</span>
          </span>
        );
      case 'MISSING_CHECKIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse shadow-xs">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>MISSING CHECK-IN</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 shadow-xs">
            <Moon className="w-3 h-3 text-slate-500" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP BAR */}
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="title-interactive-hover text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 cursor-pointer">
              <Clock className="w-6 h-6 text-growth-teal" />
              <span>Attendance Hub</span>
            </h1>
            <span className="chip-premium-highlight text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-growth-teal/30">
              Unified 3-in-1 Suite
            </span>
          </div>
          <p className="subtitle-interactive-hover text-xs text-slate-500 mt-1">
            Centralized platform governance for Live Clock-in Telemetry, Shifts & Work Policies, and Monthly Timesheet Logs
          </p>
        </div>

        {/* Client Multi-Tenant Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="">All Corporate Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.clientId})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              fetchWorkforce();
              fetchHistory();
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-growth-teal shadow-sm transition interactive-btn-hover cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MACRO KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Tracked Staff</span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{summary.totalEmployees}</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-emerald-600 text-[10px] font-bold uppercase tracking-wider block">Working Right Now</span>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{summary.workingCount}</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-amber-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-amber-600 text-[10px] font-bold uppercase tracking-wider block">Idle (&gt;5m Inactive)</span>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">{summary.idleCount}</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-orange-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-orange-600 text-[10px] font-bold uppercase tracking-wider block">On Break</span>
          <div className="text-2xl font-black text-orange-600 font-mono mt-1">{summary.onBreakCount}</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-rose-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-rose-600 text-[10px] font-bold uppercase tracking-wider block">Missing Check-In</span>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">{summary.missingCheckinCount}</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Offline / Logged Out</span>
          <div className="text-2xl font-black text-slate-600 font-mono mt-1">{summary.offlineCount}</div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION: ATTENDANCE, SHIFTS & POLICIES, TIMESHEETS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('workforce')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 interactive-btn-hover cursor-pointer ${
            activeTab === 'workforce'
              ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow border border-growth-teal'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeTab === 'workforce' ? 'text-growth-gold' : 'text-slate-500'}`} />
          <span>Attendance & Live Telemetry</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeTab === 'workforce' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {summary.workingCount} Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 interactive-btn-hover cursor-pointer ${
            activeTab === 'policy'
              ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow border border-growth-teal'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <Sliders className={`w-4 h-4 ${activeTab === 'policy' ? 'text-growth-gold' : 'text-slate-500'}`} />
          <span>Shifts & Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 interactive-btn-hover cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow border border-growth-teal'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'logs' ? 'text-growth-gold' : 'text-slate-500'}`} />
          <span>Timesheets & Reports</span>
        </button>
      </div>

      {/* TAB 1: LIVE WORKFORCE */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          <div className="panel-premium flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name, ID or Client company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-growth-teal"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-growth-teal w-full sm:w-auto"
            >
              <option value="ALL">All Live Statuses</option>
              <option value="WORKING">Working (Active)</option>
              <option value="IDLE">Idle (&gt;5m)</option>
              <option value="ON_BREAK">On Break</option>
              <option value="MISSING_CHECKIN">Missing Check-In</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Client Company</th>
                    <th className="py-3.5 px-4">Live Status</th>
                    <th className="py-3.5 px-4">Login Time</th>
                    <th className="py-3.5 px-4">Check-In Time</th>
                    <th className="py-3.5 px-4">Active Work Time</th>
                    <th className="py-3.5 px-4">Idle Time</th>
                    <th className="py-3.5 px-4">Breaks</th>
                    <th className="py-3.5 px-4 text-right">Audit Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredWorkforce.length > 0 ? (
                    filteredWorkforce.map((item: any) => {
                      const emp = item.employee;
                      const loginStr = item.loginTime ? formatClockTime(item.loginTime) : '—';
                      const checkInStr = item.checkInTime ? formatClockTime(item.checkInTime) : '—';

                      const totalSec = (item.activeSeconds || 0) + (item.idleSeconds || 0);
                      const activePercent = totalSec > 0 ? Math.round((item.activeSeconds / totalSec) * 100) : 0;

                      return (
                        <tr key={emp.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                          <td className="py-3.5 px-4">
                            <div className="title-interactive-hover font-bold text-slate-900 text-xs">{emp.fullName}</div>
                            <div className="subtitle-interactive-hover text-[11px] text-slate-500 font-mono">
                              <span className="text-growth-teal font-semibold">{emp.employeeId}</span> • {emp.designation}
                            </div>
                            <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-teal-700 font-semibold">
                              <Clock className="w-3 h-3 text-growth-teal" />
                              <span>
                                Shift: {emp.shiftStartTime === 'FLEXIBLE'
                                  ? 'Flexible (No Late)'
                                  : `${formatTo12Hour(emp.shiftStartTime || '10:00')} - ${formatTo12Hour(emp.shiftEndTime || '19:00')}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{emp.client?.companyName || 'Internal / HQ'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(item.liveStatus)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            {loginStr !== '—' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                                {loginStr}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            {checkInStr !== '—' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs">
                                {checkInStr}
                                {item.isLate && (
                                  <span className="ml-1.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.2 uppercase font-black">
                                    LATE
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-rose-500 font-medium italic text-[11px]">Not Punched In</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="text-slate-900 font-bold text-xs">{formatSecToHM(item.activeSeconds || 0)}</div>
                            <div className="w-20 bg-slate-100 border border-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div
                                className="bg-growth-teal h-1.5 rounded-full"
                                style={{ width: `${activePercent}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-amber-700 font-semibold text-xs">
                            {item.idleSeconds > 0 ? formatSecToHM(item.idleSeconds) : '0m'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                            {item.totalBreakMinutes > 0 ? `${item.totalBreakMinutes}m` : '0m'}
                            {item.activeBreak && (
                              <span className="block text-[10px] text-orange-600 font-bold">
                                Current: {item.activeBreak.breakType}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => fetchTimeline(item)}
                              className="interactive-btn-hover px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
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
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REPORTS & LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 text-slate-800 focus:outline-none focus:border-growth-teal font-mono"
              />
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-growth-navy hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-growth-teal" />
              <span>Export CSV (Payroll Log)</span>
            </button>
          </div>

          {/* Table */}
          <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 font-mono">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Client Company</th>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Check-In</th>
                    <th className="py-3.5 px-4">Check-Out</th>
                    <th className="py-3.5 px-4">Net Work Time</th>
                    <th className="py-3.5 px-4">Breaks</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {historyData?.records?.length > 0 ? (
                    historyData.records.map((r: any) => {
                      const inStr = r.checkInTime ? formatClockTime(r.checkInTime) : '—';
                      const outStr = r.checkOutTime ? formatClockTime(r.checkOutTime) : '—';
                      const workHrs = `${Math.floor((r.totalWorkMinutes || 0) / 60)}h ${(r.totalWorkMinutes || 0) % 60}m`;

                      let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (r.status === 'LATE') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                      if (r.status === 'HALF_DAY') badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';

                      return (
                        <tr key={r.id} className="interactive-row-hover hover:bg-teal-50/20 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.date}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {r.employee?.client?.companyName || 'Internal'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="title-interactive-hover font-bold text-slate-900">{r.employee?.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              <span className="text-growth-teal font-semibold">{r.employee?.employeeId}</span> •{' '}
                              {r.employee?.designation}
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
                          <td className="py-3.5 px-4 font-mono text-growth-teal font-bold">{workHrs}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{r.totalBreakMinutes || 0}m</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-amber-600 font-bold">
                            {r.overtimeMinutes > 0 ? `+${r.overtimeMinutes}m` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No records found for {selectedMonth}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POLICY RULES */}
      {activeTab === 'policy' && (
        <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="title-interactive-hover text-base font-black text-slate-900 flex items-center gap-2 cursor-pointer">
              <Sliders className="w-5 h-5 text-growth-teal" />
              <span>Shift Timings, Grace Period & Inactivity Rules</span>
            </h3>
            <p className="subtitle-interactive-hover text-xs text-slate-500 mt-1">
              Configure attendance calculation parameters, late mark cutoff, and idle telemetry sensitivity
            </p>
          </div>

          {policyMessage && (
            <div
              className={`p-3 rounded-xl text-xs ${
                policyMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold'
                  : 'bg-rose-50 border border-rose-300 text-rose-800'
              }`}
            >
              {policyMessage.text}
            </div>
          )}

          <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
            {/* Target Scope */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Policy Scope</label>
                <select
                  value={policyTargetType}
                  onChange={(e) => setPolicyTargetType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-growth-teal"
                >
                  <option value="GLOBAL">Global Default (All Clients & Employees)</option>
                  <option value="CLIENT">Client Specific Override</option>
                </select>
              </div>

              {policyTargetType === 'CLIENT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Client *</label>
                  <select
                    value={policyTargetClientId}
                    onChange={(e) => setPolicyTargetClientId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-growth-teal"
                  >
                    <option value="">Select a Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.clientId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Shift Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Shift Start Time <span className="text-teal-600 font-normal">({formatTo12Hour(policyConfig.shiftStartTime)})</span>
                </label>
                <TimePicker12
                  value={policyConfig.shiftStartTime}
                  onChange={(val) => setPolicyConfig({ ...policyConfig, shiftStartTime: val })}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Shift End Time <span className="text-teal-600 font-normal">({formatTo12Hour(policyConfig.shiftEndTime)})</span>
                </label>
                <TimePicker12
                  value={policyConfig.shiftEndTime}
                  onChange={(val) => setPolicyConfig({ ...policyConfig, shiftEndTime: val })}
                />
              </div>
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={policyConfig.gracePeriodMinutes}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, gracePeriodMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 15 mins grace period</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Idle Sensitivity (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={policyConfig.idleThresholdMinutes}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, idleThresholdMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Triggers IDLE status</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Half-Day Threshold (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="7"
                  value={policyConfig.halfDayThresholdHours}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, halfDayThresholdHours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Min 4.5h required for half-day</span>
              </div>
            </div>

            {/* Auto Checkout Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="autoCheckout"
                checked={policyConfig.autoCheckoutEnabled}
                onChange={(e) => setPolicyConfig({ ...policyConfig, autoCheckoutEnabled: e.target.checked })}
                className="w-4 h-4 text-growth-teal rounded focus:ring-teal-500"
              />
              <label htmlFor="autoCheckout" className="text-slate-700 font-semibold cursor-pointer">
                Enable automatic end-of-day checkout at 11:59 PM if employee forgets punch-out
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={policySaving}
                className="px-6 py-2.5 rounded-xl bg-growth-teal text-white font-bold hover:bg-teal-600 transition flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{policySaving ? 'Saving...' : 'Save Policy Parameters'}</span>
              </button>
            </div>
          </form>
           {/* TIMELINE DETAIL MODAL */}
      {selectedTimelineEmp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col text-slate-900 panel-premium">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 title-interactive-hover">
                  <Clock className="w-4 h-4 text-growth-teal" />
                  <span>Workday Timeline: {selectedTimelineEmp.employee.fullName}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 subtitle-interactive-hover">
                  ID: {selectedTimelineEmp.employee.employeeId} • Client:{' '}
                  {selectedTimelineEmp.employee.client?.companyName || 'Internal'}
                </p>
              </div>
              <button onClick={() => setSelectedTimelineEmp(null)} className="text-slate-400 hover:text-slate-600 p-1 interactive-btn-hover cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Today&apos;s Verified Telemetry Stream
              </div>

              {timelineLoading ? (
                <div className="text-center py-6 text-xs text-slate-400">Loading timeline events...</div>
              ) : timelineEvents.length > 0 ? (
                <div className="space-y-2 relative border-l-2 border-slate-200 ml-3 pl-4">
                  {timelineEvents.map((evt: any, idx: number) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-growth-teal ring-4 ring-teal-50" />
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs space-y-1 interactive-box-hover">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px] title-interactive-hover">{evt.eventType}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">
                            {formatClockTime(evt.timestamp, true)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  No discrete activity events logged for this session yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedTimelineEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm interactive-btn-hover cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}       </div>
      )}

    </div>
  );
};
