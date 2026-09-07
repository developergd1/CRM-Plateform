'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Building2,
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  Eye,
  LogOut,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  KeyRound,
  Key,
  Edit,
  LayoutDashboard,
  Activity,
  Clock,
} from 'lucide-react';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
import { EditEmployeeModal } from '@/components/employees/EditEmployeeModal';
import { EmployeeDetailDrawer } from '@/components/employees/EmployeeDetailDrawer';
import { PasswordResetRequestsModal } from '@/components/auth/PasswordResetRequestsModal';
import { ClientWorkforceView } from './ClientWorkforceView';
import { ClientAttendanceView } from './ClientAttendanceView';
import { EmployeeItem } from '@/types';

export const ClientPortalShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'workforce' | 'attendance' | 'history'>('dashboard');
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [blockHistories, setBlockHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Block Modal state
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('Client Workplace Policy Infraction');
  const [blockRemarks, setBlockRemarks] = useState('');

  // Unblock Modal state
  const [unblockTarget, setUnblockTarget] = useState<any | null>(null);
  const [unblockReason, setUnblockReason] = useState('Client clearance and duty reinstatement');
  const [unblockRemarks, setUnblockRemarks] = useState('');

  // Password Reset Requests Modal & Quick Reset state
  const [showResetRequests, setShowResetRequests] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);
  const [quickResetEmp, setQuickResetEmp] = useState<any | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [quickResetLoading, setQuickResetLoading] = useState(false);
  const [quickResetResult, setQuickResetResult] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchResetRequestsCount = async () => {
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const data = await res.json();
        setPendingResetCount(data.pendingCount || 0);
      }
    } catch (e) {
      console.error('Error fetching reset count:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, histRes] = await Promise.all([
        fetch(`/api/employees?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`),
        fetch('/api/employees/block-history'),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        setBlockHistories(histData.histories || []);
      }
    } catch (e) {
      console.error('Error fetching client portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchResetRequestsCount();
  }, []);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${blockTarget.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: blockReason,
          remarks: blockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`🔒 ${blockTarget.fullName} (${blockTarget.employeeId}) has been BLOCKED.`);
        setBlockTarget(null);
        setBlockRemarks('');
        await fetchData();
        setTimeout(() => setAlertMsg(null), 4500);
      } else {
        setAlertMsg(`⚠️ Error: ${data.error || 'Failed to block employee'}`);
      }
    } catch (e) {
      setAlertMsg('⚠️ Network error while blocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unblockTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${unblockTarget.id}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: unblockReason,
          remarks: unblockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`✅ ${unblockTarget.fullName} (${unblockTarget.employeeId}) is now UNBLOCKED & ACTIVE.`);
        setUnblockTarget(null);
        setUnblockRemarks('');
        await fetchData();
        setTimeout(() => setAlertMsg(null), 4500);
      } else {
        setAlertMsg(`⚠️ Error: ${data.error || 'Failed to unblock employee'}`);
      }
    } catch (e) {
      setAlertMsg('⚠️ Network error while unblocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickResetEmp) return;

    setQuickResetLoading(true);
    setQuickResetResult(null);
    try {
      const generatedPwd = quickPassword.trim() || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch(`/api/employees/${quickResetEmp.employeeId || quickResetEmp.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: generatedPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickResetResult(generatedPwd);
        setAlertMsg(`🔑 Password for ${quickResetEmp.fullName} (${quickResetEmp.employeeId}) has been reset.`);
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch (e) {
      alert('Network error resetting password');
    } finally {
      setQuickResetLoading(false);
    }
  };

  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.status === 'ACTIVE' && !e.isBlocked).length;
  const blockedStaff = employees.filter((e) => e.status === 'BLOCKED' || e.isBlocked).length;

  interface NavItem {
    id: 'dashboard' | 'employees' | 'workforce' | 'attendance' | 'history';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isLive?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: `My Employees (${totalStaff})`, icon: Users },
    { id: 'workforce', label: 'Live Workforce', icon: Activity, isLive: true },
    { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
    { id: 'history', label: `Block History (${blockHistories.length})`, icon: History },
  ];

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      {/* LEFT SIDEBAR (Matching Admin Panel) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/50">
          <GrowthIndiaLogo size="sm" />
        </div>

        {/* Client Workspace Badge */}
        <div className="mx-4 mt-4 p-3 bg-slate-950/70 rounded-2xl border border-growth-teal/30">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-growth-teal shrink-0" />
            <span className="text-xs font-black text-white truncate" title={user?.companyName}>
              {user?.companyName || 'Corporate Client'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-growth-gold/15 text-growth-gold border border-growth-gold/30">
              {user?.clientId}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">• Client Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 mb-2">
              CLIENT WORKSPACE
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-growth-gold' : 'text-slate-400'}`} />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.isLive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DOWN-LEFT PROFILE CARD + QUICK SIGN OUT */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70">
          <div className="p-2.5 bg-slate-900 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-growth-teal to-teal-800 flex items-center justify-center font-black text-white text-sm shrink-0 shadow">
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate" title={user?.fullName}>
                  {user?.fullName || 'Client User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate" title={user?.companyName}>
                  {user?.companyName || 'Corporate Client'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[9px] text-growth-gold font-bold">{user?.clientId}</span>
                  <span className="text-[9px] text-slate-500">• Client</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 text-slate-800">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-800">
              {activeTab === 'dashboard' && 'Corporate Dashboard'}
              {activeTab === 'employees' && 'Enrolled Staff Management'}
              {activeTab === 'workforce' && 'Live Workforce Telemetry'}
              {activeTab === 'attendance' && 'Staff Attendance & Shifts'}
              {activeTab === 'history' && 'Security Block & Audit History'}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-growth-teal border border-teal-200">
              {user?.companyName}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowResetRequests(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="View Employee Password Reset Requests"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Password Requests</span>
              {pendingResetCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                  {pendingResetCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Staff</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Alert banner */}
        {alertMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 font-bold shadow-sm animate-in fade-in">
            {alertMsg}
          </div>
        )}

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 text-slate-800 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-growth-navy via-slate-900 to-growth-navyLight rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-growth-gold mb-2 border border-white/10">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Corporate Client Workspace</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('employees')}
                      className="text-2xl font-black text-left text-white hover:text-growth-teal transition-all flex items-center gap-2 group/c cursor-pointer"
                      title="Click to view all employees enrolled under your company"
                    >
                      <span>{user?.companyName}</span>
                      <ArrowUpRight className="w-5 h-5 text-growth-teal opacity-70 group-hover/c:opacity-100 group-hover/c:translate-x-0.5 group-hover/c:-translate-y-0.5 transition-all" />
                    </button>
                    <p className="text-xs text-slate-300 mt-1">
                      Client ID: <span className="font-mono font-bold text-growth-gold">{user?.clientId}</span> • Contact Person: {user?.fullName}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all self-start md:self-auto"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard New Employee</span>
                  </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => setActiveTab('employees')}
                    className="bg-white border border-slate-200 hover:border-growth-teal/50 rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer group transition-all"
                    title="Click to view all employees list"
                  >
                    <div>
                      <div className="text-xs text-slate-500 font-bold group-hover:text-growth-teal transition-colors flex items-center gap-1">
                        <span>Total Onboarded Staff</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-3xl font-black text-slate-900 mt-1">{totalStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-600 font-bold">Active Employees</div>
                      <div className="text-3xl font-black text-emerald-600 mt-1">{activeStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs text-rose-600 font-bold">Blocked Staff</div>
                      <div className="text-3xl font-black text-rose-600 mt-1">{blockedStaff}</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Quick Staff Table */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Company Staff Roster</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Recently assigned active personnel</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('employees')}
                      className="text-xs font-bold text-growth-teal hover:underline"
                    >
                      View All Employees →
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Employee ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Designation</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Mobile</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {employees.slice(0, 5).map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-all">
                            <td className="py-3 px-4 font-mono font-bold text-growth-teal">{emp.employeeId}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{emp.fullName}</td>
                            <td className="py-3 px-4 text-slate-600">{emp.designation}</td>
                            <td className="py-3 px-4 text-slate-500">{emp.departmentName}</td>
                            <td className="py-3 px-4 text-slate-600">{emp.phone}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  emp.status === 'BLOCKED' || emp.isBlocked
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                }`}
                              >
                                {emp.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedEmpId(emp.employeeId)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition"
                                title="View Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {employees.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No employees onboarded under this company yet. Click &quot;Onboard Staff&quot; to begin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, mobile, designation..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="BLOCKED">Blocked</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>

                    <button
                      onClick={() => setShowAddEmployee(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow transition-all shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Onboard Staff</span>
                    </button>
                  </div>
                </div>

                {/* Complete Employee Table */}
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Employee ID</th>
                          <th className="py-3.5 px-4">Full Name</th>
                          <th className="py-3.5 px-4">Mobile</th>
                          <th className="py-3.5 px-4">Department</th>
                          <th className="py-3.5 px-4">Designation</th>
                          <th className="py-3.5 px-4">Joining Date</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {employees.map((emp) => {
                          const isBlocked = emp.status === 'BLOCKED' || emp.isBlocked;
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-all">
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => setSelectedEmpId(emp.employeeId)}
                                  className="font-mono font-bold text-growth-teal hover:underline text-left"
                                >
                                  {emp.employeeId}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{emp.fullName}</td>
                              <td className="py-3.5 px-4 text-slate-600">{emp.phone}</td>
                              <td className="py-3.5 px-4 text-slate-500">{emp.departmentName}</td>
                              <td className="py-3.5 px-4 text-slate-600">{emp.designation}</td>
                              <td className="py-3.5 px-4 text-slate-500">
                                {new Date(emp.joiningDate).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isBlocked
                                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  }`}
                                >
                                  {emp.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedEmpId(emp.employeeId)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                                    title="View Profile & History"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setEditingEmployee(emp)}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-all"
                                    title="Edit Employee Details & Password"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setQuickResetEmp(emp);
                                      setQuickPassword(`Emp#${Math.floor(1000 + Math.random() * 9000)}`);
                                      setQuickResetResult(null);
                                    }}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-all"
                                    title="Quick Reset Password"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>

                                  {isBlocked ? (
                                    <button
                                      onClick={() => setUnblockTarget(emp)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                    >
                                      Unblock
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setBlockTarget(emp)}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm"
                                    >
                                      Block
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {employees.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              No employees found matching criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Employee Block / Unblock Audit Log</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Historical governance and security action records</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Employee ID</th>
                        <th className="py-3.5 px-4">Employee Name</th>
                        <th className="py-3.5 px-4">Action</th>
                        <th className="py-3.5 px-4">Reason</th>
                        <th className="py-3.5 px-4">Remarks</th>
                        <th className="py-3.5 px-4">Action By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {blockHistories.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 text-slate-500">{new Date(h.actionDate).toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-growth-teal">
                            {h.employee?.employeeId || h.employeeId}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{h.employee?.fullName || '—'}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                h.actionType === 'BLOCK'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}
                            >
                              {h.actionType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium">{h.reason}</td>
                          <td className="py-3.5 px-4 text-slate-500">{h.remarks || '—'}</td>
                          <td className="py-3.5 px-4 text-amber-700 font-bold">{h.actionBy}</td>
                        </tr>
                      ))}
                      {blockHistories.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No block/unblock actions recorded for this company.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'workforce' && <ClientWorkforceView />}

            {activeTab === 'attendance' && <ClientAttendanceView />}
          </div>
        </main>
      </div>

      {/* Block Confirmation Modal */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Block Employee Account</h3>
                <p className="text-xs text-slate-500">{blockTarget.fullName} ({blockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to block this employee? Their login will be immediately disabled and active sessions revoked.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Block Reason *</label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Client Workplace Policy Infraction">Client Workplace Policy Infraction</option>
                  <option value="Absence without Prior Notice">Absence without Prior Notice</option>
                  <option value="Performance & Compliance Review">Performance & Compliance Review</option>
                  <option value="Temporary Security Suspension">Temporary Security Suspension</option>
                  <option value="Contract Termination / Hold">Contract Termination / Hold</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Specific details regarding this block action..."
                  value={blockRemarks}
                  onChange={(e) => setBlockRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Blocking...' : 'Confirm Block'}
                </button>
                <button
                  type="button"
                  onClick={() => setBlockTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unblock Confirmation Modal */}
      {unblockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Unblock Employee Account</h3>
                <p className="text-xs text-slate-500">{unblockTarget.fullName} ({unblockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to unblock this employee? Their status will return to ACTIVE and login will be restored.
            </p>

            <form onSubmit={handleUnblockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unblock Reason / Remarks *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance verified and reinstated by client"
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {actionLoading ? 'Unblocking...' : 'Confirm Unblock'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnblockTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Password Reset Modal for Staff */}
      {quickResetEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Reset Employee Password</h3>
                <p className="text-xs text-slate-500">{quickResetEmp.fullName} ({quickResetEmp.employeeId})</p>
              </div>
            </div>

            {quickResetResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                  <p className="text-emerald-800 font-bold">✅ Password successfully updated!</p>
                  <p className="text-slate-600">Share this new credential with the employee:</p>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-amber-700 font-bold text-sm tracking-wider flex items-center justify-between">
                    <span>{quickResetResult}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(quickResetResult)}
                      className="text-[11px] text-growth-teal hover:underline font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickResetEmp(null);
                    setQuickResetResult(null);
                  }}
                  className="w-full py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickPasswordReset} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700">New Password *</label>
                    <button
                      type="button"
                      onClick={() => setQuickPassword(`Emp#${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] text-amber-600 hover:underline font-bold"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={quickPassword}
                    onChange={(e) => setQuickPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-growth-teal"
                    placeholder="Enter new password (min 4 chars)"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Employee will use this password alongside their Employee ID or Email to sign in.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={quickResetLoading || !quickPassword.trim()}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {quickResetLoading ? 'Updating...' : 'Set & Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickResetEmp(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Requests Manager Modal */}
      <PasswordResetRequestsModal
        isOpen={showResetRequests}
        onClose={() => {
          setShowResetRequests(false);
          fetchResetRequestsCount();
        }}
        userRole="CLIENT"
        onPasswordResetSuccess={() => {
          fetchResetRequestsCount();
          fetchData();
        }}
      />

      {/* Add Employee Modal for Client */}
      <AddEmployeeModal
        isOpen={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onEmployeeCreated={() => fetchData()}
        preselectedClientId={user?.clientId}
        defaultClientId={user?.clientId}
      />

      {/* Edit Employee Modal for Client */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={true}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onEmployeeUpdated={() => fetchData()}
        />
      )}

      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        employeeId={selectedEmpId}
        onClose={() => setSelectedEmpId(null)}
        onRefresh={() => fetchData()}
      />
    </div>
  );
};
