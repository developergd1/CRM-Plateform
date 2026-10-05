'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Sliders,
} from 'lucide-react';

interface SalaryStructureItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  components?: any[];
}

export interface SalaryCustomConfig {
  calculationMode: 'AUTO' | 'MANUAL';
  pfOption: 'AUTO' | 'CUSTOM' | 'EXEMPT';
  pfAmount: number;
  ptOption: 'AUTO' | 'CUSTOM' | 'EXEMPT';
  ptAmount: number;
  tdsOption: 'AUTO' | 'CUSTOM' | 'EXEMPT';
  tdsAmount: number;
  esiOption: 'AUTO' | 'CUSTOM' | 'EXEMPT';
  esiAmount: number;
  earningsMode: 'AUTO' | 'CUSTOM';
  basicAmount: number;
  hraAmount: number;
  specialAllowance: number;
}

interface AssignSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    employeeId: string;
    fullName: string;
    designation?: string;
    department?: string;
    clientId?: string | null;
    panNumber?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    bankIfsc?: string | null;
  };
  currentSalaryProfile?: {
    assignmentId?: string;
    structureCode?: string;
    structureName?: string;
    annualCtc?: number;
    monthlyCtc?: number;
    effectiveFrom?: string;
    version?: number;
    customConfig?: SalaryCustomConfig | null;
  } | null;
  bankInfo?: {
    bankName?: string;
    bankAccount?: string;
    bankIfsc?: string;
  } | null;
  onUpdated: () => void;
}

