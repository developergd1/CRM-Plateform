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
  KeyRound,
  Sparkles,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react';
import { isAdminOrHR } from '@/lib/rbac';
import { EditEmployeeModal } from './EditEmployeeModal';
import { TimePicker12, formatTo12Hour } from '@/components/common/TimePicker12';
import { ResetPasswordModal } from './ResetPasswordModal';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'job' | 'blockHistory' | 'audit'>('profile');

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-50/70 h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
          </div>
        ) : !employee ? (
          <div className="p-8 text-center text-slate-500">Employee profile not found.</div>
        ) : (
          <>
            {/* Drawer Header */}
            <div className="p-6 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-black text-2xl text-white shadow-md shrink-0 ring-4 ring-teal-50">
                    {employee.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 select-all">
                        {employee.employeeId}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                          isBlocked
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : employee.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? 'bg-rose-500' : employee.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{employee.status}</span>
                      </span>
                      {employee.client && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-teal-600" />
                          <span className="truncate max-w-[150px]">{employee.client.companyName}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 truncate">
                      {employee.fullName}
                    </h2>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{employee.designation}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{employee.departmentName || employee.department?.name || 'General Operations'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Bar: Edit, Reset Password & Block/Unblock */}
            <div className="bg-slate-50/80 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-teal-600" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(true)}
                  className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                  <span>Assign / Reset Password</span>
                </button>
              </div>

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
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock Employee</span>
                      </button>
                    ) : (employee.employeeId === 'GI-EMP-000001' || employee.user?.role?.name === 'SUPER_ADMIN' || employee.employeeId === user?.employeeId) ? (
                      <span
                        className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 select-none cursor-default"
                        title="Super Admin and active user sessions cannot be blocked"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Protected Account</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowBlockModal(true)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Block Employee</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Global Notice banner */}
            {actionNotice && (
              <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-6 pt-3 bg-white overflow-x-auto gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'profile'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('job')}
                className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'job'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Client & Job Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blockHistory')}
                className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'blockHistory'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Block/Unblock History</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                  {employee.blockHistories?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`pb-2.5 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-teal-600 text-teal-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Tab 1: Personal Details */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  {/* Workspace Login Credentials & Password Management Card */}
                  <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-emerald-50/40 rounded-2xl border border-teal-200/70 p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>Workspace Login Access</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active Access
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Employee signs in using Employee ID, Phone, or Email
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowResetPasswordModal(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-teal-800 border border-teal-200 rounded-xl font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                        <span>Manage Password</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs relative group">
                        <div className="flex items-center justify-between mb-1">
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
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-teal-800 font-mono font-bold text-xs select-all">
                          {employee.employeeId}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs relative group">
                        <div className="flex items-center justify-between mb-1">
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
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-slate-800 font-mono font-semibold text-xs select-all">
                          {employee.phone || 'N/A'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs relative group">
                        <div className="flex items-center justify-between mb-1">
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
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-slate-800 font-mono font-semibold text-xs select-all break-all">
                          {employee.personalEmail || employee.user?.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <User className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Personal & Contact Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
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

                  {/* Statutory & KYC Compliance Reference */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Statutory KYC & Compliance Reference
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Permanent Account Number (PAN)
                          </span>
                          {employee.panNumber && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(employee.panNumber, 'pan')}
                              className="text-slate-400 hover:text-teal-700 transition cursor-pointer"
                              title="Copy PAN"
                            >
                              {copiedField === 'pan' ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs block select-all">
                          {employee.panMasked || employee.panNumber || 'Not Provided'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Masked for statutory data security</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Aadhaar Reference (UIDAI)
                          </span>
                          {employee.aadharNumber && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(employee.aadharNumber, 'aadhar')}
                              className="text-slate-400 hover:text-teal-700 transition cursor-pointer"
                              title="Copy Aadhaar"
                            >
                              {copiedField === 'aadhar' ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs block select-all">
                          {employee.aadhaarMasked || employee.aadharNumber || 'Not Provided'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Stored in compliant encrypted registry</span>
                      </div>
                    </div>
                  </div>

                  {/* Residential Address Information */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Residential Address Information
                      </h3>
                    </div>

                    {employee.address &&
                    (employee.address.includes('Temporary:') || employee.address.includes('Permanent:')) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
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
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
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
              )}

              {/* Tab 2: Job & Client Details */}
              {activeTab === 'job' && (
                <div className="space-y-4">
                  {/* Assigned Client Mapping Card */}
                  <div className="p-5 bg-gradient-to-r from-teal-50/70 via-slate-50 to-emerald-50/30 rounded-2xl border border-teal-200 space-y-2.5 shadow-xs">
                    <span className="text-teal-700 font-bold uppercase tracking-wider text-[11px] block">
                      Assigned Corporate Client / Entity
                    </span>
                    {employee.client ? (
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {employee.client.companyName}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Contact: {employee.client.contactPerson} • {employee.client.mobile}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-teal-800 bg-white px-3 py-1 rounded-xl border border-teal-200 shadow-xs">
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

                  {/* Working Hours & Shift Timing Timeline (Light Modern Theme!) */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <span>Working Shift & Punctuality Timeline</span>
                      </div>
                      <span className="text-[11px] font-mono uppercase bg-teal-50 text-teal-800 px-3 py-1 rounded-lg border border-teal-200 font-bold">
                        {employee.shiftStartTime === 'FLEXIBLE'
                          ? 'Flexible Hours (No Late Mark)'
                          : `${formatTo12Hour(employee.shiftStartTime || '10:00')} - ${formatTo12Hour(employee.shiftEndTime || '19:00')}`}
                      </span>
                    </div>

                    {/* Timeline visualization */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
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
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
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
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer"
                        >
                          Modify Shift Hours
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-teal-200 space-y-3 animate-in fade-in">
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

                  {/* Employment Details Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Briefcase className="w-4 h-4 text-teal-600" />
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Employment Terms & Deployment
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
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
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Remarks & Special Notes</span>
                      <p className="font-medium text-slate-800 text-xs leading-relaxed">{employee.remarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Block & Unblock History */}
              {activeTab === 'blockHistory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Chronological Block & Unblock Records
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
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
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="font-extrabold text-slate-900 block border-b pb-1.5">
                      System Lifecycle Audit Records
                    </span>

                    <div className="grid grid-cols-2 gap-3">
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
          </>
        )}
      </div>
    </div>
  );
};
