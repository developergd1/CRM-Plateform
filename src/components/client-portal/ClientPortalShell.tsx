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
} from 'lucide-react';
import { AddEmployeeModal } from '@/components/employees/AddEmployeeModal';
import { EmployeeDetailDrawer } from '@/components/employees/EmployeeDetailDrawer';
import { EmployeeItem } from '@/types';

export const ClientPortalShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'history'>('dashboard');
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [blockHistories, setBlockHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
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

  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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
    fetchData();
  }, [search, statusFilter]);

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

  const totalStaff = employees.length;
  const activeStaff = employees.filter((e) => e.status === 'ACTIVE' && !e.isBlocked).length;
  const blockedStaff = employees.filter((e) => e.status === 'BLOCKED' || e.isBlocked).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Client Portal Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <GrowthIndiaLogo size="sm" />
          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">{user?.companyName || 'Corporate Client Portal'}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-growth-gold/15 text-growth-gold border border-growth-gold/30">
              {user?.clientId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddEmployee(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Employee</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Subheader */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-growth-teal text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'employees'
                ? 'bg-growth-teal text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            My Employees ({totalStaff})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-growth-teal text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Block History ({blockHistories.length})
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2 hidden md:flex">
          <span>Logged in as:</span>
          <strong className="text-slate-200">{user?.fullName}</strong>
          {user?.canBlockEmployees && (
            <span className="px-2 py-0.5 bg-amber-500/10 text-growth-gold border border-amber-500/30 rounded text-[9px] font-bold">
              Staff Governance Enabled
            </span>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {alertMsg && (
        <div className="mx-6 mt-4 p-3.5 bg-slate-900 border border-growth-teal/40 rounded-2xl text-xs text-teal-300 font-bold shadow-lg animate-in fade-in">
          {alertMsg}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-growth-navy via-slate-900 to-growth-navyLight rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-growth-gold mb-2 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Client Company Workspace</span>
                </div>
                <h1 className="text-2xl font-black">{user?.companyName}</h1>
                <p className="text-xs text-slate-300 mt-1">
                  Client ID: <span className="font-mono font-bold text-growth-gold">{user?.clientId}</span> • Contact Person: {user?.fullName}
                </p>
              </div>

              <button
                onClick={() => setShowAddEmployee(true)}
                className="flex items-center gap-2 px-5 py-3 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Onboard New Employee</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Total Onboarded Staff</div>
                  <div className="text-2xl font-black text-white mt-1">{totalStaff}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-growth-teal/20 text-growth-teal flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-400 font-semibold">Active Employees</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{activeStaff}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-400 font-semibold">Blocked Staff</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">{blockedStaff}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Staff Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">Company Staff Roster</h3>
                <button
                  onClick={() => setActiveTab('employees')}
                  className="text-xs font-bold text-growth-teal hover:underline"
                >
                  View All Employees →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {employees.slice(0, 5).map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-4 font-mono font-bold text-growth-teal">{emp.employeeId}</td>
                        <td className="py-3 px-4 font-bold text-white">{emp.fullName}</td>
                        <td className="py-3 px-4 text-slate-300">{emp.designation}</td>
                        <td className="py-3 px-4 text-slate-400">{emp.departmentName}</td>
                        <td className="py-3 px-4 text-slate-300">{emp.phone}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              emp.status === 'BLOCKED' || emp.isBlocked
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedEmpId(emp.employeeId)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No employees onboarded under this company yet. Click &quot;Onboard Employee&quot; to begin.
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, name, mobile, designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
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
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
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
                  <tbody className="divide-y divide-slate-800/60">
                    {employees.map((emp) => {
                      const isBlocked = emp.status === 'BLOCKED' || emp.isBlocked;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-800/40 transition-all">
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedEmpId(emp.employeeId)}
                              className="font-mono font-bold text-growth-teal hover:underline text-left"
                            >
                              {emp.employeeId}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">{emp.fullName}</td>
                          <td className="py-3.5 px-4 text-slate-300">{emp.phone}</td>
                          <td className="py-3.5 px-4 text-slate-400">{emp.departmentName}</td>
                          <td className="py-3.5 px-4 text-slate-300">{emp.designation}</td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(emp.joiningDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isBlocked
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedEmpId(emp.employeeId)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                                title="View Profile & History"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {user?.canBlockEmployees && (
                                <>
                                  {isBlocked ? (
                                    <button
                                      onClick={() => setUnblockTarget(emp)}
                                      className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[10px] font-bold rounded-lg transition-all"
                                    >
                                      Unblock
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setBlockTarget(emp)}
                                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold rounded-lg transition-all"
                                    >
                                      Block
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white">Employee Block / Unblock Audit Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60">
                  {blockHistories.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 text-slate-400">{new Date(h.actionDate).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-growth-teal">
                        {h.employee?.employeeId || h.employeeId}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{h.employee?.fullName || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            h.actionType === 'BLOCK'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          }`}
                        >
                          {h.actionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-medium">{h.reason}</td>
                      <td className="py-3.5 px-4 text-slate-400">{h.remarks || '—'}</td>
                      <td className="py-3.5 px-4 text-growth-gold font-bold">{h.actionBy}</td>
                    </tr>
                  ))}
                  {blockHistories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No block/unblock actions recorded for this company.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Onboard Employee Modal */}
      {showAddEmployee && (
        <AddEmployeeModal
          isOpen={showAddEmployee}
          onClose={() => setShowAddEmployee(false)}
          onEmployeeCreated={() => {
            setShowAddEmployee(false);
            fetchData();
          }}
          defaultClientId={user?.id}
        />
      )}

      {/* Employee Detail Drawer */}
      {selectedEmpId && (
        <EmployeeDetailDrawer
          employeeId={selectedEmpId}
          onClose={() => setSelectedEmpId(null)}
          onRefresh={fetchData}
        />
      )}

      {/* Block Confirmation Modal */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Block Employee Account</h3>
                <p className="text-xs text-slate-400">{blockTarget.fullName} ({blockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to block this employee? Their login will be immediately disabled and active sessions revoked.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Block Reason *</label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Client Workplace Policy Infraction">Client Workplace Policy Infraction</option>
                  <option value="Absence without Prior Notice">Absence without Prior Notice</option>
                  <option value="Performance & Compliance Review">Performance & Compliance Review</option>
                  <option value="Temporary Security Suspension">Temporary Security Suspension</option>
                  <option value="Contract Termination / Hold">Contract Termination / Hold</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Additional Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Specific details regarding this block action..."
                  value={blockRemarks}
                  onChange={(e) => setBlockRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  {actionLoading ? 'Blocking...' : 'Confirm Block'}
                </button>
                <button
                  type="button"
                  onClick={() => setBlockTarget(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
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
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Unblock Employee Account</h3>
                <p className="text-xs text-slate-400">{unblockTarget.fullName} ({unblockTarget.employeeId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to unblock this employee? Their status will return to ACTIVE and login will be restored.
            </p>

            <form onSubmit={handleUnblockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Unblock Reason / Remarks *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance verified and reinstated by client"
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  {actionLoading ? 'Unblocking...' : 'Confirm Unblock'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnblockTarget(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
