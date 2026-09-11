'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  Copy,
  Check,
  Lock,
  User,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

export const ClientRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  
  // Active target for resolving reset request
  const [activeTarget, setActiveTarget] = useState<any | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{
    requesterName: string;
    requesterId: string;
    newPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to load password reset requests.');
      }
    } catch (e) {
      console.error('Error fetching password requests:', e);
      setErrorMessage('Network connection error.');
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
    setActionResult(null);
    setErrorMessage(null);
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTarget) return;

    setActionLoading(true);
    setErrorMessage(null);

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
        setActionResult({
          requesterName: activeTarget.requesterName,
          requesterId: activeTarget.requesterId,
          newPassword: passwordToSet,
        });
        setActiveTarget(null);
        setCustomPassword('');
        await fetchRequests();
      } else {
        setErrorMessage(data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while resetting password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm(`Are you sure you want to dismiss the password request for ${req.requesterName}?`)) return;

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

  const filteredRequests = requests.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      r.requesterName?.toLowerCase().includes(term) ||
      r.requesterId?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.phone?.includes(term) ||
      r.companyName?.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
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
              <h2 className="title-interactive-hover text-lg font-black text-slate-900">
                Employee Password & Security Requests
              </h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {pendingCount} PENDING
                </span>
              )}
            </div>
            <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5 font-medium">
              Review, verify, and resolve self-service password reset requests from your enrolled employees
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="interactive-btn-hover flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : 'text-slate-600'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-premium interactive-box-hover bg-white border border-amber-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">Pending Review</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 mt-2 font-mono">{pendingCount}</div>
          <div className="text-[11px] text-amber-600/80 font-semibold mt-1">Requires your authorization</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-emerald-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">Resolved Requests</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 mt-2 font-mono">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-600/80 font-semibold mt-1">Credentials safely updated</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Total Security Tickets</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">{requests.length}</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">Complete audit history</div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionResult && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-900 block text-base">
                Password Reset Successfully for {actionResult.requesterName} ({actionResult.requesterId})!
              </span>
              <p className="text-xs text-emerald-700 mt-0.5">
                The account is unlocked. Securely share this new password with the employee:
              </p>
              <div className="mt-2.5 inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-emerald-300 shadow-sm">
                <span className="text-sm font-mono font-black text-slate-900 select-all tracking-wider">
                  {actionResult.newPassword}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(actionResult.newPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActionResult(null)}
            className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-black transition self-start sm:self-auto cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="panel-premium flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name, employee ID, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-center sm:justify-start">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              statusFilter === 'RESOLVED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono font-bold">
              <tr>
                <th className="py-3.5 px-4">Request Date & Time</th>
                <th className="py-3.5 px-4">Employee Details</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                    <span>Loading security requests queue...</span>
                  </td>
                </tr>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => {
                  const isPending = req.status === 'PENDING';

                  return (
                    <tr key={req.id} className="interactive-row-hover hover:bg-amber-50/20 transition cursor-pointer">
                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        <div>{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{formatClockTime(req.createdAt)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="title-interactive-hover font-bold text-slate-900 inline-block text-xs">
                          {req.requesterName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="text-growth-teal font-extrabold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {req.requesterId}
                          </span>
                          <span>• {req.requesterRole}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600">
                        <div className="text-slate-800 font-medium">{req.phone || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-[160px]">{req.email}</div>
                      </td>
                      <td className="py-4 px-4 max-w-xs text-slate-600">
                        <div className="italic bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[11px]">
                          &ldquo;{req.reason || 'Forgot password / Account locked'}&rdquo;
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                            isPending
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {req.status}
                        </span>
                        {req.resolvedAt && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Resolved: {new Date(req.resolvedAt).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReject(req)}
                              className="interactive-btn-hover px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                              title="Dismiss Request"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleOpenResetModal(req)}
                              className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
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
                            {req.resolvedBy && (
                              <div className="text-[9px] text-slate-400 font-mono">By: {req.resolvedBy}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <span className="font-bold text-slate-600 block text-xs">No Password Reset Requests</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {statusFilter === 'ALL'
                        ? 'There are currently no active or historical password requests for your company.'
                        : `No ${statusFilter.toLowerCase()} requests found.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Modal */}
      {activeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="panel-premium bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="title-interactive-hover font-black text-sm text-slate-900">
                    Authorize Employee Password Reset
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeTarget.requesterName} ({activeTarget.requesterId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitResetPassword} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-800">{activeTarget.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee ID:</span>
                  <span className="font-mono font-bold text-growth-teal">{activeTarget.requesterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile Phone:</span>
                  <span className="font-mono text-slate-800">{activeTarget.phone || 'N/A'}</span>
                </div>
                {activeTarget.reason && (
                  <div className="pt-1.5 border-t border-slate-200 text-slate-600 italic">
                    Reason: &ldquo;{activeTarget.reason}&rdquo;
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">New Password to Assign *</label>
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
                  required
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter temporary password..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTarget(null)}
                  className="interactive-btn-hover px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !customPassword.trim()}
                  className="interactive-btn-hover flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Credentials...' : 'Confirm & Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
