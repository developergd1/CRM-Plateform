'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  Calendar,
  Eye,
  Edit,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Download,
  X,
  KeyRound,
  Trash2,
  Clock,
} from 'lucide-react';
import { formatTo12Hour } from '@/components/common/TimePicker12';
import { EmployeeDetailDrawer } from './EmployeeDetailDrawer';
import { AddEmployeeModal } from './AddEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { EmployeeCredentialsModal } from './EmployeeCredentialsModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { isAdminOrHR } from '@/lib/rbac';
import { EmployeeItem, ClientItem } from '@/types';
import { clientCache } from '@/lib/client-cache';

export const EmployeesView: React.FC = () => {
  const { user } = useAuth();
  const cachedEmployees = clientCache.get<EmployeeItem[]>('admin_employees_list', 10 * 60 * 1000);
  const cachedClients = clientCache.get<ClientItem[]>('crm_clients_list', 10 * 60 * 1000);
  const [employees, setEmployees] = useState<EmployeeItem[]>(() => cachedEmployees || []);
  const [clients, setClients] = useState<ClientItem[]>(() => cachedClients || []);
  const [loading, setLoading] = useState(() => !cachedEmployees);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any | null>(null);
  const [viewingCredentialsEmp, setViewingCredentialsEmp] = useState<any | null>(null);
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<EmployeeItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Block Modal state
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [blockReason, setBlockReason] = useState('Disciplinary Policy Breach');
  const [customBlockReason, setCustomBlockReason] = useState('');
  const [blockRemarks, setBlockRemarks] = useState('');

  // Unblock Modal state
  const [unblockTarget, setUnblockTarget] = useState<any | null>(null);
  const [unblockReason, setUnblockReason] = useState('Admin approval & compliance verified');
  const [unblockRemarks, setUnblockRemarks] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const fetchEmployees = async (forceRefresh = false) => {
    const isDefaultQuery = !search && !statusFilter && !clientFilter;
    if (!forceRefresh && isDefaultQuery) {
      const cached = clientCache.get<EmployeeItem[]>('admin_employees_list', 10 * 60 * 1000);
      if (cached && cached.length > 0) {
        setEmployees(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);
      if (clientFilter) query.set('clientId', clientFilter);

      const res = await fetch(`/api/employees?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const nonAdmin = (data.employees || []).filter(
          (emp: any) =>
            emp.employeeId !== 'GI-EMP-000001' &&
            emp.user?.role?.name !== 'ADMIN' &&
            emp.user?.role?.name !== 'SUPER_ADMIN'
        );
        setEmployees(nonAdmin);
        if (isDefaultQuery) {
          clientCache.set('admin_employees_list', nonAdmin);
        }
      }
    } catch (e) {
      console.error('Error loading employees:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const cached = clientCache.get<ClientItem[]>('crm_clients_list', 10 * 60 * 1000);
    if (cached && cached.length > 0) {
      setClients(cached);
      return;
    }
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        const list = data.clients || [];
        setClients(list);
        clientCache.set('crm_clients_list', list);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, clientFilter]);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTarget) return;

    setActionLoading(true);
    const finalReason = blockReason === 'Other Administrative Reason'
      ? (customBlockReason.trim() || 'Other Administrative Reason')
      : blockReason;

    try {
      const res = await fetch(`/api/employees/${blockTarget.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: finalReason,
          remarks: blockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`⛔ ${blockTarget.fullName} (${blockTarget.employeeId}) has been BLOCKED.`);
        setBlockTarget(null);
        setCustomBlockReason('');
        setBlockRemarks('');
        clientCache.remove('admin_employees_list');
        await fetchEmployees(true);
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
        clientCache.remove('admin_employees_list');
        await fetchEmployees(true);
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

  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeTarget) return;
    setActionLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/employees/${deleteEmployeeTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`🗑️ ${deleteEmployeeTarget.fullName} (${deleteEmployeeTarget.employeeId}) has been permanently deleted.`);
        setDeleteEmployeeTarget(null);
        setDeleteError(null);
        clientCache.remove('admin_employees_list');
        await fetchEmployees(true);
        setTimeout(() => setAlertMsg(null), 4500);
      } else {
        setDeleteError(data.error || 'Failed to delete employee record.');
      }
    } catch (e) {
      setDeleteError('Network connection error while deleting employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportEmployeesCSV = () => {
    const headers = [
      'Employee ID',
      'Full Name',
      'Client Company',
      'Mobile',
      'Email',
      'Department',
      'Designation',
      'Joining Date',
      'Status',
      'Blocked By',
      'Blocked Date',
      'Unblocked By',
      'Unblocked Date',
      'Created Date',
    ];
    const rows = employees.map((emp) => [
      emp.employeeId,
      `"${emp.fullName}"`,
      `"${emp.client?.companyName || 'Internal'}"`,
      `"${emp.phone}"`,
      `"${emp.personalEmail || emp.user?.email || ''}"`,
      `"${emp.departmentName || ''}"`,
      `"${emp.designation}"`,
      new Date(emp.joiningDate).toLocaleDateString(),
      emp.status,
      `"${emp.blockedBy || ''}"`,
      emp.blockedAt ? new Date(emp.blockedAt).toLocaleDateString() : '',
      `"${emp.unblockedBy || ''}"`,
      emp.unblockedAt ? new Date(emp.unblockedAt).toLocaleDateString() : '',
      new Date(emp.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GrowthIndia_Employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Notification */}
      {alertMsg && (
        <div className="p-4 bg-slate-900 border border-growth-teal/40 rounded-2xl text-xs text-teal-300 font-bold shadow-lg animate-in fade-in">
          {alertMsg}
        </div>
      )}

      {/* Header Bar */}
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="title-interactive-hover text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 cursor-pointer">
            <Users className="w-5 h-5 text-growth-teal" />
            <span>Employee Master Registry</span>
          </h1>
          <p className="subtitle-interactive-hover text-xs text-slate-500">
            Sequential <strong className="text-growth-goldDark font-mono">GI-EMP-XXXXXX</strong> numbering, credentials, and block/unblock lifecycle governance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchEmployees(true)}
            className="interactive-btn-hover flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
            title="Refresh Employees List"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => exportEmployeesCSV()}
            className="interactive-btn-hover flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="interactive-btn-hover flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="panel-premium bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, Name, Client, Mobile, Designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-growth-teal"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} ({c.clientId})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <button
            onClick={() => fetchEmployees(true)}
            className="interactive-btn-hover p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Employee Table */}
      <div className="panel-premium bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Client / Company</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Department & Designation</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4">Employee Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-growth-teal border-t-transparent rounded-full animate-spin" />
                      <span>Loading employee records...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isEmpBlocked = emp.status === 'BLOCKED' || emp.isBlocked;
                  return (
                    <tr
                      key={emp.id}
                      className={`interactive-row-hover hover:bg-teal-50/20 transition-colors ${
                        isEmpBlocked ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-black text-growth-teal tracking-tight whitespace-nowrap">
                        <button
                          onClick={() => setSelectedEmpId(emp.employeeId)}
                          className="hover:underline flex items-center gap-1 text-growth-teal cursor-pointer"
                        >
                          <span>{emp.employeeId}</span>
                        </button>
                      </td>

                      {/* Employee Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <button
                          onClick={() => setSelectedEmpId(emp.employeeId)}
                          className="title-interactive-hover hover:text-growth-teal text-left cursor-pointer"
                        >
                          <div>{emp.fullName}</div>
                          {emp.gender && (
                            <span className="subtitle-interactive-hover text-[10px] text-slate-400 font-normal">
                              {emp.gender} • {emp.employmentType}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Client / Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.client?.companyName || 'Growth India Internal'}</span>
                        </div>
                        {emp.client?.clientId && (
                          <span className="font-mono text-[10px] text-slate-400">
                            {emp.client.clientId}
                          </span>
                        )}
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 text-slate-700 font-mono">
                        {emp.phone}
                      </td>

                      {/* Department & Designation */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{emp.designation}</div>
                        <div className="text-[10px] text-slate-400">
                          {emp.departmentName || emp.department?.name || 'General'}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          <Clock className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>
                            {emp.shiftStartTime === 'FLEXIBLE'
                              ? 'Flexible Shift'
                              : `${formatTo12Hour(emp.shiftStartTime || '10:00')} – ${formatTo12Hour(emp.shiftEndTime || '19:00')}`}
                          </span>
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(emp.joiningDate).toLocaleDateString()}
                      </td>

                      {/* Status / Block Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isEmpBlocked
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                              : emp.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isEmpBlocked ? (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>BLOCKED</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{emp.status}</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View & Manage Credentials */}
                          <button
                            onClick={() => {
                              setViewingCredentialsEmp({
                                id: emp.id,
                                employeeId: emp.employeeId,
                                fullName: emp.fullName,
                                companyName: emp.client?.companyName || 'Internal Staff',
                                email: emp.personalEmail || emp.user?.email || `${emp.employeeId.toLowerCase()}@growthindia.in`,
                                phone: emp.phone,
                              });
                            }}
                            className="interactive-btn-hover p-1.5 hover:bg-amber-50 text-slate-600 hover:text-growth-goldDark rounded-lg transition-colors cursor-pointer"
                            title="View / Assign Employee Login Credentials"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* View Profile */}
                          <button
                            onClick={() => setSelectedEmpId(emp.employeeId)}
                            className="interactive-btn-hover p-1.5 hover:bg-slate-100 text-slate-600 hover:text-growth-teal rounded-lg transition-colors cursor-pointer"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          {isAdminOrHR(user?.role) && (
                            <button
                              onClick={() => setEditingEmployee(emp)}
                              className="interactive-btn-hover p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Employee"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reset Password */}
                          {isAdminOrHR(user?.role) && (
                            <button
                              onClick={() => setResetPasswordTarget(emp)}
                              className="interactive-btn-hover p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                              title="Assign / Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {isAdminOrHR(user?.role) && (
                            (emp.employeeId === 'GI-EMP-000001' || emp.user?.role?.name === 'SUPER_ADMIN' || emp.employeeId === user?.employeeId) ? (
                              <span
                                className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold select-none cursor-default"
                                title="Super Admin and your own account cannot be deleted"
                              >
                                Protected
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteEmployeeTarget(emp);
                                }}
                                className="interactive-btn-hover p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Delete Employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Block / Unblock */}
                          {isAdminOrHR(user?.role) && (
                            <>
                              {isEmpBlocked ? (
                                <button
                                  onClick={() => setUnblockTarget(emp)}
                                  className="interactive-btn-hover px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="Unblock this employee"
                                >
                                  Unblock
                                </button>
                              ) : (emp.employeeId === 'GI-EMP-000001' || emp.user?.role?.name === 'SUPER_ADMIN' || emp.employeeId === user?.employeeId) ? (
                                <span
                                  className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold select-none cursor-default"
                                  title="Super Admin and current user sessions cannot be blocked"
                                >
                                  Protected
                                </span>
                              ) : (
                                <button
                                  onClick={() => setBlockTarget(emp)}
                                  className="interactive-btn-hover px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                  title="Block this employee"
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Credentials Modal */}
      {viewingCredentialsEmp && (
        <EmployeeCredentialsModal
          isOpen={true}
          onClose={() => setViewingCredentialsEmp(null)}
          credentials={viewingCredentialsEmp}
          onPasswordUpdated={fetchEmployees}
        />
      )}

      {/* Delete Employee Confirmation Modal */}
      {deleteEmployeeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200 animate-in fade-in my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Employee Record</h3>
                <p className="text-xs text-slate-500">{deleteEmployeeTarget.fullName} ({deleteEmployeeTarget.employeeId})</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {deleteError}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this employee? Their profile, operational records, and associated user credentials will be permanently removed.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteEmployee}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteEmployeeTarget(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Quick Block Confirmation Modal */}
      {blockTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleBlockSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 text-rose-600 font-black text-base">
              <ShieldAlert className="w-5 h-5" />
              <span>Block Employee</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 font-medium leading-relaxed">
              <strong>Are you sure you want to block this employee?</strong>
              <p className="mt-1 text-[11px] text-rose-700">
                Blocking <span className="font-bold">{blockTarget.fullName} ({blockTarget.employeeId})</span> will immediately revoke login access and restrict platform actions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Block Reason *</label>
              <select
                value={blockReason}
                onChange={(e) => {
                  setBlockReason(e.target.value);
                  if (e.target.value !== 'Other Administrative Reason') {
                    setCustomBlockReason('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
              >
                <option value="Disciplinary Policy Breach">Disciplinary Policy Breach</option>
                <option value="Unauthorized Absence / Absconding">Unauthorized Absence / Absconding</option>
                <option value="Data Security Risk">Data Security Risk</option>
                <option value="Employment Termination / Exit">Employment Termination / Exit</option>
                <option value="Other Administrative Reason">Other Administrative Reason</option>
              </select>
            </div>

            {blockReason === 'Other Administrative Reason' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Specify Administrative Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compliance Audit, Prolonged Medical Leave..."
                  value={customBlockReason}
                  onChange={(e) => setCustomBlockReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Additional Remarks</label>
              <textarea
                rows={3}
                placeholder="Add specific notes or incident remarks..."
                value={blockRemarks}
                onChange={(e) => setBlockRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {actionLoading ? 'Blocking...' : 'Confirm & Block Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Row Quick Unblock Confirmation Modal */}
      {unblockTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleUnblockSubmit}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 text-emerald-600 font-black text-base">
              <ShieldCheck className="w-5 h-5" />
              <span>Unblock Employee</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium leading-relaxed">
              <strong>Are you sure you want to unblock this employee?</strong>
              <p className="mt-1 text-[11px] text-emerald-700">
                Unblocking <span className="font-bold">{unblockTarget.fullName} ({unblockTarget.employeeId})</span> will restore status to <span className="font-bold text-emerald-800">ACTIVE</span> and re-enable platform access.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unblock Reason / Remarks *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Investigation cleared, reinstated by HR, policy compliance verified..."
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnblockTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {actionLoading ? 'Unblocking...' : 'Confirm & Unblock Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onEmployeeCreated={() => {
          clientCache.remove('admin_employees_list');
          clientCache.remove('crm_clients_list');
          fetchEmployees(true);
        }}
      />

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={true}
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onEmployeeUpdated={() => {
            clientCache.remove('admin_employees_list');
            fetchEmployees(true);
          }}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <ResetPasswordModal
          isOpen={true}
          employee={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
          onSuccess={() => {
            clientCache.remove('admin_employees_list');
            fetchEmployees(true);
          }}
        />
      )}

      {/* Detail Drawer */}
      <EmployeeDetailDrawer
        employeeId={selectedEmpId}
        onClose={() => setSelectedEmpId(null)}
        onRefresh={() => {
          clientCache.remove('admin_employees_list');
          fetchEmployees(true);
        }}
      />
    </div>
  );
};
