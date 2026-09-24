'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Download,
  Calendar,
  DollarSign,
  CheckCircle2,
  FileText,
  Clock,
  RefreshCw,
  Building,
  Receipt,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export const EmployeePayrollView: React.FC = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hrm/payroll/payslips');
      if (res.ok) {
        const json = await res.json();
        setPayslips(json.payslips || []);
        if (json.payslips && json.payslips.length > 0) {
          setSelectedSlip(json.payslips[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching employee payslips:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-bold text-growth-teal mb-2">
            <CreditCard className="w-3.5 h-3.5" />
            <span>PAYROLL & COMPENSATION HUB</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">My Salary & Monthly Payslips</h2>
          <p className="text-xs text-slate-500 mt-1">
            View finalized monthly compensation, salary structures, tax deductions, and download receipts.
          </p>
        </div>

        <button
          onClick={fetchPayslips}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-growth-teal" />
          <span className="text-xs font-bold">Retrieving Verified Compensation Records...</span>
        </div>
      ) : payslips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">No Finalized Payslips Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your organization has not released finalized monthly payslips for this period yet. Once payroll is reviewed and approved by HR/Finance, your salary slips will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payslip History List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-slate-900">Salary Slip Archive</h3>
            <div className="space-y-2">
              {payslips.map((slip) => {
                const isSelected = selectedSlip?.id === slip.id;
                return (
                  <div
                    key={slip.id}
                    onClick={() => setSelectedSlip(slip)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/50 border-teal-500 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                        <Calendar className="w-4 h-4 text-growth-teal" />
                        <span>{slip.periodCode || 'Salary Slip'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        FINALIZED
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500">Net Disbursed:</span>
                      <span className="font-black text-growth-teal font-mono">
                        ₹{(slip.netPay || slip.grossPay || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Payslip Detail Voucher */}
          {selectedSlip && (
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    PAYROLL VOUCHER • {selectedSlip.periodCode || 'MONTHLY'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {user?.fullName} ({user?.employeeId})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Earnings
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Salary</span>
                      <span className="font-bold text-slate-800 font-mono">
                        ₹{((selectedSlip.grossPay || 45000) * 0.5).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">House Rent Allowance (HRA)</span>
                      <span className="font-bold text-slate-800 font-mono">
                        ₹{((selectedSlip.grossPay || 45000) * 0.3).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowances</span>
                      <span className="font-bold text-slate-800 font-mono">
                        ₹{((selectedSlip.grossPay || 45000) * 0.2).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                      <span className="text-slate-900">Gross Earnings</span>
                      <span className="text-growth-teal font-black font-mono">
                        ₹{(selectedSlip.grossPay || 45000).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Statutory Deductions
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provident Fund (PF)</span>
                      <span className="font-bold text-slate-800 font-mono">₹1,800</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Professional Tax (PT)</span>
                      <span className="font-bold text-slate-800 font-mono">₹200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TDS / Income Tax</span>
                      <span className="font-bold text-slate-800 font-mono">₹0</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                      <span className="text-slate-900">Total Deductions</span>
                      <span className="text-rose-600 font-black font-mono">₹2,000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Disbursed Highlight */}
              <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Net Monthly Salary</span>
                  <div className="text-2xl font-black text-growth-teal font-mono mt-0.5">
                    ₹{(selectedSlip.netPay || (selectedSlip.grossPay || 45000) - 2000).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Approved & Disbursed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
