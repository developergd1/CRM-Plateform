'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  History,
  CheckCircle2,
  Lock,
  Unlock,
  Building2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface EmployeeStatusItem {
  id: string;
  employeeId: string;
  fullName: string;
  clientName?: string;
  department?: string;
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'ON_NOTICE' | 'TERMINATED' | 'SUSPENDED';
  accountStatus: 'ACTIVE' | 'LOCKED' | 'INVITED' | 'DEACTIVATED';
  lastStatusReason?: string;
  lastStatusChangedAt?: string;
  lastStatusChangedBy?: string;
}

export const EmployeeStatusView: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');
  const [accStatusFilter, setAccStatusFilter] = useState('');

  // Status Change Modal
  const [selectedEmp, setSelectedEmp] = useState<EmployeeStatusItem | null>(null);
  const [targetEmploymentStatus, setTargetEmploymentStatus] = useState<string>('ACTIVE');
  const [targetAccountStatus, setTargetAccountStatus] = useState<string>('ACTIVE');
  const [reason, setReason] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.employees || []).map((e: any) => ({
          id: e.id,
          employeeId: e.employeeId,
          fullName: e.fullName,
          clientName: e.client?.companyName || 'Growth India Core',
          department: e.department || 'Operations',
          employmentStatus: e.status || 'ACTIVE',
          accountStatus: e.user?.status || (e.isBlocked ? 'LOCKED' : 'ACTIVE'),
          lastStatusReason: e.blockReason || e.unblockReason || 'Standard status',
          lastStatusChangedAt: e.blockedAt || e.unblockedAt || e.updatedAt,
          lastStatusChangedBy: e.blockedBy || e.unblockedBy || 'System Admin',
        }));
        setEmployees(mapped);
      }
    } catch (err) {
      console.error('Failed to load employee statuses', err);
      showToast('Failed to load employee status records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openStatusModal = (emp: EmployeeStatusItem) => {
    setSelectedEmp(emp);
    setTargetEmploymentStatus(emp.employmentStatus);
    setTargetAccountStatus(emp.accountStatus);
    setReason('');
    setIsModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setActionLoading(true);

    try {
      // If account status changed to/from LOCKED, trigger appropriate endpoint
      const accountChanged = targetAccountStatus !== selectedEmp.accountStatus;
      const employmentChanged = targetEmploymentStatus !== selectedEmp.employmentStatus;

      if (accountChanged) {
        const endpoint = targetAccountStatus === 'LOCKED' ? 'block' : 'unblock';
        await fetch(`/api/employees/${selectedEmp.id}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: reason || 'Administrative access status change',
            remarks: `Employment status: ${targetEmploymentStatus}`,
          }),
        });
      }

      if (employmentChanged) {
        await fetch(`/api/employees/${selectedEmp.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: targetEmploymentStatus,
          }),
        });
      }

      showToast(`Updated status for ${selectedEmp.fullName}`);
      setIsModalOpen(false);
      setSelectedEmp(null);
      fetchEmployees();
    } catch (err) {
      showToast('Network error while updating status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesEmp = !empStatusFilter || emp.employmentStatus === empStatusFilter;
    const matchesAcc = !accStatusFilter || emp.accountStatus === accStatusFilter;
    return matchesSearch && matchesEmp && matchesAcc;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 bg-rose-50 text-rose-800 border-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Employee Status & Access Governance
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                Dual Governance
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Strictly separates organizational Employment Status from digital Account & Login Permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Architecture Alert / Context Box */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-sky-900">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-extrabold">Enterprise Distinction: Employment vs. Account Status</div>
          <p className="text-sky-800 leading-relaxed font-medium">
            Locking an account revokes CRM and mobile app authentication without terminating the employee&apos;s contractual record. Conversely, placing an employee on notice or probation preserves their attendance records and payroll lineage.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={empStatusFilter}
            onChange={(e) => setEmpStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Employment Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_NOTICE">On Notice</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <select
            value={accStatusFilter}
            onChange={(e) => setAccStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Account Access</option>
            <option value="ACTIVE">Authorized / Active</option>
            <option value="LOCKED">Locked / Suspended</option>
          </select>
        </div>
      </div>

      {/* Status Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs animate-pulse">
            Loading employee status records...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs">
            No employees match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Client Company</th>
                  <th className="py-3 px-4">Employment Status</th>
                  <th className="py-3 px-4">Account Access</th>
                  <th className="py-3 px-4">Last Status Justification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{emp.employeeId}</div>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {emp.clientName}
                    </td>

                    {/* Employment Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          emp.employmentStatus === 'ACTIVE'
                            ? 'bg-teal-50 text-growth-teal border-teal-200'
                            : emp.employmentStatus === 'PROBATION'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : emp.employmentStatus === 'ON_NOTICE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>

                    {/* Account Access Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          emp.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {emp.accountStatus === 'ACTIVE' ? (
                          <Unlock className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Lock className="w-3 h-3 text-rose-600" />
                        )}
                        {emp.accountStatus === 'ACTIVE' ? 'Unlocked' : 'Locked'}
                      </span>
                    </td>

                    {/* Justification & Date */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-700 line-clamp-1">
                        {emp.lastStatusReason}
                      </div>
                      {emp.lastStatusChangedAt && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(emp.lastStatusChangedAt).toLocaleDateString()} &bull; by {emp.lastStatusChangedBy}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isAdminOrHR(user?.role) && (
                        <button
                          onClick={() => openStatusModal(emp)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          Modify Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modify Status Modal */}
      {isModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Manage Status & Permissions</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedEmp.fullName} ({selectedEmp.employeeId})
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  1. Organizational Employment Status *
                </label>
                <select
                  value={targetEmploymentStatus}
                  onChange={(e) => setTargetEmploymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                >
                  <option value="ACTIVE">ACTIVE (Standard active workforce)</option>
                  <option value="PROBATION">PROBATION (Evaluation period)</option>
                  <option value="ON_NOTICE">ON_NOTICE (Serving contractual notice)</option>
                  <option value="SUSPENDED">SUSPENDED (Under disciplinary inquiry)</option>
                  <option value="TERMINATED">TERMINATED (Employment ended)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  2. Digital Account & Authentication Access *
                </label>
                <select
                  value={targetAccountStatus}
                  onChange={(e) => setTargetAccountStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                >
                  <option value="ACTIVE">UNLOCKED / ACTIVE (Can login to platform & app)</option>
                  <option value="LOCKED">LOCKED / REVOKED (Immediate login block)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Mandatory Audit Justification / Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the administrative or compliance reason for this status modification..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Commit Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
