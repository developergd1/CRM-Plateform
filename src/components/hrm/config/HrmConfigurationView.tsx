'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant } from '@/lib/hrmStore';
import {
  Sliders,
  ShieldCheck,
  Clock,
  Target,
  CheckCircle2,
  Save,
  RotateCcw,
  Plus,
  Calendar,
  AlertCircle,
  HelpCircle,
  Percent,
  Check,
  Building,
} from 'lucide-react';

interface HrmConfigurationViewProps {
  currentTenant: HrmTenant;
}

type ConfigTab = 'payroll' | 'statutory' | 'workpay' | 'pms' | 'approvals';

export const HrmConfigurationView: React.FC<HrmConfigurationViewProps> = ({ currentTenant }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('payroll');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuration Form State
  const [config, setConfig] = useState({
    workingDaysPerMonth: 26,
    lopPolicy: 'WORKING_DAYS' as 'WORKING_DAYS' | 'CALENDAR_DAYS' | 'PAYABLE_DAYS',
    payCycle: 'MONTHLY',
    overtimeRatePerHour: 200,
    overtimeMultiplier: 1.5,
    overtimeRequiresApproval: true,
    pmsReviewFrequency: 'QUARTERLY',
    pmsRatingScale: 5,
    requireHrApprovalForLeave: true,
    requireAdminSignoffForPayroll: true,
  });

  // Statutory Rules State
  const [statutoryRules, setStatutoryRules] = useState<any[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'PF' as 'PF' | 'ESI' | 'TDS' | 'PT',
    country: 'India',
    state: 'Maharashtra',
    employeeRate: 12,
    employerRate: 12,
    ceilingAmount: 15000,
    thresholdAmount: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchConfigData = async () => {
    try {
      setLoading(true);
      const [configRes, rulesRes] = await Promise.all([
        fetch('/api/hrm/config'),
        fetch('/api/hrm/compliance/rules'),
      ]);

      if (configRes.ok) {
        const cData = await configRes.json();
        if (cData.config) {
          setConfig({
            workingDaysPerMonth: cData.config.workingDaysPerMonth ?? 26,
            lopPolicy: cData.config.lopPolicy ?? 'WORKING_DAYS',
            payCycle: cData.config.payCycle ?? 'MONTHLY',
            overtimeRatePerHour: cData.config.overtimeRatePerHour ?? 200,
            overtimeMultiplier: cData.config.overtimeMultiplier ?? 1.5,
            overtimeRequiresApproval: cData.config.overtimeRequiresApproval ?? true,
            pmsReviewFrequency: cData.config.pmsReviewFrequency ?? 'QUARTERLY',
            pmsRatingScale: cData.config.pmsRatingScale ?? 5,
            requireHrApprovalForLeave: cData.config.requireHrApprovalForLeave ?? true,
            requireAdminSignoffForPayroll: cData.config.requireAdminSignoffForPayroll ?? true,
          });
        }
      }

      if (rulesRes.ok) {
        const rData = await rulesRes.json();
        setStatutoryRules(rData.rules || []);
      }
    } catch (err) {
      console.error('Failed to load configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigData();
  }, [currentTenant]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/hrm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        showToast('HRM policy configuration saved and active for subsequent payroll calculations.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStatutoryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hrm/compliance/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleForm,
          employeeRate: Number(ruleForm.employeeRate),
          employerRate: Number(ruleForm.employerRate),
          ceilingAmount: ruleForm.ceilingAmount ? Number(ruleForm.ceilingAmount) : null,
          thresholdAmount: ruleForm.thresholdAmount ? Number(ruleForm.thresholdAmount) : null,
        }),
      });

      if (res.ok) {
        showToast('New versioned statutory rule added.');
        setShowRuleModal(false);
        await fetchConfigData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save rule');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-bold animate-slideDown">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">HRM & Payroll Configuration</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              Deterministic Governance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure enterprise statutory percentages, LOP deduction policies, overtime multipliers, and approval gates.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Policies...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Configuration Tabs matching Section 35 */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
        {[
          { id: 'payroll', label: 'Payroll Rules & LOP', icon: Sliders },
          { id: 'statutory', label: 'Statutory Rules Engine (PF/ESI/TDS/PT)', icon: ShieldCheck, badge: statutoryRules.length },
          { id: 'workpay', label: 'Work & Overtime Policies', icon: Clock },
          { id: 'pms', label: 'PMS / Goal Policies', icon: Target },
          { id: 'approvals', label: 'Approval Settings & Gates', icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConfigTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 bg-white/20 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PAYROLL RULES & LOP */}
      {activeTab === 'payroll' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-3xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configurable LOP & Pay Cycle Engine</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly adheres to Section 14: LOP deduction basis is configurable and not hardcoded globally.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">LOP Calculation Policy *</label>
              <select
                value={config.lopPolicy}
                onChange={(e: any) => setConfig({ ...config, lopPolicy: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value="WORKING_DAYS">Working Days (Base Salary / 26 Working Days)</option>
                <option value="CALENDAR_DAYS">Calendar Days (Base Salary / Total Days in Month [28-31])</option>
                <option value="PAYABLE_DAYS">Payable Days (Base Salary / Scheduled Payable Days)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Formula: LOP = (Applicable Base / Policy Days) × Unpaid Days
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Standard Working Days Per Month</label>
              <input
                type="number"
                min="20"
                max="31"
                value={config.workingDaysPerMonth}
                onChange={(e) => setConfig({ ...config, workingDaysPerMonth: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Used when policy is set to Working Days (default 26)</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Pay Cycle Frequency</label>
              <select
                value={config.payCycle}
                onChange={(e) => setConfig({ ...config, payCycle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value="MONTHLY">Monthly (1st to end of month)</option>
                <option value="BI_WEEKLY">Bi-Weekly (Every 14 days)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATUTORY RULES ENGINE (PF, ESI, TDS, PT) */}
      {activeTab === 'statutory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Versioned Statutory Rule Engine</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Strictly adheres to Section 17: Statutory percentages are versioned and configurable. Historical finalized payroll never gets retroactively overwritten.
              </p>
            </div>

            <button
              onClick={() => setShowRuleModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Versioned Statutory Rule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statutoryRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-[#0D9488] transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                      {rule.ruleType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rule.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rule.isActive ? 'ACTIVE' : 'HISTORICAL'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {rule.ruleType === 'PF' && 'Employees Provident Fund (EPF)'}
                      {rule.ruleType === 'ESI' && 'Employee State Insurance (ESIC)'}
                      {rule.ruleType === 'TDS' && 'Tax Deducted at Source (TDS)'}
                      {rule.ruleType === 'PT' && `Professional Tax (${rule.state || 'State'})`}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {rule.state ? `${rule.state}, ` : ''}{rule.country || 'India'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employee Deduction</span>
                      <strong className="text-slate-900 font-mono">{rule.employeeRate}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employer Contribution</span>
                      <strong className="text-slate-900 font-mono">{rule.employerRate}%</strong>
                    </div>
                    {rule.ceilingAmount && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ceiling Limit</span>
                        <strong className="text-slate-900 font-mono">₹{rule.ceilingAmount.toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {rule.thresholdAmount && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Threshold Wage</span>
                        <strong className="text-slate-900 font-mono">₹{rule.thresholdAmount.toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>From: {new Date(rule.effectiveFrom).toLocaleDateString()}</span>
                  <span>{rule.effectiveTo ? `To: ${new Date(rule.effectiveTo).toLocaleDateString()}` : 'Indefinite'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WORK & OVERTIME POLICIES */}
      {activeTab === 'workpay' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Work Hours & Overtime Policies</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly adheres to Section 15: Configurable overtime rates and approval prerequisites.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Hourly Overtime Rate (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={config.overtimeRatePerHour}
                  onChange={(e) => setConfig({ ...config, overtimeRatePerHour: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Overtime Multiplier (e.g. 1.5x)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={config.overtimeMultiplier}
                  onChange={(e) => setConfig({ ...config, overtimeMultiplier: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 text-xs block">Require Manager Overtime Approval</strong>
                <p className="text-[11px] text-slate-500">
                  When enabled, unapproved overtime hours are flagged in payroll exceptions and excluded from calculation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.overtimeRequiresApproval}
                onChange={(e) => setConfig({ ...config, overtimeRequiresApproval: e.target.checked })}
                className="w-4 h-4 accent-[#0D9488] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PMS / GOAL POLICIES */}
      {activeTab === 'pms' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Performance Management System (PMS) Policies</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review cycle frequencies, rating calibration scales, and governance policies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Review Frequency</label>
              <select
                value={config.pmsReviewFrequency}
                onChange={(e) => setConfig({ ...config, pmsReviewFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value="QUARTERLY">Quarterly (Q1, Q2, Q3, Q4)</option>
                <option value="BI_ANNUAL">Bi-Annual (Every 6 Months)</option>
                <option value="ANNUAL">Annual (FY End Calibration)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rating Calibration Scale</label>
              <select
                value={config.pmsRatingScale}
                onChange={(e) => setConfig({ ...config, pmsRatingScale: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value={5}>5-Star Scale (1.0 to 5.0)</option>
                <option value={10}>10-Point Scale (1.0 to 10.0)</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
            <strong className="block font-bold">Important Business Constraint:</strong>
            <p className="text-[11px] text-amber-800">
              In adherence to Section 31 & 32: Performance score must NEVER automatically change employee salary. Only an explicitly approved appraisal decision can trigger payroll adjustments or salary revisions.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: APPROVAL SETTINGS & GATES */}
      {activeTab === 'approvals' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Governance & Approval Sign-off Gates</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enforce multi-step approval workflows across Leave and Payroll finalization.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 text-xs block">Require HR Approval For Leave Applications</strong>
                <p className="text-[11px] text-slate-500">
                  Approved leaves update leave balance ledgers and unpaid leaves flow automatically into LOP deduction.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.requireHrApprovalForLeave}
                onChange={(e) => setConfig({ ...config, requireHrApprovalForLeave: e.target.checked })}
                className="w-4 h-4 accent-[#0D9488] cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 text-xs block">Require Admin Sign-off for Payroll Finalization</strong>
                <p className="text-[11px] text-slate-500">
                  Finalization permanently locks the payroll period. Blocking exceptions prevent finalization until resolved.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.requireAdminSignoffForPayroll}
                onChange={(e) => setConfig({ ...config, requireAdminSignoffForPayroll: e.target.checked })}
                className="w-4 h-4 accent-[#0D9488] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STATUTORY RULE */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add Versioned Statutory Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStatutoryRule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rule Type *</label>
                  <select
                    value={ruleForm.ruleType}
                    onChange={(e: any) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white cursor-pointer"
                  >
                    <option value="PF">EPF (Provident Fund)</option>
                    <option value="ESI">ESIC (Employee State Insurance)</option>
                    <option value="TDS">TDS (Tax Deducted at Source)</option>
                    <option value="PT">PT (Professional Tax)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State (if PT)</label>
                  <input
                    type="text"
                    value={ruleForm.state}
                    onChange={(e) => setRuleForm({ ...ruleForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleForm.employeeRate}
                    onChange={(e) => setRuleForm({ ...ruleForm, employeeRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employer Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleForm.employerRate}
                    onChange={(e) => setRuleForm({ ...ruleForm, employerRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ceiling Amount (₹)</label>
                  <input
                    type="number"
                    value={ruleForm.ceilingAmount}
                    onChange={(e) => setRuleForm({ ...ruleForm, ceilingAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Threshold Amount (₹)</label>
                  <input
                    type="number"
                    value={ruleForm.thresholdAmount}
                    onChange={(e) => setRuleForm({ ...ruleForm, thresholdAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective From Date</label>
                <input
                  type="date"
                  value={ruleForm.effectiveFrom}
                  onChange={(e) => setRuleForm({ ...ruleForm, effectiveFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Save Statutory Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
