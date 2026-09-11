'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, Plus, CheckCircle, XCircle, Clock, RefreshCw, Filter, Search } from 'lucide-react';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export const LeaveView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = isAdminOrHR(user?.role);

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states (for employees applying for leave)
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState('1');
  const [reason, setReason] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leave');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error('Error fetching leaves:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) return;

    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveType, startDate, endDate, totalDays, reason }),
    });

    if (res.ok) {
      setShowApplyModal(false);
      setReason('');
      fetchLeaves();
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const remarks = prompt(`Enter ${status.toLowerCase()} remarks:`) || undefined;
    const res = await fetch(`/api/leave/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewRemarks: remarks }),
    });
    if (res.ok) fetchLeaves();
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const empName = req.employee?.fullName?.toLowerCase() || '';
      const empId = req.employee?.employeeId?.toLowerCase() || '';
      const rReason = req.reason?.toLowerCase() || '';
      const rType = req.leaveType?.toLowerCase() || '';
      if (!empName.includes(q) && !empId.includes(q) && !rReason.includes(q) && !rType.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="title-interactive-hover text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 cursor-pointer">
            <Briefcase className="w-5 h-5 text-growth-teal" />
            <span>{isAdmin ? 'Leave Governance & Approvals' : 'Leave Management & Requests'}</span>
          </h1>
          <p className="subtitle-interactive-hover text-xs text-slate-500">
            {isAdmin
              ? 'Review and manage employee leave applications, approve/reject requests, and track organizational absence status'
              : 'Submit leave requests, track approvals, and view team calendar status'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLeaves()}
            disabled={loading}
            className="interactive-btn-hover px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            title="Refresh Leave Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          {/* Only render Apply for Leave for Employees */}
          {!isAdmin && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="interactive-btn-hover px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlight Boxes with Filter Click */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`card-premium interactive-box-hover bg-white p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'ring-2 ring-growth-teal border-growth-teal shadow-md' : 'border-slate-200'
          }`}
          title="Click to view all requests"
        >
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leaves</span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{requests.length}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`card-premium interactive-box-hover bg-white p-4 rounded-2xl border bg-amber-50/30 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : 'border-amber-200'
          }`}
          title="Click to filter by Pending Review"
        >
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
          <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{requests.filter((r) => r.status === 'PENDING').length}</p>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`card-premium interactive-box-hover bg-white p-4 rounded-2xl border bg-emerald-50/30 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md' : 'border-emerald-200'
          }`}
          title="Click to filter by Approved"
        >
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-emerald-600">Approved</span>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{requests.filter((r) => r.status === 'APPROVED').length}</p>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`card-premium interactive-box-hover bg-white p-4 rounded-2xl border bg-rose-50/30 shadow-sm cursor-pointer transition-all ${
            statusFilter === 'REJECTED' ? 'ring-2 ring-rose-500 border-rose-500 shadow-md' : 'border-rose-200'
          }`}
          title="Click to filter by Rejected"
        >
          <span className="title-interactive-hover text-[11px] font-bold uppercase tracking-wider text-rose-600">Rejected</span>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{requests.filter((r) => r.status === 'REJECTED').length}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="panel-premium bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee, ID, Type, Reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-growth-teal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`interactive-btn-hover px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-growth-teal text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {s === 'ALL' ? 'All Records' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="panel-premium bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration (Dates)</th>
                <th className="py-3.5 px-4">Total Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                {isManagerOrAbove(user?.role) && <th className="py-3.5 px-4 text-right">Review Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="interactive-row-hover hover:bg-teal-50/20 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="title-interactive-hover font-bold text-slate-900">{req.employee?.fullName || '—'}</div>
                    <div className="subtitle-interactive-hover text-[10px] text-slate-400 font-mono">{req.employee?.employeeId || '—'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{req.leaveType}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {req.startDate} to {req.endDate}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{req.totalDays} days</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">{req.reason}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>

                  {isManagerOrAbove(user?.role) && (
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReview(req.id, 'APPROVED')}
                            className="interactive-btn-hover px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-200 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'REJECTED')}
                            className="interactive-btn-hover px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Reviewed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}

              {filteredRequests.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal (Only for Employees) */}
      {!isAdmin && showApplyModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <form onSubmit={handleApply} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900">Apply for Leave</h3>
            
            <div>
              <label className="block font-bold text-slate-700 mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="PAID">Earned / Paid Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Days</label>
              <input
                type="number"
                step="0.5"
                value={totalDays}
                onChange={(e) => setTotalDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Leave *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Family medical emergency / Personal travel..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-growth-teal text-white font-bold rounded-xl shadow-sm"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
