'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  FileCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Info,
  Scale,
} from 'lucide-react';

interface EditComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    designation?: string;
    department?: string;
    panNumber?: string | null;
    panMasked?: string | null;
    aadhaarMasked?: string | null;
    pfUan?: string | null;
    esiNumber?: string | null;
    ptState?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    bankIfsc?: string | null;
  };
  statutoryInfo?: {
    pan?: string;
    panMasked?: string;
    aadhaarMasked?: string;
    pfUan?: string;
    esiNumber?: string;
    ptState?: string;
  } | null;
  bankInfo?: {
    bankName?: string;
    bankAccount?: string;
    bankIfsc?: string;
  } | null;
  onUpdated: () => void;
}

const INDIAN_STATES = [
  'Maharashtra',
  'Karnataka',
  'Delhi',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'West Bengal',
  'Uttar Pradesh',
  'Haryana',
  'Rajasthan',
  'Kerala',
  'Andhra Pradesh',
  'Madhya Pradesh',
  'Punjab',
  'Odisha',
  'Bihar',
  'Assam',
  'Goa',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Chandigarh',
];

export const EditComplianceModal: React.FC<EditComplianceModalProps> = ({
  isOpen,
  onClose,
  employee,
  statutoryInfo,
  bankInfo,
  onUpdated,
}) => {
  const [panNumber, setPanNumber] = useState<string>(
    statutoryInfo?.pan || employee.panNumber || ''
  );
  const [showPan, setShowPan] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState<string>(
    statutoryInfo?.aadhaarMasked || employee.aadhaarMasked || ''
  );

  // Provident Fund
  const [pfEnrolled, setPfEnrolled] = useState<boolean>(
    Boolean(statutoryInfo?.pfUan && statutoryInfo.pfUan !== 'N/A')
  );
  const [pfUan, setPfUan] = useState<string>(
    statutoryInfo?.pfUan && statutoryInfo.pfUan !== 'N/A' ? statutoryInfo.pfUan : ''
  );

  // ESI
  const [esiEnrolled, setEsiEnrolled] = useState<boolean>(
    Boolean(statutoryInfo?.esiNumber && statutoryInfo.esiNumber !== 'N/A')
  );
  const [esiNumber, setEsiNumber] = useState<string>(
    statutoryInfo?.esiNumber && statutoryInfo.esiNumber !== 'N/A' ? statutoryInfo.esiNumber : ''
  );

  // Professional Tax & Tax Regime
  const [ptState, setPtState] = useState<string>(
    statutoryInfo?.ptState || employee.ptState || 'Maharashtra'
  );
  const [taxRegime, setTaxRegime] = useState<'NEW' | 'OLD'>('NEW');

  // Bank Info
  const [bankName, setBankName] = useState<string>(
    bankInfo?.bankName || employee.bankName || 'HDFC Bank'
  );
  const [bankAccount, setBankAccount] = useState<string>(
    bankInfo?.bankAccount || employee.bankAccount || ''
  );
  const [bankIfsc, setBankIfsc] = useState<string>(
    bankInfo?.bankIfsc || employee.bankIfsc || ''
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPanNumber(statutoryInfo?.pan || employee.panNumber || '');
      setAadhaarNumber(statutoryInfo?.aadhaarMasked || employee.aadhaarMasked || '');
      const hasPf = Boolean(statutoryInfo?.pfUan && statutoryInfo.pfUan !== 'N/A');
      setPfEnrolled(hasPf);
      setPfUan(hasPf ? (statutoryInfo?.pfUan || '') : '');
      const hasEsi = Boolean(statutoryInfo?.esiNumber && statutoryInfo.esiNumber !== 'N/A');
      setEsiEnrolled(hasEsi);
      setEsiNumber(hasEsi ? (statutoryInfo?.esiNumber || '') : '');
      setPtState(statutoryInfo?.ptState || employee.ptState || 'Maharashtra');
      setBankName(bankInfo?.bankName || employee.bankName || 'HDFC Bank');
      setBankAccount(bankInfo?.bankAccount || employee.bankAccount || '');
      setBankIfsc(bankInfo?.bankIfsc || employee.bankIfsc || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, statutoryInfo, employee, bankInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic PAN format validation if entered
    const cleanPan = panNumber.trim().toUpperCase();
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setErrorMsg('Invalid PAN format. Must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panNumber: cleanPan || null,
          aadharNumber: aadhaarNumber.trim() || null,
          pfUan: pfEnrolled ? (pfUan.trim() || null) : null,
          esiNumber: esiEnrolled ? (esiNumber.trim() || null) : null,
          ptState: ptState.trim(),
          bankName: bankName.trim() || null,
          bankAccount: bankAccount.trim() || null,
          bankIfsc: bankIfsc.trim().toUpperCase() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update compliance details');
      }

      setSuccessMsg('Statutory and compliance configurations saved successfully!');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">
                  Regulatory Compliance
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {employee.employeeId}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Statutory & Tax Setup — {employee.fullName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Section 1: Income Tax & National Identity */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Identity & Tax Credentials</span>
              </h3>
              <span className="text-[10px] text-slate-400">Used for TDS returns & Form 16 issuance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Permanent Account Number (PAN) *
                </label>
                <div className="relative">
                  <input
                    type={showPan ? 'text' : 'password'}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 tracking-wider uppercase focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPan(!showPan)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPan ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Format: 5 letters, 4 digits, 1 letter</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Income Tax Regime
                </label>
                <select
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:border-indigo-600 outline-hidden cursor-pointer"
                >
                  <option value="NEW">New Tax Regime (Section 115BAC) — Default</option>
                  <option value="OLD">Old Tax Regime (With Chapter VI-A Deductions)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Determines provisional TDS calculation slab</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Aadhaar Number / Virtual ID
                </label>
                <input
                  type="text"
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  maxLength={16}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:border-indigo-600 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Statutory Social Security (EPF & ESI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* EPF Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>Provident Fund (EPF)</span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pfEnrolled}
                    onChange={(e) => setPfEnrolled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {pfEnrolled ? (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Universal Account Number (UAN)
                    </label>
                    <input
                      type="text"
                      value={pfUan}
                      onChange={(e) => setPfUan(e.target.value)}
                      placeholder="12-digit UAN (e.g. 101234567890)"
                      maxLength={12}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[10px] text-emerald-800 space-y-0.5">
                    <p className="font-bold">Statutory Rule: 12% of Basic Salary</p>
                    <p className="text-emerald-700">Capped at ₹15,000 wage ceiling (max ₹1,800/month employee contribution).</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 py-2 italic">
                  Employee is marked as exempt or non-enrolled in EPF scheme.
                </p>
              )}
            </div>

            {/* ESI Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>State Insurance (ESI)</span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esiEnrolled}
                    onChange={(e) => setEsiEnrolled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {esiEnrolled ? (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ESI Insurance Number
                    </label>
                    <input
                      type="text"
                      value={esiNumber}
                      onChange={(e) => setEsiNumber(e.target.value)}
                      placeholder="17-digit ESI IP Number"
                      maxLength={17}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:bg-white focus:border-sky-600 outline-hidden"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-100 text-[10px] text-sky-800 space-y-0.5">
                    <p className="font-bold">Statutory Threshold: Monthly Gross ≤ ₹21,000</p>
                    <p className="text-sky-700">Deducts 0.75% Employee + 3.25% Employer contribution.</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 py-2 italic">
                  Employee is exempt or not covered under ESI Act.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Professional Tax Jurisdiction */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Professional Tax (PT) Jurisdiction</span>
              </span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                State Law Dependent
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Jurisdiction State *
                </label>
                <select
                  value={ptState}
                  onChange={(e) => setPtState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:border-purple-600 outline-hidden cursor-pointer"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 flex items-center">
                <span>
                  {ptState === 'Maharashtra'
                    ? 'Maharashtra: ₹200/mo for gross > ₹10,000 (₹300 in February).'
                    : ptState === 'Karnataka'
                    ? 'Karnataka: ₹200/mo for gross ≥ ₹15,000.'
                    : ptState === 'Delhi'
                    ? 'Delhi: No Professional Tax applicable.'
                    : `${ptState}: Standard state PT slab rates applied automatically.`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Remittance Banking Synchronization */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Remittance Account Sync</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase text-slate-800 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Compliance Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