export const AssignSalaryModal: React.FC<AssignSalaryModalProps> = ({
  isOpen,
  onClose,
  employee,
  currentSalaryProfile,
  bankInfo,
  onUpdated,
}) => {
  const [structures, setStructures] = useState<SalaryStructureItem[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [annualCtc, setAnnualCtc] = useState<number>(currentSalaryProfile?.annualCtc || 600000);
  const [monthlyCtc, setMonthlyCtc] = useState<number>(currentSalaryProfile?.monthlyCtc || 50000);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Manual Component Controls (Admin / Client access)
  const existingConfig = currentSalaryProfile?.customConfig;
  const [calcMode, setCalcMode] = useState<'AUTO' | 'MANUAL'>(
    existingConfig?.calculationMode || 'AUTO'
  );

  // PF Controls
  const [pfOption, setPfOption] = useState<'AUTO' | 'CUSTOM' | 'EXEMPT'>(
    existingConfig?.pfOption || 'AUTO'
  );
  const [pfCustomAmount, setPfCustomAmount] = useState<number>(
    existingConfig?.pfAmount ?? 1800
  );

  // PT Controls
  const [ptOption, setPtOption] = useState<'AUTO' | 'CUSTOM' | 'EXEMPT'>(
    existingConfig?.ptOption || 'AUTO'
  );
  const [ptCustomAmount, setPtCustomAmount] = useState<number>(
    existingConfig?.ptAmount ?? 200
  );

  // TDS Controls
  const [tdsOption, setTdsOption] = useState<'AUTO' | 'CUSTOM' | 'EXEMPT'>(
    existingConfig?.tdsOption || 'AUTO'
  );
  const [tdsCustomAmount, setTdsCustomAmount] = useState<number>(
    existingConfig?.tdsAmount ?? (monthlyCtc >= 50000 ? Math.round(monthlyCtc * 0.05) : 0)
  );

  // ESIC Controls
  const [esiOption, setEsiOption] = useState<'AUTO' | 'CUSTOM' | 'EXEMPT'>(
    existingConfig?.esiOption || 'AUTO'
  );
  const [esiCustomAmount, setEsiCustomAmount] = useState<number>(
    existingConfig?.esiAmount ?? 0
  );

  // Earnings Breakdown Controls
  const [earningsMode, setEarningsMode] = useState<'AUTO' | 'CUSTOM'>(
    existingConfig?.earningsMode || 'AUTO'
  );
  const [basicCustomAmount, setBasicCustomAmount] = useState<number>(
    existingConfig?.basicAmount ?? Math.round(monthlyCtc * 0.5)
  );
  const [hraCustomAmount, setHraCustomAmount] = useState<number>(
    existingConfig?.hraAmount ?? Math.round(monthlyCtc * 0.2)
  );
  const [specialAllowanceCustom, setSpecialAllowanceCustom] = useState<number>(
    existingConfig?.specialAllowance ??
      Math.max(0, monthlyCtc - (Math.round(monthlyCtc * 0.5) + Math.round(monthlyCtc * 0.2)))
  );

  // Remittance
  const [bankName, setBankName] = useState<string>(
    bankInfo?.bankName || employee.bankName || 'HDFC Bank'
  );
  const [bankAccount, setBankAccount] = useState<string>(
    bankInfo?.bankAccount || employee.bankAccount || ''
  );
  const [bankIfsc, setBankIfsc] = useState<string>(
    bankInfo?.bankIfsc || employee.bankIfsc || ''
  );
  const [panNumber, setPanNumber] = useState<string>(employee.panNumber || '');

  const [loadingStructures, setLoadingStructures] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch salary structures
  useEffect(() => {
    if (!isOpen) return;
    setLoadingStructures(true);
    fetch('/api/hrm/payroll/structures')
      .then((res) => res.json())
      .then((data) => {
        if (data.structures && data.structures.length > 0) {
          setStructures(data.structures);
          const matched = data.structures.find(
            (s: any) =>
              s.code === currentSalaryProfile?.structureCode ||
              s.name === currentSalaryProfile?.structureName
          );
          setSelectedStructureId(matched ? matched.id : data.structures[0].id);
        }
      })
      .catch((e) => console.error('Failed to load salary structures:', e))
      .finally(() => setLoadingStructures(false));
  }, [isOpen, currentSalaryProfile]);

  // Two-way synchronization between Annual CTC and Monthly Gross
  const handleAnnualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) || 0;
    setAnnualCtc(val);
    const newMonthly = Math.round(val / 12);
    setMonthlyCtc(newMonthly);

    if (earningsMode === 'AUTO') {
      const b = Math.round(newMonthly * 0.5);
      const h = Math.round(b * 0.4);
      setBasicCustomAmount(b);
      setHraCustomAmount(h);
      setSpecialAllowanceCustom(Math.max(0, newMonthly - (b + h)));
    }
  };

  const handleMonthlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) || 0;
    setMonthlyCtc(val);
    setAnnualCtc(Math.round(val * 12));

    if (earningsMode === 'AUTO') {
      const b = Math.round(val * 0.5);
      const h = Math.round(b * 0.4);
      setBasicCustomAmount(b);
      setHraCustomAmount(h);
      setSpecialAllowanceCustom(Math.max(0, val - (b + h)));
    }
  };

  // Auto-calculated defaults
  const autoBasic = Math.round(monthlyCtc * 0.5);
  const autoHra = Math.round(autoBasic * 0.4);
  const autoSpecial = Math.max(0, monthlyCtc - (autoBasic + autoHra));

  const autoPf = autoBasic > 15000 ? 1800 : Math.round(autoBasic * 0.12);
  const autoPt = monthlyCtc > 10000 ? 200 : 0;
  const autoTds = monthlyCtc >= 50000 ? Math.round(monthlyCtc * 0.05) : 0;
  const autoEsi = monthlyCtc <= 21000 ? Math.round(monthlyCtc * 0.0075) : 0;

  // Active amounts (based on Auto vs Manual choice)
  const effectiveBasic = calcMode === 'MANUAL' && earningsMode === 'CUSTOM' ? basicCustomAmount : autoBasic;
  const effectiveHra = calcMode === 'MANUAL' && earningsMode === 'CUSTOM' ? hraCustomAmount : autoHra;
  const effectiveSpecial =
    calcMode === 'MANUAL' && earningsMode === 'CUSTOM'
      ? specialAllowanceCustom
      : Math.max(0, monthlyCtc - (effectiveBasic + effectiveHra));

  const effectivePf =
    calcMode === 'MANUAL'
      ? pfOption === 'EXEMPT'
        ? 0
        : pfOption === 'CUSTOM'
        ? pfCustomAmount
        : autoPf
      : autoPf;

  const effectivePt =
    calcMode === 'MANUAL'
      ? ptOption === 'EXEMPT'
        ? 0
        : ptOption === 'CUSTOM'
        ? ptCustomAmount
        : autoPt
      : autoPt;

  const effectiveTds =
    calcMode === 'MANUAL'
      ? tdsOption === 'EXEMPT'
        ? 0
        : tdsOption === 'CUSTOM'
        ? tdsCustomAmount
        : autoTds
      : autoTds;

  const effectiveEsi =
    calcMode === 'MANUAL'
      ? esiOption === 'EXEMPT'
        ? 0
        : esiOption === 'CUSTOM'
        ? esiCustomAmount
        : autoEsi
      : autoEsi;

  const totalDeductions = effectivePf + effectivePt + effectiveTds + effectiveEsi;
  const effectiveTakeHome = Math.max(0, monthlyCtc - totalDeductions);

  // Balance earnings remainder in custom mode
  const handleAutoBalanceSpecial = () => {
    const remainder = Math.max(0, monthlyCtc - (basicCustomAmount + hraCustomAmount));
    setSpecialAllowanceCustom(remainder);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructureId) {
      setErrorMsg('Please select a Salary Structure');
      return;
    }
    if (!annualCtc || annualCtc <= 0) {
      setErrorMsg('Annual CTC must be greater than 0');
      return;
    }
    if (!monthlyCtc || monthlyCtc <= 0) {
      setErrorMsg('Monthly Gross must be greater than 0');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const customConfigPayload: SalaryCustomConfig = {
      calculationMode: calcMode,
      pfOption,
      pfAmount: effectivePf,
      ptOption,
      ptAmount: effectivePt,
      tdsOption,
      tdsAmount: effectiveTds,
      esiOption,
      esiAmount: effectiveEsi,
      earningsMode,
      basicAmount: effectiveBasic,
      hraAmount: effectiveHra,
      specialAllowance: effectiveSpecial,
    };

    try {
      const res = await fetch('/api/hrm/payroll/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          structureId: selectedStructureId,
          baseCtcAnnual: annualCtc,
          effectiveFrom,
          bankName,
          bankAccount,
          bankIfsc,
          panNumber,
          customConfig: customConfigPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign salary structure');
      }

      setSuccessMsg('Salary structure assigned and persisted successfully!');
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-black">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md">
                  Payroll Architecture
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {employee.employeeId}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Assign Salary Structure — {employee.fullName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - noValidate prevents HTML5 tooltip errors */}
        <form noValidate onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
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

          {/* Section 1: Salary Structure Selection (Clean, Fresh, No Subtitle Clutter) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#0D9488]" />
              <span>Salary Structure & Rate Card</span>
            </label>

            {loadingStructures ? (
              <div className="p-4 rounded-2xl border border-slate-200 text-center text-slate-400 font-semibold">
                Loading salary structures...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {structures.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStructureId(s.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selectedStructureId === s.id
                        ? 'border-[#0D9488] bg-[#0D9488]/5 ring-2 ring-[#0D9488]/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-slate-900">{s.name}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-2 py-0.5 rounded-md bg-slate-100 shrink-0">
                      {s.code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Compensation Numbers (No Unnecessary Subtitles) */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Compensation Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Annual CTC (₹ / Year) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={annualCtc || ''}
                    onChange={handleAnnualChange}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-hidden"
                    placeholder="e.g. 600000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Monthly Gross (₹ / Month) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={monthlyCtc || ''}
                    onChange={handleMonthlyChange}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-[#0D9488] focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-hidden"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Effective Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 outline-hidden cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Salary Breakdown & Manual Configuration Controls (Admin / Client Access) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Salary Breakdown & Statutory Controls</span>
                </h3>
              </div>

              {/* Mode Toggle Switcher: Auto vs Manual */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCalcMode('AUTO')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    calcMode === 'AUTO'
                      ? 'bg-white text-[#0D9488] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Auto (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('MANUAL')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    calcMode === 'MANUAL'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manual Controls
                </button>
              </div>
            </div>

            {/* MANUAL CONTROLS PANEL (Visible when Manual Controls mode is selected) */}
            {calcMode === 'MANUAL' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>Statutory Deduction Rules (Choose Manually)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md">
                    Custom Override Active
                  </span>
                </div>

                {/* 1. PF Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="font-bold text-slate-800 block text-[11px]">
                      Provident Fund (PF)
                    </label>
                    <span className="text-[10px] text-slate-400">Employee contribution</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <select
                      value={pfOption}
                      onChange={(e) => setPfOption(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 focus:border-[#0D9488] outline-hidden cursor-pointer"
                    >
                      <option value="AUTO">Statutory Standard (₹{autoPf})</option>
                      <option value="CUSTOM">Custom Amount</option>
                      <option value="EXEMPT">Exempt / No PF (₹0)</option>
                    </select>

                    {pfOption === 'CUSTOM' && (
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={pfCustomAmount}
                          onChange={(e) => setPfCustomAmount(Number(e.target.value) || 0)}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                          placeholder="Amount"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Professional Tax (PT) Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="font-bold text-slate-800 block text-[11px]">
                      Professional Tax (PT)
                    </label>
                    <span className="text-[10px] text-slate-400">State statutory tax</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <select
                      value={ptOption}
                      onChange={(e) => setPtOption(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 focus:border-[#0D9488] outline-hidden cursor-pointer"
                    >
                      <option value="AUTO">Standard PT (₹{autoPt})</option>
                      <option value="CUSTOM">Custom Amount</option>
                      <option value="EXEMPT">Exempt (₹0)</option>
                    </select>

                    {ptOption === 'CUSTOM' && (
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={ptCustomAmount}
                          onChange={(e) => setPtCustomAmount(Number(e.target.value) || 0)}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                          placeholder="Amount"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. TDS (Income Tax) Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="font-bold text-slate-800 block text-[11px]">
                      TDS (Income Tax)
                    </label>
                    <span className="text-[10px] text-slate-400">Monthly tax withholding</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <select
                      value={tdsOption}
                      onChange={(e) => setTdsOption(e.target.value as any)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 focus:border-[#0D9488] outline-hidden cursor-pointer"
                    >
                      <option value="AUTO">Auto Estimated (₹{autoTds})</option>
                      <option value="CUSTOM">Custom Monthly TDS</option>
                      <option value="EXEMPT">Exempt / Zero (₹0)</option>
                    </select>

                    {tdsOption === 'CUSTOM' && (
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={tdsCustomAmount}
                          onChange={(e) => setTdsCustomAmount(Number(e.target.value) || 0)}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                          placeholder="Amount"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Earnings Components Customization (Optional) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-[11px]">
                      Earnings Component Distribution
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEarningsMode(earningsMode === 'AUTO' ? 'CUSTOM' : 'AUTO')}
                        className="text-[10px] font-bold text-[#0D9488] hover:underline cursor-pointer"
                      >
                        {earningsMode === 'AUTO' ? 'Customize Basic / HRA' : 'Reset to Standard 50/40 Split'}
                      </button>
                    </div>
                  </div>

                  {earningsMode === 'CUSTOM' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 block mb-0.5">Basic Salary (₹)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={basicCustomAmount}
                          onChange={(e) => setBasicCustomAmount(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 block mb-0.5">HRA (₹)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={hraCustomAmount}
                          onChange={(e) => setHraCustomAmount(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold text-slate-600">Special Allowance (₹)</span>
                          <button
                            type="button"
                            onClick={handleAutoBalanceSpecial}
                            className="text-[9px] font-bold text-[#0D9488] hover:underline cursor-pointer"
                          >
                            Auto-balance
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={specialAllowanceCustom}
                          onChange={(e) => setSpecialAllowanceCustom(Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-900 focus:bg-white focus:border-[#0D9488] outline-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Component Simulation Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Basic Salary</span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  ₹{effectiveBasic.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">HRA</span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  ₹{effectiveHra.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Special Allowance</span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  ₹{effectiveSpecial.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20">
                <span className="text-[10px] text-[#0D9488] uppercase font-bold block">Est. Take-Home</span>
                <span className="text-sm font-black text-[#0D9488] font-mono">
                  ₹{effectiveTakeHome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Deductions Summary Strip */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                PF: <strong className="font-mono text-slate-800">₹{effectivePf.toLocaleString()}</strong>
                {calcMode === 'MANUAL' && pfOption !== 'AUTO' && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    {pfOption}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1">
                PT: <strong className="font-mono text-slate-800">₹{effectivePt.toLocaleString()}</strong>
                {calcMode === 'MANUAL' && ptOption !== 'AUTO' && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    {ptOption}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-1">
                TDS: <strong className="font-mono text-slate-800">₹{effectiveTds.toLocaleString()}</strong>
                {calcMode === 'MANUAL' && tdsOption !== 'AUTO' && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    {tdsOption}
                  </span>
                )}
              </span>

              <span className="ml-auto text-slate-500 font-bold">
                Total Deductions: <strong className="font-mono text-rose-600">₹{totalDeductions.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* Section 4: Direct Bank Remittance Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Direct Bank Remittance Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:border-[#0D9488] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 focus:border-[#0D9488] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-slate-800 uppercase focus:border-[#0D9488] outline-hidden"
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
              className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold transition-all shadow-md shadow-[#0D9488]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Assign Structure</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
