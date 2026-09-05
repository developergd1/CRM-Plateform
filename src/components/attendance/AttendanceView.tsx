'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Calendar,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Users,
} from 'lucide-react';
import { isManagerOrAbove } from '@/lib/rbac';

export const AttendanceView: React.FC = () => {
  const { user, todayAttendance, checkIn, checkOut, startBreak, endBreak } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // Fetch history
      const resHist = await fetch('/api/attendance/history');
      if (resHist.ok) {
        const data = await resHist.json();
        setHistory(data.history || []);
      }

      // Fetch today summary for managers/admins
      const resToday = await fetch('/api/attendance/today');
      if (resToday.ok) {
        const data = await resToday.json();
        if (data.summary) setTodaySummary(data);
      }
    } catch (e) {
      console.error('Error fetching attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [user, todayAttendance]);

  const isCheckedIn = !!todayAttendance?.checkInTime;
  const isCheckedOut = !!todayAttendance?.checkOutTime;
  const isOnBreak = isCheckedIn && !isCheckedOut && todayAttendance?.breaks?.some((b: any) => !b.breakEndTime);

  const formatTime = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePunchIn = async () => {
    setActionLoading(true);
    await checkIn();
    await fetchAttendanceData();
    setActionLoading(false);
  };

  const handlePunchOut = async () => {
    if (!confirm('Are you sure you want to Check Out for the day?')) return;
    setActionLoading(true);
    await checkOut();
    await fetchAttendanceData();
    setActionLoading(false);
  };

  const handleBreakToggle = async () => {
    setActionLoading(true);
    if (isOnBreak) await endBreak();
    else await startBreak('TEA_LUNCH');
    await fetchAttendanceData();
    setActionLoading(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-growth-teal" />
            <span>Attendance & Shift Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Daily check-in / check-out punch, break tracking, and monthly attendance reports
          </p>
        </div>
      </div>

      {/* Live Punch Card for Current Employee */}
      <div className="bg-gradient-to-br from-slate-900 via-growth-navy to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-growth-gold uppercase tracking-wider block">
            Today&apos;s Live Session ({new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })})
          </span>
          <div className="text-2xl font-black">
            {!isCheckedIn ? (
              <span className="text-slate-400">Shift Not Started</span>
            ) : isCheckedOut ? (
              <span className="text-emerald-400">Shift Completed ({formatTime(todayAttendance.checkOutTime)})</span>
            ) : isOnBreak ? (
              <span className="text-amber-400 animate-pulse">Currently on Break</span>
            ) : (
              <span className="text-white">Active at Work (Checked in at {formatTime(todayAttendance.checkInTime)})</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Shift: <span className="text-slate-200 font-semibold">09:30 AM – 06:30 PM</span> • Grace Period: <span className="text-slate-200 font-semibold">15 Mins</span>
          </p>
        </div>

        {/* Punch Action Buttons */}
        <div className="flex items-center gap-3">
          {!isCheckedIn ? (
            <button
              onClick={handlePunchIn}
              disabled={actionLoading}
              className="px-6 py-3 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-sm rounded-2xl shadow-tealGlow flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Punch In (Check-In)</span>
            </button>
          ) : !isCheckedOut ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleBreakToggle}
                disabled={actionLoading}
                className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                  isOnBreak
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Coffee className="w-4 h-4" />
                <span>{isOnBreak ? 'End Break (Resume)' : 'Take Break'}</span>
              </button>

              <button
                onClick={handlePunchOut}
                disabled={actionLoading}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center gap-2 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Check Out</span>
              </button>
            </div>
          ) : (
            <div className="px-5 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Punch Closed for Today</span>
            </div>
          )}
        </div>
      </div>

      {/* Today's Presence Dashboard (For Managers & Admins) */}
      {todaySummary && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-growth-teal" />
            <span>Today&apos;s Company Attendance Status</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Present Today</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {todaySummary.summary?.presentCount} / {todaySummary.summary?.totalEmployees}
              </span>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80">
              <span className="text-amber-800 font-bold uppercase text-[10px] block">Late Arrivals</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {todaySummary.summary?.lateCount}
              </span>
            </div>
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200/80">
              <span className="text-growth-teal font-bold uppercase text-[10px] block">Currently on Break</span>
              <span className="text-2xl font-black text-growth-tealDark mt-1 block">
                {todaySummary.summary?.onBreakCount}
              </span>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200/80">
              <span className="text-rose-800 font-bold uppercase text-[10px] block">Absent / Unmarked</span>
              <span className="text-2xl font-black text-rose-900 mt-1 block">
                {todaySummary.summary?.absentCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Attendance Log & Monthly Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Check In</th>
                <th className="py-3.5 px-4">Check Out</th>
                <th className="py-3.5 px-4">Total Work</th>
                <th className="py-3.5 px-4">Breaks</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    {record.date}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{record.employee?.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{record.employee?.employeeId}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {formatTime(record.checkInTime)}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {formatTime(record.checkOutTime)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {record.totalWorkMinutes > 0
                      ? `${Math.floor(record.totalWorkMinutes / 60)}h ${record.totalWorkMinutes % 60}m`
                      : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600">
                    {record.totalBreakMinutes} mins
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-600">
                    {record.overtimeMinutes > 0 ? `+${record.overtimeMinutes}m` : '0m'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        record.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : record.status === 'LATE'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
