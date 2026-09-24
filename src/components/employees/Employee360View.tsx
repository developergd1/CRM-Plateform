'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Edit,
  KeyRound,
  Coffee,
  CalendarClock,
  FileText,
  FileCheck,
  ListTodo,
  History,
  Activity,
  User,
  ArrowLeft,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  LogOut,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { formatTo12Hour } from '@/components/common/TimePicker12';

interface Employee360ViewProps {
  initialEmployeeId?: string | null;
  onBack?: () => void;
  onNavigateTab?: (tab: string, context?: any) => void;
}

export const Employee360View: React.FC<Employee360ViewProps> = ({
  initialEmployeeId,
  onBack,
  onNavigateTab,
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialEmployeeId || '');
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Sync selectedId when initialEmployeeId prop changes
  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  // Fetch employees list for dropdown selector
  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch('/api/employees?limit=200');
        if (res.ok) {
          const json = await res.json();
          const emps = json.employees || [];
          setEmployeesList(emps);
          if (!selectedId && emps.length > 0) {
            setSelectedId(initialEmployeeId || emps[0].employeeId);
          }
        }
      } catch (e) {}
    };
    fetchList();
  }, [initialEmployeeId]);

  // Fetch 360 payload for selected employee
  const fetch360Data = async (empId: string) => {
    if (!empId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${empId}/360`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error loading Employee 360:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      fetch360Data(selectedId);
    }
  }, [selectedId]);

  const handleRevokeSessions = async () => {
    if (!confirm('Are you sure you want to revoke all active sessions for this employee?')) return;
    try {
      const res = await fetch('/api/access/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REVOKE_SESSIONS', employeeId: selectedId }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMsg(json.message);
        fetch360Data(selectedId);
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (e) {}
  };

  const employee = data?.employee;
  const attendance = data?.attendanceSummary;
  const leaves = data?.leaveBalances;
  const clientAssignment = data?.clientAssignment;
  const kyc = data?.kyc;
  const account = data?.account;

  const tabs = [
    { id: 'overview', label: '1. Overview', icon: UserCheck },
    { id: 'personal', label: '2. Personal Info', icon: User },
    { id: 'employment', label: '3. Employment', icon: Building2 },
    { id: 'client', label: '4. Client Assignment', icon: Building2 },
    { id: 'attendance', label: '5. Attendance', icon: Clock },
    { id: 'timesheets', label: '6. Timesheets', icon: CalendarClock },
    { id: 'leaves', label: '7. Leaves & Balances', icon: Coffee },
    { id: 'tasks', label: '8. Tasks', icon: ListTodo },
    { id: 'documents', label: '9. Documents', icon: FileText },
    { id: 'kyc', label: '10. KYC Vault', icon: FileCheck },
    { id: 'access', label: '11. Account & Access', icon: KeyRound },
    { id: 'timeline', label: '12. Activity Timeline', icon: Activity },
    { id: 'audit', label: '13. Audit History', icon: History },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Top Navigation & Employee Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-pulse" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Employee 360 Governance Profile
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Complete workforce identity, operational telemetry, lifecycle, access, and audit records
            </p>
          </div>
        </div>

        {/* Employee Dropdown Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Select Employee:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#0D9488] outline-hidden cursor-pointer"
          >
            {employeesList.map((emp) => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.employeeId} — {emp.fullName} ({emp.designation})
              </option>
            ))}
          </select>
          <button
            onClick={() => fetch360Data(selectedId)}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh profile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/30 text-[#0D9488] text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-[#0D9488] hover:text-[#0F766E]">×</button>
        </div>
      )}

      {loading && !employee ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading comprehensive Employee 360 profile...</p>
        </div>
      ) : !employee ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No Employee Selected</p>
          <p className="text-xs text-slate-400">Please choose an employee from the dropdown above to view their profile.</p>
        </div>
      ) : (
        <>
          {/* Header Card with Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0D9488] text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                  {employee.fullName.charAt(0)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {employee.fullName}
                    </h2>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30">
                      {employee.employeeId}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        employee.isBlocked
                          ? 'bg-orange-100 text-growth-orange border border-orange-200'
                          : employee.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : employee.status === 'ARCHIVED'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {employee.isBlocked ? 'BLOCKED' : employee.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-700">
                    {employee.designation} • <span className="text-[#0D9488]">{employee.department}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <strong>Client:</strong> {employee.client?.companyName || 'Internal Growth India Staff'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <strong>Joined:</strong> {new Date(employee.joiningDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <strong>Shift:</strong> {formatTo12Hour(employee.shiftStartTime || '10:00')} – {formatTo12Hour(employee.shiftEndTime || '19:00')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Attendance</span>
                </button>

                <button
                  onClick={() => setActiveTab('leaves')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Coffee className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Leaves</span>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Documents</span>
                </button>

                <button
                  onClick={() => setActiveTab('access')}
                  className="px-3 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Manage Access</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMoreActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 text-xs">
                      <button
                        onClick={() => {
                          handleRevokeSessions();
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Revoke All Sessions</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('timeline');
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>View Timeline</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('audit');
                          setShowMoreActions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Trail</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 13 Structured Tabs Bar */}
            <div className="mt-6 border-t border-slate-100 pt-3 flex items-center gap-1 overflow-x-auto scrollbar-thin">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#0D9488] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#0D9488]/10'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Quick Summary KPIs */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Summary</h3>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Present Days</span>
                      <p className="text-lg font-black text-[#0D9488]">{attendance?.presentDays || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Late Punches</span>
                      <p className="text-lg font-black text-amber-700">{attendance?.lateDays || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Daily Hours</span>
                      <p className="text-lg font-black text-slate-900">{attendance?.avgDailyHours || 0}h</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Overtime</span>
                      <p className="text-lg font-black text-slate-900">{attendance?.totalOvertimeHours || 0}h</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Leave Ledger Balances</h3>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#0D9488]/10 border border-[#0D9488]/30">
                      <span className="font-bold text-[#0D9488]">Casual Leave (CL)</span>
                      <span className="font-mono font-black text-[#0D9488]">{leaves?.casual?.remaining || 12} days remaining</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-orange-50 border border-orange-200">
                      <span className="font-bold text-orange-950">Sick Leave (SL)</span>
                      <span className="font-mono font-black text-orange-800">{leaves?.sick?.remaining || 10} days remaining</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 border border-slate-200">
                      <span className="font-bold text-slate-900">Earned Leave (EL)</span>
                      <span className="font-mono font-black text-slate-700">{leaves?.earned?.remaining || 15} days remaining</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle & Right Column: Profile Overview & Recent Activity */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Primary Employment Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                      <span className="font-semibold text-slate-800">{employee.personalEmail || employee.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Number</span>
                      <span className="font-semibold text-slate-800 font-mono">{employee.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Employment Type</span>
                      <span className="font-semibold text-slate-800">{employee.employmentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Work Location</span>
                      <span className="font-semibold text-slate-800">{employee.location}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Reporting Manager</span>
                      <span className="font-semibold text-slate-800">{employee.reportingManager?.fullName || 'Direct to Leadership'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Status</span>
                      <span className="font-bold text-[#0D9488]">{employee.accountStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Attendance Punches */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Recent Attendance Logs</h3>
                    <button onClick={() => setActiveTab('attendance')} className="text-xs font-bold text-[#0D9488] hover:underline">View All</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Check In</th>
                          <th className="p-2">Check Out</th>
                          <th className="p-2">Work Minutes</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(attendance?.records || []).slice(0, 5).map((rec: any) => (
                          <tr key={rec.id}>
                            <td className="p-2 font-mono">{rec.date}</td>
                            <td className="p-2 font-mono">{rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="p-2 font-mono">{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="p-2 font-mono font-bold">{rec.totalWorkMinutes}m</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${rec.status === 'PRESENT' ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'bg-slate-100 text-slate-600'}`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900">Personal & Emergency Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Full Legal Name</span>
                  <p className="text-sm font-bold text-slate-800">{employee.fullName}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Father / Mother / Guardian</span>
                  <p className="text-sm font-bold text-slate-800">{employee.fatherMotherName || 'Not recorded'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date of Birth</span>
                  <p className="text-sm font-bold text-slate-800">{employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Not recorded'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Gender</span>
                  <p className="text-sm font-bold text-slate-800">{employee.gender || 'Not specified'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                  <p className="text-sm font-bold text-slate-800 font-mono">{employee.phone}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                  <p className="text-sm font-bold text-slate-800">{employee.personalEmail || employee.phone}</p>
                </div>
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Residential Address</span>
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">{employee.address || 'Address not on file.'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Emergency Contact</span>
                  <p className="text-sm font-bold text-slate-800">{employee.emergencyContact || 'None'}</p>
                  <span className="text-[11px] text-slate-500">{employee.emergencyName}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYMENT */}
          {activeTab === 'employment' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900">Employment Terms & Work Policies</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                  <p className="text-sm font-bold text-slate-800">{employee.department}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Designation</span>
                  <p className="text-sm font-bold text-slate-800">{employee.designation}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Employment Type</span>
                  <p className="text-sm font-bold text-slate-800">{employee.employmentType}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Official Joining Date</span>
                  <p className="text-sm font-bold text-slate-800">{new Date(employee.joiningDate).toLocaleDateString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Shift Timings</span>
                  <p className="text-sm font-bold text-[#0D9488] font-mono">
                    {formatTo12Hour(employee.shiftStartTime || '10:00')} – {formatTo12Hour(employee.shiftEndTime || '19:00')}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Work Location</span>
                  <p className="text-sm font-bold text-slate-800">{employee.location}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLIENT ASSIGNMENT */}
          {activeTab === 'client' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900">Corporate Client Assignment & History</h3>
              <div className="p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#0D9488]">Currently Assigned Client</span>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">{clientAssignment?.current?.companyName || 'Internal Growth India Staff'}</h4>
                  <p className="text-xs text-[#0D9488] font-mono mt-0.5">{clientAssignment?.current?.clientId || 'N/A'}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0D9488] text-white">Active Assignment</span>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400">Assignment History Chain</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {(clientAssignment?.history || []).length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 text-center">No previous client reassignments recorded.</p>
                  ) : (
                    clientAssignment.history.map((hist: any) => (
                      <div key={hist.id} className="p-3 text-xs flex items-center justify-between bg-white hover:bg-slate-50">
                        <div>
                          <span className="font-bold text-slate-800">{hist.client?.companyName}</span>
                          <span className="text-slate-400 ml-2 font-mono">({hist.client?.clientId})</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">Assigned by: {hist.assignedBy?.fullName || 'Administrator'}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{new Date(hist.assignedAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Monthly Attendance Punches & Breaks</h3>
                <span className="text-xs text-slate-500">Showing last 31 records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Check In</th>
                      <th className="py-2.5 px-3">Check Out</th>
                      <th className="py-2.5 px-3">Work Time</th>
                      <th className="py-2.5 px-3">Break Time</th>
                      <th className="py-2.5 px-3">Overtime</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(attendance?.records || []).map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{att.date}</td>
                        <td className="py-2.5 px-3 font-mono">{att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-2.5 px-3 font-mono">{att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-2.5 px-3 font-mono">{att.totalWorkMinutes}m</td>
                        <td className="py-2.5 px-3 font-mono">{att.totalBreakMinutes}m</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0D9488]">{att.overtimeMinutes}m</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${att.status === 'PRESENT' ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'bg-slate-100 text-slate-600'}`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">{att.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: TIMESHEETS */}
          {activeTab === 'timesheets' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Monthly Timesheet Reconciliations</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Scheduled Hours</span>
                  <p className="text-xl font-black text-slate-800 mt-1">{data.timesheets?.[0]?.scheduledHours || 176}h</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Worked Hours</span>
                  <p className="text-xl font-black text-[#0D9488] mt-1">{data.timesheets?.[0]?.workedHours || 0}h</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Break Duration</span>
                  <p className="text-xl font-black text-slate-700 mt-1">{data.timesheets?.[0]?.breakHours || 0}h</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Approved Hours</span>
                  <p className="text-xl font-black text-emerald-700 mt-1">{data.timesheets?.[0]?.approvedHours || 0}h</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: LEAVES */}
          {activeTab === 'leaves' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900">Leave Applications & Approval History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Start</th>
                      <th className="py-2.5 px-3">End</th>
                      <th className="py-2.5 px-3">Days</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.leaveRequests || []).length === 0 ? (
                      <tr><td colSpan={6} className="py-6 text-center text-slate-400">No leave requests found.</td></tr>
                    ) : (
                      data.leaveRequests.map((l: any) => (
                        <tr key={l.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{l.leaveType}</td>
                          <td className="py-2.5 px-3 font-mono">{l.startDate}</td>
                          <td className="py-2.5 px-3 font-mono">{l.endDate}</td>
                          <td className="py-2.5 px-3 font-bold">{l.totalDays}d</td>
                          <td className="py-2.5 px-3 text-slate-600">{l.reason}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : l.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: TASKS */}
          {activeTab === 'tasks' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Operational Tasks & Deliverables</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(data.tasks || []).length === 0 ? (
                  <p className="p-6 text-xs text-slate-400 text-center">No assigned CRM or operational tasks.</p>
                ) : (
                  data.tasks.map((t: any) => (
                    <div key={t.id} className="p-3.5 text-xs flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <h4 className="font-bold text-slate-800">{t.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t.description || 'Deliverable in progress'}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">{t.status}</span>
                        <p className="text-[10px] text-slate-400 mt-1">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 9: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Uploaded Employee Documents & Files</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(data.documents || []).length === 0 ? (
                  <p className="p-6 text-xs text-slate-400 text-center">No uploaded documents on file.</p>
                ) : (
                  data.documents.map((doc: any) => (
                    <div key={doc.id} className="p-3.5 text-xs flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">{doc.title}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">({doc.documentType})</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{doc.documentId} • {Math.round(doc.fileSizeBytes / 1024)} KB</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {doc.verificationStatus}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 10: KYC */}
          {activeTab === 'kyc' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Secure KYC Identity Vault</h3>
                  <p className="text-xs text-slate-500">Masked PII protection with watermarked previews</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30">
                  {kyc?.verificationStatus || 'PENDING_VERIFICATION'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Permanent Account Number (PAN)</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-base font-mono font-black text-slate-900 tracking-wider">
                    {kyc?.panMasked || 'XXXXX0000X'}
                  </p>
                  <p className="text-[10px] text-slate-400">Masked per data-privacy governance standards.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Aadhaar Identity</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-base font-mono font-black text-slate-900 tracking-wider">
                    {kyc?.aadhaarMasked || 'XXXX XXXX 0000'}
                  </p>
                  <p className="text-[10px] text-slate-400">Masked per national UID governance guidelines.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: ACCOUNT & ACCESS */}
          {activeTab === 'access' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">User Account & Session Security</h3>
                  <p className="text-xs text-slate-500">Security tokens, active sessions, and credential state</p>
                </div>
                <button
                  onClick={handleRevokeSessions}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Force Revoke All Sessions
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Account Login</span>
                  <p className="font-bold text-slate-800 mt-1">{account?.email || 'No login created'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Portal Role</span>
                  <p className="font-bold text-slate-800 mt-1">{account?.role}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Active Sessions</span>
                  <p className="font-black text-[#0D9488] text-lg mt-1">{account?.activeSessions?.length || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: ACTIVITY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Chronological Lifecycle & Event Timeline</h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(data.timeline || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No lifecycle events recorded for this employee.</p>
                ) : (
                  data.timeline.map((evt: any) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-[#0D9488] ring-4 ring-white" />
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#0D9488]/50 transition-all text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Stage Transition: {evt.toStage}</span>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(evt.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">Reason: {evt.reason}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">Authorized by: {evt.actorName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 13: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.auditHistory || []).map((log: any) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-600">{log.actorEmployeeId || 'SYSTEM'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-xs">{log.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
