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
} from 'lucide-react';
import {
  PayrollPeriodItem,
  PayrollRecordItem,
  SalaryStructureItem,
  SalaryComponentItem,
  EmployeeSalaryAssignmentItem,
  ReimbursementClaimItem,
  EmployeeLoanItem,
  PayslipItem,
} from '@/types/hrm';

export const HrmPayrollView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'periods' | 'records' | 'structures' | 'reimbursements' | 'loans'>('periods');

  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodItem | null>(null);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState<any | null>(null);
  const [structures, setStructures] = useState<SalaryStructureItem[]>([]);
  const [components, setComponents] = useState<SalaryComponentItem[]>([]);
  const [assignments, setAssignments] = useState<EmployeeSalaryAssignmentItem[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementClaimItem[]>([]);
  const [loans, setLoans] = useState<EmployeeLoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [periodsRes, structRes, assignRes, reimbRes, loansRes] = await Promise.all([
        fetch('/api/hrm/payroll/periods'),
        fetch('/api/hrm/payroll/structures'),
        fetch('/api/hrm/payroll/assignments'),
        fetch('/api/hrm/payroll/reimbursements'),
        fetch('/api/hrm/payroll/loans'),
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
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPeriodDetail = async (periodId: string) => {
    try {
      const res = await fetch(`/api/hrm/payroll/periods/${periodId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPeriodDetail(data.period);
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
      const res = await fetch('/api/hrm/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: newMonth, year: newYear }),
      });
      if (res.ok) {
        setShowNewPeriodModal(false);
        await fetchPayrollData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPeriod = async (periodId: string) => {
    if (!confirm('Run 5-step payroll calculation engine for this period? This will ingest EMS attendance, leaves, deductions, and reimbursements.')) return;
    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/payroll/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });
      if (res.ok) {
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
        setActiveTab('records');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePeriod = async (periodId: string) => {
    if (!confirm('Approve this payroll period? Once approved, it can be finalized by administration.')) return;
    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/payroll/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId, remarks: 'Administrative sign-off completed' }),
      });
      if (res.ok) {
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalizePeriod = async (periodId: string) => {
    if (!confirm('FINALIZE PAYROLL: This action is permanent and immutable. All salary records will be locked, official payslips will be generated, and loan/reimbursements updated. Continue?')) return;
    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/payroll/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });
      if (res.ok) {
        await fetchPayrollData();
        await loadPeriodDetail(periodId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignStructure = async () => {
    try {
      setProcessing(true);
      const res = await fetch('/api/hrm/payroll/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignEmpId,
          structureId: assignStructId,
          baseCtcAnnual: assignCtc,
        }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        await fetchPayrollData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReimbursementAction = async (claimId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/hrm/payroll/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, type: action }),
      });
      if (res.ok) {
        await fetchPayrollData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecords = (selectedPeriodDetail?.records || []).filter((r: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.employee?.fullName?.toLowerCase().includes(term) ||
      r.employee?.employeeId?.toLowerCase().includes(term) ||
      r.employee?.designation?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Summary */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Integrated Payroll & Compensation Hub</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Payroll Management & Payslips</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consumes verified attendance and leave LOP data from EMS/HRM. 5-step automated computation, exception validation, and immutable payslip distribution.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchPayrollData()}
              className="p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewPeriodModal(true)}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Pay Period</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E5E7E2]">
          <div className="p-3 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Pay Period</p>
            <p className="text-lg font-bold text-[#111111] mt-0.5">
              {selectedPeriodDetail?.periodCode || periods[0]?.periodCode || 'None'}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
              selectedPeriodDetail?.status === 'FINALIZED'
                ? 'bg-emerald-100 text-emerald-800'
                : selectedPeriodDetail?.status === 'APPROVED'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {selectedPeriodDetail?.status || 'DRAFT'}
            </span>
          </div>

          <div className="p-3 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Pay (This Period)</p>
            <p className="text-lg font-bold text-[#111111] mt-0.5">
              ₹{(selectedPeriodDetail?.totalGrossPay || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{selectedPeriodDetail?.recordsCount || 0} Employees Calculated</p>
          </div>

          <div className="p-3 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deductions (PF/PT/TDS)</p>
            <p className="text-lg font-bold text-[#111111] mt-0.5">
              ₹{(selectedPeriodDetail?.totalDeductions || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Statutory & EMI deductions</p>
          </div>

          <div className="p-3 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Salary Disbursement</p>
            <p className="text-lg font-bold text-teal-700 mt-0.5">
              ₹{(selectedPeriodDetail?.totalNetPay || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Ready for Bank ACH Transfer</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7E2] pb-2">
        <button
          onClick={() => setActiveTab('periods')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'periods'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Pay Periods</span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'records'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Payroll Records & Payslips ({selectedPeriodDetail?.records?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'structures'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Salary Structures & Assignments ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reimbursements')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reimbursements'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Expense Claims ({reimbursements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'loans'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Employee Loans & Advances ({loans.length})</span>
        </button>
      </div>

      {/* TAB 1: PAYROLL PERIODS */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {periods.map((p) => {
              const isSelected = selectedPeriod?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPeriod(p);
                    loadPeriodDetail(p.id);
                  }}
                  className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-600 shadow-sm ring-1 ring-teal-600/30'
                      : 'border-[#E5E7E2] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#111111]">{p.periodCode}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'FINALIZED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Month: {p.month} / {p.year} • {p.workingDays} Working Days
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#E5E7E2] flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Net Distribution</p>
                      <p className="font-bold text-[#111111]">₹{p.totalNetPay.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 text-right">Records</p>
                      <p className="font-semibold text-slate-700 text-right">{p.recordsCount} Staff</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Period Operational Action Panel */}
          {selectedPeriodDetail && (
            <div className="bg-white border border-[#E5E7E2] rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#111111]">
                    Pay Period Actions: {selectedPeriodDetail.periodCode}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lifecycle State: <span className="font-bold text-[#111111]">{selectedPeriodDetail.status}</span> • Working Days: {selectedPeriodDetail.workingDays}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedPeriodDetail.status !== 'FINALIZED' && (
                    <button
                      onClick={() => handleProcessPeriod(selectedPeriodDetail.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{selectedPeriodDetail.recordsCount > 0 ? 'Re-Calculate Payroll' : 'Execute 5-Step Payroll'}</span>
                    </button>
                  )}

                  {selectedPeriodDetail.status === 'UNDER_REVIEW' && (
                    <button
                      onClick={() => handleApprovePeriod(selectedPeriodDetail.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Payroll</span>
                    </button>
                  )}

                  {selectedPeriodDetail.status === 'APPROVED' && (
                    <button
                      onClick={() => handleFinalizePeriod(selectedPeriodDetail.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Finalize & Lock Payslips</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('records')}
                    className="px-3.5 py-2 border border-[#E5E7E2] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View Records ({selectedPeriodDetail.records?.length || 0})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Approval Audit Trail */}
              {selectedPeriodDetail.approvalLogs?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[#E5E7E2]">
                  <p className="text-xs font-bold text-slate-700 mb-2">Audit History & Approvals</p>
                  <div className="space-y-1.5">
                    {selectedPeriodDetail.approvalLogs.map((log: any) => (
                      <div key={log.id} className="text-[11px] text-slate-600 flex items-center gap-2">
                        <span className="font-bold text-teal-700 uppercase">[{log.action}]</span>
                        <span>{log.remarks}</span>
                        <span className="text-slate-400">by {log.actionBy} ({new Date(log.timestamp).toLocaleString()})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYROLL RECORDS & PAYSLIPS */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by employee name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7E2] rounded-xl text-xs focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Period: <span className="font-bold text-[#111111]">{selectedPeriodDetail?.periodCode || 'None Selected'}</span>
              </span>
            </div>
          </div>

          {/* Exception Banner if any records have exceptions */}
          {selectedPeriodDetail?.records?.some((r: any) => r.hasExceptions) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-bold">Attention Needed:</span> Exceptions detected in payroll calculation (e.g. missing bank accounts or attendance mismatches). Review records flagged below before final approval.
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4 text-center">Days (Pres/LOP)</th>
                    <th className="py-3 px-4 text-right">Base Salary</th>
                    <th className="py-3 px-4 text-right">Gross Pay</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net Salary</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E2]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No payroll records found for this period. Click "Execute 5-Step Payroll" to calculate.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#111111]">{r.employee?.fullName || 'Employee'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.employee?.employeeId}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.employee?.designation || 'Staff'}
                          <div className="text-[10px] text-slate-400">{r.employee?.departmentName || 'Operations'}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-emerald-700">{r.presentDays}</span>
                          <span className="text-slate-400"> / </span>
                          <span className={r.lopDays > 0 ? 'font-bold text-red-600' : 'text-slate-500'}>
                            {r.lopDays} LOP
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          ₹{r.baseSalary.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#111111]">
                          ₹{r.grossPay.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                          -₹{r.totalDeductions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-teal-700">
                          ₹{r.netPay.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.hasExceptions ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-700" title={r.exceptionRemarks}>
                              Exception
                            </span>
                          ) : r.isLocked ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-600">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedPayslip(r)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Payslip</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY STRUCTURES & ASSIGNMENTS */}
      {activeTab === 'structures' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111111]">Salary Structures & Employee CTC Assignments</h2>
              <p className="text-xs text-slate-500">Configured grade rate cards with statutory PF, PT, and tax rules.</p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign CTC to Employee</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures.map((s) => (
              <div key={s.id} className="bg-white border border-[#E5E7E2] rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#111111]">{s.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{s.description || 'Standard corporate structure'}</p>

                <div className="mt-4 pt-3 border-t border-[#E5E7E2]">
                  <p className="text-[11px] font-bold text-slate-700 mb-2">Components Breakdown</p>
                  <div className="space-y-1.5">
                    {s.components?.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{c.component?.name || 'Component'}</span>
                        <span className="font-semibold text-slate-900">
                          {c.percentage ? `${c.percentage}% of Basic` : `₹${c.amount.toLocaleString()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Active Employee CTC Assignments Table */}
          <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs mt-6">
            <div className="p-4 border-b border-[#E5E7E2] flex items-center justify-between">
              <h3 className="font-bold text-[#111111] text-xs uppercase tracking-wider">
                Current Active Assignments ({assignments.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Structure</th>
                    <th className="py-3 px-4 text-right">Annual Base CTC</th>
                    <th className="py-3 px-4 text-right">Monthly Gross</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Bank & PAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7E2]">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{a.employee?.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{a.employee?.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{a.structure?.name}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#111111]">
                        ₹{a.baseCtcAnnual.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-teal-700">
                        ₹{a.grossSalaryMonthly.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(a.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[10px] text-slate-600">A/C: {a.employee?.bankAccountNumber || 'Not Provided'}</div>
                        <div className="text-[10px] text-slate-400">PAN: {a.employee?.panNumber || 'Pending'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REIMBURSEMENTS */}
      {activeTab === 'reimbursements' && (
        <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E5E7E2] flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#111111] text-sm">Expense Claims & Reimbursements</h2>
              <p className="text-xs text-slate-500">Approved claims are automatically credited during payroll calculation.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Claim #</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7E2]">
                {reimbursements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No reimbursement claims submitted.
                    </td>
                  </tr>
                ) : (
                  reimbursements.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#111111]">{c.claimNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{c.employee?.fullName}</div>
                        <div className="text-[10px] text-slate-500">{c.employee?.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.category}</td>
                      <td className="py-3 px-4 text-slate-700">{c.title}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#111111]">₹{c.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          c.status === 'PROCESSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'SUBMITTED' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReimbursementAction(c.id, 'APPROVE')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReimbursementAction(c.id, 'REJECT')}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
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

      {/* TAB 5: LOANS */}
      {activeTab === 'loans' && (
        <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E5E7E2] flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#111111] text-sm">Employee Loans & Advance Recoveries</h2>
              <p className="text-xs text-slate-500">Monthly EMI installments automatically deducted from payroll.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Loan #</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Monthly EMI</th>
                  <th className="py-3 px-4 text-center">Remaining EMIs</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7E2]">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No active loans on record.
                    </td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#111111]">{l.loanNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111111]">{l.employee?.fullName}</div>
                        <div className="text-[10px] text-slate-500">{l.employee?.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">₹{l.principalAmount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">₹{l.monthlyInstallment.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-slate-800">{l.remainingInstallments}</span> / {l.totalInstallments}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#111111]">₹{l.totalBalanceRemaining.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          l.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OFFICIAL PAYSLIP POPUP MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-[#E5E7E2] animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b border-[#E5E7E2]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-base">
                    GI
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#111111] tracking-tight">GROWTH INDIA ENTERPRISE</h2>
                    <p className="text-[10px] text-slate-500">Corporate Payroll & Compensation Department</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-teal-700">
                  PAYSLIP FOR {selectedPeriodDetail?.periodCode || 'CURRENT MONTH'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Generated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-[#E5E7E2] bg-[#F5F6F2] p-4 rounded-xl mt-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Employee Name</p>
                <p className="font-bold text-[#111111] mt-0.5">{selectedPayslip.employee?.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Designation</p>
                <p className="font-medium text-slate-700">{selectedPayslip.employee?.designation}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Employee ID</p>
                <p className="font-bold text-[#111111] mt-0.5 font-mono">{selectedPayslip.employee?.employeeId}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Bank Account / PAN</p>
                <p className="font-mono text-slate-700 text-[11px]">
                  {selectedPayslip.employee?.bankAccountNumber || 'N/A'} • {selectedPayslip.employee?.panNumber || 'PAN N/A'}
                </p>
              </div>
            </div>

            {/* Attendance & Days Summary */}
            <div className="flex items-center justify-between py-3 text-xs border-b border-[#E5E7E2]">
              <span className="text-slate-600">Present Days: <strong className="text-emerald-700">{selectedPayslip.presentDays}</strong></span>
              <span className="text-slate-600">Loss Of Pay (LOP): <strong className="text-red-600">{selectedPayslip.lopDays}</strong></span>
              <span className="text-slate-600">Standard Base: <strong>₹{selectedPayslip.baseSalary.toLocaleString()}</strong></span>
            </div>

            {/* Earnings vs Deductions Table */}
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* Earnings */}
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Earnings
                </p>
                <div className="space-y-1.5 text-xs">
                  {selectedPayslip.earnings?.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between">
                      <span className="text-slate-600">{e.componentName}</span>
                      <span className="font-semibold text-slate-900">₹{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                    <span>Total Gross</span>
                    <span>₹{selectedPayslip.grossPay.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  Deductions
                </p>
                <div className="space-y-1.5 text-xs">
                  {selectedPayslip.deductions?.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <span className="text-slate-600">{d.componentName}</span>
                      <span className="font-semibold text-red-600">₹{d.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                    <span>Total Deductions</span>
                    <span className="text-red-600">₹{selectedPayslip.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="mt-6 p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-teal-700 uppercase">Net Salary Payable</p>
                <p className="text-2xl font-black text-[#111111] mt-0.5">₹{selectedPayslip.netPay.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-teal-700 border border-teal-300 shadow-xs">
                  Official Record
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#E5E7E2]">
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Payslip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PERIOD MODAL */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Create Pay Period</h3>
            <p className="text-xs text-slate-500 mt-1">Specify month and year to initialize payroll cycle.</p>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Month (1 - 12)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Year</label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
              <button
                onClick={() => setShowNewPeriodModal(false)}
                className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePeriod}
                disabled={processing}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {processing ? 'Creating...' : 'Initialize Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN STRUCTURE MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Assign Salary Structure</h3>
            <p className="text-xs text-slate-500 mt-1">Link an employee to a compensation grade and base CTC.</p>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Employee ID or Code</label>
                <input
                  type="text"
                  placeholder="e.g. GI-EMP-000002"
                  value={assignEmpId}
                  onChange={(e) => setAssignEmpId(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Structure</label>
                <select
                  value={assignStructId}
                  onChange={(e) => setAssignStructId(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-teal-500"
                >
                  <option value="">Select structure...</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Annual Base CTC (₹)</label>
                <input
                  type="number"
                  step={10000}
                  value={assignCtc}
                  onChange={(e) => setAssignCtc(Number(e.target.value))}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignStructure}
                disabled={processing || !assignEmpId || !assignStructId}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {processing ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
