'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HrmTenant, HrmAttendance } from '@/lib/hrmStore';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Coffee,
  Calendar,
  Sparkles,
  Users,
  Activity,
  ShieldCheck,
  Building2,
  Search,
} from 'lucide-react';

interface HrmAttendanceViewProps {
  currentTenant: HrmTenant;
}

export const HrmAttendanceView: React.FC<HrmAttendanceViewProps> = ({ currentTenant }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'live-workforce'>('attendance');
  const [attendance, setAttendance] = useState<HrmAttendance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchMsg, setPunchMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/attendance?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentTenant]);

  const handlePunch = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    setPunching(true);
    setPunchMsg(null);
    try {
      const res = await fetch('/api/hrm/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          employeeId: user?.employeeId || 'GI-EMP-000001',
          employeeName: user?.fullName || 'Platform Administrator',
          action,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPunchMsg(data.message);
        await fetchAttendance();
      }
    } catch (err) {
      setPunchMsg('Failed to process attendance punch.');
    } finally {
      setPunching(false);
      setTimeout(() => setPunchMsg(null), 3500);
    }
  };

  const filteredAttendance = attendance.filter((a) => {
    const matchesSearch =
      a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">PRESENT</span>;
      case 'LATE':
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">LATE ARRIVAL</span>;
      case 'HALF_DAY':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">HALF DAY</span>;
      case 'ON_LEAVE':
        return <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">ON LEAVE</span>;
      case 'HOLIDAY':
        return <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-bold text-[10px]">HOLIDAY</span>;
      case 'WEEKLY_OFF':
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">WEEKLY OFF</span>;
      case 'ABSENT':
      default:
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">ABSENT</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Quick Punch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">Attendance & Live Workforce</h1>
            <span className="text-xs font-mono text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/30 px-2 py-0.5 rounded font-bold">
              {currentTenant.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational attendance punches, status tracking, and authorized live workforce session telemetry.
          </p>
        </div>

        {/* Live Punch Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePunch('CHECK_IN')}
            disabled={punching}
            className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Punch In</span>
          </button>
          <button
            onClick={() => handlePunch('CHECK_OUT')}
            disabled={punching}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Check Out</span>
          </button>
        </div>
      </div>

      {punchMsg && (
        <div className="p-3 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/30 text-xs font-bold text-[#0D9488] animate-fadeIn">
          {punchMsg}
        </div>
      )}

      {/* Domain Sub-tab Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('live-workforce')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'live-workforce'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Workforce Telemetry</span>
          </button>
        </div>
        <span className="text-[10px] text-slate-400 font-medium px-3 hidden sm:inline">
          {activeTab === 'attendance' ? 'Login Session ≠ Attendance Punch' : 'Real-time Session Telemetry'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Present Today</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.totalPresent || 0}</span>
            <span className="text-xs font-bold text-emerald-600">On Duty</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Late Check-ins</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{stats?.totalLate || 0}</span>
            <span className="text-xs font-bold text-amber-600">&gt; 15 min grace</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Work Hours</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0D9488]">{stats?.avgWorkingHours || 9.2}h</span>
            <span className="text-xs font-bold text-slate-400">Target 9.0h</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Grace Threshold</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">09:45 AM</span>
            <span className="text-xs font-bold text-[#0D9488]">Standard Policy</span>
          </div>
        </div>
      </div>

      {activeTab === 'attendance' ? (
        /* Attendance Ledger */
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by employee name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0D9488]" />
                <h3 className="text-sm font-bold text-slate-900">Verified Attendance Records</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{new Date().toDateString()}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Check-In</th>
                    <th className="px-6 py-3">Check-Out</th>
                    <th className="px-6 py-3">Work Duration</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Overtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        No attendance records found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((att) => (
                      <tr key={att.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-bold text-slate-900">{att.employeeName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{att.employeeId}</p>
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-700 truncate max-w-[150px]">
                          {currentTenant.name}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">{att.checkIn}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">{att.checkOut || 'Active Session'}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{att.totalHours ? `${att.totalHours} hrs` : '-'}</td>
                        <td className="px-6 py-3.5">
                          {getStatusBadge(att.status)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-[#0D9488]">
                          {att.overtimeMinutes > 0 ? `+${att.overtimeMinutes}m` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Live Workforce Telemetry */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
            <strong>Privacy & Regulatory Notice:</strong> Live Workforce telemetry captures authenticated application sessions and punch activity for operational routing. It is distinct from biometric attendance and does not infer employee productivity from idle login status.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendance.slice(0, 6).map((att, idx) => (
              <div
                key={att.id || idx}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold text-xs">
                      {att.employeeName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">{att.employeeName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{att.employeeId}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Active Session</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Organization:</span>
                    <strong className="text-slate-700 truncate max-w-[140px]">{currentTenant.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Punch Check-In:</span>
                    <span className="font-mono font-bold text-slate-800">{att.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Session State:</span>
                    <span className="text-[#0D9488] font-bold">Authorized Session</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Telemetry Ping:</span>
                    <span className="font-mono text-slate-500">2 minutes ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
