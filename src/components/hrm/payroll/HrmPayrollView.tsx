'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  Lock,
  Play,
  Check,
  ChevronRight,
  Download,
  Printer,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Sliders,
  Receipt,
  CreditCard,
  Building,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  PayrollPeriodItem,
  PayrollRecordItem,
  SalaryStructureItem,
  SalaryComponentItem,
  EmployeeSalaryAssignmentItem,
  ReimbursementClaimItem,
  EmployeeLoanItem,
  StatutoryRuleItem,
  ControlledAdjustmentItem,
  PayrollExceptionItem,
} from '@/types/hrm';

export const HrmPayrollView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'periods' | 'records' | 'structures' | 'components' | 'assignments' | 'adjustments' | 'exceptions' | 'compliance' | 'payslips' | 'reimbursements' | 'loans'
  >('dashboard');

  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodItem | null>(null);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState<any | null>(null);
  const [structures, setStructures] = useState<SalaryStructureItem[]>([]);
  const [components, setComponents] = useState<SalaryComponentItem[]>([]);
  const [assignments, setAssignments] = useState<EmployeeSalaryAssignmentItem[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementClaimItem[]>([]);
  const [loans, setLoans] = useState<EmployeeLoanItem[]>([]);
  const [statutoryRules, setStatutoryRules] = useState<StatutoryRuleItem[]>([]);
  const [adjustments, setAdjustments] = useState<ControlledAdjustmentItem[]>([]);
  const [exceptions, setExceptions] = useState<PayrollExceptionItem[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sub-filter for compliance
  const [complianceType, setComplianceType] = useState<'PF' | 'ESI' | 'TDS' | 'PT'>('PF');

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // New Period Modal
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());

  // Assign Structure Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignStructId, setAssignStructId] = useState('');
  const [assignCtc, setAssignCtc] = useState<number>(600000);

  // New Adjustment Modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjEmpId, setAdjEmpId] = useState('');
  const [adjType, setAdjType] = useState('BONUS');
  const [adjAmount, setAdjAmount] = useState<number>(5000);
  const [adjReason, setAdjReason] = useState('');

  // New Statutory Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleType, setRuleType] = useState<'PF' | 'ESI' | 'TDS' | 'PT'>('PF');
  const [ruleState, setRuleState] = useState('ALL');
  const [ruleEmpRate, setRuleEmpRate] = useState<number>(12);
  const [ruleEmprRate, setRuleEmprRate] = useState<number>(12);
  const [ruleCeiling, setRuleCeiling] = useState<number>(15000);
  const [ruleThreshold, setRuleThreshold] = useState<number>(0);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [periodsRes, structRes, assignRes, reimbRes, loansRes, rulesRes, adjRes, slipsRes] = await Promise.all([
        fetch('/api/hrm/payroll/periods'),
        fetch('/api/hrm/payroll/structures'),
        fetch('/api/hrm/payroll/assignments'),
        fetch('/api/hrm/payroll/reimbursements'),
        fetch('/api/hrm/payroll/loans'),
        fetch('/api/hrm/compliance/rules'),
        fetch('/api/hrm/payroll/adjustments'),
        fetch('/api/hrm/payroll/payslips'),
      ]);

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data.periods || []);
        if (data.periods?.length > 0 && !selectedPeriod) {
          setSelectedPeriod(data.periods[0]);
          loadPeriodDetail(data.periods[0].id);
        }
      }

      if (structRes.ok) {
        const data = await structRes.json();
        setStructures(data.structures || []);
        setComponents(data.components || []);
        if (data.structures?.length > 0 && !assignStructId) {
          setAssignStructId(data.structures[0].id);
        }
      }

      if (assignRes.ok) {
        const data = await assignRes.json();
        setAssignments(data.assignments || []);
      }

      if (reimbRes.ok) {
        const data = await reimbRes.json();
        setReimbursements(data.claims || []);
      }

      if (loansRes.ok) {
        const data = await loansRes.json();
        setLoans(data.loans || []);
      }

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setStatutoryRules(data.rules || []);
      }

      if (adjRes.ok) {
        const data = await adjRes.json();
        setAdjustments(data.adjustments || []);
      }

      if (slipsRes.ok) {
        const data = await slipsRes.json();
        setPayslips(data.payslips || []);
      }
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodDetail = async (periodId: string) => {
    try {
      const [res, excRes] = await Promise.all([
        fetch(`/api/hrm/payroll/periods/${periodId}`),
        fetch(`/api/hrm/payroll/exceptions?periodId=${periodId}`),
      ]);
      if (res.ok) {
        const data = await res.json();
        setSelectedPeriodDetail(data.period);
      }
      if (excRes.ok) {
        const data = await excRes.json();
        setExceptions(data.exceptions || []);
      }
    } catch (err) {
      console.error('Failed to load period detail:', err);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const handleCreatePeriod = async () => {
    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: newMonth, year: newYear }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowNewPeriodModal(false);
        setSuccessMessage(`Created period ${data.period?.periodCode}`);
        await fetchPayrollData();
      } else {
        setErrorMessage(data.error || 'Failed to create period');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleProcessPeriod = async (periodId: string) => {
    if (!confirm('Run 5-step deterministic payroll engine? This will compute gross earnings, statutory PF/ESI/TDS/PT rules, LOP days, overtime, approved adjustments, and audit exceptions.')) return;
    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Processed ${data.period?.recordsCount} employee records. Discovered ${data.period?.exceptionCount || 0} audit exception(s).`);
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
        setActiveTab('records');
      } else {
        setErrorMessage(data.error || 'Failed to process period');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleApprovePeriod = async (periodId: string) => {
    if (!confirm('Approve this payroll period? Note: Approval will be rejected if blocking exceptions are open.')) return;
    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Payroll period administratively approved.');
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
      } else {
        setErrorMessage(data.error || 'Failed to approve period');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleFinalizePeriod = async (periodId: string) => {
    if (!confirm('Permanently finalize and lock this payroll period? This action generates official tamper-proof payslips, records adjustments, and locks all figures against further edits.')) return;
    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Payroll period permanently finalized and locked. Official payslips published.');
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
        setActiveTab('payslips');
      } else {
        setErrorMessage(data.error || 'Failed to finalize period');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleAssignStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmpId || !assignStructId || !assignCtc) return;

    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignEmpId,
          structureId: assignStructId,
          baseCtcAnnual: assignCtc,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAssignModal(false);
        setSuccessMessage(`Assigned structure to employee ${assignEmpId}`);
        await fetchPayrollData();
      } else {
        setErrorMessage(data.error || 'Failed to assign salary structure');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmpId || !adjAmount || !adjReason) return;

    try {
      setProcessing(true);
      setErrorMessage(null);
      const res = await fetch('/api/hrm/payroll/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: adjEmpId,
          type: adjType,
          amount: adjAmount,
          reason: adjReason,
          effectivePeriodCode: selectedPeriod?.periodCode || 'PAY-2026-10',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdjustmentModal(false);
        setSuccessMessage(`Created ${adjType} adjustment for ₹${adjAmount}`);
        await fetchPayrollData();
      } else {
        setErrorMessage(data.error || 'Failed to create adjustment');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleReviewAdjustment = async (adjId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(true);
      const res = await fetch(`/api/hrm/payroll/adjustments/${adjId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setSuccessMessage(`Adjustment ${decision.toLowerCase()}`);
        await fetchPayrollData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleResolveException = async (excId: string, action: 'RESOLVE' | 'WAIVE') => {
    const resolution = prompt(action === 'RESOLVE' ? 'Enter resolution notes:' : 'Enter reason for waiving this exception:');
    if (!resolution) return;

    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/payroll/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, exceptionId: excId, resolution }),
      });
      if (res.ok) {
        setSuccessMessage(`Exception ${action === 'RESOLVE' ? 'resolved' : 'waived'}`);
        if (selectedPeriod) await loadPeriodDetail(selectedPeriod.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/compliance/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleType,
          state: ruleState,
          employeeRate: ruleEmpRate,
          employerRate: ruleEmprRate,
          ceiling: ruleCeiling,
          threshold: ruleThreshold,
          effectiveFrom: new Date(),
        }),
      });
      if (res.ok) {
        setShowRuleModal(false);
        setSuccessMessage(`Saved versioned rule for ${ruleType}`);
        await fetchPayrollData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">Payroll & Statutory Compliance Engine</h1>
            <span className="text-[10px] font-mono font-bold bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30 px-2 py-0.5 rounded">
              EPFO • ESIC • TDS • PT Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic 5-step gross-to-net computation, versioned statutory rules, controlled adjustments, exception auditing, and immutable finalization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewPeriodModal(true)}
            className="px-3.5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Payroll Run</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdjustmentModal(true)}
            className="px-3.5 py-2 border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Adjustment</span>
          </button>
          <button
            type="button"
            onClick={() => fetchPayrollData()}
            className="p-2 border border-[#E2E8F0] rounded-xl hover:bg-[#F0FDFA] text-slate-600 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Module Navigation Tabs (Exact Section 3 Hierarchy) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#E2E8F0]">
        {[
          { id: 'dashboard', label: 'Payroll Dashboard', icon: TrendingUp },
          { id: 'periods', label: 'Payroll Runs', icon: Calendar },
          { id: 'records', label: 'Processed Records', icon: FileText },
          { id: 'structures', label: 'Salary Structures', icon: Sliders },
          { id: 'components', label: 'Salary Components', icon: DollarSign },
          { id: 'assignments', label: 'Employee Salary', icon: CreditCard },
          { id: 'adjustments', label: 'Controlled Adjustments', icon: DollarSign },
          { id: 'exceptions', label: 'Audit Exceptions', icon: AlertTriangle },
          { id: 'compliance', label: 'Compliance (PF/ESI/TDS/PT)', icon: ShieldCheck },
          { id: 'payslips', label: 'Payslips', icon: Receipt },
          { id: 'reimbursements', label: 'Reimbursements', icon: Receipt },
          { id: 'loans', label: 'Loans & Advances', icon: Building },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.id === 'exceptions' && exceptions.filter((e) => e.status === 'OPEN' && e.severity === 'BLOCKING').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: PAYROLL DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Current Period</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{selectedPeriodDetail?.periodCode || selectedPeriod?.periodCode || 'PAY-2026-10'}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedPeriodDetail?.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {selectedPeriodDetail?.status || 'DRAFT'}
              </span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Gross Payroll</span>
              <p className="text-2xl font-black text-slate-900 mt-1">₹{(selectedPeriodDetail?.totalGrossPay || 0).toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Staff Processed: {selectedPeriodDetail?.recordsCount || 0}</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Statutory & Other Deductions</span>
              <p className="text-2xl font-black text-rose-600 mt-1">-₹{(selectedPeriodDetail?.totalDeductions || 0).toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">EPF + ESIC + PT + TDS + Loans</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Net Disbursement</span>
              <p className="text-2xl font-black text-[#0D9488] mt-1">₹{(selectedPeriodDetail?.totalNetPay || 0).toLocaleString()}</p>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Electronic Export
              </span>
            </div>
          </div>

          {/* Quick Execution Banner */}
          {selectedPeriod && (
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-teal-300 font-bold">
                  Active Period: {selectedPeriod.periodCode}
                </span>
                <h3 className="text-lg font-black tracking-tight text-white">Execute Payroll Calculation & Sign-off Lifecycle</h3>
                <p className="text-xs text-slate-300">
                  Runs the 5-step engine, cross-checks attendance LOP and overtime, enforces statutory compliance caps, flags exceptions, and prepares publishable payslips.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleProcessPeriod(selectedPeriod.id)}
                  disabled={processing || selectedPeriod.status === 'FINALIZED'}
                  className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Calculate Payroll</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApprovePeriod(selectedPeriod.id)}
                  disabled={processing || selectedPeriod.status === 'APPROVED' || selectedPeriod.status === 'FINALIZED'}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Run</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinalizePeriod(selectedPeriod.id)}
                  disabled={processing || selectedPeriod.status === 'FINALIZED'}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Finalize & Lock</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PAYROLL RUNS / PERIODS */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Period Code</th>
                  <th className="py-3 px-4">Month / Year</th>
                  <th className="py-3 px-4">Staff Count</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">Net Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {periods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.periodCode}</td>
                    <td className="py-3 px-4">{p.month} / {p.year}</td>
                    <td className="py-3 px-4">{p.recordsCount || p.totalEmployees}</td>
                    <td className="py-3 px-4 font-semibold">₹{(p.totalGrossPay || p.totalGross || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-black text-[#0D9488]">₹{(p.totalNetPay || p.totalNet || 0).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-700' : p.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPeriod(p);
                          loadPeriodDetail(p.id);
                          setActiveTab('records');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0D9488] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: PROCESSED RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Inspecting Period</span>
              <p className="text-base font-black text-slate-900">{selectedPeriodDetail?.periodCode || selectedPeriod?.periodCode || 'None'}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search staff name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-xl text-xs w-64 focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Base CTC</th>
                  <th className="py-3 px-4">LOP Deduction</th>
                  <th className="py-3 px-4">Gross Earnings</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Reimbursements</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {((selectedPeriodDetail?.records || []) as any[])
                  .filter((r) =>
                    !searchTerm ||
                    r.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{r.employee?.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-400">{r.employee?.employeeId}</span>
                      </td>
                      <td className="py-3 px-4">₹{r.baseSalary?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-rose-600">-₹{r.lopDeduction?.toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold">₹{r.grossPay?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-rose-600">-₹{r.totalDeductions?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-emerald-600">+₹{r.reimbursements?.toLocaleString()}</td>
                      <td className="py-3 px-4 font-black text-[#0D9488]">₹{r.netPay?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: SALARY STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures.map((s) => (
              <div key={s.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded">
                    {s.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {s._count?.assignments || 0} Staff Assigned
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                <p className="text-xs text-slate-500">{s.description || 'Indian corporate grade structure'}</p>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Components Linked: {s.components?.length || 0}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignStructId(s.id);
                      setShowAssignModal(true);
                    }}
                    className="text-[#0D9488] font-bold hover:underline"
                  >
                    Assign to Employee
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: SALARY COMPONENTS */}
      {activeTab === 'components' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Calculation Method</th>
                <th className="py-3 px-4">Taxable</th>
                <th className="py-3 px-4">Statutory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {components.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.code}</td>
                  <td className="py-3 px-4">{c.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.type === 'EARNING' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">{c.calculationType} ({c.percentageValue ? `${c.percentageValue}%` : 'Standard'})</td>
                  <td className="py-3 px-4">{c.isTaxable ? 'YES' : 'NO'}</td>
                  <td className="py-3 px-4">{c.isStatutory ? 'YES' : 'NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 6: EMPLOYEE SALARY ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Structure</th>
                  <th className="py-3 px-4">Annual Base CTC</th>
                  <th className="py-3 px-4">Monthly Gross</th>
                  <th className="py-3 px-4">Effective From</th>
                  <th className="py-3 px-4">Bank Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{a.employee?.fullName}</span>
                      <span className="text-[10px] font-mono text-slate-400">{a.employee?.employeeId}</span>
                    </td>
                    <td className="py-3 px-4">{a.structure?.name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{((a.baseCtcAnnual || a.annualCtc || 0)).toLocaleString()}</td>
                    <td className="py-3 px-4 font-black text-[#0D9488]">₹{((a.grossSalaryMonthly || a.monthlyCtc || 0)).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono">{new Date(a.effectiveFrom).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{a.employee?.bankAccountNumber || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 7: CONTROLLED ADJUSTMENTS */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No controlled adjustments recorded. Click "Add Adjustment" above.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{adj.employeeName || adj.employeeId}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {adj.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">₹{adj.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{adj.reason}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{adj.effectivePeriodCode}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          adj.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : adj.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {adj.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {adj.status === 'PENDING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewAdjustment(adj.id, 'APPROVED')}
                              className="px-2 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewAdjustment(adj.id, 'REJECTED')}
                              className="px-2 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 8: AUDIT EXCEPTIONS */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Blocking Anomaly & Audit Exception Register</h3>
              <p className="text-xs text-slate-500">Unresolved blocking exceptions will halt period sign-off</p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
              {exceptions.filter((e) => e.status === 'OPEN' && e.severity === 'BLOCKING').length} Blocking Open
            </span>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No audit exceptions detected. Payroll run is clean.
                    </td>
                  </tr>
                ) : (
                  exceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          exc.severity === 'BLOCKING' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{exc.exceptionType}</td>
                      <td className="py-3 px-4 font-semibold">{exc.employeeName || 'Period Wide'}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-sm">{exc.reason}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          exc.status === 'OPEN' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {exc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {exc.status === 'OPEN' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleResolveException(exc.id, 'RESOLVE')}
                              className="px-2 py-1 bg-[#0D9488] text-white rounded-lg font-bold text-[10px]"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolveException(exc.id, 'WAIVE')}
                              className="px-2 py-1 border border-slate-200 text-slate-600 rounded-lg font-bold text-[10px]"
                            >
                              Waive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 9: STATUTORY COMPLIANCE (PF / ESI / TDS / PT) */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Versioned Statutory Rule Engine</h3>
              <p className="text-xs text-slate-500">Configurable rate schedules for PF, ESI, TDS provisional slabs, and State PT</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRuleModal(true)}
              className="px-3.5 py-2 bg-[#0D9488] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure Statutory Rule</span>
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
            {(['PF', 'ESI', 'TDS', 'PT'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setComplianceType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  complianceType === type ? 'bg-[#0D9488] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type === 'PF' ? 'Employees Provident Fund (PF)' : type === 'ESI' ? 'Employees State Insurance (ESI)' : type === 'TDS' ? 'Tax Deducted at Source (TDS)' : 'Professional Tax (PT)'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Jurisdiction / State</th>
                  <th className="py-3 px-4">Employee Rate</th>
                  <th className="py-3 px-4">Employer Rate</th>
                  <th className="py-3 px-4">Ceiling / Cap</th>
                  <th className="py-3 px-4">Wage Threshold</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Effective Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {statutoryRules.filter((r) => r.ruleType === complianceType).map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.state || 'All India'}</td>
                    <td className="py-3 px-4 font-black text-slate-800">{r.employeeRate}%</td>
                    <td className="py-3 px-4">{r.employerRate ? `${r.employerRate}%` : '—'}</td>
                    <td className="py-3 px-4">{r.ceiling ? `₹${r.ceiling.toLocaleString()}` : 'No cap'}</td>
                    <td className="py-3 px-4">{r.threshold ? `₹${r.threshold.toLocaleString()}` : 'None'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">v{r.version}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{new Date(r.effectiveFrom).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 10: PAYSLIPS */}
      {activeTab === 'payslips' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Payslip #</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Earnings</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Published</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payslipNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{p.employee?.fullName}</span>
                      <span className="text-[10px] font-mono text-slate-400">{p.employee?.employeeId}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">{p.periodCode}</td>
                    <td className="py-3 px-4">₹{p.grossEarnings?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-rose-600">-₹{p.totalDeductions?.toLocaleString()}</td>
                    <td className="py-3 px-4 font-black text-[#0D9488]">₹{p.netSalary?.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        Published
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayslip(p)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0D9488] hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 11 & 12: REIMBURSEMENTS & LOANS (PRESERVED) */}
      {activeTab === 'reimbursements' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Claim #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {reimbursements.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.claimNumber}</td>
                  <td className="py-3 px-4">{c.employee?.fullName}</td>
                  <td className="py-3 px-4">{c.category}</td>
                  <td className="py-3 px-4 font-bold text-[#0D9488]">₹{c.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600">{c.title || c.description}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Loan #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Principal</th>
                <th className="py-3 px-4">Monthly EMI</th>
                <th className="py-3 px-4">Balance Remaining</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loans.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{l.loanNumber}</td>
                  <td className="py-3 px-4">{l.employee?.fullName}</td>
                  <td className="py-3 px-4">₹{l.principalAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-rose-600">₹{l.monthlyInstallment.toLocaleString()}</td>
                  <td className="py-3 px-4 font-black text-slate-900">₹{l.totalBalanceRemaining.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: NEW PAYROLL RUN */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Initialize Monthly Payroll Period</h3>
            <p className="text-xs text-slate-500">Sets up a new calculation period for all eligible employees.</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Month (1 - 12)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Year</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePeriod}
                disabled={processing}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Create Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN SALARY STRUCTURE */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form noValidate onSubmit={handleAssignStructure} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Assign Salary Structure to Employee</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Employee ID or Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GI-EMP-000002"
                  value={assignEmpId}
                  onChange={(e) => setAssignEmpId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Select Structure</label>
                <select
                  value={assignStructId}
                  onChange={(e) => setAssignStructId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold bg-white"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Annual Base CTC (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={assignCtc}
                  onChange={(e) => setAssignCtc(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ADD CONTROLLED ADJUSTMENT */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form noValidate onSubmit={handleCreateAdjustment} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Add Controlled Payroll Adjustment</h3>
            <p className="text-xs text-slate-500">Every manual adjustment requires explicit reason and approval workflow.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Employee ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GI-EMP-000002"
                  value={adjEmpId}
                  onChange={(e) => setAdjEmpId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Adjustment Type</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold bg-white"
                  >
                    <option value="BONUS">Bonus (Earning)</option>
                    <option value="COMMISSION">Commission (Earning)</option>
                    <option value="INCENTIVE">Incentive (Earning)</option>
                    <option value="ARREAR">Arrear (Earning)</option>
                    <option value="ADVANCE">Advance (Deduction)</option>
                    <option value="ONE_TIME_DEDUCTION">One-time Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700">Audit Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Mandatory justification for this adjustment"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Submit Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: STATUTORY RULE CONFIGURATION */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form noValidate onSubmit={handleCreateRule} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Configure Versioned Statutory Rule</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold bg-white"
                  >
                    <option value="PF">EPF (Provident Fund)</option>
                    <option value="ESI">ESIC (State Insurance)</option>
                    <option value="TDS">TDS (Income Tax)</option>
                    <option value="PT">Professional Tax (PT)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">State / Territory</label>
                  <input
                    type="text"
                    value={ruleState}
                    onChange={(e) => setRuleState(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Employee Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ruleEmpRate}
                    onChange={(e) => setRuleEmpRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Employer Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ruleEmprRate}
                    onChange={(e) => setRuleEmprRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Wage Ceiling (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ruleCeiling}
                    onChange={(e) => setRuleCeiling(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Wage Threshold (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 border border-[#E2E8F0] text-slate-600 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Save Versioned Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: OFFICIAL PAYSLIP DETAIL MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#0D9488] font-black uppercase">Growth India Technologies Enterprise</span>
                <h3 className="text-xl font-black text-slate-900">Official Payslip Statement</h3>
                <p className="text-xs text-slate-500 font-mono">Period: {selectedPayslip.periodCode} • {selectedPayslip.payslipNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Employee Details</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedPayslip.employee?.fullName}</p>
                <p className="text-slate-500 font-mono">{selectedPayslip.employee?.employeeId} • {selectedPayslip.employee?.designation}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Statutory & Bank</span>
                <p className="font-mono text-slate-700 mt-0.5">PAN: {selectedPayslip.employee?.panNumber || 'N/A'}</p>
                <p className="font-mono text-slate-700">Bank: {selectedPayslip.employee?.bankAccountNumber || 'Direct Transfer'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold uppercase text-slate-500 text-[10px] border-b pb-1">Gross Earnings</h4>
                <div className="flex justify-between">
                  <span>Gross Earnings</span>
                  <span className="font-bold text-slate-900">₹{selectedPayslip.grossEarnings?.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase text-slate-500 text-[10px] border-b pb-1">Statutory Deductions</h4>
                <div className="flex justify-between">
                  <span>Total Deductions</span>
                  <span className="font-bold text-rose-600">-₹{selectedPayslip.totalDeductions?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#0D9488]/10 border border-[#0D9488]/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#0D9488]">Net Disbursed Salary</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">₹{selectedPayslip.netSalary?.toLocaleString()}</h4>
                <p className="text-xs text-slate-600 italic mt-0.5">{selectedPayslip.netSalaryWords || selectedPayslip.netPayInWords}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#0D9488] text-white">
                Tamper-Proof
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 bg-[#0D9488] text-white rounded-xl font-bold text-xs cursor-pointer"
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
