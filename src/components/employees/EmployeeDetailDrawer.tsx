'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Building2,
  Phone,
  Mail,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  User,
  MapPin,
  FileText,
  Clock,
  Edit,
  History,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Sparkles,
  Briefcase,
  Copy,
  Check,
  Banknote,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  AlertCircle,
  RefreshCw,
  Umbrella,
  Hourglass,
  CheckSquare,
} from 'lucide-react';
import { isAdminOrHR } from '@/lib/rbac';
import { EditEmployeeModal } from './EditEmployeeModal';
import { TimePicker12, formatTo12Hour } from '@/components/common/TimePicker12';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AssignSalaryModal } from './AssignSalaryModal';
import { EditComplianceModal } from './EditComplianceModal';

interface DrawerProps {
  employeeId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const EmployeeDetailDrawer: React.FC<DrawerProps> = ({
  employeeId,
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'job' | 'attendance' | 'leaves' | 'blockHistory' | 'audit'>('profile');

  // Attendance filter & regularize modal states
  const [attendanceMonth, setAttendanceMonth] = useState<string>('ALL');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE'>('PRESENT');
  const [attCheckIn, setAttCheckIn] = useState('09:30');
  const [attCheckOut, setAttCheckOut] = useState('18:30');
  const [attOvertime, setAttOvertime] = useState(0);
  const [attRemarks, setAttRemarks] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Leave modals & actions state
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAutoApprove, setLeaveAutoApprove] = useState(true);
  const [leaveRemarks, setLeaveRemarks] = useState('');
  const [savingLeave, setSavingLeave] = useState(false);

  // Reject Leave modal state
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actioningLeaveId, setActioningLeaveId] = useState<string | null>(null);

  // Block Modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('Disciplinary Policy Breach');
  const [customBlockReason, setCustomBlockReason] = useState('');
  const [blockRemarks, setBlockRemarks] = useState('');

  // Unblock Modal state
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [unblockReason, setUnblockReason] = useState('Admin approval & compliance verified');
  const [unblockRemarks, setUnblockRemarks] = useState('');

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Reset Password Modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Salary & Compliance Modal states
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  // Shift timing editing state
  const [editingShift, setEditingShift] = useState(false);
  const [drawerShiftStart, setDrawerShiftStart] = useState('10:00');
  const [drawerShiftEnd, setDrawerShiftEnd] = useState('19:00');
  const [savingShift, setSavingShift] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTimeStr = (isoDateOrTime: any) => {
    if (!isoDateOrTime) return '-';
    try {
      const d = new Date(isoDateOrTime);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return String(isoDateOrTime);
    } catch {
      return '-';
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setSavingAttendance(true);
    try {
      let totalWorkMinutes = 0;
      if (attStatus === 'PRESENT' || attStatus === 'LATE') {
        totalWorkMinutes = 480;
      } else if (attStatus === 'HALF_DAY') {
        totalWorkMinutes = 240;
      }

      const checkInISO = attStatus !== 'ABSENT' && attCheckIn
        ? new Date(`${attDate}T${attCheckIn}:00`).toISOString()
        : null;
      const checkOutISO = attStatus !== 'ABSENT' && attCheckOut
        ? new Date(`${attDate}T${attCheckOut}:00`).toISOString()
        : null;

      const res = await fetch('/api/hrm/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: attDate,
          status: attStatus,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          totalWorkMinutes,
          overtimeMinutes: Number(attOvertime) || 0,
          remarks: attRemarks || 'Recorded via Employee Profile Workspace',
        }),
      });

