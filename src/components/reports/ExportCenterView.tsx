'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Building2,
  Users,
  Clock,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ExportPreset {
  id: string;
  title: string;
  description: string;
  icon: any;
  type: 'EMPLOYEES' | 'ATTENDANCE' | 'TIMESHEETS' | 'LEAVES' | 'KYC';
  badge: string;
}

const PRESETS: ExportPreset[] = [
  {
    id: 'employees',
    title: 'Master Employee Directory',
    description: 'Complete employee census with contact details, department, client assignment, and lifecycle status.',
    icon: Users,
    type: 'EMPLOYEES',
    badge: 'Core Workforce',
  },
  {
    id: 'attendance',
    title: 'Attendance & Punch Records',
    description: 'Daily check-in / check-out timestamps, shift deviations, late arrival flags, and anomaly statuses.',
    icon: Clock,
    type: 'ATTENDANCE',
    badge: 'Time Tracking',
  },
  {
    id: 'timesheets',
    title: 'Monthly Timesheets & Hours',
    description: 'Aggregated productive hours, overtime, weekly total billable hours, and managerial approvals.',
    icon: FileSpreadsheet,
    type: 'TIMESHEETS',
    badge: 'Payroll Ready',
  },
  {
    id: 'leaves',
    title: 'Leave Applications & Balances',
    description: 'Leave requests, category breakdowns (Paid, Sick, Casual), approval audit lineage, and deductions.',
    icon: Calendar,
    type: 'LEAVES',
    badge: 'Absence Mgmt',
  },
  {
    id: 'kyc',
    title: 'KYC & Compliance Audit Trail',
    description: 'Verification status of Aadhaar, PAN, agreements, expiring documents, and reviewer signatures.',
    icon: ShieldCheck,
    type: 'KYC',
    badge: 'Compliance',
  },
];

export const ExportCenterView: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [dateRange, setDateRange] = useState('CURRENT_MONTH');
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch('/api/crm/clients')
      .then((res) => res.json())
      .then((data) => setClients(data.clients || []))
      .catch((err) => console.error('Failed to load clients', err));
  }, []);

  const handleTriggerExport = async (preset: ExportPreset) => {
    setDownloadingType(preset.id);
    try {
      const query = new URLSearchParams();
      query.set('type', preset.type);
      if (selectedClient) query.set('clientId', selectedClient);
      query.set('dateRange', dateRange);

      const res = await fetch(`/api/reports/export?${query.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `growth_india_${preset.id}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast(`${preset.title} downloaded successfully!`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to generate report export', 'error');
      }
    } catch (err) {
      showToast('Network error during export download', 'error');
    } finally {
      setDownloadingType(null);
    }
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
            <Download className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Enterprise Export & Compliance Center
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                Streaming CSV / Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Generate standardized data exports for payroll calculation, compliance filing, and external audit.
            </p>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Client Filter</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer min-w-[200px]"
            >
              <option value="">All Corporate Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Time Window</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer min-w-[180px]"
            >
              <option value="CURRENT_MONTH">Current Month</option>
              <option value="LAST_MONTH">Previous Month</option>
              <option value="LAST_90_DAYS">Last 90 Days</option>
              <option value="CURRENT_YEAR">Current Fiscal Year</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium text-right hidden md:block">
          All exports include tenant isolation, timestamp headers, and operator signatures.
        </div>
      </div>

      {/* Export Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isDownloading = downloadingType === preset.id;

          return (
            <div
              key={preset.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-teal-300 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-growth-teal group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] uppercase font-mono font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200">
                    {preset.badge}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-growth-teal transition-colors">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400">Format: CSV</span>
                <button
                  onClick={() => handleTriggerExport(preset)}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-growth-teal text-slate-700 hover:text-white font-bold text-xs rounded-xl border border-slate-200 hover:border-growth-teal transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                  <span>{isDownloading ? 'Generating...' : 'Export File'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
