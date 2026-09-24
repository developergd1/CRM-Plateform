'use client';

import React, { useState, useEffect } from 'react';
import {
  UserMinus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Laptop,
  Briefcase,
  FileText,
  DollarSign,
  Search,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  Building2,
  Calendar,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface OffboardingCase {
  id: string;
  employeeId: string;
  fullName: string;
  clientName?: string;
  department?: string;
  designation?: string;
  noticeStartDate: string;
  lastWorkingDay: string;
  status: 'INITIATED' | 'IN_PROGRESS' | 'CLEARED' | 'COMPLETED';
  fnfStatus: 'PENDING' | 'IN_REVIEW' | 'SETTLED';
  clearances: {
    clientRelease: boolean;
    managerKT: boolean;
    tasksHandover: boolean;
    assetReturn: boolean;
    documentsRelieving: boolean;
  };
  exitInterviewCompleted: boolean;
}

export const OffboardingView: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<OffboardingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<OffboardingCase | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isExitInterviewOpen, setIsExitInterviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Exit interview form
  const [interviewForm, setInterviewForm] = useState({
    primaryReason: 'Career Advancement / Better Opportunity',
    experienceRating: 5,
    managerFeedback: '',
    workCultureFeedback: '',
    recommendCompany: true,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOffboardingCases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees/offboarding');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error('Failed to load offboarding cases', err);
      showToast('Failed to load offboarding pipeline', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffboardingCases();
  }, []);

  const handleToggleClearance = async (key: keyof OffboardingCase['clearances']) => {
    if (!selectedCase) return;
    setActionLoading(true);

    const updatedClearances = {
      ...selectedCase.clearances,
      [key]: !selectedCase.clearances[key],
    };

    try {
      const res = await fetch('/api/employees/offboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase.id,
          clearances: updatedClearances,
        }),
      });

      if (res.ok) {
        setSelectedCase({ ...selectedCase, clearances: updatedClearances });
        showToast('Clearance checklist updated');
        fetchOffboardingCases();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update clearance', 'error');
      }
    } catch (err) {
      showToast('Network error while updating clearance', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExitInterviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/employees/offboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: selectedCase.id,
          exitInterview: interviewForm,
        }),
      });

      if (res.ok) {
        showToast('Exit interview feedback recorded');
        setIsExitInterviewOpen(false);
        fetchOffboardingCases();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to record exit interview', 'error');
      }
    } catch (err) {
      showToast('Network error submitting exit interview', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    return (
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.employeeId.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getClearanceProgress = (clearances: OffboardingCase['clearances']) => {
    const total = 5;
    const completed = Object.values(clearances).filter(Boolean).length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 bg-rose-50 text-rose-800 border-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Offboarding & Exit Clearances
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                5-Point Clearance
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage client release, manager sign-offs, asset recovery, exit interviews, and final settlements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOffboardingCases}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">
          {filteredCases.length} active exit case(s)
        </span>
      </div>

      {/* Offboarding Cases Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs animate-pulse">
            Loading offboarding cases...
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Active Offboarding Cases</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All staff are active. When an employee is moved to &apos;ON_NOTICE&apos; or &apos;OFFBOARDING&apos;, their case appears here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Client / Dept</th>
                  <th className="py-3 px-4">Notice Dates</th>
                  <th className="py-3 px-4">Clearance Status</th>
                  <th className="py-3 px-4">Exit Interview</th>
                  <th className="py-3 px-4">FNF Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCases.map((c) => {
                  const progress = getClearanceProgress(c.clearances);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{c.fullName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{c.employeeId}</div>
                      </td>

                      {/* Client / Dept */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-semibold">{c.clientName || 'Internal'}</div>
                        <div className="text-[11px] text-slate-500">{c.department || 'Operations'}</div>
                      </td>

                      {/* Notice Dates */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-600">Start: {c.noticeStartDate}</div>
                        <div className="text-rose-600 font-bold">LWD: {c.lastWorkingDay}</div>
                      </td>

                      {/* Clearance Progress */}
                      <td className="py-3.5 px-4">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-500">{progress.completed}/5 Signed</span>
                            <span className="text-growth-teal">{progress.percent}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-growth-teal rounded-full transition-all"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Exit Interview */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.exitInterviewCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedCase(c);
                              setIsExitInterviewOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 transition-all cursor-pointer"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            Take Interview
                          </button>
                        )}
                      </td>

                      {/* FNF Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            c.fnfStatus === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.fnfStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setIsChecklistModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-growth-teal font-bold text-xs rounded-xl border border-teal-200 transition-all cursor-pointer"
                        >
                          Checklist (5)
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5-Point Clearance Modal */}
      {isChecklistModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Department Clearances</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCase.fullName} ({selectedCase.employeeId}) &bull; LWD: {selectedCase.lastWorkingDay}
                </p>
              </div>
              <button
                onClick={() => setIsChecklistModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Client Release */}
              <div
                onClick={() => handleToggleClearance('clientRelease')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCase.clearances.clientRelease
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-growth-teal" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      1. Client Release & Project Handover
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Formal project transition and client manager sign-off.
                    </p>
                  </div>
                </div>
                {selectedCase.clearances.clientRelease ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* 2. Manager KT */}
              <div
                onClick={() => handleToggleClearance('managerKT')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCase.clearances.managerKT
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      2. Manager Knowledge Transfer (KT)
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Documentation, credentials transfer, and code/design review.
                    </p>
                  </div>
                </div>
                {selectedCase.clearances.managerKT ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* 3. Tasks Handover */}
              <div
                onClick={() => handleToggleClearance('tasksHandover')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCase.clearances.tasksHandover
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      3. Pending Tasks & Ticket Reassignments
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      All active CRM tickets and milestones reassigned to peers.
                    </p>
                  </div>
                </div>
                {selectedCase.clearances.tasksHandover ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* 4. Asset Return */}
              <div
                onClick={() => handleToggleClearance('assetReturn')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCase.clearances.assetReturn
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Laptop className="w-4 h-4 text-growth-teal" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      4. Asset & Hardware Return
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Laptop, access card, peripherals, and company SIM card returned.
                    </p>
                  </div>
                </div>
                {selectedCase.clearances.assetReturn ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* 5. Documents & Relieving */}
              <div
                onClick={() => handleToggleClearance('documentsRelieving')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCase.clearances.documentsRelieving
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      5. Documents & Final Settlement (FNF)
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Relieving letter issued, experience letter, and payroll clearance.
                    </p>
                  </div>
                </div>
                {selectedCase.clearances.documentsRelieving ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setIsChecklistModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Interview Modal */}
      {isExitInterviewOpen && selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Exit Interview Form</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCase.fullName} ({selectedCase.employeeId})
                </p>
              </div>
              <button
                onClick={() => setIsExitInterviewOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExitInterviewSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Primary Reason for Leaving *
                </label>
                <select
                  value={interviewForm.primaryReason}
                  onChange={(e) => setInterviewForm({ ...interviewForm, primaryReason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                >
                  <option value="Career Advancement / Better Opportunity">
                    Career Advancement / Better Opportunity
                  </option>
                  <option value="Higher Compensation / Benefits">
                    Higher Compensation / Benefits
                  </option>
                  <option value="Relocation / Personal / Family Reasons">
                    Relocation / Personal / Family Reasons
                  </option>
                  <option value="Role Fit / Project Scope">
                    Role Fit / Project Scope
                  </option>
                  <option value="Higher Education">Higher Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Overall Experience Rating (1-5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setInterviewForm({ ...interviewForm, experienceRating: star })}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        interviewForm.experienceRating >= star
                          ? 'bg-amber-50 border-amber-300 text-amber-700 font-black'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Manager & Team Feedback
                </label>
                <textarea
                  rows={2}
                  placeholder="Feedback on leadership, communication, mentorship..."
                  value={interviewForm.managerFeedback}
                  onChange={(e) => setInterviewForm({ ...interviewForm, managerFeedback: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Workplace & Culture Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Suggestions for improving organizational culture..."
                  value={interviewForm.workCultureFeedback}
                  onChange={(e) => setInterviewForm({ ...interviewForm, workCultureFeedback: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExitInterviewOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Recording...' : 'Submit Interview'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
