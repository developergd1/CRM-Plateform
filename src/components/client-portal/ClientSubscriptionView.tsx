'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Users,
  HardDrive,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionData {
  clientId: string;
  companyName: string;
  plan: string;
  planKey: string;
  status: string;
  startDate: string;
  usage: {
    employees: {
      current: number;
      max: number;
      percentage: number;
      isNearLimit: boolean;
      isLimitReached: boolean;
    };
    users: {
      current: number;
      max: number;
      percentage: number;
      isNearLimit: boolean;
      isLimitReached: boolean;
    };
    storageGb: {
      limit: number;
    };
  };
  assignedModules: string[];
  allowedModules: string[];
}

export const ClientSubscriptionView: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/client/subscription');
      if (res.ok) {
        const json = await res.json();
        setSubscription(json.subscription || null);
      }
    } catch (e) {
      console.error('Error loading subscription info:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-growth-teal border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-bold">Querying subscription telemetry...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
        <p className="text-sm font-bold text-slate-700">No subscription record found</p>
        <p className="text-xs text-slate-400">Please contact Growth India support to link your enterprise plan.</p>
      </div>
    );
  }

  const empUsage = subscription.usage.employees;
  const userUsage = subscription.usage.users;

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full">
              Enterprise Plan
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                subscription.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {subscription.status}
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{subscription.plan}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Organization: <strong className="text-slate-800">{subscription.companyName}</strong> ({subscription.clientId})
          </p>
        </div>

        <button
          onClick={fetchSubscription}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition shadow-sm cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Quotas</span>
        </button>
      </div>

      {/* Quota Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Employees Quota */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Active Staff Limit</h4>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {empUsage.current} / {empUsage.max}
                </div>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-growth-teal">{empUsage.percentage}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                empUsage.isLimitReached
                  ? 'bg-rose-500'
                  : empUsage.isNearLimit
                  ? 'bg-amber-500'
                  : 'bg-growth-teal'
              }`}
              style={{ width: `${Math.min(100, empUsage.percentage)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {empUsage.isLimitReached ? (
              <span className="text-rose-600 font-bold">Quota limit reached! Additional employee additions will be blocked.</span>
            ) : empUsage.isNearLimit ? (
              <span className="text-amber-600 font-bold">Near capacity. Consider upgrading plan soon.</span>
            ) : (
              <span>{empUsage.max - empUsage.current} employee slots remaining in this billing cycle.</span>
            )}
          </p>
        </div>

        {/* User Seats Quota */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Shared User Seats</h4>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {userUsage.current} / {userUsage.max}
                </div>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-indigo-600">{userUsage.percentage}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, userUsage.percentage)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {userUsage.max - userUsage.current} delegated team seats remaining under this subscription.
          </p>
        </div>

        {/* Storage Limit */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Vault Storage</h4>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {subscription.usage.storageGb.limit} GB
                </div>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div className="h-full bg-purple-600 rounded-full" style={{ width: '15%' }} />
          </div>

          <p className="text-[11px] text-slate-500">
            Dedicated multi-tenant encrypted storage for KYC files, documents, and logs.
          </p>
        </div>
      </div>

      {/* Module Entitlements Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-sm text-slate-900">Assigned Platform Entitlements</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Modules enabled for your organization by Platform Administration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['EMS', 'CRM', 'HRM'].map((mod) => {
            const isAssigned = (subscription.assignedModules || []).includes(mod);
            return (
              <div
                key={mod}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between ${
                  isAssigned
                    ? 'bg-teal-50/50 border-teal-200 text-teal-900'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <span>{mod === 'EMS' ? 'EMS — Workforce Management' : mod === 'CRM' ? 'CRM — Pipeline & Sales' : 'HRM — Enterprise HR & Payroll'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {mod === 'EMS' && 'Employee onboarding, attendance tracking, leave requests, and document vault.'}
                    {mod === 'CRM' && 'Leads management, pipeline deals, contacts, activities, and revenue forecasting.'}
                    {mod === 'HRM' && 'Recruitment ATS, employee 360 lifecycle, payroll structures, and OKR goals.'}
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ml-2 ${
                    isAssigned
                      ? 'bg-growth-teal text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isAssigned ? 'Active' : 'Unassigned'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
