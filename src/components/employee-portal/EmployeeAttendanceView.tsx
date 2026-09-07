'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWorkTracker } from '@/hooks/useWorkTracker';
import {
  Clock,
  Play,
  Square,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Info,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';

export const EmployeeAttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayData, setTodayData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedBreakType, setSelectedBreakType] = useState<string>('TEA');

  // Month selector for history
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance & active session
  const fetchTodayData = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const data = await res.json();
        setTodayData(data);
      }
    } catch (e) {
      console.error('Failed to load today attendance:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch monthly history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/history?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (e) {
      console.error('Failed to load attendance history:', e);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchTodayData();
    fetchHistory();
  }, [fetchTodayData, fetchHistory]);

  const activeSessionId = todayData?.activeSession?.sessionId;
  const attendance = todayData?.attendance;
  const activeBreak = attendance?.breaks?.find((b: any) => !b.breakEndTime);
  const isCheckedIn = Boolean(attendance?.checkInTime);
  const isCheckedOut = Boolean(attendance?.checkOutTime);

  // Client telemetry hook
  const { isIdle, dismissIdleWarning } = useWorkTracker({
    sessionId: activeSessionId,
    enabled: isCheckedIn && !isCheckedOut && !activeBreak,
    idleThresholdMinutes: todayData?.policy?.idleThresholdMinutes || 5,
    onHeartbeatSync: () => {
      fetchTodayData();
    },
  });

  // Handlers
  const handleCheckIn = async () => {
    if (!confirm('Confirm Check-In? Your work time and activity tracking will begin.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      alert(data.message || 'Checked in successfully!');
      await fetchTodayData();
      await fetchHistory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to Check-Out? This will complete your working session for today.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-out failed');
      alert(data.message || 'Checked out successfully!');
      await fetchTodayData();
      await fetchHistory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/break/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ breakType: selectedBreakType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start break');
      await fetchTodayData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/break/end', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to end break');
      await fetchTodayData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-growth-teal mr-3" />
        <span className="text-xs font-bold">Loading Attendance & Telemetry System...</span>
      </div>
    );
  }

  const metrics = todayData?.metrics;
  const policy = todayData?.policy;
  const loginTimestamp = todayData?.activeSession?.loginTimestamp;

  // Determine Live Status Badge
  let statusBadge = { label: 'OFFLINE', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  if (isCheckedOut) {
    statusBadge = { label: 'COMPLETED FOR TODAY', color: 'bg-teal-950 text-teal-400 border-teal-800/60' };
  } else if (activeBreak) {
    statusBadge = { label: `ON BREAK (${activeBreak.breakType})`, color: 'bg-amber-950 text-amber-400 border-amber-800/60 animate-pulse' };
  } else if (isIdle) {
    statusBadge = { label: 'IDLE (NO ACTIVITY)', color: 'bg-yellow-950 text-yellow-400 border-yellow-800/60 animate-pulse' };
  } else if (isCheckedIn) {
    statusBadge = { label: 'WORKING (TRACKING ACTIVE)', color: 'bg-emerald-950 text-emerald-400 border-emerald-800/60' };
  } else if (loginTimestamp) {
    statusBadge = { label: 'LOGGED IN (MISSING CHECK-IN)', color: 'bg-rose-950 text-rose-400 border-rose-800/60' };
  }

  return (
    <div className="space-y-6">
      {/* Idle Detection Warning Modal */}
      {isIdle && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-slate-800">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900">Inactivity Detected</h3>
                <p className="text-xs text-amber-700">No mouse or keyboard activity for 5+ minutes</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your session has switched to <strong className="text-amber-600">IDLE</strong>. Idle minutes are separated from active working time per platform governance policy.
            </p>
            <button
              onClick={dismissIdleWarning}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition shadow-md"
            >
              I&apos;m Back (Resume Active Tracking)
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR: Server Clock & Shift Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-growth-navy to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400 shadow-inner">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs text-teal-300 font-mono font-bold flex items-center gap-1 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                <Clock className="w-3 h-3 text-growth-teal" />
                <span>
                  Shift: {todayData?.employee?.shiftStartTime === 'FLEXIBLE' || policy?.shiftStartTime === 'FLEXIBLE'
                    ? 'Flexible Hours'
                    : `${formatTo12Hour(todayData?.employee?.shiftStartTime || policy?.shiftStartTime || '10:00')} – ${formatTo12Hour(todayData?.employee?.shiftEndTime || policy?.shiftEndTime || '19:00')}`}
                </span>
              </span>
            </div>
            <h2 className="text-3xl font-black text-white font-mono tracking-tight mt-1">
              {formatClockTime(currentTime, true)}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Distinction Clarification Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 max-w-md">
          <div className="flex items-center gap-1.5 text-growth-teal font-bold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Core Rule: Login Time ≠ Working Time</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Session Login</span>
              <span className="font-mono font-bold text-white">
                {loginTimestamp ? formatClockTime(loginTimestamp) : '—'}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Work Check-In</span>
              <span className="font-mono font-bold text-teal-400">
                {attendance?.checkInTime ? formatClockTime(attendance.checkInTime) : 'Not Checked In'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS PANEL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-growth-teal" />
            <span>Attendance & Work Actions</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* CHECK IN BUTTON */}
          <button
            disabled={isCheckedIn || actionLoading}
            onClick={handleCheckIn}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-sm ${
              isCheckedIn
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isCheckedIn ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Checked In at {formatClockTime(attendance.checkInTime)}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Work (Check-In)</span>
              </>
            )}
          </button>

          {/* BREAK CONTROLS */}
          {activeBreak ? (
            <button
              disabled={actionLoading}
              onClick={handleEndBreak}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-black text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-sm transition-all animate-pulse"
            >
              <Coffee className="w-4 h-4" />
              <span>End {activeBreak.breakType} Break</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <select
                disabled={!isCheckedIn || isCheckedOut || actionLoading}
                value={selectedBreakType}
                onChange={(e) => setSelectedBreakType(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2 text-slate-800 focus:outline-none focus:border-teal-500 disabled:opacity-50"
              >
                <option value="TEA">Tea (15m)</option>
                <option value="LUNCH">Lunch (45m)</option>
                <option value="PERSONAL">Personal</option>
                <option value="OTHER">Other</option>
              </select>
              <button
                disabled={!isCheckedIn || isCheckedOut || actionLoading}
                onClick={handleStartBreak}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-2xl font-black text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Coffee className="w-4 h-4 text-amber-600" />
                <span>Take Break</span>
              </button>
            </div>
          )}

          {/* CHECK OUT BUTTON */}
          <button
            disabled={!isCheckedIn || isCheckedOut || actionLoading}
            onClick={handleCheckOut}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-sm ${
              isCheckedOut
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : !isCheckedIn
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/20'
            }`}
          >
            {isCheckedOut ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Checked Out at {formatClockTime(attendance.checkOutTime)}</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>End Work (Check-Out)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TODAY'S METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Attendance Duration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Attendance Hours</span>
          <div className="text-xl font-black text-slate-900 font-mono">
            {metrics ? `${Math.floor(metrics.attendanceMinutes / 60)}h ${metrics.attendanceMinutes % 60}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-slate-400 block">Check-in to Check-out</span>
        </div>

        {/* Active Tracked Time */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider block">Active Working</span>
          <div className="text-xl font-black text-emerald-600 font-mono">
            {metrics ? `${Math.floor(metrics.activeSeconds / 3600)}h ${Math.floor((metrics.activeSeconds % 3600) / 60)}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-emerald-600/70 block">Active input time</span>
        </div>

        {/* Idle Time */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider block">Idle Time</span>
          <div className="text-xl font-black text-amber-600 font-mono">
            {metrics ? `${Math.floor(metrics.idleSeconds / 3600)}h ${Math.floor((metrics.idleSeconds % 3600) / 60)}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-amber-600/70 block">&gt;5m inactivity</span>
        </div>

        {/* Total Break Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Break</span>
          <div className="text-xl font-black text-slate-900 font-mono">
            {metrics ? `${metrics.totalBreakMinutes}m` : '0m'}
          </div>
          <span className="text-[10px] text-slate-400 block">Tea & Lunch</span>
        </div>

        {/* Net Work Minutes */}
        <div className="bg-white border border-teal-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-teal-700 text-[10px] font-bold uppercase tracking-wider block">Net Work Time</span>
          <div className="text-xl font-black text-teal-700 font-mono">
            {metrics ? `${Math.floor(metrics.netWorkMinutes / 60)}h ${metrics.netWorkMinutes % 60}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-teal-600/70 block">Excluding breaks</span>
        </div>

        {/* Overtime / Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Status / Overtime</span>
          <div className="text-base font-black text-slate-900 font-mono truncate">
            {attendance?.status || (isCheckedIn ? 'PRESENT' : 'NOT CHECKED IN')}
          </div>
          <span className="text-[10px] text-growth-teal font-bold block">
            {metrics?.overtimeMinutes ? `+${metrics.overtimeMinutes}m OT` : 'Standard'}
          </span>
        </div>
      </div>

      {/* MONTHLY ATTENDANCE SUMMARY & CALENDAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-growth-teal" />
              <span>Monthly Attendance & Work Summary</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical verification and monthly hours</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
        </div>

        {/* Monthly KPI Cards */}
        {historyData?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Present Days</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{historyData.summary.presentCount}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-amber-600 text-[10px] uppercase font-bold block">Late Days</span>
              <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">{historyData.summary.lateCount}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-yellow-600 text-[10px] uppercase font-bold block">Half Days</span>
              <span className="text-2xl font-black text-yellow-600 font-mono mt-1 block">{historyData.summary.halfDayCount}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-teal-700 text-[10px] uppercase font-bold block">Total Work Hours</span>
              <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">{historyData.summary.totalWorkHours}h</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-amber-700 text-[10px] uppercase font-bold block">Overtime Hours</span>
              <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">{historyData.summary.totalOvertimeHours}h</span>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Work Hours</th>
                <th className="py-3 px-4">Breaks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {historyData?.records?.length > 0 ? (
                historyData.records.map((rec: any) => {
                  const inTime = rec.checkInTime ? formatClockTime(rec.checkInTime) : '—';
                  const outTime = rec.checkOutTime ? formatClockTime(rec.checkOutTime) : '—';
                  const workHrs = `${Math.floor((rec.totalWorkMinutes || 0) / 60)}h ${(rec.totalWorkMinutes || 0) % 60}m`;

                  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (rec.status === 'LATE') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (rec.status === 'HALF_DAY') badgeColor = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                  if (rec.status === 'ABSENT') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.date}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{outTime}</td>
                      <td className="py-3 px-4 font-mono text-teal-700 font-bold">{workHrs}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{rec.totalBreakMinutes || 0}m</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-700 font-semibold">
                        {rec.overtimeMinutes > 0 ? `+${rec.overtimeMinutes}m` : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records for {selectedMonth}
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
