'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Target,
  DollarSign,
  Clock,
  Briefcase,
  Bell,
  RotateCcw,
} from 'lucide-react';

export const CrmSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'leads' | 'deals' | 'activities' | 'accounts' | 'notifications'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [settings, setSettings] = useState<any>({
    general: {
      companyName: 'Growth India',
      crmTitle: 'Growth India CRM Platform',
      supportEmail: 'support@growthindia.com',
      supportPhone: '+91 98765 43210',
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      fiscalYearStart: '04-01',
    },
    leads: {
      autoLeadNumberPrefix: 'LD-',
      defaultLeadSource: 'WEBSITE',
      defaultLeadPriority: 'MEDIUM',
      defaultLeadStatus: 'NEW',
      duplicateCheckPhone: true,
      duplicateCheckEmail: true,
      staleLeadDays: 14,
      autoAssignStrategy: 'ROUND_ROBIN',
    },
    deals: {
      autoDealNumberPrefix: 'DL-',
      defaultPipelineCode: 'STANDARD',
      requireWinReason: true,
      requireLossReason: true,
      allowNegativeAmounts: false,
      staleDealDays: 30,
      notifyOnDealWon: true,
    },
    activities: {
      defaultCallDurationMinutes: 15,
      taskDueReminderMinutes: 60,
      enableActivityAudit: true,
    },
    accounts: {
      autoAccountCodePrefix: 'ACC-',
      defaultAccountType: 'COMMERCIAL',
      enforceIndustryClassification: true,
    },
    notifications: {
      emailOnLeadAssigned: true,
      emailOnDealWon: true,
      whatsappAlertsEnabled: false,
      dailySummaryDigest: true,
    },
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/crm/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings');
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch('/api/crm/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setSuccessMsg('CRM Administration configurations saved successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (section: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
        <p className="text-sm font-semibold">Loading CRM System Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              CRM Administration & Global Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure system-wide lead workflows, sales policies, deal rules, numbering schemes, and automated alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E2E8F0]">
        {[
          { key: 'general', label: 'General & Organization', icon: Building2 },
          { key: 'leads', label: 'Lead Governance', icon: Target },
          { key: 'deals', label: 'Deal & Pipeline Rules', icon: DollarSign },
          { key: 'activities', label: 'Activities & Tasks', icon: Clock },
          { key: 'accounts', label: 'Commercial Accounts', icon: Briefcase },
          { key: 'notifications', label: 'Notifications & Alerts', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-lg transition-all border-b-2 ${
                isActive
                  ? 'border-[#0D9488] text-[#0D9488] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Organization & Commercial Identity
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Entity Name</label>
                <input
                  type="text"
                  value={settings.general?.companyName || ''}
                  onChange={(e) => updateSection('general', 'companyName', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CRM Platform Title</label>
                <input
                  type="text"
                  value={settings.general?.crmTitle || ''}
                  onChange={(e) => updateSection('general', 'crmTitle', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support / Contact Email</label>
                <input
                  type="email"
                  value={settings.general?.supportEmail || ''}
                  onChange={(e) => updateSection('general', 'supportEmail', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone Helpline</label>
                <input
                  type="text"
                  value={settings.general?.supportPhone || ''}
                  onChange={(e) => updateSection('general', 'supportPhone', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operating Currency</label>
                <select
                  value={settings.general?.currency || 'INR'}
                  onChange={(e) => updateSection('general', 'currency', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="AED">AED (د.إ - UAE Dirham)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Timezone</label>
                <select
                  value={settings.general?.timezone || 'Asia/Kolkata'}
                  onChange={(e) => updateSection('general', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Lead Ingestion & Deduplication Policies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lead ID Prefix</label>
                <input
                  type="text"
                  value={settings.leads?.autoLeadNumberPrefix || 'LD-'}
                  onChange={(e) => updateSection('leads', 'autoLeadNumberPrefix', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Auto-assignment Strategy</label>
                <select
                  value={settings.leads?.autoAssignStrategy || 'ROUND_ROBIN'}
                  onChange={(e) => updateSection('leads', 'autoAssignStrategy', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="ROUND_ROBIN">Round Robin (Distribute Equally)</option>
                  <option value="MANUAL">Manual Allocation Only</option>
                  <option value="LEAST_LOADED">Least Loaded Sales Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stale Lead Threshold (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={settings.leads?.staleLeadDays || 14}
                  onChange={(e) => updateSection('leads', 'staleLeadDays', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.leads?.duplicateCheckPhone)}
                  onChange={(e) => updateSection('leads', 'duplicateCheckPhone', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Enforce strict phone number uniqueness check upon lead creation
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.leads?.duplicateCheckEmail)}
                  onChange={(e) => updateSection('leads', 'duplicateCheckEmail', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Enforce email address uniqueness check upon lead creation
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Pipeline Stage & Deal Governance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deal ID Prefix</label>
                <input
                  type="text"
                  value={settings.deals?.autoDealNumberPrefix || 'DL-'}
                  onChange={(e) => updateSection('deals', 'autoDealNumberPrefix', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stale Deal Inactivity (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.deals?.staleDealDays || 30}
                  onChange={(e) => updateSection('deals', 'staleDealDays', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.deals?.requireWinReason)}
                  onChange={(e) => updateSection('deals', 'requireWinReason', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Mandate "Win Reason" commentary before moving deals to Closed Won
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.deals?.requireLossReason)}
                  onChange={(e) => updateSection('deals', 'requireLossReason', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Mandate "Loss Reason" categorization before moving deals to Closed Lost
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.deals?.notifyOnDealWon)}
                  onChange={(e) => updateSection('deals', 'notifyOnDealWon', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Broadcast deal closure victory alert to Sales leadership
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Sales Tasks & Activity Defaults
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Call Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.activities?.defaultCallDurationMinutes || 15}
                  onChange={(e) => updateSection('activities', 'defaultCallDurationMinutes', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Due Reminder Lead Time (Minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1440"
                  value={settings.activities?.taskDueReminderMinutes || 60}
                  onChange={(e) => updateSection('activities', 'taskDueReminderMinutes', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.activities?.enableActivityAudit)}
                  onChange={(e) => updateSection('activities', 'enableActivityAudit', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Record all sales call logs and meeting notes directly into the system Audit Trail
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Commercial Account Policies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Code Prefix</label>
                <input
                  type="text"
                  value={settings.accounts?.autoAccountCodePrefix || 'ACC-'}
                  onChange={(e) => updateSection('accounts', 'autoAccountCodePrefix', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Account Classification</label>
                <select
                  value={settings.accounts?.defaultAccountType || 'COMMERCIAL'}
                  onChange={(e) => updateSection('accounts', 'defaultAccountType', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="COMMERCIAL">Commercial Enterprise</option>
                  <option value="SME">Small & Medium Enterprise (SME)</option>
                  <option value="GOVERNMENT">Government / PSU</option>
                  <option value="INDIVIDUAL">Individual Proprietor</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.accounts?.enforceIndustryClassification)}
                  onChange={(e) => updateSection('accounts', 'enforceIndustryClassification', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Enforce mandatory Industry classification for all commercial accounts
                </span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Alerts & Dispatch Preferences
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.emailOnLeadAssigned)}
                  onChange={(e) => updateSection('notifications', 'emailOnLeadAssigned', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Send email notification to sales rep when a new lead is assigned to them
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.emailOnDealWon)}
                  onChange={(e) => updateSection('notifications', 'emailOnDealWon', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Send congratulations email notification upon marking a deal as Closed Won
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.dailySummaryDigest)}
                  onChange={(e) => updateSection('notifications', 'dailySummaryDigest', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Deliver daily commercial summary digest at 08:00 AM IST
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications?.whatsappAlertsEnabled)}
                  onChange={(e) => updateSection('notifications', 'whatsappAlertsEnabled', e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Enable high-priority WhatsApp alerts via configured WhatsApp Business API gateway
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
