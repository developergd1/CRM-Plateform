'use client';

import React, { useState, useEffect } from 'react';
import { X, KeyRound, Sparkles, Check, Copy, RefreshCw, AlertCircle, CheckCircle2, User, Building2, Clock, ShieldCheck } from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

interface PasswordResetRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewerRole?: 'ADMIN' | 'CLIENT';
  userRole?: string;
  onPasswordResetSuccess?: () => void;
}

export const PasswordResetRequestsModal: React.FC<PasswordResetRequestsModalProps> = ({
  isOpen,
  onClose,
  viewerRole,
  userRole,
  onPasswordResetSuccess,
}) => {
  const effectiveRole = viewerRole || (userRole === 'CLIENT' ? 'CLIENT' : 'ADMIN');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active reset item
  const [activeResetTarget, setActiveResetTarget] = useState<any | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<{
    requesterName: string;
    requesterId: string;
    newPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      } else {
        setErrorMsg(data.error || 'Failed to load password reset requests.');
      }
    } catch (e) {
      setErrorMsg('Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
      setActiveResetTarget(null);
      setResolvedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAutoGenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(`Emp#${rand}${Math.floor(10 + Math.random() * 90)}`);
  };

  const handleResolve = async (reqItem: any) => {
    setActionLoading(true);
    setErrorMsg(null);

    const passwordToSet = customPassword.trim() || `Emp#${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetch('/api/auth/password-reset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: reqItem.id,
          newPassword: passwordToSet,
          action: 'RESOLVE',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResolvedResult({
          requesterName: reqItem.requesterName,
          requesterId: reqItem.requesterId,
          newPassword: passwordToSet,
        });
        setActiveResetTarget(null);
        setCustomPassword('');
        await fetchRequests();
      } else {
        setErrorMsg(data.error || 'Failed to reset password.');
      }
    } catch (e) {
      setErrorMsg('Network error while resetting password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reqItem: any) => {
    if (!confirm(`Are you sure you want to dismiss the reset request for ${reqItem.requesterName}?`)) return;

    try {
      const res = await fetch('/api/auth/password-reset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: reqItem.id,
          action: 'REJECT',
        }),
      });
      if (res.ok) {
        await fetchRequests();
      }
    } catch (e) {}
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pastRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Password Reset Requests</h2>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    {pendingRequests.length} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {viewerRole === 'CLIENT'
                  ? 'Manage and reset access passwords for your enrolled employees'
                  : 'Manage and reset credentials for corporate clients and employees'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Modal Notification if resolved */}
        {resolvedResult && (
          <div className="p-4 m-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black text-emerald-900 block">
                  Password Reset Successfully for {resolvedResult.requesterName} ({resolvedResult.requesterId})!
                </span>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  The account has been unlocked. Provide these new login credentials to the user:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-lg border border-emerald-300 text-slate-900 select-all">
                    {resolvedResult.newPassword}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resolvedResult.newPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Password'}</span>
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setResolvedResult(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Pending Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-growth-teal" />
                <span>Pending Reset Requests ({pendingRequests.length})</span>
              </span>
              <button
                onClick={fetchRequests}
                className="text-[11px] font-bold text-growth-teal hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading && pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-slate-500 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <span className="font-bold text-slate-700 block">No Pending Reset Requests</span>
                <p className="text-[11px] text-slate-400 mt-0.5">All accounts are secure and active.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const isResetting = activeResetTarget?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-slate-50 border border-slate-200/80 hover:border-growth-teal/40 rounded-2xl space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{req.requesterName}</span>
                            <span className="font-mono text-[10px] font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {req.requesterId}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {req.requesterRole}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Phone: <strong className="text-slate-700">{req.phone}</strong> • Email:{' '}
                            <strong className="text-slate-700">{req.email}</strong>
                          </p>
                          {req.reason && (
                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 mt-2 italic">
                              &ldquo;{req.reason}&rdquo;
                            </p>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatClockTime(req.createdAt)}
                        </span>
                      </div>

                      {/* Reset Box or Action Buttons */}
                      {isResetting ? (
                        <div className="p-3 bg-white border border-teal-200 rounded-xl space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">Set New Password</span>
                            <button
                              type="button"
                              onClick={handleAutoGenerate}
                              className="text-[10px] font-bold text-growth-teal hover:underline flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-growth-gold" />
                              <span>Auto-Generate</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Enter new password or click Auto-Generate..."
                              value={customPassword}
                              onChange={(e) => setCustomPassword(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-growth-teal"
                            />
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleResolve(req)}
                              className="px-3.5 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-lg shadow-sm disabled:opacity-50"
                            >
                              {actionLoading ? 'Saving...' : 'Confirm Reset'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveResetTarget(null);
                                setCustomPassword('');
                              }}
                              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleReject(req)}
                            className="px-3 py-1.5 text-slate-500 hover:text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-50 transition-all"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveResetTarget(req);
                              handleAutoGenerate();
                            }}
                            className="px-3.5 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow flex items-center gap-1.5 transition-all"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Password</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past History */}
          {pastRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block border-b pb-1.5">
                Past Resolved Requests ({pastRequests.length})
              </span>
              <div className="space-y-2">
                {pastRequests.slice(0, 10).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{r.requesterName}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">({r.requesterId})</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Resolved by: {r.resolvedBy || 'Admin'} • {new Date(r.resolvedAt || r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
