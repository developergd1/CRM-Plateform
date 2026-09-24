'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Briefcase,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  Calendar,
  FileText,
  User,
  Building,
  Eye,
  Ban,
  Paperclip,
  Check,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  X,
} from 'lucide-react';
import { isAdminOrHR, isManagerOrAbove } from '@/lib/rbac';

export interface LeaveViewProps {
  initialClientId?: string;
  hideClientFilter?: boolean;
}

export const LeaveView: React.FC<LeaveViewProps> = ({
  initialClientId,
  hideClientFilter = false,
}) => {
  const { user } = useAuth();
  const isAdmin = isAdminOrHR(user?.role);
  const isClient = user?.role === 'CLIENT';
  const isEmployee = user?.role === 'EMPLOYEE';
  const canReview = isAdmin || isClient || isManagerOrAbove(user?.role);

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || 'ALL');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Client roster or unique employees list for filtering
  const [clientList, setClientList] = useState<{ id: string; name: string }[]>([]);

  // Modals state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [detailsTarget, setDetailsTarget] = useState<any | null>(null);

  // Form states for Leave Application
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState('1');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Auto-calculate Total Days when start or end date changes
  useEffect(() => {
    if (startDate && endDate) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const diffMs = end.getTime() - start.getTime();
          const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
          setTotalDays(String(days));
        } else if (end < start) {
          setTotalDays('1');
        }
      } catch (e) {
        // ignore
      }
    }
  }, [startDate, endDate]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let url = '/api/leave?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (selectedClientId !== 'ALL' && isAdmin) url += `clientId=${selectedClientId}&`;
      if (selectedEmployeeFilter !== 'ALL') url += `employeeId=${selectedEmployeeFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const reqs = data.requests || [];
        setRequests(reqs);

        // If admin, extract unique clients for client filter dropdown
        if (isAdmin) {
          const uniqueClients = new Map<string, string>();
          reqs.forEach((r: any) => {
            if (r.employee?.client?.id) {
              uniqueClients.set(r.employee.client.id, r.employee.client.companyName || 'Client');
            }
          });
          setClientList(Array.from(uniqueClients.entries()).map(([id, name]) => ({ id, name })));
        }
      }
    } catch (e) {
      console.error('Error fetching leaves:', e);
      showToast('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user, statusFilter, selectedClientId, selectedEmployeeFilter]);

  // Extract unique employee roster for employee-wise filter
  const employeeRoster = useMemo(() => {
    const map = new Map<string, { id: string; employeeId: string; name: string }>();
    requests.forEach((r) => {
      if (r.employee) {
        map.set(r.employee.id || r.employeeId, {
          id: r.employee.id || r.employeeId,
          employeeId: r.employee.employeeId || '',
          name: r.employee.fullName || 'Employee',
        });
      }
    });
    return Array.from(map.values());
  }, [requests]);

  // Handle Leave Application
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      showToast('Please fill in Start Date, End Date, and Reason', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          totalDays: parseFloat(totalDays) || 1,
          reason: reason.trim(),
          remarks: remarks.trim() || undefined,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowApplyModal(false);
        setReason('');
        setRemarks('');
        setAttachmentUrl('');
        setStartDate('');
        setEndDate('');
        setTotalDays('1');
        showToast('Leave application submitted successfully (Pending review)');
        fetchLeaves();
      } else {
        showToast(data.error || 'Failed to submit leave', 'error');
      }
    } catch (err) {
      showToast('Network error while submitting leave', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open review modal
  const openReviewModal = (req: any, action: 'APPROVED' | 'REJECTED') => {
    setReviewTarget(req);
    setReviewAction(action);
    setReviewRemarks('');
    setRejectionReason('');
    setRejectionError(false);
  };

  // Confirm review
  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    if (reviewAction === 'REJECTED' && !rejectionReason.trim()) {
      setRejectionError(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave/${reviewTarget.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          reviewRemarks: reviewRemarks.trim() || undefined,
          rejectionReason: reviewAction === 'REJECTED' ? rejectionReason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewTarget(null);
        showToast(
          reviewAction === 'APPROVED'
            ? 'Leave Approved! Attendance successfully synced as On Leave.'
            : 'Leave request rejected.'
        );
        fetchLeaves();
      } else {
        showToast(data.error || 'Review failed', 'error');
      }
    } catch (err) {
      showToast('Network error during review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Employee Cancel Request
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/leave/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelRemarks }),
      });

      const data = await res.json();
      if (res.ok) {
        setCancelTarget(null);
        setCancelRemarks('');
        showToast('Leave request has been cancelled.');
        fetchLeaves();
      } else {
        showToast(data.error || 'Failed to cancel leave', 'error');
      }
    } catch (err) {
      showToast('Network error while cancelling leave', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests locally by search term
  const filteredRequests = requests.filter((req) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const empName = req.employee?.fullName?.toLowerCase() || '';
      const empId = req.employee?.employeeId?.toLowerCase() || '';
      const rReason = req.reason?.toLowerCase() || '';
      const rRemarks = req.remarks?.toLowerCase() || '';
      const rType = req.leaveType?.toLowerCase() || '';
      const company = req.employee?.client?.companyName?.toLowerCase() || '';
      if (
        !empName.includes(q) &&
        !empId.includes(q) &&
        !rReason.includes(q) &&
        !rRemarks.includes(q) &&
        !rType.includes(q) &&
        !company.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-growth-teal border border-teal-200">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-growth-orange border border-orange-200">
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300">
            Cancelled
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 text-growth-orange border border-orange-200">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Alert */}
      {feedbackMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {feedbackMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="title-interactive-hover text-xl font-black text-slate-900 tracking-tight">
            {isAdmin
              ? 'Centralized Leave Governance & Approvals'
              : isClient
              ? 'Staff Leave Management & Approvals'
              : 'My Leave Requests & Balance'}
          </h1>
          <p className="subtitle-interactive-hover text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Multi-client absence governance, attendance synchronization, and audit records.'
              : isClient
              ? 'Review workforce absence requests and authorize leave for your company.'
              : 'Apply for time off, monitor approval progress, and view leave balance.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchLeaves()}
            disabled={loading}
            className="interactive-btn-hover px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh Leave Records"
          >
            <span>Refresh</span>
          </button>

          {isEmployee && (
            <button
              onClick={() => setShowApplyModal(true)}
              className="interactive-btn-hover px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards / Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'ALL', label: 'Total Leaves', count: requests.length, color: 'border-slate-200 text-slate-900', ring: 'ring-slate-900 border-slate-900' },
          { id: 'PENDING', label: 'Pending Review', count: requests.filter((r) => r.status === 'PENDING').length, color: 'border-orange-200 text-growth-orange bg-orange-50/20', ring: 'ring-growth-orange border-growth-orange' },
          { id: 'APPROVED', label: 'Approved', count: requests.filter((r) => r.status === 'APPROVED').length, color: 'border-teal-200 text-growth-teal bg-teal-50/20', ring: 'ring-growth-teal border-growth-teal' },
          { id: 'REJECTED', label: 'Rejected', count: requests.filter((r) => r.status === 'REJECTED').length, color: 'border-orange-200 text-growth-orange bg-orange-50/20', ring: 'ring-growth-orange border-growth-orange' },
          { id: 'CANCELLED', label: 'Cancelled', count: requests.filter((r) => r.status === 'CANCELLED').length, color: 'border-slate-200 text-slate-600 bg-slate-50', ring: 'ring-slate-400 border-slate-400' },
        ].map((kpi) => (
          <div
            key={kpi.id}
            onClick={() => setStatusFilter(kpi.id as any)}
            className={`card-premium interactive-box-hover bg-white p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${kpi.color} ${
              statusFilter === kpi.id ? `ring-2 ${kpi.ring} shadow-md` : ''
            }`}
          >
            <span className="title-interactive-hover text-[10px] font-black uppercase tracking-wider text-slate-400">
              {kpi.label}
            </span>
            <p className="text-2xl font-black mt-1 font-mono">{kpi.count}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="panel-premium bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, ID, reason, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none transition"
          />
        </div>

        {/* Dropdown Filters for Admin & Client */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Admin Client-wise Filter */}
          {isAdmin && !hideClientFilter && clientList.length > 0 && (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
            >
              <option value="ALL">All Clients / Companies</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Employee-wise History Filter (For Admin & Client) */}
          {canReview && employeeRoster.length > 0 && (
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
            >
              <option value="ALL">All Personnel (Roster)</option>
              {employeeRoster.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          )}

          {/* Status buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="panel-premium bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Duration & Window</th>
                <th className="py-3.5 px-4">Total Days</th>
                <th className="py-3.5 px-4">Reason & Remarks</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isMyLeave = isEmployee || req.employee?.employeeId === user?.employeeId;

                return (
                  <tr key={req.id} className="interactive-row-hover hover:bg-teal-50/20 transition-all">
                    {/* Employee Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                          {req.employee?.fullName?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <span className="title-interactive-hover font-bold text-slate-900 block">
                            {req.employee?.fullName || '—'}
                          </span>
                          <span className="subtitle-interactive-hover font-mono text-[10px] text-growth-teal font-extrabold block">
                            {req.employee?.employeeId || '—'}
                            {req.employee?.client?.companyName && (
                              <span className="text-slate-400 font-normal ml-1">
                                • {req.employee.client.companyName}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                          {req.leaveType}
                        </span>
                        {req.attachmentUrl && (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-growth-teal hover:text-growth-tealDark p-1"
                            title="View Attachment"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Duration Window */}
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{req.startDate}</span>
                        <span className="text-slate-400">→</span>
                        <span>{req.endDate}</span>
                      </div>
                    </td>

                    {/* Total Days */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded-xl bg-slate-100 font-mono font-bold text-slate-800 text-[11px]">
                        {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                      </span>
                    </td>

                    {/* Reason & Remarks */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-800 font-semibold truncate" title={req.reason}>
                        {req.reason}
                      </div>
                      {req.remarks && (
                        <div className="text-[10px] text-slate-400 truncate italic" title={`Remarks: ${req.remarks}`}>
                          Note: {req.remarks}
                        </div>
                      )}
                      {req.rejectionReason && req.status === 'REJECTED' && (
                        <div className="text-[10px] text-rose-600 truncate font-semibold mt-0.5" title={`Rejection: ${req.rejectionReason}`}>
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details & Audit Timeline */}
                        <button
                          onClick={() => setDetailsTarget(req)}
                          className="interactive-btn-hover p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
                          title="View Details & Audit Timeline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Employee Cancel Action (Only on own Pending leaves) */}
                        {isPending && isMyLeave && (
                          <button
                            onClick={() => {
                              setCancelTarget(req);
                              setCancelRemarks('');
                            }}
                            className="interactive-btn-hover px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Cancel Leave Request"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}

                        {/* Review Actions for Authorized Client / Admin / HR */}
                        {isPending && canReview && (
                          <>
                            <button
                              onClick={() => openReviewModal(req, 'APPROVED')}
                              className="interactive-btn-hover p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition cursor-pointer"
                              title="Approve Leave & Sync Attendance"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openReviewModal(req, 'REJECTED')}
                              className="interactive-btn-hover p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition cursor-pointer"
                              title="Reject Leave (Requires Mandatory Reason)"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-growth-teal">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading leave records...</span>
                      </div>
                    ) : (
                      'No leave records found matching the active filter criteria.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. APPLY FOR LEAVE MODAL (FOR EMPLOYEES)              */}
      {/* ---------------------------------------------------- */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-growth-teal border border-teal-100">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="title-interactive-hover text-base font-black text-slate-900">Apply for Leave</h3>
                  <p className="subtitle-interactive-hover text-xs text-slate-400">Submit an official leave request for approval</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs">
              {/* Leave Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                  required
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Earned/Annual Leave">Earned / Annual Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                    required
                  />
                </div>
              </div>

              {/* Total Days */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Leave Days *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Automatically computed. You can adjust to 0.5 for a half-day.
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for absence..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                  required
                />
              </div>

              {/* Remarks / Handover Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Handover Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Delegated pending client tasks to team member"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                />
              </div>

              {/* Attachment Link */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Attachment / Medical Slip URL (Optional)</label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-tealGlow transition disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. REVIEW MODAL (APPROVE / REJECT WITH MANDATORY REASON) */}
      {/* ---------------------------------------------------- */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    reviewAction === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {reviewAction === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {reviewAction === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {reviewTarget.employee?.fullName} ({reviewTarget.employee?.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Summary */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Leave Type:</span>
                <span className="font-bold text-slate-800">{reviewTarget.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono font-bold text-slate-800">
                  {reviewTarget.startDate} → {reviewTarget.endDate} ({reviewTarget.totalDays}d)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{reviewTarget.reason}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-3 text-xs">
              {/* Mandatory Rejection Reason */}
              {reviewAction === 'REJECTED' ? (
                <div>
                  <label className="block font-black text-rose-700 mb-1">
                    Rejection Reason (Mandatory) *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (e.target.value.trim()) setRejectionError(false);
                    }}
                    placeholder="Provide a specific operational or policy reason for rejecting this leave..."
                    className={`w-full px-3.5 py-2.5 bg-rose-50/40 border rounded-xl font-medium text-slate-900 outline-none ${
                      rejectionError ? 'border-rose-500 ring-2 ring-rose-200' : 'border-rose-200 focus:ring-1 focus:ring-rose-400'
                    }`}
                    required
                  />
                  {rejectionError && (
                    <span className="text-[11px] text-rose-600 font-bold mt-1 block">
                      A clear rejection reason is mandatory before rejecting.
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Approval Remarks / Handover Confirmation (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="e.g. Approved. Duty handover verified."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal outline-none"
                  />
                  <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                    Attendance for these dates will automatically reflect &quot;On Leave&quot;.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50 ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {actionLoading
                    ? 'Processing...'
                    : reviewAction === 'APPROVED'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. EMPLOYEE CANCEL CONFIRMATION MODAL                 */}
      {/* ---------------------------------------------------- */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Cancel Leave Request?</h3>
                <p className="text-[11px] text-slate-500">
                  {cancelTarget.leaveType} ({cancelTarget.startDate} to {cancelTarget.endDate})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this pending leave request? This action will update its status to Cancelled and record an immutable audit entry.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Cancellation (Optional)</label>
                <input
                  type="text"
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  placeholder="e.g. Meeting rescheduled, leave no longer needed"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Keep Request
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 transition"
                >
                  {actionLoading ? 'Cancelling...' : 'Yes, Cancel Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. DETAILS & AUDIT ACTION HISTORY MODAL / TIMELINE   */}
      {/* ---------------------------------------------------- */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-slate-900 shadow-2xl space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-growth-teal border border-teal-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="title-interactive-hover text-base font-black text-slate-900">
                    Leave Request Audit & Details
                  </h3>
                  <p className="subtitle-interactive-hover text-xs text-slate-400">
                    Full verification trail and status progression
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Applicant</span>
                <p className="font-bold text-slate-900">{detailsTarget.employee?.fullName}</p>
                <p className="font-mono text-[10px] text-growth-teal font-extrabold">{detailsTarget.employee?.employeeId}</p>
                {detailsTarget.employee?.client?.companyName && (
                  <p className="text-[10px] text-slate-500 font-semibold">{detailsTarget.employee.client.companyName}</p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Current Status</span>
                <div>{getStatusBadge(detailsTarget.status)}</div>
                <p className="font-mono text-[10px] text-slate-500 pt-1">
                  Applied: {new Date(detailsTarget.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Leave Duration & Reasoning */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Leave Type:</span>
                <span className="font-bold text-slate-800">{detailsTarget.leaveType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Time Window:</span>
                <span className="font-mono font-bold text-slate-800">
                  {detailsTarget.startDate} to {detailsTarget.endDate} ({detailsTarget.totalDays} days)
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-100">
                <span className="text-slate-400 block mb-1">Reason:</span>
                <span className="font-medium text-slate-800 block bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {detailsTarget.reason}
                </span>
              </div>
              {detailsTarget.remarks && (
                <div className="py-1.5 border-b border-slate-100">
                  <span className="text-slate-400 block mb-1">Handover Notes / Remarks:</span>
                  <span className="font-medium text-slate-700 block bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                    {detailsTarget.remarks}
                  </span>
                </div>
              )}
              {detailsTarget.rejectionReason && (
                <div className="py-1.5 border-b border-slate-100">
                  <span className="text-rose-600 font-bold block mb-1">Mandatory Rejection Reason:</span>
                  <span className="font-semibold text-rose-800 block bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {detailsTarget.rejectionReason}
                  </span>
                </div>
              )}
              {detailsTarget.attachmentUrl && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-400">Attachment:</span>
                  <a
                    href={detailsTarget.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-growth-teal hover:underline flex items-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </a>
                </div>
              )}
            </div>

            {/* Audit Trail Timeline */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-growth-teal" />
                <span>Immutable Action History</span>
              </h4>

              <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-1">
                {detailsTarget.auditTrail && detailsTarget.auditTrail.length > 0 ? (
                  detailsTarget.auditTrail.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="relative text-xs space-y-0.5">
                      {/* Node Bullet */}
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-growth-teal ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        By <span className="font-bold text-slate-800">{log.performedBy}</span>{' '}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono">
                          {log.performerRole}
                        </span>
                      </div>
                      {log.rejectionReason && (
                        <div className="text-[10px] text-rose-600 font-semibold bg-rose-50 p-1.5 rounded-lg border border-rose-100 mt-1">
                          Rejection Reason: {log.rejectionReason}
                        </div>
                      )}
                      {log.remarks && !log.rejectionReason && (
                        <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1">
                          {log.remarks}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-xs py-2 italic">
                    Created on {new Date(detailsTarget.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
