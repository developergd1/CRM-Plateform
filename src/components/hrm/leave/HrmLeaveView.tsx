'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canApproveLeave } from '@/lib/rbac';
import {
  Coffee,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { LeaveTypeItem, LeaveApplicationItem, LeaveBalanceItem } from '@/types/hrm';

export const HrmLeaveView: React.FC = () => {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [applications, setApplications] = useState<LeaveApplicationItem[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form state
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hrm/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data.leaveTypes || []);
        setApplications(data.applications || []);
        setBalances(data.balances || []);
        if (data.leaveTypes?.length > 0 && !selectedLeaveTypeId) {
          setSelectedLeaveTypeId(data.leaveTypes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/hrm/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId: selectedLeaveTypeId,
          startDate,
          endDate,
          days,
          reason,
        }),
      });
      if (res.ok) {
        setShowApplyModal(false);
        setReason('');
        await fetchLeaves();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (appId: string, decision: 'APPROVED' | 'REJECTED') => {
    let remarks = 'Approved by supervisor';
    if (decision === 'REJECTED') {
      const inputReason = prompt('Please enter mandatory reason for rejecting this leave request:');
      if (!inputReason || inputReason.trim() === '') {
        alert('A business reason is strictly required to reject leave.');
        return;
      }
      remarks = inputReason.trim();
    }

    try {
      const res = await fetch(`/api/hrm/leaves/${appId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          remarks,
        }),
      });
      if (res.ok) {
        await fetchLeaves();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredApplications = applications.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  const isApprover = canApproveLeave(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold mb-2 border border-[#0D9488]/20">
              <Coffee className="w-3.5 h-3.5" />
              <span>Leave Ledger & Balances</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Time-Off & Leave Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified leave requests, balance tracking, manager approvals, and automated Loss Of Pay (LOP) integration for payroll.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchLeaves()}
              className="p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* Leave Balance Quota Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E2E8F0]">
          {leaveTypes.map((lt) => {
            const bal = balances.find((b) => b.leaveTypeId === lt.id);
            const available = bal ? bal.availableDays : lt.defaultAnnualQuota;
            const used = bal ? bal.usedDays : 0;
            return (
              <div key={lt.id} className="p-4 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111111]">{lt.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-white border border-[#E5E7E2] rounded-md font-bold text-slate-600">
                    {lt.code}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-[#111111]">{available}</span>
                    <span className="text-xs text-slate-500 ml-1">Days Left</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    Used: <span className="font-semibold text-slate-700">{used}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5E7E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">Leave Applications Inbox</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {filteredApplications.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#111111] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Application #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isApprover && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7E2]">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={isApprover ? 7 : 6} className="py-12 text-center text-slate-400">
                    No leave applications matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-[#111111]">
                      {app.applicationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#111111]">{app.employee?.fullName || 'Employee'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{app.employee?.employeeId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{app.leaveType?.name || 'Leave'}</span>
                      <div className="text-[10px] text-slate-400 font-mono">{app.leaveType?.code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>
                        {new Date(app.startDate).toLocaleDateString()} to {new Date(app.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">{app.totalDays} day(s) • {app.dayType}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={app.reason}>
                      {app.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    {isApprover && (
                      <td className="py-3 px-4 text-right">
                        {app.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReview(app.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(app.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Reviewed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPLY LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mt-1">Submit request for supervisor approval.</p>

            <form onSubmit={handleApplyLeave} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Leave Type</label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Total Days</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide brief business context for your leave request..."
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
