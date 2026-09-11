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
  RefreshCw,
  Activity,
} from 'lucide-react';
import { formatTo12Hour, formatClockTime } from '@/components/common/TimePicker12';
import { clientCache } from '@/lib/client-cache';

export const EmployeeAttendanceView: React.FC = () => {
  const { user } = useAuth();
  const todayCacheKey = `emp_today_${user?.employeeId || 'emp'}`;
  const initialToday = clientCache.get<any>(todayCacheKey, 10 * 60 * 1000);
  const [loading, setLoading] = useState(() => !initialToday);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayData, setTodayData] = useState<any>(() => initialToday);
  const [historyData, setHistoryData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedBreakType, setSelectedBreakType] = useState<string>('TEA');
  const [actionMessage, setActionMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Month selector for history
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Clock ticker (only updates local UI time)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance & active session
  const fetchTodayData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = clientCache.get<any>(todayCacheKey, 10 * 60 * 1000);
      if (cached) {
        setTodayData(cached);
        setLoading(false);
        return;
      }
    }
    try {
      const res = await fetch('/api/attendance/today');
      if (res.ok) {
        const data = await res.json();
        setTodayData(data);
        clientCache.set(todayCacheKey, data);
      }
    } catch (e) {
      console.error('Failed to load today attendance:', e);
    } finally {
      setLoading(false);
    }
  }, [todayCacheKey]);

  // Fetch monthly history
  const fetchHistory = useCallback(async (forceRefresh = false) => {
    const histCacheKey = `emp_hist_${user?.employeeId || 'emp'}_${selectedMonth}`;
    if (!forceRefresh) {
      const cached = clientCache.get<any>(histCacheKey, 15 * 60 * 1000);
      if (cached) {
        setHistoryData(cached);
        return;
      }
    }
    try {
      const res = await fetch(`/api/attendance/history?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
        clientCache.set(histCacheKey, data);
      }
    } catch (e) {
      console.error('Failed to load attendance history:', e);
    }
  }, [selectedMonth, user?.employeeId]);

  useEffect(() => {
    fetchTodayData();
    fetchHistory();
  }, [fetchTodayData, fetchHistory]);

  const activeSessionId = todayData?.activeSession?.sessionId;
  const attendance = todayData?.attendance;
  const activeBreak = attendance?.breaks?.find((b: any) => !b.breakEndTime);
  const isCheckedIn = Boolean(attendance?.checkInTime && !attendance?.checkOutTime);
  const isCheckedOut = Boolean(attendance?.checkInTime && attendance?.checkOutTime);
  const isNotCheckedIn = !attendance?.checkInTime;

  // Live elapsed working time ticker (updates every 1 second)
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!attendance?.checkInTime || isCheckedOut) {
      setLiveElapsedSeconds(0);
      return;
    }

    const checkInMs = new Date(attendance.checkInTime).getTime();

    const updateLiveTimer = () => {
      const nowMs = Date.now();
      const totalElapsed = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));
      
      // Calculate total break seconds so far today
      let breakSeconds = 0;
      if (attendance.breaks && Array.isArray(attendance.breaks)) {
        attendance.breaks.forEach((b: any) => {
          const bStart = new Date(b.breakStartTime).getTime();
          const bEnd = b.breakEndTime ? new Date(b.breakEndTime).getTime() : nowMs;
          breakSeconds += Math.max(0, Math.floor((bEnd - bStart) / 1000));
        });
      }

      setLiveElapsedSeconds(Math.max(0, totalElapsed - breakSeconds));
    };

    updateLiveTimer();
    const interval = setInterval(updateLiveTimer, 1000);
    return () => clearInterval(interval);
  }, [attendance?.checkInTime, attendance?.breaks, isCheckedOut]);

  // Client telemetry hook (silent heartbeat, no full page auto-refresh)
  const { isIdle, dismissIdleWarning } = useWorkTracker({
    sessionId: activeSessionId,
    enabled: isCheckedIn && !isCheckedOut && !activeBreak,
    idleThresholdMinutes: todayData?.policy?.idleThresholdMinutes || 5,
  });

  // Handlers
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-in failed');
      showMessage(data.message || 'Checked in successfully! Work tracking active.');
      clientCache.remove(todayCacheKey);
      await fetchTodayData(true);
      await fetchHistory(true);
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm('Are you sure you want to Check-Out? This will end your active working session for today.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/attendance/check-out', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check-out failed');
      showMessage(data.message || 'Checked out successfully! Work session ended.');
      clientCache.remove(todayCacheKey);
      await fetchTodayData(true);
      await fetchHistory(true);
    } catch (err: any) {
      showMessage(err.message, 'error');
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
      showMessage(`Started ${selectedBreakType} break.`);
      clientCache.remove(todayCacheKey);
      await fetchTodayData(true);
    } catch (err: any) {
      showMessage(err.message, 'error');
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
      showMessage('Break ended successfully! Work resumed.');
      clientCache.remove(todayCacheKey);
      await fetchTodayData(true);
    } catch (err: any) {
      showMessage(err.message, 'error');
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

  const formatSecondsToClock = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

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
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl transition shadow-md cursor-pointer"
            >
              I&apos;m Back (Resume Active Tracking)
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC ATTENDANCE STATUS HERO BANNER (RED = Not Checked In, GREEN = Working, AMBER = Break, SLATE = Day Done) */}
      {isNotCheckedIn ? (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-xl shadow-rose-900/20 border-2 border-rose-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>🔴 NOT CHECKED IN (WORK NOT STARTED)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              You haven&apos;t Checked In yet today!
            </h2>
            <p className="text-xs text-rose-100 max-w-xl leading-relaxed font-medium">
              You are logged into the system ({loginTimestamp ? `Login Time: ${formatClockTime(loginTimestamp)}` : 'Active Session'}), but your official working hours are <strong>NOT counting</strong> until you click the Check-In button below.
            </p>
          </div>

          <button
            disabled={actionLoading}
            onClick={handleCheckIn}
            className="interactive-btn-hover shrink-0 flex items-center gap-3 px-8 py-4 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl font-black text-sm shadow-2xl transition-all transform active:scale-95 cursor-pointer"
          >
            {actionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-rose-700 text-rose-700" />
            )}
            <span>PUNCH IN / START WORK NOW</span>
          </button>
        </div>
      ) : isCheckedIn ? (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-900/20 border-2 border-emerald-400 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>🟢 ON DUTY & WORKING (ACTIVE TRACKING)</span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-white font-mono tracking-tight">
                ⏱️ {formatSecondsToClock(liveElapsedSeconds)}
              </h2>
              <span className="text-xs text-emerald-100 font-semibold bg-white/10 px-2.5 py-1 rounded-lg">
                Checked in at {formatClockTime(attendance.checkInTime)}
              </span>
            </div>
            <p className="text-xs text-emerald-100 max-w-xl font-medium">
              Your work time is counting live every second. Stay active to log your input hours.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              disabled={actionLoading}
              onClick={handleStartBreak}
              className="interactive-btn-hover flex items-center gap-2 px-4 py-3 bg-emerald-700/80 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs border border-white/20 transition cursor-pointer"
            >
              <Coffee className="w-4 h-4 text-amber-300" />
              <span>Take Break</span>
            </button>
            <button
              disabled={actionLoading}
              onClick={handleCheckOut}
              className="interactive-btn-hover flex items-center gap-2 px-6 py-3 bg-white text-rose-700 hover:bg-rose-50 rounded-xl font-black text-xs shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-rose-700" />
              <span>Check Out (End Day)</span>
            </button>
          </div>
        </div>
      ) : activeBreak ? (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-amber-900/20 border-2 border-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black text-white border border-white/30 animate-pulse">
              <Coffee className="w-4 h-4" />
              <span>☕ ON BREAK ({activeBreak.breakType})</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Work Tracking Paused
            </h2>
            <p className="text-xs text-amber-100 max-w-xl font-medium">
              Break started at {formatClockTime(activeBreak.breakStartTime)}. Click below when you return to resume active work time.
            </p>
          </div>

          <button
            disabled={actionLoading}
            onClick={handleEndBreak}
            className="interactive-btn-hover shrink-0 flex items-center gap-2 px-8 py-4 bg-white text-amber-700 hover:bg-amber-50 rounded-2xl font-black text-sm shadow-2xl transition transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-amber-700" />
            <span>RESUME WORK (END BREAK)</span>
          </button>
        </div>
      ) : (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white shadow-xl border-2 border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-black text-teal-300 border border-teal-500/30">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>🏁 WORK COMPLETED FOR TODAY</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              You have checked out for the day
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-medium">
              Checked In at <strong>{formatClockTime(attendance.checkInTime)}</strong> • Checked Out at <strong>{formatClockTime(attendance.checkOutTime)}</strong>
            </p>
          </div>

          <button
            disabled={actionLoading}
            onClick={handleCheckIn}
            className="interactive-btn-hover shrink-0 flex items-center gap-2 px-6 py-3.5 bg-growth-teal hover:bg-growth-tealDark text-white rounded-xl font-black text-xs shadow-lg transition transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Punch In Again / Resume Work</span>
          </button>
        </div>
      )}

      {/* TOP BAR: Server Clock & Shift Banner */}
      <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
            isNotCheckedIn ? 'bg-rose-50 text-rose-600 border border-rose-200' :
            isCheckedIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
            activeBreak ? 'bg-amber-50 text-amber-600 border border-amber-200' :
            'bg-teal-50 text-growth-teal border border-teal-200'
          }`}>
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                isNotCheckedIn ? 'bg-rose-100 text-rose-800 border-rose-300' :
                isCheckedIn ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                activeBreak ? 'bg-amber-100 text-amber-800 border-amber-300' :
                'bg-slate-100 text-slate-800 border-slate-300'
              }`}>
                {isNotCheckedIn ? '🔴 NOT CHECKED IN' : isCheckedIn ? '🟢 ACTIVE WORKING' : activeBreak ? '☕ ON BREAK' : '🏁 COMPLETED'}
              </span>
              <span className="text-xs text-slate-800 font-mono font-bold flex items-center gap-1 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">
                <Clock className="w-3 h-3 text-growth-teal" />
                <span>
                  Shift: {todayData?.employee?.shiftStartTime === 'FLEXIBLE' || policy?.shiftStartTime === 'FLEXIBLE'
                    ? 'Flexible Hours'
                    : `${formatTo12Hour(todayData?.employee?.shiftStartTime || policy?.shiftStartTime || '10:00')} – ${formatTo12Hour(todayData?.employee?.shiftEndTime || policy?.shiftEndTime || '19:00')}`}
                </span>
              </span>
            </div>
            <h2 className="title-interactive-hover text-3xl font-black text-slate-900 font-mono tracking-tight mt-1">
              {formatClockTime(currentTime, true)}
            </h2>
            <p className="subtitle-interactive-hover text-xs text-slate-700 mt-0.5">
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Distinction Clarification Card */}
        <div className="card-premium interactive-box-hover bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 max-w-md cursor-pointer">
          <div className="flex items-center gap-1.5 text-growth-teal font-bold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Core Rule: Login Time ≠ Working Time</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-bold">Session Login</span>
              <span className="font-mono font-black text-slate-900 text-xs">
                {loginTimestamp ? formatClockTime(loginTimestamp) : '—'}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isNotCheckedIn 
                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="block text-[10px] font-bold">Work Check-In</span>
              <span className="font-mono font-black text-xs">
                {attendance?.checkInTime ? formatClockTime(attendance.checkInTime) : '🔴 Not Checked In'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS PANEL */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="title-interactive-hover text-sm font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-growth-teal" />
            <span>Attendance & Work Actions</span>
          </h3>
          <button
            onClick={() => {
              fetchTodayData(true);
              fetchHistory(true);
            }}
            title="Refresh Attendance Data"
            className="interactive-btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* CHECK IN BUTTON */}
          <button
            disabled={actionLoading || (isCheckedIn && !isCheckedOut)}
            onClick={handleCheckIn}
            className={`interactive-btn-hover flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black text-xs transition-all shadow-md cursor-pointer ${
              isCheckedIn && !isCheckedOut
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-300'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
            }`}
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isCheckedIn && !isCheckedOut ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Checked In at {formatClockTime(attendance.checkInTime)}</span>
              </>
            ) : isCheckedOut ? (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Punch In Again (Resume)</span>
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
              className="interactive-btn-hover flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-500 text-white shadow-md transition-all animate-pulse cursor-pointer"
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
                className="interactive-btn-hover flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl font-black text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
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
            className={`interactive-btn-hover flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-black text-xs transition-all shadow-sm ${
              isCheckedOut
                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                : !isCheckedIn
                ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/30 cursor-pointer'
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
        
        {/* ACTION MESSAGE TOAST */}
        {actionMessage && (
          <div className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* TODAY'S METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Attendance Duration */}
        <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-5 transition-opacity">
            <Clock className="w-12 h-12 text-slate-900" />
          </div>
          <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wider block relative z-10">Attendance Hours</span>
          <div className="text-xl font-black text-slate-900 font-mono relative z-10">
            {metrics ? `${Math.floor(metrics.attendanceMinutes / 60)}h ${metrics.attendanceMinutes % 60}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-slate-600 block relative z-10">Check-in to Check-out</span>
        </div>

        {/* Active Work Time */}
        <div className="card-premium interactive-box-hover bg-white border border-emerald-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Activity className="w-12 h-12 text-emerald-600" />
          </div>
          <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider block relative z-10">Active Working</span>
          <div className="text-xl font-black text-emerald-700 font-mono relative z-10">
            {metrics ? `${Math.floor(metrics.activeSeconds / 3600)}h ${Math.floor((metrics.activeSeconds % 3600) / 60)}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-emerald-700 block relative z-10">Active input time</span>
        </div>

        {/* Idle Time */}
        <div className="card-premium interactive-box-hover bg-white border border-amber-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <AlertTriangle className="w-12 h-12 text-amber-600" />
          </div>
          <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block relative z-10">Idle Time</span>
          <div className="text-xl font-black text-amber-700 font-mono relative z-10">
            {metrics ? `${Math.floor(metrics.idleSeconds / 3600)}h ${Math.floor((metrics.idleSeconds % 3600) / 60)}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-amber-700 block relative z-10">&gt;5m inactivity</span>
        </div>

        {/* Total Break */}
        <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Coffee className="w-12 h-12 text-slate-600" />
          </div>
          <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wider block relative z-10">Total Break</span>
          <div className="text-xl font-black text-slate-900 font-mono relative z-10">
            {metrics ? `${metrics.totalBreakMinutes}m` : '0m'}
          </div>
          <span className="text-[10px] text-slate-600 block relative z-10">Tea & Lunch</span>
        </div>

        {/* Net Work Time */}
        <div className="card-premium interactive-box-hover bg-white border border-teal-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <CheckCircle2 className="w-12 h-12 text-teal-600" />
          </div>
          <span className="text-teal-800 text-[10px] font-bold uppercase tracking-wider block relative z-10">Net Work Time</span>
          <div className="text-xl font-black text-teal-800 font-mono relative z-10">
            {metrics ? `${Math.floor(metrics.netWorkMinutes / 60)}h ${metrics.netWorkMinutes % 60}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-teal-700 block relative z-10">Excluding breaks</span>
        </div>

        {/* Status / Overtime */}
        <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm cursor-pointer relative overflow-hidden group">
          <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wider block relative z-10">Status / Overtime</span>
          <div className="text-base font-black text-slate-900 truncate relative z-10" title={attendance?.status || 'N/A'}>
            {attendance?.status || '—'}
          </div>
          <span className="text-[10px] text-growth-teal font-bold block relative z-10">
            {metrics?.overtimeMinutes ? `+${metrics.overtimeMinutes}m Overtime` : 'Standard'}
          </span>
        </div>
      </div>

      {/* MONTHLY ATTENDANCE SUMMARY & CALENDAR */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-6 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="title-interactive-hover text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-growth-teal" />
              <span>Monthly Attendance & Work Summary</span>
            </h3>
            <p className="subtitle-interactive-hover text-xs text-slate-700 mt-0.5">Historical verification and monthly hours</p>
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
            <div className="card-premium interactive-box-hover cursor-pointer bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-slate-700 text-[10px] uppercase font-bold block">Present Days</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{historyData.summary.presentCount}</span>
            </div>
            <div className="card-premium interactive-box-hover cursor-pointer bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-amber-600 text-[10px] uppercase font-bold block">Late Days</span>
              <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">{historyData.summary.lateCount}</span>
            </div>
            <div className="card-premium interactive-box-hover cursor-pointer bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-yellow-600 text-[10px] uppercase font-bold block">Half Days</span>
              <span className="text-2xl font-black text-yellow-600 font-mono mt-1 block">{historyData.summary.halfDayCount}</span>
            </div>
            <div className="card-premium interactive-box-hover cursor-pointer bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-teal-700 text-[10px] uppercase font-bold block">Total Work Hours</span>
              <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">{historyData.summary.totalWorkHours}h</span>
            </div>
            <div className="card-premium interactive-box-hover cursor-pointer bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-amber-700 text-[10px] uppercase font-bold block">Overtime Hours</span>
              <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">{historyData.summary.totalOvertimeHours}h</span>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
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
                    <tr key={rec.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                      <td className="py-3 px-4">
                        <span className="title-interactive-hover font-mono font-bold text-slate-900 inline-block">{rec.date}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">{inTime}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{outTime}</td>
                      <td className="py-3 px-4 font-mono text-teal-700 font-bold">{workHrs}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{rec.totalBreakMinutes || 0}m</td>
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
