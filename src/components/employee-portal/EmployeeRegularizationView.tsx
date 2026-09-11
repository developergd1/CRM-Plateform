'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Send,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

export const EmployeeRegularizationView: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Apply form state
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [proposedCheckIn, setProposedCheckIn] = useState('09:30');
  const [proposedCheckOut, setProposedCheckOut] = useState('18:30');
  const [reason, setReason] = useState('Biometric Reader Failure');
  const [supportingReason, setSupportingReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/regularization');
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
      }
    } catch (e) {
      console.error('Error fetching employee regularizations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          proposedCheckIn,
          proposedCheckOut,
          reason,
          supportingReason: supportingReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Regularization request submitted successfully!' });
        setShowApplyModal(false);
        setSupportingReason('');
        await fetchRequests();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit regularization request.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Network error submitting request.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="title-interactive-hover text-xl font-black text-slate-900">Attendance Regularization</h1>
            <p className="subtitle-interactive-hover text-xs text-slate-500 font-medium mt-0.5">
              Submit attendance punch corrections and track manager approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="interactive-btn-hover p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowApplyModal(true)}
            className="interactive-btn-hover flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Request Correction</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Requests History List */}
      <div className="panel-premium bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="title-interactive-hover text-sm font-black text-slate-900">My Regularization Submissions</h2>
          <span className="text-xs font-bold text-slate-500">{requests.length} Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Punch Date</th>
                <th className="py-3.5 px-4">Proposed Times</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reviewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-growth-teal" />
                    Loading regularization records...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No regularization requests submitted. Click &quot;Request Correction&quot; above to submit one.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="interactive-row-hover hover:bg-teal-50/20 transition cursor-pointer">
                    <td className="py-3.5 px-4">
                      <span className="title-interactive-hover font-bold text-slate-900 inline-block">
                        {new Date(req.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {formatClockTime(req.proposedCheckIn)} - {formatClockTime(req.proposedCheckOut)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800">{req.reason}</div>
                      {req.supportingReason && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">{req.supportingReason}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {req.reviewerName ? (
                        <div>
                          <div className="font-semibold text-slate-800">{req.reviewerName}</div>
                          {req.reviewRemarks && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">&quot;{req.reviewRemarks}&quot;</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Pending Review</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="panel-premium bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-growth-teal" />
                <h3 className="title-interactive-hover text-base font-bold text-slate-900">Request Punch Correction</h3>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Date *</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/20 focus:border-growth-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proposed Check-In *</label>
                  <input
                    type="time"
                    required
                    value={proposedCheckIn}
                    onChange={(e) => setProposedCheckIn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/20 focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proposed Check-Out *</label>
                  <input
                    type="time"
                    required
                    value={proposedCheckOut}
                    onChange={(e) => setProposedCheckOut(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/20 focus:border-growth-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/20 focus:border-growth-teal"
                >
                  <option value="Biometric Reader Failure">Biometric Reader Failure</option>
                  <option value="Forgot to Punch Out">Forgot to Punch Out</option>
                  <option value="Official External Duty / Client Meeting">Official External Duty / Client Meeting</option>
                  <option value="Network / Power Outage">Network / Power Outage</option>
                  <option value="System Sync Delay">System Sync Delay</option>
                  <option value="Other Legitimate Workplace Reason">Other Legitimate Workplace Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Supporting Remarks</label>
                <textarea
                  rows={2}
                  value={supportingReason}
                  onChange={(e) => setSupportingReason(e.target.value)}
                  placeholder="Provide supervisor context or details..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/20 focus:border-growth-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-tealGlow transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Regularization'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
