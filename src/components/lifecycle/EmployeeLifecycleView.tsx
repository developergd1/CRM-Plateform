'use client';

import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  UserCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  Archive,
  CheckCircle2,
  Calendar,
  Building2,
  Search,
  Filter,
  RefreshCw,
  History,
  Shield,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface EmployeeLifecycleItem {
  id: string;
  employeeId: string;
  fullName: string;
  department?: string;
  designation?: string;
  clientName?: string;
  lifecycleStage: 'PREBOARDING' | 'ONBOARDING' | 'PROBATION' | 'ACTIVE' | 'ON_NOTICE' | 'EXIT_INITIATED' | 'OFFBOARDING' | 'EXITED' | 'ARCHIVED';
  stageChangedAt: string;
  lastReason?: string;
}

const STAGES = [
  { key: 'PREBOARDING', label: 'Preboarding', color: 'border-blue-200 bg-blue-50/50 text-blue-800', badge: 'bg-blue-100 text-blue-800' },
  { key: 'ONBOARDING', label: 'Onboarding', color: 'border-[#0D9488]/30 bg-[#0D9488]/10 text-[#0D9488]', badge: 'bg-[#0D9488]/15 text-[#0D9488]' },
  { key: 'PROBATION', label: 'Probation', color: 'border-amber-200 bg-amber-50/50 text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  { key: 'ACTIVE', label: 'Active Staff', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
  { key: 'ON_NOTICE', label: 'On Notice', color: 'border-orange-200 bg-orange-50/50 text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  { key: 'EXIT_INITIATED', label: 'Exit Initiated', color: 'border-orange-300 bg-orange-50/50 text-orange-900', badge: 'bg-orange-100 text-orange-900' },
  { key: 'OFFBOARDING', label: 'Offboarding', color: 'border-slate-300 bg-slate-100 text-slate-800', badge: 'bg-slate-200 text-slate-800' },
  { key: 'EXITED', label: 'Exited', color: 'border-rose-200 bg-rose-50/50 text-rose-800', badge: 'bg-rose-100 text-rose-800' },
  { key: 'ARCHIVED', label: 'Archived', color: 'border-slate-200 bg-slate-50/50 text-slate-700', badge: 'bg-slate-200 text-slate-700' },
];

interface EmployeeLifecycleViewProps {
  onView360?: (employeeId: string) => void;
}

export const EmployeeLifecycleView: React.FC<EmployeeLifecycleViewProps> = ({ onView360 }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeLifecycleItem[]>([]);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Transition Modal State
  const [selectedEmp, setSelectedEmp] = useState<EmployeeLifecycleItem | null>(null);
  const [targetStage, setTargetStage] = useState<string>('ACTIVE');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transitionReason, setTransitionReason] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // History Drawer State
  const [historyTarget, setHistoryTarget] = useState<EmployeeLifecycleItem | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLifecycleEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees/lifecycle');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load lifecycle employees', err);
      showToast('Failed to load lifecycle stage board', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => {
    fetchLifecycleEmployees();
    fetchClients();
  }, []);

  const openTransitionModal = (emp: EmployeeLifecycleItem) => {
    setSelectedEmp(emp);
    // Suggest logical next stage
    const currentIndex = STAGES.findIndex((s) => s.key === emp.lifecycleStage);
    const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1].key : 'ACTIVE';
    setTargetStage(nextStage);
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setTransitionReason('');
    setIsModalOpen(true);
  };

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/employees/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmp.id,
          stage: targetStage,
          effectiveDate,
          reason: transitionReason,
        }),
      });

      if (res.ok) {
        showToast(`${selectedEmp.fullName} transitioned to stage ${targetStage}`);
        setIsModalOpen(false);
        setSelectedEmp(null);
        fetchLifecycleEmployees();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update lifecycle stage', 'error');
      }
    } catch (err) {
      showToast('Network error while transitioning stage', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchEmployeeHistory = async (emp: EmployeeLifecycleItem) => {
    setHistoryTarget(emp);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/employees/lifecycle?employeeId=${emp.id}&history=true`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesClient = !clientFilter || emp.clientName === clientFilter;
    return matchesSearch && matchesClient;
  });

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
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Employee Lifecycle Engine
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                7-Stage Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Track workforce progression from Onboarding through Active service, Notice periods, to controlled Archival.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLifecycleEmployees}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh Board</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.companyName}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 9-Stage Pipeline Board */}
      <div className="flex gap-3.5 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageEmployees = filteredEmployees.filter(
            (emp) => (emp.lifecycleStage || 'ACTIVE') === stage.key
          );

          return (
            <div
              key={stage.key}
              className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col min-w-[220px] max-w-[240px] shadow-sm shrink-0"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-800">{stage.label}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${stage.badge}`}
                >
                  {stageEmployees.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {stageEmployees.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400 font-medium italic">
                    No staff in this stage
                  </div>
                ) : (
                  stageEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 transition-all hover:shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {emp.fullName}
                          </h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {emp.employeeId}
                          </span>
                        </div>
                        <button
                          onClick={() => fetchEmployeeHistory(emp)}
                          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="View Stage History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div className="truncate font-semibold text-slate-700">
                          {emp.designation || 'Staff Member'}
                        </div>
                        <div className="truncate text-[#0D9488] font-medium">
                          {emp.clientName || 'Internal'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        {onView360 && (
                          <button
                            onClick={() => onView360(emp.employeeId)}
                            className="text-[10px] font-bold text-slate-500 hover:text-[#0D9488] transition-colors cursor-pointer"
                            title="Open Employee 360"
                          >
                            360 Profile
                          </button>
                        )}
                        {isAdminOrHR(user?.role) && (
                          <button
                            onClick={() => openTransitionModal(emp)}
                            className="flex items-center gap-1 text-[10px] font-black text-[#0D9488] hover:text-[#0F766E] transition-colors cursor-pointer ml-auto"
                          >
                            <span>Move Stage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition Modal */}
      {isModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Transition Lifecycle Stage</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedEmp.fullName} &bull; Current: {selectedEmp.lifecycleStage}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransitionSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Stage *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Effective Date *</label>
                <input
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Justification / Audit Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Probation cleared successfully, Resignation submitted, Clearance completed..."
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                />
              </div>

              {targetStage === 'ARCHIVED' && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 font-medium">
                  <strong>Notice:</strong> Archiving removes the employee from active punch and payroll lists while strictly retaining their historical attendance, leave records, and timesheets.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Transitioning...' : 'Confirm Stage Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto space-y-4 animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Lifecycle Audit History</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {historyTarget.fullName} ({historyTarget.employeeId})
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                Loading audit trail...
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">
                No previous stage changes recorded.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pt-2">
                {historyLogs.map((log, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-growth-teal border-2 border-white shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {log.fromStage || 'INITIAL'} &rarr; {log.toStage}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(log.createdAt).toLocaleString()} &bull; by {log.changedBy || 'System'}
                      </div>
                      {log.reason && (
                        <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {log.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