      if (res.ok) {
        setActionNotice(`Attendance for ${attDate} successfully recorded as ${attStatus}.`);
        setTimeout(() => setActionNotice(null), 4000);
        setShowMarkAttendanceModal(false);
        fetchEmployeeDetails();
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update attendance');
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      alert(err.message || 'Error recording attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleGrantLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !leaveReason.trim()) return;
    setSavingLeave(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          totalDays: Number(leaveDays) || 1,
          reason: leaveReason.trim(),
          remarks: leaveRemarks.trim() || undefined,
          status: leaveAutoApprove ? 'APPROVED' : 'PENDING',
        }),
      });

      if (res.ok) {
        setActionNotice(`Leave for ${employee.fullName} successfully logged (${leaveAutoApprove ? 'Approved' : 'Pending'}).`);
        setTimeout(() => setActionNotice(null), 4000);
        setShowApplyLeaveModal(false);
        setLeaveReason('');
        setLeaveRemarks('');
        fetchEmployeeDetails();
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to grant leave');
      }
    } catch (err: any) {
      console.error('Error granting leave:', err);
      alert(err.message || 'Error granting leave');
    } finally {
      setSavingLeave(false);
    }
  };

  const handleReviewLeave = async (leaveId: string, status: 'APPROVED' | 'REJECTED', reasonText?: string) => {
    setActioningLeaveId(leaveId);
    try {
      const res = await fetch(`/api/leave/${leaveId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'REJECTED' ? (reasonText || 'Application not approved by management') : undefined,
          reviewRemarks: status === 'APPROVED' ? 'Approved by Corporate Management' : undefined,
        }),
      });

      if (res.ok) {
        setActionNotice(`Leave request #${leaveId.slice(-6)} marked as ${status}.`);
        setTimeout(() => setActionNotice(null), 4000);
        setRejectingLeaveId(null);
        setRejectionReason('');
        fetchEmployeeDetails();
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || `Failed to ${status.toLowerCase()} leave`);
      }
    } catch (err: any) {
      console.error('Error reviewing leave:', err);
      alert(err.message || 'Error reviewing leave');
    } finally {
      setActioningLeaveId(null);
    }
  };

  const fetchEmployeeDetails = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployee(data.employee);
      }
    } catch (e) {
      console.error('Error fetching employee details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

  useEffect(() => {
    if (employee) {
      setDrawerShiftStart(employee.shiftStartTime || '10:00');
      setDrawerShiftEnd(employee.shiftEndTime || '19:00');
    }
  }, [employee]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !showBlockModal &&
        !showUnblockModal &&
        !showEditModal &&
        !showResetPasswordModal &&
        !showSalaryModal &&
        !showComplianceModal
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    showBlockModal,
    showUnblockModal,
    showEditModal,
    showResetPasswordModal,
    showSalaryModal,
    showComplianceModal,
  ]);

  const handleSaveShift = async () => {
    if (!employee) return;
    setSavingShift(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftStartTime: drawerShiftStart,
          shiftEndTime: drawerShiftEnd,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployee(data.employee);
        setEditingShift(false);
        setActionNotice('Working shift timings updated successfully!');
        setTimeout(() => setActionNotice(null), 3500);
      } else {
        const err = await res.json();
        setActionNotice(`Error: ${err.error || 'Failed to update shift'}`);
      }
    } catch (e) {
      setActionNotice('Network error updating shift');
    } finally {
      setSavingShift(false);
    }
  };

  if (!employeeId) return null;

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockReason.trim()) return;

    setActionLoading(true);
    const finalReason = blockReason === 'Other Administrative Reason'
      ? (customBlockReason.trim() || 'Other Administrative Reason')
      : blockReason;

    try {
      const res = await fetch(`/api/employees/${employee.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: finalReason,
          remarks: blockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowBlockModal(false);
        setBlockRemarks('');
        setActionNotice(`${employee.fullName} (${employee.employeeId}) has been BLOCKED.`);
        await fetchEmployeeDetails();
        onRefresh();
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        alert(data.error || 'Failed to block employee');
      }
    } catch (e) {
      alert('Network error while blocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/unblock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: unblockReason,
          remarks: unblockRemarks,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowUnblockModal(false);
        setUnblockRemarks('');
        setActionNotice(`${employee.fullName} (${employee.employeeId}) is now UNBLOCKED & ACTIVE.`);
        await fetchEmployeeDetails();
        onRefresh();
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        alert(data.error || 'Failed to unblock employee');
      }
    } catch (e) {
      alert('Network error while unblocking employee');
    } finally {
      setActionLoading(false);
    }
  };

  const isBlocked = employee?.status === 'BLOCKED' || employee?.isBlocked;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 flex flex-col animate-in fade-in duration-150">
      <div className="w-full min-h-screen bg-slate-50 flex flex-col">
        {/* Top Sticky Page Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
          <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer group active:scale-95"
                title="Return to Directory (Esc)"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Directory</span>
              </button>

              <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                <span>/</span>
                <span className="font-semibold text-slate-500">Employee Directory</span>
                <span>/</span>
                <span className="font-bold text-slate-900">{employee?.fullName || 'Profile'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {employee && (
                <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 select-all hidden sm:inline-block">
                  {employee.employeeId}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-[1760px] mx-auto w-full px-4 sm:px-8 lg:px-12 py-6 space-y-6">
          {loading ? (
            <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-teal-600" />
              <p className="text-xs text-slate-500 font-medium">Loading employee profile...</p>
            </div>
          ) : !employee ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500">
              Employee profile not found.
            </div>
          ) : (
            <>
              {/* Employee Profile Hero Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden relative">
                {/* Ambient Top Accent Banner */}
                <div className="h-36 sm:h-44 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1.25px,transparent_1.25px)] [background-size:20px_20px]" />
                  <div className="absolute -right-20 -top-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute right-1/3 -bottom-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

                  {/* Corporate entity pill in banner */}
                  <div className="absolute top-4 right-4 sm:right-6 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/95 text-xs font-semibold shadow-sm">
                      <Building2 className="w-3.5 h-3.5 text-teal-300" />
                      <span>{employee.client?.companyName || 'Growth India HQ'}</span>
                    </span>
                  </div>
                </div>

                {/* Profile Details & Actions */}
                <div className="px-6 sm:px-8 pb-6 pt-0 relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 -mt-14 sm:-mt-16">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                    {/* Avatar with active glow indicator */}
                    <div className="relative shrink-0">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-2xl ring-4 ring-white/95">
                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 flex items-center justify-center font-black text-4xl sm:text-5xl text-white shadow-inner select-none">
                          {employee.fullName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span
                        className={`absolute bottom-2 right-2 w-5 h-5 rounded-full ring-4 ring-white shadow-sm flex items-center justify-center ${
                          isBlocked ? 'bg-rose-500' : employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={`Status: ${employee.status}`}
                      >
                        {employee.status === 'ACTIVE' && (
                          <span className="w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
                        )}
                      </span>
                    </div>

                    {/* Identity Info */}
                    <div className="min-w-0 pb-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {employee.fullName}
                        </h1>
                        <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 select-all shadow-2xs">
                          {employee.employeeId}
                        </span>
                        <span
                          className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs ${
                            isBlocked
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : employee.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-rose-500' : employee.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{employee.status}</span>
                        </span>
                        {employee.client ? (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>{employee.client.companyName}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Growth India HQ Staff</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 bg-slate-100/90 px-3 py-1 rounded-xl">
                          <Briefcase className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{employee.designation}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100/90 px-3 py-1 rounded-xl font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{employee.departmentName || employee.department?.name || 'General Operations'}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100/90 px-3 py-1 rounded-xl font-medium text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{employee.jobLocation || employee.location || 'Headquarters'}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100/90 px-3 py-1 rounded-xl font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>Joined {new Date(employee.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar in Hero Header */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 pb-1">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
                      title="Edit Personal, Job, Contact, and Shift details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResetPasswordModal(true)}
                      className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      <span>Assign / Reset Password</span>
                    </button>

                    {(isAdminOrHR(user?.role) || user?.role === 'CLIENT') && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowSalaryModal(true)}
                          className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Assign or revise compensation and salary structure"
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Salary Profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowComplianceModal(true)}
                          className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Edit statutory compliance, EPF, ESIC, PT, PAN"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>Compliance</span>
                        </button>
                      </>
                    )}

                    {/* Block / Unblock button */}
                    {(() => {
                      const canPerformBlock =
                        isAdminOrHR(user?.role) ||
                        (user?.role === 'CLIENT' &&
                          user?.canBlockEmployees &&
                          (user?.clientId === employee?.client?.clientId || user?.id === employee?.client?.userId));

                      if (!canPerformBlock) return null;

                      return (
                        <div>
                          {isBlocked ? (
                            <button
                              type="button"
                              onClick={() => setShowUnblockModal(true)}
                              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Unblock Employee</span>
                            </button>
                          ) : (employee.employeeId === 'GI-EMP-000001' || employee.user?.role?.name === 'SUPER_ADMIN' || employee.employeeId === user?.employeeId) ? (
                            <span
                              className="px-3 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 select-none cursor-default"
                              title="Super Admin and active user sessions cannot be blocked"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>Protected Account</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowBlockModal(true)}
                              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>Block Employee</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Global Notice banner */}
                {actionNotice && (
                  <div className="bg-emerald-50 px-6 sm:px-8 py-2.5 border-t border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{actionNotice}</span>
                  </div>
                )}

                {/* Navigation Tabs Bar */}
                <div className="border-t border-slate-100 px-6 sm:px-8 py-3 bg-slate-50/70 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-2xl flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'profile'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Personal Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('job')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'job'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Client & Job Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('attendance')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'attendance'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Daily Attendance</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {employee.attendanceSummary?.presentDays ?? employee.attendanceRecords?.length ?? 0}d
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('leaves')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'leaves'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Leaves & Balances</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          activeTab === 'leaves' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {employee.leaveRequests?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('blockHistory')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'blockHistory'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>Block / Unblock History</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          activeTab === 'blockHistory' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {employee.blockHistories?.length || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('audit')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'audit'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Audit Trail</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Glance Key Metrics Bar (4 Cards spanning full wide layout) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment Role</span>
                    <Briefcase className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">{employee.designation}</div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {employee.departmentName || employee.department?.name || 'General Operations'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift Schedule</span>
                    <Clock className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {employee.shiftStartTime === 'FLEXIBLE'
                      ? 'Flexible Working Hours'
                      : `${formatTo12Hour(employee.shiftStartTime || '10:00')} - ${formatTo12Hour(employee.shiftEndTime || '19:00')}`}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {employee.shiftStartTime === 'FLEXIBLE' ? 'Self-Paced / No Late Mark' : 'Daily Working Window'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Entity</span>
                    <Building2 className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {employee.client?.companyName || 'HQ Direct Staff'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {employee.client?.clientId ? `Client ID: ${employee.client.clientId}` : 'Growth India Internal'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Security</span>
                    <KeyRound className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span>{isBlocked ? 'Login Access Blocked' : 'Workspace Access Active'}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    Login ID: {employee.employeeId}
                  </div>
                </div>
              </div>

              {/* Scrollable Page Body Content */}
              <div className="space-y-6">
                {/* Tab 1: Personal Details */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {/* Workspace Login Credentials & Password Management Card */}
                    <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-emerald-50/40 rounded-3xl border border-teal-200/70 p-6 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>Workspace Login Access</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active Access
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Employee signs in using Employee ID, Phone, or Email
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowResetPasswordModal(true)}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-teal-800 border border-teal-200 rounded-xl font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                          <span>Manage Password</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Employee ID (Login)
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(employee.employeeId, 'empId')}
                              className="text-slate-400 hover:text-teal-700 transition p-0.5 cursor-pointer"
                              title="Copy Employee ID"
                            >
                              {copiedField === 'empId' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-teal-800 font-mono font-bold text-sm select-all">
                            {employee.employeeId}
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Login Phone
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(employee.phone, 'phone')}
                              className="text-slate-400 hover:text-teal-700 transition p-0.5 cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedField === 'phone' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-slate-800 font-mono font-semibold text-sm select-all">
                            {employee.phone || 'N/A'}
                          </span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Login Email
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(employee.personalEmail || employee.user?.email || '', 'email')}
                              className="text-slate-400 hover:text-teal-700 transition p-0.5 cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedField === 'email' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-slate-800 font-mono font-semibold text-sm select-all break-all">
                            {employee.personalEmail || employee.user?.email || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2-Column Responsive Widescreen Grid: Personal Info + Statutory KYC */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* Left Column (7 cols): Personal Info + Address */}
                      <div className="xl:col-span-7 space-y-6">
                        {/* Personal Information Grid */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-teal-600" />
                              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                Personal & Contact Information
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEditModal(true)}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Full Legal Name
                              </span>
                              <span className="font-bold text-slate-900 text-sm block">
                                {employee.fullName}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Parent / Guardian Name
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block">
                                {employee.fatherMotherName || 'Not Provided'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Date of Birth
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block">
                                {employee.dob
                                  ? new Date(employee.dob).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'Not Provided'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Gender / Identity
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block">
                                {employee.gender || 'Not Specified'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Contact Phone
                              </span>
                              <span className="font-semibold font-mono text-slate-800 text-xs block">
                                {employee.phone}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Personal Email
                              </span>
                              <span className="font-semibold text-slate-800 text-xs block break-all">
                                {employee.personalEmail || employee.user?.email || 'Not Provided'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Residential Address Information */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-teal-600" />
                              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                Residential Address Information
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEditModal(true)}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit Address</span>
                            </button>
                          </div>

                          {employee.address &&
                          (employee.address.includes('Temporary:') || employee.address.includes('Permanent:')) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {employee.address.split('\n').map((line: string, idx: number) => {
                                const isTemp = line.startsWith('Temporary:');
                                const isPerm = line.startsWith('Permanent:');
                                const label = isTemp
                                  ? 'Temporary Address'
                                  : isPerm
                                  ? 'Permanent Address'
                                  : 'Address';
                                const val = line.replace(/^(Temporary|Permanent):\s*/, '');
                                return (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1"
                                  >
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                      {label}
                                    </span>
                                    <span className="font-medium text-slate-800 text-xs leading-relaxed block">
                                      {val}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Registered Physical Address
                              </span>
                              <span className="font-medium text-slate-800 text-xs leading-relaxed block">
                                {employee.address || 'No physical address registered'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column (5 cols): Statutory KYC + Employment Snapshot */}
                      <div className="xl:col-span-5 space-y-6">
                        {/* Statutory & KYC Compliance Reference */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs flex flex-col justify-between">
                          <div className="space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-teal-600" />
                                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                                  Statutory KYC Reference
                                </h3>
                              </div>
                              {(isAdminOrHR(user?.role) || user?.role === 'CLIENT') && (
                                <button
                                  type="button"
                                  onClick={() => setShowComplianceModal(true)}
                                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    PAN
                                  </span>
                                  {employee.panNumber && (
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(employee.panNumber, 'pan')}
                                      className="text-slate-400 hover:text-teal-700 transition cursor-pointer"
                                      title="Copy PAN"
                                    >
                                      {copiedField === 'pan' ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-slate-900 text-sm block select-all">
                                  {employee.panMasked || employee.panNumber || 'Not Provided'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">Masked for statutory data security</span>
                              </div>

                              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Aadhaar (UIDAI)
                                  </span>
                                  {employee.aadharNumber && (
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(employee.aadharNumber, 'aadhar')}
                                      className="text-slate-400 hover:text-teal-700 transition cursor-pointer"
                                      title="Copy Aadhaar"
                                    >
                                      {copiedField === 'aadhar' ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-slate-900 text-sm block select-all">
                                  {employee.aadhaarMasked || employee.aadharNumber || 'Not Provided'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">Encrypted compliant registry</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-100 text-xs text-teal-800 flex items-center justify-between">
                            <span className="font-semibold">EPFO & ESIC Records</span>
                            <span className="font-bold">{employee.pfUan ? `UAN: ${employee.pfUan}` : 'UAN not configured'}</span>
                          </div>
                        </div>

                        {/* Employment Terms Snapshot */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <Briefcase className="w-4 h-4 text-teal-600" />
                            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              Employment Snapshot
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</span>
                              <span className="font-bold text-slate-800 block">{employee.employmentType || 'Regular / Full-time'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Location</span>
                              <span className="font-bold text-slate-800 block truncate">{employee.jobLocation || employee.location || 'Headquarters'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Entity</span>
                              <span className="font-bold text-slate-800 block truncate">{employee.client?.companyName || 'Growth India HQ'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Joining Date</span>
                              <span className="font-bold text-slate-800 block">{new Date(employee.joiningDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Job & Client Details */}
                {activeTab === 'job' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left Column (7 cols): Assigned Client + Working Shift */}
                    <div className="xl:col-span-7 space-y-6">
                      {/* Assigned Client Mapping Card */}
                      <div className="p-6 bg-gradient-to-r from-teal-50/70 via-slate-50 to-emerald-50/30 rounded-3xl border border-teal-200 space-y-3 shadow-xs">
                        <span className="text-teal-700 font-bold uppercase tracking-wider text-[11px] block">
                          Assigned Corporate Client / Entity
                        </span>
                        {employee.client ? (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                                <Building2 className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-base">
                                  {employee.client.companyName}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Contact: {employee.client.contactPerson} • {employee.client.mobile}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-teal-800 bg-white px-3.5 py-1.5 rounded-xl border border-teal-200 shadow-xs">
                              {employee.client.clientId}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                            <Building2 className="w-4 h-4 text-teal-600" />
                            <span>Growth India Internal Corporate Account (HQ Staff)</span>
                          </div>
                        )}
                      </div>

                      {/* Working Hours & Shift Timing Timeline */}
                      <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 font-bold text-xs text-slate-900 uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-teal-600" />
                            <span>Working Shift & Punctuality Timeline</span>
                          </div>
                          <span className="text-[11px] font-mono uppercase bg-teal-50 text-teal-800 px-3 py-1 rounded-xl border border-teal-200 font-bold">
                            {employee.shiftStartTime === 'FLEXIBLE'
                              ? 'Flexible Hours (No Late Mark)'
                              : `${formatTo12Hour(employee.shiftStartTime || '10:00')} - ${formatTo12Hour(employee.shiftEndTime || '19:00')}`}
                          </span>
                        </div>

                        {/* Timeline visualization */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between font-mono text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">Expected Check-In</span>
                              <span className="font-bold text-emerald-700 text-sm">
                                {employee.shiftStartTime === 'FLEXIBLE' ? 'Anytime' : formatTo12Hour(employee.shiftStartTime || '10:00')}
                              </span>
                            </div>
                            <div className="text-center font-sans text-xs text-slate-600 font-bold">
                              {employee.shiftStartTime === 'FLEXIBLE'
                                ? 'Self-Paced / Flexible'
                                : 'Daily Working Window'}
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">Expected Check-Out</span>
                              <span className="font-bold text-teal-700 text-sm">
                                {employee.shiftEndTime === 'FLEXIBLE' ? 'Anytime' : formatTo12Hour(employee.shiftEndTime || '19:00')}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-600 h-full w-full rounded-full" />
                          </div>
                        </div>

                        {/* Configure Shift Controls */}
                        {!editingShift ? (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-500">
                              Adjust shift schedule or working hours for this employee
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingShift(true)}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                            >
                              Modify Shift Hours
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-teal-200 space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Shift Start (Check-In)
                                </label>
                                <TimePicker12
                                  value={drawerShiftStart}
                                  onChange={(val) => setDrawerShiftStart(val)}
                                  disabled={drawerShiftStart === 'FLEXIBLE'}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Shift End (Check-Out)
                                </label>
                                <TimePicker12
                                  value={drawerShiftEnd}
                                  onChange={(val) => setDrawerShiftEnd(val)}
                                  disabled={drawerShiftEnd === 'FLEXIBLE'}
                                />
                              </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                              <span className="text-slate-500 font-semibold">Presets:</span>
                              <button
                                type="button"
                                onClick={() => { setDrawerShiftStart('09:30'); setDrawerShiftEnd('18:30'); }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>09:30 AM - 06:30 PM</span>
                                <span className="text-teal-600 font-bold">(9h)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDrawerShiftStart('10:00'); setDrawerShiftEnd('19:00'); }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>10:00 AM - 07:00 PM</span>
                                <span className="text-teal-600 font-bold">(9h)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDrawerShiftStart('11:00'); setDrawerShiftEnd('20:00'); }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>11:00 AM - 08:00 PM</span>
                                <span className="text-teal-600 font-bold">(9h)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (drawerShiftStart === 'FLEXIBLE') {
                                    setDrawerShiftStart('10:00');
                                    setDrawerShiftEnd('19:00');
                                  } else {
                                    setDrawerShiftStart('FLEXIBLE');
                                    setDrawerShiftEnd('FLEXIBLE');
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                                  drawerShiftStart === 'FLEXIBLE'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                                }`}
                              >
                                {drawerShiftStart === 'FLEXIBLE' ? 'Flexible Hours' : 'Set Flexible'}
                              </button>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => setEditingShift(false)}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={savingShift}
                                onClick={handleSaveShift}
                                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                              >
                                {savingShift ? 'Saving...' : 'Save Shift Hours'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column (5 cols): Employment Details Grid + Remarks */}
                    <div className="xl:col-span-5 space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                          <Briefcase className="w-4 h-4 text-teal-600" />
                          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Employment Terms & Deployment
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Department</span>
                            <span className="font-semibold text-slate-900 text-xs block">{employee.departmentName || employee.department?.name || 'General Operations'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Job Designation</span>
                            <span className="font-semibold text-slate-900 text-xs block">{employee.designation}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Work Location</span>
                            <span className="font-semibold text-slate-900 text-xs block">{employee.jobLocation || employee.location || 'Headquarters'}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Official Joining Date</span>
                            <span className="font-semibold text-slate-900 text-xs block">{new Date(employee.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Employment Type</span>
                            <span className="font-semibold text-slate-900 text-xs block">{employee.employmentType}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">System Enrollment Date</span>
                            <span className="font-semibold text-slate-900 text-xs block">{new Date(employee.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {employee.remarks && (
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-2 shadow-xs">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Remarks & Special Notes</span>
                          <p className="font-medium text-slate-800 text-xs leading-relaxed">{employee.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Daily Attendance & Timesheets */}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    {/* Top KPI Ribbon: Attendance & Payroll Impact */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                      {/* Payable Days */}
                      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-emerald-700 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Payable Days</span>
                          <Banknote className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-2xl font-black text-emerald-800">
                          {employee.attendanceSummary?.payableDays ?? 0}d
                        </div>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          Base for Gross Salary
                        </p>
                      </div>

                      {/* Present Days */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Present</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                          {employee.attendanceSummary?.presentDays ?? 0}d
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Full workdays logged
                        </p>
                      </div>

                      {/* Late Arrivals */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Late Punches</span>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600">
                          {employee.attendanceSummary?.lateDays ?? 0}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          After shift window
                        </p>
                      </div>

                      {/* Half Days */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Half Days</span>
                          <Hourglass className="w-3.5 h-3.5 text-orange-500" />
                        </div>
                        <div className="text-2xl font-black text-orange-600">
                          {employee.attendanceSummary?.halfDays ?? 0}d
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          0.5 pay calculated
                        </p>
                      </div>

                      {/* Loss of Pay / Absences */}
                      <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-rose-600 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">LOP / Absent</span>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-2xl font-black text-rose-700">
                          {employee.attendanceSummary?.lopDays ?? 0}d
                        </div>
                        <p className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Salary Deductible
                        </p>
                      </div>

                      {/* Overtime Hours */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Total Overtime</span>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-black text-indigo-700">
                          {employee.attendanceSummary?.totalOvertimeHours ?? 0}h
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          OT pay allowance
                        </p>
                      </div>
                    </div>

                    {/* Attendance Logs Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                      {/* Filter Bar & Action Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-teal-600" />
                            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              Daily Attendance Log & Shift Punches
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Daily check-in / check-out timestamps and hours logged for payroll regularization.
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Month Filter */}
                          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                            <Filter className="w-3.5 h-3.5 text-slate-500" />
                            <select
                              value={attendanceMonth}
                              onChange={(e) => setAttendanceMonth(e.target.value)}
                              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                            >
                              <option value="ALL">All Months</option>
                              {Array.from(new Set(employee.attendanceRecords?.map((r: any) => r.date?.substring(0, 7)).filter(Boolean) || []))
                                .map((m: any) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                          </div>

                          {/* Status Filter */}
                          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                            <select
                              value={attendanceStatusFilter}
                              onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                            >
                              <option value="ALL">All Statuses</option>
                              <option value="PRESENT">Present</option>
                              <option value="LATE">Late</option>
                              <option value="HALF_DAY">Half Day</option>
                              <option value="ON_LEAVE">On Leave</option>
                              <option value="ABSENT">Absent</option>
                            </select>
                          </div>

                          {/* Mark/Regularize Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setAttDate(new Date().toISOString().split('T')[0]);
                              setAttStatus('PRESENT');
                              setAttCheckIn('09:30');
                              setAttCheckOut('18:30');
                              setAttOvertime(0);
                              setAttRemarks('');
                              setShowMarkAttendanceModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mark / Regularize Attendance</span>
                          </button>
                        </div>
                      </div>

                      {/* Table of Daily Records */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="pb-3 pr-4">Date</th>
                              <th className="pb-3 px-4">Punch In</th>
                              <th className="pb-3 px-4">Punch Out</th>
                              <th className="pb-3 px-4">Total Worked</th>
                              <th className="pb-3 px-4">Overtime</th>
                              <th className="pb-3 px-4">Status</th>
                              <th className="pb-3 px-4">Remarks / Source</th>
                              <th className="pb-3 pl-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const filteredRecords = (employee.attendanceRecords || []).filter((r: any) => {
                                if (attendanceMonth !== 'ALL' && !r.date?.startsWith(attendanceMonth)) return false;
                                if (attendanceStatusFilter !== 'ALL' && r.status !== attendanceStatusFilter) return false;
                                return true;
                              });

                              if (filteredRecords.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                                      No attendance records matching the selected filters.
                                    </td>
                                  </tr>
                                );
                              }

                              return filteredRecords.map((r: any) => {
                                const isLate = r.status === 'LATE' || r.isLate;
                                const isHalf = r.status === 'HALF_DAY';
                                const isAbsent = r.status === 'ABSENT';
                                const isLeave = r.status === 'ON_LEAVE';
                                const isPresent = r.status === 'PRESENT';

                                const hours = Math.floor((r.totalWorkMinutes || 0) / 60);
                                const mins = (r.totalWorkMinutes || 0) % 60;

                                return (
                                  <tr key={r.id || r.date} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 pr-4 font-mono font-bold text-slate-900">
                                      <div>{r.date}</div>
                                      <div className="text-[10px] text-slate-400 font-sans font-normal">
                                        {formatFriendlyDate(r.date).split(',')[0]}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                      {formatTimeStr(r.checkInTime)}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                      {formatTimeStr(r.checkOutTime)}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-slate-800">
                                      {r.totalWorkMinutes ? `${hours}h ${mins}m` : '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                      {r.overtimeMinutes ? (
                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                                          +{r.overtimeMinutes}m
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                                          isPresent
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : isLate
                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                            : isHalf
                                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                                            : isLeave
                                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            isPresent ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : isHalf ? 'bg-orange-500' : isLeave ? 'bg-purple-500' : 'bg-rose-500'
                                          }`}
                                        />
                                        <span>{r.status}</span>
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={r.remarks || ''}>
                                      {r.remarks || 'Standard biometric / system punch'}
                                    </td>
                                    <td className="py-3 pl-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAttDate(r.date);
                                          setAttStatus(r.status || 'PRESENT');
                                          if (r.checkInTime) {
                                            const d = new Date(r.checkInTime);
                                            setAttCheckIn(d.toTimeString().substring(0, 5));
                                          }
                                          if (r.checkOutTime) {
                                            const d = new Date(r.checkOutTime);
                                            setAttCheckOut(d.toTimeString().substring(0, 5));
                                          }
                                          setAttOvertime(r.overtimeMinutes || 0);
                                          setAttRemarks(r.remarks || '');
                                          setShowMarkAttendanceModal(true);
                                        }}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Leaves & Balances */}
                {activeTab === 'leaves' && (
                  <div className="space-y-6">
                    {/* Leave Balances Grid (4 Cards) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Casual Leave */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Casual Leave (CL)</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {employee.leaveBalances?.casual?.remaining ?? 12}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">days available</span>
                        </div>
                        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (((employee.leaveBalances?.casual?.used ?? 0) / 12) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1.5">
                          <span>Used: {employee.leaveBalances?.casual?.used ?? 0}d</span>
                          <span>Allocated: 12d</span>
                        </div>
                      </div>

                      {/* Sick Leave */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sick Leave (SL)</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {employee.leaveBalances?.sick?.remaining ?? 10}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">days available</span>
                        </div>
                        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (((employee.leaveBalances?.sick?.used ?? 0) / 10) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1.5">
                          <span>Used: {employee.leaveBalances?.sick?.used ?? 0}d</span>
                          <span>Allocated: 10d</span>
                        </div>
                      </div>

                      {/* Earned / Paid Leave */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paid Leave (EL/PL)</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">
                            {employee.leaveBalances?.earned?.remaining ?? 15}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">days available</span>
                        </div>
                        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (((employee.leaveBalances?.earned?.used ?? 0) / 15) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1.5">
                          <span>Used: {employee.leaveBalances?.earned?.used ?? 0}d</span>
                          <span>Allocated: 15d</span>
                        </div>
                      </div>

                      {/* Loss of Pay / Unpaid */}
                      <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 shadow-2xs relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Loss of Pay (LOP)</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-rose-800">
                            {employee.leaveBalances?.unpaid?.used ?? 0}
                          </span>
                          <span className="text-xs text-rose-600 font-semibold">days logged</span>
                        </div>
                        <div className="mt-3 w-full bg-rose-200/60 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-600 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, ((employee.leaveBalances?.unpaid?.used ?? 0) > 0 ? 100 : 0))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-rose-700 font-bold mt-1.5">
                          <span>Salary Deductible</span>
                          <span>Per-day LOP</span>
                        </div>
                      </div>
                    </div>

                    {/* Payroll Insight Alert Banner */}
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3">
                      <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Payroll Integration Rule: </span>
                        Approved Paid Leaves (Casual, Sick, and Earned Leaves) are included in full monthly salary. Unpaid leaves or Loss of Pay (LOP) days are automatically flagged and deducted proportionally from gross salary during payroll processing.
                      </div>
                    </div>

                    {/* Leave Applications & Approvals */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-teal-600" />
                            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              Leave Applications & Approvals History
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Manage leave requests, review employee reasons, and grant leaves on behalf of staff.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setLeaveType('Casual Leave');
                            setLeaveStartDate(new Date().toISOString().split('T')[0]);
                            setLeaveEndDate(new Date().toISOString().split('T')[0]);
                            setLeaveDays(1);
                            setLeaveReason('');
                            setLeaveAutoApprove(true);
                            setLeaveRemarks('');
                            setShowApplyLeaveModal(true);
                          }}
                          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Grant / Apply Leave</span>
                        </button>
                      </div>

                      {/* Leaves List */}
                      <div className="space-y-3">
                        {(!employee.leaveRequests || employee.leaveRequests.length === 0) ? (
                          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                            No leave applications found for this employee.
                          </div>
                        ) : (
                          employee.leaveRequests.map((l: any) => {
                            const isApproved = l.status === 'APPROVED';
                            const isPending = l.status === 'PENDING';
                            const isRejected = l.status === 'REJECTED';

                            return (
                              <div
                                key={l.id}
                                className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                                  isApproved
                                    ? 'bg-emerald-50/40 border-emerald-200/90'
                                    : isPending
                                    ? 'bg-amber-50/50 border-amber-200'
                                    : 'bg-rose-50/40 border-rose-200'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {l.leaveType}
                                    </span>
                                    <span className="font-mono text-xs text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                                      {l.startDate} → {l.endDate} ({l.totalDays} {l.totalDays === 1 ? 'day' : 'days'})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                        isApproved
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : isPending
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                                      }`}
                                    >
                                      {isApproved ? (
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      ) : isPending ? (
                                        <Clock className="w-3 h-3 text-amber-600" />
                                      ) : (
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                      )}
                                      <span>{l.status}</span>
                                    </span>

                                    {/* Action Buttons for Pending Leave */}
                                    {isPending && (
                                      <div className="flex items-center gap-1.5 ml-2">
                                        <button
                                          type="button"
                                          disabled={actioningLeaveId === l.id}
                                          onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>Approve</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={actioningLeaveId === l.id}
                                          onClick={() => {
                                            setRejectingLeaveId(l.id);
                                            setRejectionReason('');
                                          }}
                                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                                        >
                                          <X className="w-3 h-3" />
                                          <span>Reject</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="text-xs text-slate-700 font-medium">
                                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Reason:</span>
                                  <span>{l.reason}</span>
                                </div>

                                {l.remarks && (
                                  <div className="text-[11px] text-slate-500 bg-white/60 p-2 rounded-xl border border-slate-200">
                                    <span className="font-bold text-slate-700">Management Remarks: </span>
                                    <span>{l.remarks}</span>
                                  </div>
                                )}

                                {l.rejectionReason && (
                                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                                    <span className="font-bold">Rejection Note: </span>
                                    <span>{l.rejectionReason}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                                  <span>Applied on {new Date(l.createdAt).toLocaleDateString()}</span>
                                  {l.reviewedAt && (
                                    <span>Reviewed on {new Date(l.reviewedAt).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Block & Unblock History */}
                {activeTab === 'blockHistory' && (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-rose-600" />
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          Chronological Block & Unblock Records
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                        {employee.blockHistories?.length || 0} Total Actions
                      </span>
                    </div>

                    <div className="space-y-3">
                      {employee.blockHistories?.map((h: any) => {
                        const isBlock = h.actionType === 'BLOCK';
                        return (
                          <div
                            key={h.id}
                            className={`p-4 rounded-2xl border text-xs space-y-2 ${
                              isBlock
                                ? 'bg-rose-50/60 border-rose-200'
                                : 'bg-emerald-50/60 border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isBlock
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {isBlock ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                <span>{h.actionType}</span>
                              </span>

                              <span className="text-[11px] font-mono text-slate-500">
                                {new Date(h.actionDate).toLocaleString()}
                              </span>
                            </div>

                            <div>
                              <div className="font-bold text-slate-900">Reason: {h.reason}</div>
                              {h.remarks && (
                                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                  Remarks: {h.remarks}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                              <div>Action By: <strong className="text-slate-800">{h.actionBy}</strong></div>
                              <div className="font-mono">
                                {h.previousStatus} <ArrowRight className="inline w-3 h-3 text-slate-400 mx-1" /> {h.newStatus}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {employee.blockHistories?.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                          No block or unblock events recorded for this employee.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 4: Audit Information */}
                {activeTab === 'audit' && (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs text-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        System Lifecycle Audit Records
                      </h3>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] block">Created By</span>
                          <span className="font-semibold text-slate-800">{employee.createdBy || 'System Administrator'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] block">Created Date</span>
                          <span className="font-semibold text-slate-800">{new Date(employee.createdAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] block">Last Updated By</span>
                          <span className="font-semibold text-slate-800">{employee.updatedBy || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] block">Last Updated Date</span>
                          <span className="font-semibold text-slate-800">{new Date(employee.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {(employee.blockedBy || employee.unblockedBy) && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <span className="font-extrabold text-slate-900 block border-b pb-1.5">
                          Latest Security Action
                        </span>

                        <div className="grid grid-cols-2 gap-3">
                          {employee.blockedBy && (
                            <>
                              <div>
                                <span className="text-rose-500 font-bold text-[10px] block">Last Blocked By</span>
                                <span className="font-semibold text-slate-800">{employee.blockedBy}</span>
                              </div>
                              <div>
                                <span className="text-rose-500 font-bold text-[10px] block">Last Blocked Date</span>
                                <span className="font-semibold text-slate-800">{new Date(employee.blockedAt).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          {employee.unblockedBy && (
                            <>
                              <div>
                                <span className="text-emerald-600 font-bold text-[10px] block">Last Unblocked By</span>
                                <span className="font-semibold text-slate-800">{employee.unblockedBy}</span>
                              </div>
                              <div>
                                <span className="text-emerald-600 font-bold text-[10px] block">Last Unblocked Date</span>
                                <span className="font-semibold text-slate-800">{new Date(employee.unblockedAt).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* Block Confirmation Modal */}
            {showBlockModal && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                <form
                  onSubmit={handleBlockSubmit}
                  className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center gap-2 text-rose-600 font-black text-base">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Block Employee</span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 font-medium leading-relaxed">
                    <strong>Are you sure you want to block this employee?</strong>
                    <p className="mt-1 text-[11px] text-rose-700">
                      Blocking <span className="font-bold">{employee.fullName} ({employee.employeeId})</span> will immediately disable login access, revoke all active sessions, and restrict all activities.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Block Reason *</label>
                    <select
                      value={blockReason}
                      onChange={(e) => {
                        setBlockReason(e.target.value);
                        if (e.target.value !== 'Other Administrative Reason') {
                          setCustomBlockReason('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
                    >
                      <option value="Disciplinary Policy Breach">Disciplinary Policy Breach</option>
                      <option value="Unauthorized Absence / Absconding">Unauthorized Absence / Absconding</option>
                      <option value="Data Security Risk">Data Security Risk</option>
                      <option value="Employment Termination / Exit">Employment Termination / Exit</option>
                      <option value="Other Administrative Reason">Other Administrative Reason</option>
                    </select>
                  </div>

                  {blockReason === 'Other Administrative Reason' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Specify Administrative Reason *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Compliance Audit, Prolonged Medical Leave..."
                        value={customBlockReason}
                        onChange={(e) => setCustomBlockReason(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Additional Remarks</label>
                    <textarea
                      rows={3}
                      placeholder="Add specific notes, investigation details, or incident summary..."
                      value={blockRemarks}
                      onChange={(e) => setBlockRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBlockModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      {actionLoading ? 'Blocking...' : 'Confirm & Block Employee'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Unblock Confirmation Modal */}
            {showUnblockModal && (
              <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                <form
                  onSubmit={handleUnblockSubmit}
                  className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-base">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Unblock Employee</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium leading-relaxed">
                    <strong>Are you sure you want to unblock this employee?</strong>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Unblocking <span className="font-bold">{employee.fullName} ({employee.employeeId})</span> will restore the employee status to <span className="font-bold text-emerald-800">ACTIVE</span> and re-enable platform login.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unblock Reason / Remarks *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Investigation cleared, reinstated by HR, policy compliance restored..."
                      value={unblockReason}
                      onChange={(e) => setUnblockReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowUnblockModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      {actionLoading ? 'Unblocking...' : 'Confirm & Unblock Employee'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Modal */}
            <EditEmployeeModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              employee={employee}
              onEmployeeUpdated={() => {
                fetchEmployeeDetails();
                onRefresh();
              }}
            />

            {/* Reset Password Modal */}
            <ResetPasswordModal
              isOpen={showResetPasswordModal}
              onClose={() => setShowResetPasswordModal(false)}
              employee={employee}
              onSuccess={() => {
                fetchEmployeeDetails();
                onRefresh();
              }}
            />

            {/* Assign / Edit Salary Modal */}
            {showSalaryModal && (
              <AssignSalaryModal
                isOpen={showSalaryModal}
                onClose={() => setShowSalaryModal(false)}
                employee={{
                  id: employee.id,
                  employeeId: employee.employeeId,
                  fullName: employee.fullName,
                  designation: employee.designation,
                  department: employee.departmentName || employee.department?.name,
                  clientId: employee.clientId || employee.client?.id,
                  panNumber: employee.panNumber,
                  bankName: employee.bankName,
                  bankAccount: employee.bankAccount,
                  bankIfsc: employee.bankIfsc,
                }}
                currentSalaryProfile={
                  employee.salaryAssignments?.[0]
                    ? {
                        assignmentId: employee.salaryAssignments[0].id,
                        structureCode: employee.salaryAssignments[0].structure?.code,
                        structureName: employee.salaryAssignments[0].structure?.name,
                        annualCtc: employee.salaryAssignments[0].annualCtc,
                        monthlyCtc: employee.salaryAssignments[0].monthlyCtc,
                        effectiveFrom: employee.salaryAssignments[0].effectiveFrom,
                        version: employee.salaryAssignments[0].version,
                      }
                    : null
                }
                bankInfo={{
                  bankName: employee.bankName,
                  bankAccount: employee.bankAccount,
                  bankIfsc: employee.bankIfsc,
                }}
                onUpdated={() => {
                  fetchEmployeeDetails();
                  onRefresh();
                  setActionNotice('Salary compensation package updated successfully!');
                  setTimeout(() => setActionNotice(null), 3500);
                }}
              />
            )}

            {/* Edit Compliance Modal */}
            {showComplianceModal && (
              <EditComplianceModal
                isOpen={showComplianceModal}
                onClose={() => setShowComplianceModal(false)}
                employee={{
                  id: employee.id,
                  employeeId: employee.employeeId,
                  fullName: employee.fullName,
                  designation: employee.designation,
                  department: employee.departmentName || employee.department?.name,
                  panNumber: employee.panNumber,
                  panMasked: employee.panMasked,
                  aadhaarMasked: employee.aadhaarMasked,
                  pfUan: employee.pfUan,
                  esiNumber: employee.esiNumber,
                  ptState: employee.ptState,
                  bankName: employee.bankName,
                  bankAccount: employee.bankAccount,
                  bankIfsc: employee.bankIfsc,
                }}
                statutoryInfo={{
                  pan: employee.panNumber,
                  panMasked: employee.panMasked,
                  aadhaarMasked: employee.aadhaarMasked,
                  pfUan: employee.pfUan,
                  esiNumber: employee.esiNumber,
                  ptState: employee.ptState,
                }}
                bankInfo={{
                  bankName: employee.bankName,
                  bankAccount: employee.bankAccount,
                  bankIfsc: employee.bankIfsc,
                }}
                onUpdated={() => {
                  fetchEmployeeDetails();
                  onRefresh();
                  setActionNotice('Statutory compliance and banking details saved successfully!');
                  setTimeout(() => setActionNotice(null), 3500);
                }}
              />
            )}

            {/* Mark / Regularize Attendance Modal */}
            {showMarkAttendanceModal && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowMarkAttendanceModal(false);
                }}
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Mark / Regularize Attendance
                        </h3>
                        <p className="text-[11px] text-slate-500">{employee.fullName} ({employee.employeeId})</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMarkAttendanceModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Attendance Date</label>
                      <input
                        type="date"
                        required
                        value={attDate}
                        onChange={(e) => setAttDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Status</label>
                      <select
                        value={attStatus}
                        onChange={(e: any) => setAttStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="PRESENT">Present (Full Day)</option>
                        <option value="LATE">Late Arrival</option>
                        <option value="HALF_DAY">Half Day (0.5 Pay)</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="ABSENT">Absent (Loss of Pay)</option>
                      </select>
                    </div>

                    {attStatus !== 'ABSENT' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Check In Time</label>
                          <input
                            type="time"
                            value={attCheckIn}
                            onChange={(e) => setAttCheckIn(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Check Out Time</label>
                          <input
                            type="time"
                            value={attCheckOut}
                            onChange={(e) => setAttCheckOut(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Overtime Minutes (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="15"
                        value={attOvertime}
                        onChange={(e) => setAttOvertime(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 60 for 1 hour"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Remarks / Justification</label>
                      <input
                        type="text"
                        value={attRemarks}
                        onChange={(e) => setAttRemarks(e.target.value)}
                        placeholder="e.g. Biometric misread / Approved manual regularization"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowMarkAttendanceModal(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAttendance}
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        {savingAttendance ? 'Saving...' : 'Save Attendance'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Grant / Apply Leave Modal */}
            {showApplyLeaveModal && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowApplyLeaveModal(false);
                }}
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Grant / Apply Leave
                        </h3>
                        <p className="text-[11px] text-slate-500">{employee.fullName} ({employee.employeeId})</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApplyLeaveModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleGrantLeave} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Leave Category</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="Casual Leave">Casual Leave (CL) - Paid</option>
                        <option value="Sick Leave">Sick Leave (SL) - Paid</option>
                        <option value="Earned Leave">Earned / Paid Leave (EL/PL) - Paid</option>
                        <option value="Loss of Pay">Loss of Pay (LOP) - Unpaid (Deducted in Salary)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">From Date</label>
                        <input
                          type="date"
                          required
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">To Date</label>
                        <input
                          type="date"
                          required
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Total Days</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        required
                        value={leaveDays}
                        onChange={(e) => setLeaveDays(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Reason for Leave *</label>
                      <textarea
                        required
                        rows={2}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Provide details about the leave request..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-teal-50/60 rounded-xl border border-teal-200/80">
                      <input
                        type="checkbox"
                        id="leaveAutoApprove"
                        checked={leaveAutoApprove}
                        onChange={(e) => setLeaveAutoApprove(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <label htmlFor="leaveAutoApprove" className="text-xs font-bold text-teal-900 cursor-pointer select-none">
                        Auto-Approve & Synchronize to Attendance Master
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowApplyLeaveModal(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingLeave}
                        className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        {savingLeave ? 'Granting...' : 'Grant Leave'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reject Leave Request Modal */}
            {rejectingLeaveId && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setRejectingLeaveId(null);
                }}
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-rose-700">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <h3 className="font-bold text-slate-900 text-sm">
                        Reject Leave Application
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRejectingLeaveId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Please provide the reason for rejecting this leave request. This will be recorded in the audit trail.
                  </p>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Rejection Reason *</label>
                    <textarea
                      required
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Critical project deadline / High operational workload"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRejectingLeaveId(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!rejectionReason.trim() || actioningLeaveId === rejectingLeaveId}
                      onClick={() => handleReviewLeave(rejectingLeaveId, 'REJECTED', rejectionReason)}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {actioningLeaveId === rejectingLeaveId ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </main>
      </div>
    </div>
  );
};
