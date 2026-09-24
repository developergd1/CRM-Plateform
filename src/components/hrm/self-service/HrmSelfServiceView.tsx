'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  UserCheck,
  Clock,
  Coffee,
  FileCheck,
  LifeBuoy,
  Target,
  Banknote,
  Receipt,
  Download,
  Printer,
  Eye,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { PayslipItem, LeaveBalanceItem } from '@/types/hrm';

interface HrmSelfServiceViewProps {
  currentTenant?: any;
  onNavigate: (tab: string) => void;
}

export const HrmSelfServiceView: React.FC<HrmSelfServiceViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeEssTab, setActiveEssTab] = useState<'payslips' | 'leaves' | 'claims' | 'tickets'>('payslips');
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimTitle, setClaimTitle] = useState('');
  const [claimCategory, setClaimCategory] = useState('TRAVEL');
  const [claimAmount, setClaimAmount] = useState<number>(1500);

  const fetchEssData = async () => {
    try {
      setLoading(true);
      const [payslipsRes, leavesRes] = await Promise.all([
        fetch('/api/hrm/payroll/payslips'),
        fetch('/api/hrm/leaves'),
      ]);

      if (payslipsRes.ok) {
        const pData = await payslipsRes.json();
        setPayslips(pData.payslips || []);
      }

      if (leavesRes.ok) {
        const lData = await leavesRes.json();
        setBalances(lData.balances || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEssData();
  }, []);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTitle || !claimAmount) return;

    try {
      const res = await fetch('/api/hrm/payroll/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: claimTitle,
          category: claimCategory,
          amount: claimAmount,
        }),
      });
      if (res.ok) {
        setShowClaimModal(false);
        setClaimTitle('');
        await fetchEssData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold mb-2 border border-[#0D9488]/20">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Employee Self-Service (ESS) Console</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
              Welcome, {user?.fullName || 'Colleague'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Access your monthly salary slips, check leave entitlements, submit expense claims, and track service desk requests.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('hrm-leave')}
              className="px-3.5 py-2 border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
            <button
              onClick={() => setShowClaimModal(true)}
              className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Expense Claim</span>
            </button>
          </div>
        </div>

        {/* Quick Employee Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-[#E2E8F0] text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Employee ID</span>
            <p className="font-mono font-bold text-[#111111] mt-0.5">{user?.employeeProfile?.employeeId || user?.employeeId || 'GI-EMP-000001'}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Designation</span>
            <p className="font-semibold text-slate-800 mt-0.5">{user?.designation || 'Staff Associate'}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Official Email</span>
            <p className="font-medium text-slate-600 mt-0.5 truncate">{user?.email}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Account Access</span>
            <p className="font-bold text-[#0D9488] mt-0.5">{user?.roleDisplayName || user?.role}</p>
          </div>
        </div>
      </div>

      {/* ESS Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7E2] pb-2">
        <button
          onClick={() => setActiveEssTab('payslips')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeEssTab === 'payslips'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>My Payslips ({payslips.length})</span>
        </button>

        <button
          onClick={() => setActiveEssTab('leaves')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeEssTab === 'leaves'
              ? 'bg-[#111111] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Leave Entitlements ({balances.length})</span>
        </button>
      </div>

      {/* TAB 1: PAYSLIPS */}
      {activeEssTab === 'payslips' && (
        <div className="bg-white border border-[#E5E7E2] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E5E7E2] flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">Official Monthly Payslips</h2>
            <span className="text-[11px] text-slate-400">Cryptographically verified documents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F2] border-b border-[#E5E7E2] text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Payslip #</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Gross Salary</th>
                  <th className="py-3 px-4 text-right">Total Deductions</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7E2]">
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No finalized payslips available for this account yet.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#111111]">{p.payslipNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.periodCode}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">₹{p.grossPay.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">-₹{p.totalDeductions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#0D9488]">₹{p.netPay.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(p.generatedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayslip(p)}
                          className="px-2.5 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE BALANCES */}
      {activeEssTab === 'leaves' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#111111] text-sm">{b.leaveType?.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F0FDFA] border border-[#E2E8F0] rounded font-bold">
                  {b.leaveType?.code}
                </span>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-[#0D9488]">{b.availableDays}</span>
                  <span className="text-xs text-slate-500 ml-1.5">Days Available</span>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Used: <strong className="text-slate-700">{b.usedDays}</strong></p>
                  <p>Pending: <strong className="text-amber-600">{b.pendingDays}</strong></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OFFICIAL PAYSLIP POPUP MODAL */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-[#E5E7E2] animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0D9488] flex items-center justify-center text-white font-bold text-base">
                    GI
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#111111] tracking-tight">GROWTH INDIA ENTERPRISE</h2>
                    <p className="text-[10px] text-slate-500">Corporate Employee Payslip</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono font-bold text-[#0D9488]">
                  PAYSLIP: {selectedPayslip.periodCode}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Ref: {selectedPayslip.payslipNumber}
                </p>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-[#E2E8F0] bg-[#F0FDFA] p-4 rounded-xl mt-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Employee Name</p>
                <p className="font-bold text-[#111111] mt-0.5">{selectedPayslip.employee?.fullName || user?.fullName}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Designation</p>
                <p className="font-medium text-slate-700">{selectedPayslip.employee?.designation || user?.designation}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Employee ID</p>
                <p className="font-bold text-[#111111] mt-0.5 font-mono">{selectedPayslip.employee?.employeeId || user?.employeeId}</p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Bank Account</p>
                <p className="font-mono text-slate-700 text-[11px]">
                  {selectedPayslip.employee?.bankAccountNumber || 'Verified Corporate Account'}
                </p>
              </div>
            </div>

            {/* Amounts Summary */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Gross Earnings</span>
                <p className="text-xl font-bold text-[#111111] mt-1">₹{selectedPayslip.grossPay.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Total Deductions</span>
                <p className="text-xl font-bold text-red-600 mt-1">-₹{selectedPayslip.totalDeductions.toLocaleString()}</p>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div className="mt-6 p-4 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/30 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#0D9488] uppercase">Net Salary Transferred</p>
                <p className="text-2xl font-black text-[#111111] mt-0.5">₹{selectedPayslip.netPay.toLocaleString()}</p>
                {selectedPayslip.netPayInWords && (
                  <p className="text-[10px] text-slate-500 mt-1 italic">{selectedPayslip.netPayInWords}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white text-[#0D9488] border border-[#0D9488]/30 shadow-xs">
                  Signed & Finalized
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

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CLAIM MODAL */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Submit Expense Claim</h3>
            <p className="text-xs text-slate-500 mt-1">Submit travel or business reimbursement for payroll credit.</p>

            <form onSubmit={handleSubmitClaim} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Onsite Meeting Travel"
                  value={claimTitle}
                  onChange={(e) => setClaimTitle(e.target.value)}
                  className="w-full p-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={claimCategory}
                  onChange={(e) => setClaimCategory(e.target.value)}
                  className="w-full p-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
                >
                  <option value="TRAVEL">Travel & Commute</option>
                  <option value="MEALS">Client Meals & Entertainment</option>
                  <option value="INTERNET">Broadband / Remote Work</option>
                  <option value="SUPPLIES">Office Supplies & Stationery</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Claim Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(Number(e.target.value))}
                  className="w-full p-2 border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
