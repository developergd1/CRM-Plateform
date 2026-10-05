'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit,
  Layers,
  Activity,
  Calendar,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { CmsClientEmsView } from './CmsClientEmsView';

interface CmsSelectedClientShellProps {
  clientId: string;
  onBack: () => void;
  initialTab?: string;
}

export const CmsSelectedClientShell: React.FC<CmsSelectedClientShellProps> = ({
  clientId,
  onBack,
  initialTab = 'profile',
}) => {
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab === 'workforce' ? 'ems' : initialTab);

  // Module configuration state
  const [assignedModules, setAssignedModules] = useState<string[]>(['EMS']);
  const [savingModules, setSavingModules] = useState(false);

  // Subscription and employee quota state
  const [selectedPlan, setSelectedPlan] = useState<string>('STANDARD');
  const [maxEmployees, setMaxEmployees] = useState<number>(100);
  const [savingSubscription, setSavingSubscription] = useState(false);

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error('Client organization not found');
      const data = await res.json();
      if (data.success && data.client) {
        setClient(data.client);
        setAssignedModules(
          Array.isArray(data.client.assignedModules) && data.client.assignedModules.length > 0
            ? data.client.assignedModules
            : ['EMS']
        );
        setSelectedPlan(data.client.subscriptionPlan || 'STANDARD');
        setMaxEmployees(data.client.maxEmployees || 100);
      } else {
        throw new Error(data.error || 'Failed to load client details');
      }
    } catch (err: any) {
      console.error('Error fetching client profile:', err);
      setError(err.message || 'Error loading client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    const defaults: Record<string, number> = {
      TRIAL: 2,
      STARTER: 25,
      STANDARD: 100,
      ENTERPRISE: 1000,
    };
    if (defaults[plan]) {
      setMaxEmployees(defaults[plan]);
    }
  };

  const handleSaveSubscription = async () => {
    if (!maxEmployees || maxEmployees < 1) {
      showToast('Please enter a valid employee onboarding limit (minimum 1).', 'error');
      return;
    }
    try {
      setSavingSubscription(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionPlan: selectedPlan,
          maxEmployees: Number(maxEmployees),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription quota');

      showToast(`Subscription plan (${selectedPlan}) & employee limit (${maxEmployees}) updated successfully!`);
      setClient((prev: any) => ({
        ...prev,
        subscriptionPlan: selectedPlan,
        maxEmployees: Number(maxEmployees),
      }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingSubscription(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveModules = async () => {
    if (assignedModules.length === 0) {
      showToast('Client must have at least one assigned module.', 'error');
      return;
    }
    try {
      setSavingModules(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedModules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update modules');

      showToast('Assigned modules updated successfully!');
      setClient((prev: any) => ({ ...prev, assignedModules }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingModules(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    try {
      setSavingPassword(true);
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setPasswordNotice(`Password updated to "${newPassword.trim()}". Copy and provide to client.`);
      showToast('Client portal password updated successfully!');
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading && !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0D9488] animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading client organization profile...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center space-y-4 max-w-md mx-auto my-12">
        <h2 className="text-base font-bold text-rose-800">Client Profile Unavailable</h2>
        <p className="text-xs text-slate-600">{error || 'Unable to locate client record.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
        >
          ← Return to All Clients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* Client Overview Card & Breadcrumb Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Clients</span>
          </button>

          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span>{client.companyName}</span>
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {client.clientId}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                client.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  client.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <span>{client.status}</span>
            </span>
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
            <span>Contact: <strong className="text-slate-800">{client.contactPerson}</strong></span>
            <span>•</span>
            <span className="font-mono">{client.mobile}</span>
            {client.email && (
              <>
                <span>•</span>
                <span>{client.email}</span>
              </>
            )}
            <span>•</span>
            <span>{client.industry || 'General Industry'}</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ems')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
              activeTab === 'ems'
                ? 'bg-[#0D9488] text-white'
                : 'bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0D9488]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Open Client EMS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Reset Client Login Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Credentials</span>
          </button>
        </div>
      </div>

      {/* Primary Section Boxes Navigation (Task 2: Converted to animated interactive boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Box 1: Client Account & Profile (Flows in from Left) */}
        <div
          onClick={() => setActiveTab('profile')}
          className={`animate-flow-left group relative p-5 lg:p-6 rounded-3xl border-2 transition-all duration-300 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between ${
            activeTab === 'profile'
              ? 'bg-white border-[#0D9488] ring-2 ring-[#0D9488]/20 shadow-md'
              : 'bg-white/80 hover:bg-white border-slate-200 hover:border-[#0D9488]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'bg-[#0D9488]/10 text-[#0D9488] group-hover:scale-110'
              }`}
            >
              <Building2 className="w-6 h-6" />
            </div>
            {activeTab === 'profile' && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0D9488] text-white">
                Active View
              </span>
            )}
          </div>
          <div>
            <h3
              className={`text-lg lg:text-xl font-black tracking-tight transition-colors ${
                activeTab === 'profile' ? 'text-[#0D9488]' : 'text-slate-900 group-hover:text-[#0D9488]'
              }`}
            >
              Client Account & Profile
            </h3>
          </div>
        </div>

        {/* Box 2: Assigned Modules (Flows in from Left) */}
        <div
          onClick={() => setActiveTab('modules')}
          className={`animate-flow-left group relative p-5 lg:p-6 rounded-3xl border-2 transition-all duration-300 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between ${
            activeTab === 'modules'
              ? 'bg-white border-[#0D9488] ring-2 ring-[#0D9488]/20 shadow-md'
              : 'bg-white/80 hover:bg-white border-slate-200 hover:border-[#0D9488]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                activeTab === 'modules'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'bg-[#0D9488]/10 text-[#0D9488] group-hover:scale-110'
              }`}
            >
              <Layers className="w-6 h-6" />
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                activeTab === 'modules'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-[#0D9488]/10 text-[#0D9488]'
              }`}
            >
              {assignedModules.length} Subscribed
            </span>
          </div>
          <div>
            <h3
              className={`text-lg lg:text-xl font-black tracking-tight transition-colors ${
                activeTab === 'modules' ? 'text-[#0D9488]' : 'text-slate-900 group-hover:text-[#0D9488]'
              }`}
            >
              Assigned Modules
            </h3>
          </div>
        </div>

        {/* Box 3: Client-Specific EMS (Flows in from Right) */}
        <div
          onClick={() => setActiveTab('ems')}
          className={`animate-flow-right group relative p-5 lg:p-6 rounded-3xl border-2 transition-all duration-300 shadow-xs hover:shadow-lg cursor-pointer flex flex-col justify-between ${
            activeTab === 'ems'
              ? 'bg-white border-[#0D9488] ring-2 ring-[#0D9488]/20 shadow-md'
              : 'bg-white/80 hover:bg-white border-slate-200 hover:border-[#0D9488]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                activeTab === 'ems'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'bg-[#0D9488]/10 text-[#0D9488] group-hover:scale-110'
              }`}
            >
              <Users className="w-6 h-6" />
            </div>
            {activeTab === 'ems' && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0D9488] text-white">
                Active View
              </span>
            )}
          </div>
          <div>
            <h3
              className={`text-lg lg:text-xl font-black tracking-tight transition-colors ${
                activeTab === 'ems' ? 'text-[#0D9488]' : 'text-slate-900 group-hover:text-[#0D9488]'
              }`}
            >
              Client-Specific EMS
            </h3>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. Profile & Account Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Legal Entity Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Organization Entity Details
            </h2>

            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">Company Name</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{client.companyName}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">Entity Type</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{client.companyType || 'Private Limited'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">Client ID (Immutable)</dt>
                <dd className="font-mono font-bold text-[#0D9488] mt-0.5">{client.clientId}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">GST Number</dt>
                <dd className="font-mono font-bold text-slate-900 mt-0.5">{client.gstNumber || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">Industry</dt>
                <dd className="font-bold text-slate-900 mt-0.5">{client.industry || 'General'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[11px] font-bold">Date Onboarded</dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {client.dateAdded ? new Date(client.dateAdded).toLocaleDateString('en-IN') : 'N/A'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400 text-[11px] font-bold">Corporate Registered Address</dt>
                <dd className="font-medium text-slate-800 mt-0.5">{client.address || 'No address registered'}</dd>
              </div>
              {client.remarks && (
                <div className="col-span-2">
                  <dt className="text-slate-400 text-[11px] font-bold">Onboarding Scope / Remarks</dt>
                  <dd className="font-medium text-slate-700 mt-0.5">{client.remarks}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Client Portal Account & Security */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Portal Authentication & Security Account
              </h2>

              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-slate-400 text-[11px] font-bold">Portal Login Email</dt>
                  <dd className="font-mono font-bold text-slate-900 mt-0.5 select-all">
                    {client.user?.email || client.email || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px] font-bold">Login Access Status</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        client.user?.isActive !== false && client.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {client.user?.isActive !== false && client.status === 'ACTIVE'
                        ? 'LOGIN ENABLED'
                        : 'LOGIN DISABLED'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px] font-bold">Subscription Plan</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{client.subscriptionPlan || 'STANDARD'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[11px] font-bold">Staff Onboard Quota</dt>
                  <dd className="font-bold text-teal-700 mt-0.5">
                    {client._count?.employees || 0} / {client.maxEmployees || maxEmployees || 100} Allowed
                  </dd>
                </div>
              </dl>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                Password credentials are stored securely via one-way cryptographic bcrypt hash. To issue new access credentials, use the password reset tool below.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change / Reset Client Password</span>
            </button>
          </div>

          {/* 3. Subscription Tier & Employee Onboarding Quota Governance Card */}
          <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Subscription Tier & Employee Onboarding Quota
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                    Platform Administrator Authority
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Admin decides how many employees {client.companyName} can onboard under their organization account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSubscription}
                disabled={savingSubscription}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>{savingSubscription ? 'Saving Quota...' : 'Save Plan & Limit'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Plan Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Subscription Tier
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="TRIAL">Evaluation Trial (Default: 2 Employees)</option>
                  <option value="STARTER">Starter Plan (Default: 25 Employees)</option>
                  <option value="STANDARD">Growth Standard (Default: 100 Employees)</option>
                  <option value="ENTERPRISE">Enterprise HRM Suite (Default: 1,000 Employees)</option>
                  <option value="CUSTOM">Custom Enterprise Quota</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Changing plan tier auto-fills preset limit, or you can customize below.
                </p>
              </div>

              {/* Max Employee Limit Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Employee Onboard Limit *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={maxEmployees}
                    onChange={(e) => setMaxEmployees(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    placeholder="e.g. 1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    staff max
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Client portal will enforce this quota; adding more staff will be blocked.
                </p>
              </div>

              {/* Current Utilization Progress */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">Current Usage</span>
                    <span className="font-mono font-black text-[#0D9488]">
                      {Math.min(100, Math.round(((client._count?.employees || 0) / (maxEmployees || 1)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (client._count?.employees || 0) >= (maxEmployees || 1)
                          ? 'bg-rose-500'
                          : (client._count?.employees || 0) >= (maxEmployees || 1) * 0.85
                          ? 'bg-amber-500'
                          : 'bg-[#0D9488]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((client._count?.employees || 0) / (maxEmployees || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-700 mt-2">
                  <span className="text-slate-900 font-black">{client._count?.employees || 0}</span> onboarded of{' '}
                  <span className="text-slate-900 font-black">{maxEmployees}</span> slots allowed
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Assigned Modules Tab */}
      {activeTab === 'modules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Software Engine Entitlements
              </h2>
              <p className="text-[11px] text-slate-500">
                Configure which applications {client.companyName} can access through the Client Portal.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveModules}
              disabled={savingModules}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{savingModules ? 'Saving Entitlements...' : 'Save Module Changes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* EMS Module */}
            <div
              onClick={() => {
                const exists = assignedModules.includes('EMS');
                if (exists && assignedModules.length === 1) return;
                setAssignedModules(
                  exists ? assignedModules.filter((m) => m !== 'EMS') : [...assignedModules, 'EMS']
                );
              }}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                assignedModules.includes('EMS')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">EMS</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    assignedModules.includes('EMS')
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {assignedModules.includes('EMS') ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Employee Management System</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Workforce directory, attendance time clocking, leave quotas, project tasks, and document vault.
              </p>
            </div>

            {/* HRM Module */}
            <div
              onClick={() => {
                const exists = assignedModules.includes('HRM');
                if (exists && assignedModules.length === 1) return;
                setAssignedModules(
                  exists ? assignedModules.filter((m) => m !== 'HRM') : [...assignedModules, 'HRM']
                );
              }}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                assignedModules.includes('HRM')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">HRM</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    assignedModules.includes('HRM')
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {assignedModules.includes('HRM') ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Enterprise Human Resources</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Recruitment ATS, automated payroll, salary slips, performance reviews, and OKRs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Client-Specific EMS Tab */}
      {activeTab === 'ems' && (
        <CmsClientEmsView
          client={client}
          onBackToClientProfile={() => setActiveTab('profile')}
        />
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0D9488]" />
                <span>Reset Client Portal Password</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordNotice(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {passwordNotice ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                  {passwordNotice}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordNotice(null);
                  }}
                  className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Enter New Password
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NewPassword#2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Password will be hashed immediately in the database.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {savingPassword ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
