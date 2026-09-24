'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Smartphone,
  Globe,
  Clock,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  employeeId?: string;
  role: string;
  clientName?: string;
  accountStatus: 'ACTIVE' | 'LOCKED' | 'INVITED' | 'DEACTIVATED';
  mfaEnabled: boolean;
  activeSessionsCount: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export const AccountAccessView: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reset Token Modal
  const [resetModalData, setResetModalData] = useState<{
    fullName: string;
    email: string;
    resetUrl: string;
    expiresAt: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/access/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
      showToast('Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleForceLogout = async (account: UserAccount) => {
    if (!confirm(`Force logout all active sessions for ${account.fullName}?`)) return;
    setActionLoadingId(account.id);
    try {
      const res = await fetch('/api/access/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FORCE_LOGOUT',
          userId: account.id,
        }),
      });

      if (res.ok) {
        showToast(`All active sessions terminated for ${account.fullName}`);
        fetchAccounts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to terminate sessions', 'error');
      }
    } catch (err) {
      showToast('Network error while terminating sessions', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGenerateResetLink = async (account: UserAccount) => {
    setActionLoadingId(account.id);
    try {
      const res = await fetch('/api/access/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_RESET_TOKEN',
          userId: account.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResetModalData({
          fullName: account.fullName,
          email: account.email,
          resetUrl: data.resetUrl,
          expiresAt: data.expiresAt,
        });
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to generate reset link', 'error');
      }
    } catch (err) {
      showToast('Network error while generating reset link', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleAccountStatus = async (account: UserAccount) => {
    const newStatus = account.accountStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const actionName = newStatus === 'LOCKED' ? 'Lock Account' : 'Unlock Account';
    if (!confirm(`${actionName} for ${account.fullName}?`)) return;

    setActionLoadingId(account.id);
    try {
      const res = await fetch('/api/access/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        showToast(`Account status updated to ${newStatus}`);
        fetchAccounts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update account status', 'error');
      }
    } catch (err) {
      showToast('Network error updating account status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.fullName.toLowerCase().includes(search.toLowerCase()) ||
      acc.email.toLowerCase().includes(search.toLowerCase()) ||
      (acc.employeeId && acc.employeeId.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || acc.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
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
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Account & Access Governance
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Zero Plaintext Policy
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Secure credential resets, active session termination, 2FA status, and cryptographic token management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search email, name or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LOCKED">Locked</option>
            <option value="INVITED">Invited</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs animate-pulse">
            Loading user security accounts...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No User Accounts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All active staff and client accounts will be listed with their respective session tokens.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Account User</th>
                  <th className="py-3 px-4">Role & Workspace</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">2FA / Security</th>
                  <th className="py-3 px-4">Active Sessions</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* User */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{acc.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{acc.email}</div>
                    </td>

                    {/* Role & Workspace */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-black text-slate-800 text-[11px] block">{acc.role}</span>
                      <span className="text-[10px] text-growth-teal">{acc.clientName || 'Internal'}</span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          acc.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : acc.accountStatus === 'LOCKED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {acc.accountStatus}
                      </span>
                    </td>

                    {/* 2FA / Security */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {acc.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          2FA Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Shield className="w-3.5 h-3.5" />
                          Standard Password
                        </span>
                      )}
                    </td>

                    {/* Active Sessions */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-800">
                          {acc.activeSessionsCount || 1} active
                        </span>
                        {acc.activeSessionsCount > 0 && (
                          <button
                            onClick={() => handleForceLogout(acc)}
                            disabled={actionLoadingId === acc.id}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Force Logout All Sessions"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                      {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString() : 'Never logged in'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleGenerateResetLink(acc)}
                          disabled={actionLoadingId === acc.id}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          title="Generate single-use password reset link"
                        >
                          Reset Link
                        </button>

                        <button
                          onClick={() => handleToggleAccountStatus(acc)}
                          disabled={actionLoadingId === acc.id}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            acc.accountStatus === 'LOCKED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          title={acc.accountStatus === 'LOCKED' ? 'Unlock Account' : 'Lock Account'}
                        >
                          {acc.accountStatus === 'LOCKED' ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cryptographic Reset Token Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Secure Reset Link Generated</h3>
                  <p className="text-xs text-slate-500 font-medium">{resetModalData.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              In accordance with enterprise zero-plaintext security policies, passwords cannot be viewed directly. Share this single-use reset URL with the employee:
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all flex items-center justify-between gap-2">
              <span className="truncate">{resetModalData.resetUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.resetUrl);
                  showToast('Password reset link copied to clipboard!');
                }}
                className="p-1.5 hover:bg-white rounded-lg text-growth-teal font-bold shrink-0 transition-all cursor-pointer"
                title="Copy Link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Link expires in 24 hours. Single-use cryptographic token.</span>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setResetModalData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
