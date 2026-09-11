'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  Building2,
  FileText,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { formatClockTime } from '@/components/common/TimePicker12';

interface RegularizationItem {
  id: string;
  attendanceId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  date: string;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
  proposedCheckIn: string;
  proposedCheckOut: string;
  reason: string;
  supportingReason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByUserId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
  createdAt: string;
}

import { clientCache } from '@/lib/client-cache';

export const RegularizationView: React.FC = () => {
  const cached = clientCache.get<RegularizationItem[]>('attendance_regularization_list', 15 * 60 * 1000);
  const [requests, setRequests] = useState<RegularizationItem[]>(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review modal state
  const [reviewModalTarget, setReviewModalTarget] = useState<RegularizationItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');

  const fetchRequests = useCallback(async (forceRefresh = false) => {
    const cachedData = !forceRefresh ? clientCache.get<RegularizationItem[]>('attendance_regularization_list', 15 * 60 * 1000) : null;
    if (!cachedData) setLoading(true);

    try {
      const result = await clientCache.swrFetch(
        'attendance_regularization_list',
        async () => {
          const res = await fetch('/api/attendance/regularization');
          if (!res.ok) throw new Error('Error fetching regularization requests');
          const json = await res.json();
          return json.requests || [];
        },
        {
          forceRefresh,
          onUpdate: (data) => setRequests(data),
        }
      );
      if (result) setRequests(result);
    } catch (e) {
      console.error('Error fetching regularization requests:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(false);
  }, [fetchRequests]);

  const handleReviewSubmit = async () => {
    if (!reviewModalTarget) return;
    setActionLoading(reviewModalTarget.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/attendance/regularization/${reviewModalTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          remarks: reviewRemarks.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg({
          type: 'success',
          text: `Request for ${reviewModalTarget.employeeName} ${reviewAction.toLowerCase()} successfully.`,
        });
        setReviewModalTarget(null);
        setReviewRemarks('');
        await fetchRequests();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: data.error || 'Failed to review regularization request.',
        });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      r.employeeName?.toLowerCase().includes(term) ||
      r.employeeCode?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term) ||
      r.date?.includes(term);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="title-interactive-hover text-xl font-black text-slate-900 cursor-pointer">Attendance Regularization</h1>
              <p className="subtitle-interactive-hover text-xs text-slate-500 font-medium mt-0.5">
                Review and approve employee punch corrections and attendance regularizations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchRequests(true)}
          disabled={loading}
          className="interactive-btn-hover inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-premium interactive-box-hover bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{requests.length}</p>
        </div>
        <div className="card-premium interactive-box-hover bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
          <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
        </div>
        <div className="card-premium interactive-box-hover bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</p>
        </div>
        <div className="card-premium interactive-box-hover bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-sm cursor-pointer">
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-rose-700">Rejected</span>
          <p className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="panel-premium bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, date, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`interactive-btn-hover px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="panel-premium bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Original Punch</th>
                <th className="py-3 px-4">Proposed Correction</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading regularization requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No regularization requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="interactive-row-hover hover:bg-teal-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="title-interactive-hover font-bold text-slate-900 cursor-pointer">{r.employeeName}</div>
                      {r.employeeCode && (
                        <div className="subtitle-interactive-hover text-[10px] text-slate-400 font-mono">{r.employeeCode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {new Date(r.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-600">
                        <span className="font-medium text-[11px]">In:</span>{' '}
                        {r.originalCheckIn ? formatClockTime(r.originalCheckIn) : '—'}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium text-[11px]">Out:</span>{' '}
                        {r.originalCheckOut ? formatClockTime(r.originalCheckOut) : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-emerald-700 font-semibold">
                        <span className="text-[11px]">In:</span> {formatClockTime(r.proposedCheckIn)}
                      </div>
                      <div className="text-emerald-700 font-semibold">
                        <span className="text-[11px]">Out:</span> {formatClockTime(r.proposedCheckOut)}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-1">{r.reason}</div>
                      {r.supportingReason && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {r.supportingReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.reviewerName && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          by {r.reviewerName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setReviewModalTarget(r);
                              setReviewAction('APPROVED');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Approve Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setReviewModalTarget(r);
                              setReviewAction('REJECTED');
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Confirmation Modal */}
      {reviewModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {reviewAction === 'APPROVED' ? 'Approve Regularization' : 'Reject Regularization'}
              </h3>
              <button
                onClick={() => setReviewModalTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900">{reviewModalTarget.employeeName}</div>
                <div className="text-slate-500">
                  Date:{' '}
                  {new Date(reviewModalTarget.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-slate-500">Reason: {reviewModalTarget.reason}</div>
                <div className="font-semibold text-emerald-700">
                  Correction: {formatClockTime(reviewModalTarget.proposedCheckIn)} -{' '}
                  {formatClockTime(reviewModalTarget.proposedCheckOut)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Review Remarks (Optional)
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVED'
                      ? 'Approved per team manager confirmation'
                      : 'Reason for rejecting this regularization'
                  }
                  rows={3}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setReviewModalTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={actionLoading !== null}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 ${
                  reviewAction === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? 'Processing...' : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
