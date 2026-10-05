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
  Check,
  X,
  Sliders,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface HrmAttendanceViewProps {
  currentTenant: HrmTenant;
}

export const HrmAttendanceView: React.FC<HrmAttendanceViewProps> = ({ currentTenant }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'timesheets' | 'regularization' | 'summary'>('live');
  const [attendance, setAttendance] = useState<HrmAttendance[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [punchMsg, setPunchMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Regularization modal state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:30',
    checkOut: '18:30',
    reason: 'Biometric device synchronization issue',
  });

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [attRes, regRes] = await Promise.all([
        fetch(`/api/hrm/attendance?tenantId=${currentTenant.id}&month=${selectedMonth}`),
        fetch(`/api/attendance/regularization`),
      ]);

      if (attRes.ok) {
        const data = await attRes.json();
        setAttendance(data.attendance || []);
        setStats(data.stats || {});
      }

      if (regRes.ok) {
        const regData = await regRes.json();
        setRegularizations(regData.requests || regData.regularizations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentTenant, selectedMonth]);

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
      } else {
        setPunchMsg(data.error || 'Failed to process punch');
      }
    } catch (err: any) {
      setPunchMsg(err.message || 'Failed to process attendance punch.');
    } finally {
      setPunching(false);
      setTimeout(() => setPunchMsg(null), 3500);
    }
  };

  const handleUpdateStatus = async (employeeId: string, date: string, newStatus: string) => {
    try {
      const res = await fetch('/api/hrm/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date,
          status: newStatus,
        }),
      });
      if (res.ok) {
        await fetchAttendance();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleReviewRegularization = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/attendance/regularization/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          remarks: `${action} by HR administrator`,
        }),
      });
      if (res.ok) {
        await fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user?.employeeId || 'GI-EMP-000001',
          employeeName: user?.fullName || 'Administrator',
          date: regForm.date,
          requestedCheckIn: regForm.checkIn,
          requestedCheckOut: regForm.checkOut,
          reason: regForm.reason,
        }),
      });
      if (res.ok) {
        setShowRegModal(false);
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit regularization');
      }
    } catch (err: any) {
      alert(err.message);
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
      case 'ABSENT':
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">ABSENT (LOP)</span>;
      case 'ON_LEAVE':
        return <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">ON LEAVE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px]">{status}</span>;
    }
  };

  // Generate monthly attendance summary grouped by employee
  const employeeSummaryMap = new Map<string, {
    employeeId: string;
    employeeName: string;
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    onLeave: number;
    totalHours: number;
    unpaidDays: number;
    payableDays: number;
  }>();

  for (const a of attendance) {
    if (!employeeSummaryMap.has(a.employeeId)) {
      employeeSummaryMap.set(a.employeeId, {
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        onLeave: 0,
        totalHours: 0,
        unpaidDays: 0,
        payableDays: 26,
      });
    }
    const item = employeeSummaryMap.get(a.employeeId)!;
    if (a.status === 'PRESENT') item.present++;
    else if (a.status === 'LATE') { item.late++; item.present++; }
    else if (a.status === 'HALF_DAY') { item.halfDay++; item.unpaidDays += 0.5; }
    else if (a.status === 'ABSENT') { item.absent++; item.unpaidDays += 1; }
    else if (a.status === 'ON_LEAVE') item.onLeave++;
    item.totalHours += a.totalHours || 0;
    item.payableDays = Math.max(0, 26 - item.unpaidDays);
  }

  const summaryList = Array.from(employeeSummaryMap.values());

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-[11px] border border-[#0D9488]/20">
              Biometric & Shift Operations
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Attendance & Time Telemetry</h1>
          <p className="text-xs text-slate-500">
            Real-time biometric punch logging, timesheets, regularizations, and payroll-integrated payable day tracking.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'live' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timesheets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'timesheets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timesheets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('regularization')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'regularization' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Regularization</span>
            {regularizations.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px]">
                {regularizations.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Summary
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Present Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.totalPresent || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Biometric authenticated</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Late Arrivals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.totalLate || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">After 09:45 AM threshold</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Unexcused Absences</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.totalAbsent || 0}</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Tied to LOP payroll deduction</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Average Work Hours</span>
            <TrendingUp className="w-4 h-4 text-[#0D9488]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats?.avgWorkingHours || 8.5}h</div>
          <div className="text-[11px] text-slate-500 mt-1">Standard 8.0h shift basis</div>
        </div>
      </div>

      {/* TAB 1: LIVE ATTENDANCE PUNCH CLOCK */}
      {activeTab === 'live' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Electronic Attendance Punch</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Authenticated Identity: <strong className="text-slate-800">{user?.fullName}</strong> ({user?.employeeId || 'GI-EMP-000001'})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={punching}
                onClick={() => handlePunch('CHECK_IN')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Punch Check-In</span>
              </button>

              <button
                type="button"
                disabled={punching}
                onClick={() => handlePunch('CHECK_OUT')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Punch Check-Out</span>
              </button>
            </div>
          </div>

          {punchMsg && (
            <div className="p-3 rounded-xl bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{punchMsg}</span>
            </div>
          )}

          {/* Today's Punch List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Recent Punches Today</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-200">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Check-In</th>
                    <th className="py-2.5 px-3">Check-Out</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Work Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.slice(0, 10).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {a.employeeName}
                        <span className="block text-[10px] text-slate-400 font-mono">{a.employeeId}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{a.date}</td>
                      <td className="py-2.5 px-3 text-slate-700">{a.checkIn}</td>
                      <td className="py-2.5 px-3 text-slate-700">{a.checkOut || 'Active'}</td>
                      <td className="py-2.5 px-3">{getStatusBadge(a.status)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{a.totalHours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMESHEETS & DAILY LOGS */}
      {activeTab === 'timesheets' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 w-64 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-200">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Check-In</th>
                  <th className="py-3 px-3">Check-Out</th>
                  <th className="py-3 px-3">Hours</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Adjust Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">{a.date}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{a.employeeName}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{a.employeeId}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{a.checkIn}</td>
                    <td className="py-3 px-3 text-slate-600">{a.checkOut || '—'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{a.totalHours}h</td>
                    <td className="py-3 px-3">{getStatusBadge(a.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(a.employeeId, a.date, 'PRESENT')}
                          className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold"
                          title="Mark Present"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(a.employeeId, a.date, 'HALF_DAY')}
                          className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold"
                          title="Mark Half Day"
                        >
                          HD
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(a.employeeId, a.date, 'ABSENT')}
                          className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold"
                          title="Mark Absent"
                        >
                          A
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGULARIZATION */}
      {activeTab === 'regularization' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance Regularization Requests</h2>
              <p className="text-xs text-slate-500">
                Correct biometric misses, off-site visits, and punch anomalies with manager sign-off.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs"
            >
              + Submit Regularization
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-200">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Requested Check-In</th>
                  <th className="py-3 px-3">Requested Check-Out</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regularizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      No regularization requests recorded.
                    </td>
                  </tr>
                ) : (
                  regularizations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">{r.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">{r.employeeName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{r.employeeId}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{r.requestedCheckIn}</td>
                      <td className="py-3 px-3 text-slate-700">{r.requestedCheckOut}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          r.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewRegularization(r.id, 'APPROVED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewRegularization(r.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px]"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">{r.reviewedBy || 'Reviewed'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDANCE SUMMARY & PAYABLE DAYS */}
      {activeTab === 'summary' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Attendance & Payable Days Summary</h2>
              <p className="text-xs text-slate-500">
                Direct payroll synchronization view: Payable days and Loss of Pay (LOP) calculated from attendance.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-700 font-mono">
              Month: {selectedMonth}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-200">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3 text-center">Present</th>
                  <th className="py-3 px-3 text-center">Late</th>
                  <th className="py-3 px-3 text-center">Half Day</th>
                  <th className="py-3 px-3 text-center text-rose-600">Absent (LOP)</th>
                  <th className="py-3 px-3 text-center">Total Hours</th>
                  <th className="py-3 px-3 text-center text-rose-600">Unpaid Days</th>
                  <th className="py-3 px-3 text-right text-emerald-700 font-bold">Payable Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryList.map((s) => (
                  <tr key={s.employeeId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{s.employeeName}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{s.employeeId}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{s.present}</td>
                    <td className="py-3 px-3 text-center text-amber-600 font-semibold">{s.late}</td>
                    <td className="py-3 px-3 text-center text-blue-600 font-semibold">{s.halfDay}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{s.absent}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{s.totalHours}h</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{s.unpaidDays}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                      {s.payableDays} / 26
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regularization Submission Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Submit Attendance Regularization</h3>
            <form onSubmit={handleCreateRegularization} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={regForm.date}
                  onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    required
                    value={regForm.checkIn}
                    onChange={(e) => setRegForm({ ...regForm, checkIn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    required
                    value={regForm.checkOut}
                    onChange={(e) => setRegForm({ ...regForm, checkOut: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Regularization</label>
                <textarea
                  required
                  rows={3}
                  value={regForm.reason}
                  onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  placeholder="Explain why biometric punch was missed or needs adjustment..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
