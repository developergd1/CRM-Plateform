'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileBarChart, Activity, Sparkles, RefreshCw } from 'lucide-react';
import { clientCache } from '@/lib/client-cache';
import { ClientAttendanceView } from './ClientAttendanceView';
import { ClientTimesheetsView } from './ClientTimesheetsView';
import { ClientReportsView } from './ClientReportsView';
import { ClientWorkforceView } from './ClientWorkforceView';

export interface ClientAttendanceHubProps {
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const ClientAttendanceHub: React.FC<ClientAttendanceHubProps> = ({
  initialSubTab = 'attendance',
  onSubTabChange,
}) => {
  const [subTab, setSubTab] = useState<string>(() => {
    if (initialSubTab === 'timesheets' || initialSubTab === 'reports' || initialSubTab === 'workforce') {
      return initialSubTab;
    }
    return 'attendance';
  });

  const [suiteRefreshKey, setSuiteRefreshKey] = useState(0);
  const [suiteRefreshing, setSuiteRefreshing] = useState(false);

  const handleRefreshSuite = () => {
    setSuiteRefreshing(true);
    clientCache.clear('client_attendance_');
    clientCache.clear('client_timesheets_');
    clientCache.clear('client_reports_');
    clientCache.clear('client_workforce_');
    setSuiteRefreshKey((prev) => prev + 1);
    setTimeout(() => setSuiteRefreshing(false), 600);
  };

  useEffect(() => {
    if (initialSubTab && ['attendance', 'timesheets', 'reports', 'workforce'].includes(initialSubTab)) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSubTabChange = (t: string) => {
    setSubTab(t);
    if (onSubTabChange) {
      onSubTabChange(t);
    }
  };

  const tabs = [
    { id: 'attendance', label: 'Daily Attendance & Shifts', icon: Calendar },
    { id: 'timesheets', label: 'Timesheets & Billable Hours', icon: Clock },
    { id: 'reports', label: 'Governance & Analytics', icon: FileBarChart },
    { id: 'workforce', label: 'Live Telemetry & Radar', icon: Activity, isLive: true },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Tabs Navigation */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-growth-gold" />
              <span>Unified 4-in-1 Attendance & Workforce Suite</span>
            </div>
            <h2 className="title-interactive-hover text-lg font-black text-slate-900">
              Attendance & Timesheets Governance
            </h2>
            <p className="subtitle-interactive-hover text-xs text-slate-500">
              Centralized platform governance for employee shifts, daily punch records, billable timesheets, and live telemetry
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshSuite}
            disabled={suiteRefreshing}
            className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm self-start sm:self-auto cursor-pointer"
            title="Refresh Attendance & Workforce Suite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${suiteRefreshing ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh Suite</span>
          </button>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSubTabChange(t.id)}
                className={`interactive-btn-hover flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-growth-teal text-white shadow-tealGlow'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-growth-gold' : 'text-slate-400'}`} />
                <span>{t.label}</span>
                {t.isLive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active View */}
      {subTab === 'attendance' && <ClientAttendanceView key={`hub-attendance-${suiteRefreshKey}`} />}
      {subTab === 'timesheets' && <ClientTimesheetsView key={`hub-timesheets-${suiteRefreshKey}`} />}
      {subTab === 'reports' && <ClientReportsView key={`hub-reports-${suiteRefreshKey}`} />}
      {subTab === 'workforce' && <ClientWorkforceView key={`hub-workforce-${suiteRefreshKey}`} />}
    </div>
  );
};
