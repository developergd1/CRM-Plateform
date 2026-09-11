'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Lock,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

export const PasswordRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  // Active resolution
  const [activeTarget, setActiveTarget] = useState<any | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<{
    requesterName: string;
    requesterId: string;
    newPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
      } else {
        setErrorMsg('Failed to load password reset requests.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAutoGenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(`Emp#${rand}${Math.floor(10 + Math.random() * 90)}`);
  };

  const handleOpenResetModal = (req: any) => {
    setActiveTarget(req);
    handleAutoGenerate();
    setErrorMsg(null);
  };

  const handleResolveSubmit = async () => {
    if (!activeTarget) return;
    setActionLoading(true);
    setErrorMsg(null);

    const passwordToSet = customPassword.trim() || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetch('/api/auth/password-reset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: activeTarget.id,
          newPassword: passwordToSet,
          action: 'RESOLVE',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResolvedResult({
          requesterName: activeTarget.requesterName,
          requesterId: activeTarget.requesterId || activeTarget.userId,
          newPassword: passwordToSet,
        });
        setActiveTarget(null);
        setCustomPassword('');
        await fetchRequests();
      } else {
        setErrorMsg(data.error || 'Failed to reset password.');
      }
    } catch (e) {
      setErrorMsg('Error submitting password reset.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm(`Are you sure you want to dismiss the reset request for ${req.requesterName}?`)) return;

    try {
      const res = await fetch('/api/auth/password-reset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: req.id,
          action: 'REJECT',
        }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (e) {
      console.error('Reject failed:', e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = requests.filter((r) => {
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && r.status === 'PENDING') ||
      (filterStatus === 'RESOLVED' && r.status === 'RESOLVED');
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      r.requesterName?.toLowerCase().includes(term) ||
      r.requesterEmail?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.requesterId?.toLowerCase().includes(term) ||
      r.phone?.includes(term) ||
      r.companyName?.toLowerCase().includes(term) ||
      r.organizationName?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const resolvedCount = requests.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm panel-premium">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 title-interactive-hover">Password Reset Requests</h1>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingCount} PENDING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 subtitle-interactive-hover">
              Executive console to review, auto-generate, and resolve password resets for clients and employees
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 interactive-btn-hover cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm card-premium interactive-box-hover cursor-pointer">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 title-interactive-hover">Total Requests</span>
          <p className="text-3xl font-black text-slate-800 mt-1 font-mono">{requests.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Audit trail logged</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-sm card-premium interactive-box-hover cursor-pointer">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 title-interactive-hover">Pending Requests</span>
          <p className="text-3xl font-black text-amber-700 mt-1 font-mono">{pendingCount}</p>
          <p className="text-[11px] text-amber-600/80 font-medium mt-1">Requires administrator action</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-sm card-premium interactive-box-hover cursor-pointer">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 title-interactive-hover">Resolved Requests</span>
          <p className="text-3xl font-black text-emerald-700 mt-1 font-mono">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-600/80 font-medium mt-1">Credentials securely updated</p>
        </div>
      </div>

      {/* Resolved Success Alert */}
      {resolvedResult && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md panel-premium animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900 title-interactive-hover">
                Password Reset Successfully for {resolvedResult.requesterName} ({resolvedResult.requesterId})!
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                The account has been unlocked. Provide these new login credentials to the user:
              </p>
              <div className="mt-2.5 inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-emerald-300 shadow-sm">
                <span className="text-sm font-mono font-black text-slate-900 select-all tracking-wider">
                  {resolvedResult.newPassword}
                </span>
                <button
                  onClick={() => handleCopy(resolvedResult.newPassword)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setResolvedResult(null)}
            className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-black transition self-start sm:self-auto cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between panel-premium">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search requester, ID, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto justify-center md:justify-start">
          {(['ALL', 'PENDING', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all interactive-btn-hover cursor-pointer ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? `All (${requests.length})` : st === 'PENDING' ? `Pending (${pendingCount})` : `Resolved (${resolvedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden panel-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-mono font-bold">
                <th className="py-3.5 px-4">Requester Details</th>
                <th className="py-3.5 px-4">Role & Company</th>
                <th className="py-3.5 px-4">Requested At</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading password reset requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <span className="font-bold text-slate-600 block text-xs">No Password Reset Requests Found</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">All accounts are secure and synchronized.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isPending = r.status === 'PENDING';
                  return (
                    <tr key={r.id} className="interactive-row-hover hover:bg-amber-50/20 cursor-pointer transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 title-interactive-hover text-xs">{r.requesterName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="text-growth-teal font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {r.requesterId}
                          </span>
                          {r.email && <span className="ml-1.5 text-slate-400">• {r.email}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {r.requesterRole || r.role || 'USER'}
                        </span>
                        {(r.companyName || r.organizationName) && (
                          <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                            {r.companyName || r.organizationName}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[10px] text-slate-400">{formatClockTime(r.createdAt)}</div>
                      </td>
                      <td className="py-4 px-4 max-w-xs text-slate-600">
                        <div className="italic bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px]">
                          &ldquo;{r.reason || 'Forgot password / Account locked'}&rdquo;
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                            isPending
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.resolvedAt && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(r.resolvedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReject(r)}
                              className="interactive-btn-hover px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                              title="Dismiss Request"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleOpenResetModal(r)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all interactive-btn-hover shadow-sm cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Reset Password</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 font-medium space-y-0.5">
                            <span className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                            {r.resolvedBy && (
                              <div className="text-[9px] text-slate-400 font-mono">By: {r.resolvedBy}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Target Modal */}
      {activeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 panel-premium">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 title-interactive-hover">Reset User Password</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{activeTarget.requesterName} ({activeTarget.requesterId})</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold interactive-btn-hover cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requester:</span>
                  <span className="font-bold text-slate-900">{activeTarget.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account ID:</span>
                  <span className="font-mono font-bold text-growth-teal">{activeTarget.requesterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role & Entity:</span>
                  <span className="font-medium text-slate-700">{activeTarget.requesterRole} • {activeTarget.companyName || 'Growth India'}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 text-xs">
                    New Password to Assign *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerate}
                    className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Pass#2026"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold bg-slate-50 focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveTarget(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl interactive-btn-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveSubmit}
                disabled={actionLoading || !customPassword.trim()}
                className="flex-1 py-2.5 text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-md transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 interactive-btn-hover cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Updating...' : 'Confirm & Reset Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
