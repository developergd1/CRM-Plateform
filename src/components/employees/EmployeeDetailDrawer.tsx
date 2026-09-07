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
        setActionNotice(`🔒 ${employee.fullName} (${employee.employeeId}) has been BLOCKED.`);
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
        setActionNotice(`✅ ${employee.fullName} (${employee.employeeId}) is now UNBLOCKED & ACTIVE.`);
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
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-growth-teal" />
          </div>
        ) : !employee ? (
          <div className="p-8 text-center text-slate-500">Employee profile not found.</div>
        ) : (
          <>
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-growth-teal to-growth-gold flex items-center justify-center font-black text-xl text-white shadow-md">
                  {employee.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-growth-gold bg-amber-950/80 px-2.5 py-0.5 rounded border border-growth-gold/30">
                      {employee.employeeId}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isBlocked
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : employee.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                      }`}
                    >
                      {employee.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1 text-white tracking-tight">
                    {employee.fullName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {employee.designation} • {employee.departmentName || employee.department?.name || 'General'}
                  </p>
                </div>
              </div>

              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Bar: Edit, Reset Password & Block/Unblock Button */}
            <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5 text-growth-teal" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => setShowResetPasswordModal(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
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
                        onClick={() => setShowUnblockModal(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock Employee</span>
                      </button>
                    ) : (employee.employeeId === 'GI-EMP-000001' || employee.user?.role?.name === 'SUPER_ADMIN' || employee.employeeId === user?.employeeId) ? (
                      <span
                        className="px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 select-none cursor-default"
                        title="Super Admin and active user sessions cannot be blocked"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Protected Account</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowBlockModal(true)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
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
            <div className="flex border-b border-slate-200 px-6 pt-3 bg-white overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-growth-teal text-growth-teal'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Personal Details
              </button>

              <button
                onClick={() => setActiveTab('job')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'job'
                    ? 'border-growth-teal text-growth-teal'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Client & Job Details
              </button>

              <button
                onClick={() => setActiveTab('blockHistory')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'blockHistory'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Block/Unblock History ({employee.blockHistories?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'border-growth-teal text-growth-teal'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Audit Trail</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tab 1: Personal Details */}
              {activeTab === 'profile' && (
                <div className="space-y-4 text-xs">
                  {/* Workspace Login Credentials & Password Management */}
                  <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-growth-teal/20 border border-growth-teal/30 text-growth-teal flex items-center justify-center">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>Workspace Login Credentials</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Employee can sign in using their Email, Mobile, or Employee ID
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowResetPasswordModal(true)}
                        className="px-3 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-glow transition-all flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Assign / Reset Password</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] font-mono">
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block font-semibold">Login Email:</span>
                        <span className="text-teal-400 font-bold break-all select-all">
                          {employee.personalEmail || employee.user?.email || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block font-semibold">Employee ID:</span>
                        <span className="text-growth-gold font-bold select-all">{employee.employeeId}</span>
                      </div>
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-sans block font-semibold">Login Mobile:</span>
                        <span className="text-slate-200 font-bold select-all">{employee.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Full Legal Name</span>
                      <span className="font-bold text-slate-900 text-sm">{employee.fullName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Father&apos;s / Mother&apos;s Name</span>
                      <span className="font-semibold text-slate-800">{employee.fatherMotherName || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Date of Birth</span>
                      <span className="font-semibold text-slate-800">
                        {employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Not Provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Gender</span>
                      <span className="font-semibold text-slate-800">{employee.gender || 'Not Specified'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Phone Number</span>
                      <span className="font-semibold text-slate-800">{employee.phone}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Email</span>
                      <span className="font-semibold text-slate-800">{employee.personalEmail || employee.user?.email || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">PAN Reference</span>
                      <span className="font-mono font-bold text-slate-800">{employee.panMasked || employee.panNumber || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Aadhar Reference</span>
                      <span className="font-mono font-bold text-slate-800">{employee.aadhaarMasked || employee.aadharNumber || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Account Status</span>
                      <span className="font-bold text-slate-900">{employee.status}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    {employee.address && (employee.address.includes('Temporary:') || employee.address.includes('Permanent:')) ? (
                      <div className="space-y-2">
                        {employee.address.split('\n').map((line: string, idx: number) => {
                          const isTemp = line.startsWith('Temporary:');
                          const isPerm = line.startsWith('Permanent:');
                          const label = isTemp ? 'Temporary Address' : isPerm ? 'Permanent Address' : 'Address';
                          const val = line.replace(/^(Temporary|Permanent):\s*/, '');
                          return (
                            <div key={idx} className="border-b border-slate-200/60 last:border-b-0 pb-1.5 last:pb-0">
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">{label}</span>
                              <span className="font-medium text-slate-800 leading-relaxed">{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Address</span>
                        <span className="font-medium text-slate-800 leading-relaxed">{employee.address || 'No physical address registered'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Job & Client Details */}
              {activeTab === 'job' && (
                <div className="space-y-4 text-xs">
                  {/* Working Hours & Shift Timing Timeline */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-teal-400">
                        <Clock className="w-4 h-4 text-growth-teal" />
                        <span>Working Hours & Shift Timeline</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-slate-800 text-teal-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
                        {employee.shiftStartTime === 'FLEXIBLE'
                          ? 'Flexible Hours (No Late Penalty)'
                          : `${formatTo12Hour(employee.shiftStartTime || '10:00')} - ${formatTo12Hour(employee.shiftEndTime || '19:00')}`}
                      </span>
                    </div>

                    {/* Timeline visualization */}
                    <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Check-In Window</span>
                          <span className="font-bold text-emerald-400">
                            {employee.shiftStartTime === 'FLEXIBLE' ? 'Anytime' : formatTo12Hour(employee.shiftStartTime || '10:00')}
                          </span>
                        </div>
                        <div className="text-center font-sans text-[11px] text-slate-300 font-bold">
                          {employee.shiftStartTime === 'FLEXIBLE'
                            ? 'Self-Paced / Flexible'
                            : 'Daily Scheduled Window'}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-sans">Check-Out Expected</span>
                          <span className="font-bold text-teal-400">
                            {employee.shiftEndTime === 'FLEXIBLE' ? 'Anytime' : formatTo12Hour(employee.shiftEndTime || '19:00')}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 h-full w-full rounded-full" />
                      </div>
                    </div>

                    {/* Configure Shift Controls */}
                    {!editingShift ? (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          Configure or adjust working hours for this employee
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingShift(true)}
                          className="px-3 py-1.5 bg-growth-teal hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm"
                        >
                          Decide Shift Timing
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950 rounded-xl border border-teal-800/50 space-y-3 animate-in fade-in">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Shift Start (Check-In)
                            </label>
                            <TimePicker12
                              value={drawerShiftStart}
                              onChange={(val) => setDrawerShiftStart(val)}
                              disabled={drawerShiftStart === 'FLEXIBLE'}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
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
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-slate-400 font-semibold">Presets:</span>
                          <button
                            type="button"
                            onClick={() => { setDrawerShiftStart('09:30'); setDrawerShiftEnd('18:30'); }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                          >
                            <span>09:30 AM - 06:30 PM</span>
                            <span className="text-teal-400 text-[9px]">(9h)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDrawerShiftStart('10:00'); setDrawerShiftEnd('19:00'); }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                          >
                            <span>10:00 AM - 07:00 PM</span>
                            <span className="text-teal-400 text-[9px]">(9h)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDrawerShiftStart('11:00'); setDrawerShiftEnd('20:00'); }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                          >
                            <span>11:00 AM - 08:00 PM</span>
                            <span className="text-teal-400 text-[9px]">(9h)</span>
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
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${
                              drawerShiftStart === 'FLEXIBLE'
                                ? 'bg-growth-teal text-slate-950 shadow-sm'
                                : 'bg-teal-950/60 text-teal-300 border border-teal-800/60 hover:bg-teal-900/60'
                            }`}
                          >
                            {drawerShiftStart === 'FLEXIBLE' ? '✓ Flexible Hours' : 'Set Flexible (No Late)'}
                          </button>
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setEditingShift(false)}
                            className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingShift}
                            onClick={handleSaveShift}
                            className="px-4 py-1 bg-growth-teal text-slate-950 rounded-lg text-xs font-bold hover:bg-teal-400 transition"
                          >
                            {savingShift ? 'Saving...' : 'Save Shift Timeline'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Client Mapping */}
                  <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200">
                    <span className="text-teal-700 font-bold uppercase text-[10px] block mb-1">Assigned Client / Company</span>
                    {employee.client ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{employee.client.companyName}</div>
                          <div className="text-[11px] text-slate-500">Contact: {employee.client.contactPerson} • {employee.client.mobile}</div>
                        </div>
                        <span className="font-mono text-xs font-bold text-growth-teal bg-white px-2.5 py-1 rounded-xl border border-teal-200">
                          {employee.client.clientId}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-700">Growth India Internal Corporate Account</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Department</span>
                      <span className="font-semibold text-slate-800">{employee.departmentName || employee.department?.name || 'General'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Designation</span>
                      <span className="font-semibold text-slate-800">{employee.designation}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Job Location</span>
                      <span className="font-semibold text-slate-800">{employee.jobLocation || employee.location || 'Headquarters'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Date of Joining</span>
                      <span className="font-semibold text-slate-800">{new Date(employee.joiningDate).toLocaleDateString()}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Employment Type</span>
                      <span className="font-semibold text-slate-800">{employee.employmentType}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">System Created Date</span>
                      <span className="font-semibold text-slate-800">{new Date(employee.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {employee.remarks && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Remarks & Notes</span>
                      <span className="font-medium text-slate-800">{employee.remarks}</span>
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
