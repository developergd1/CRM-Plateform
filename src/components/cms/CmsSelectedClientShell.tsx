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

      {/* Primary Tab Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Client Account & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Assigned Modules ({assignedModules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ems')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ems'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Client-Specific EMS</span>
        </button>
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
                  <dt className="text-slate-400 text-[11px] font-bold">Workforce Deployed</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">
                    {client._count?.employees || 0} employees
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* CRM Module */}
            <div
              onClick={() => {
                const exists = assignedModules.includes('CRM');
                if (exists && assignedModules.length === 1) return;
                setAssignedModules(
                  exists ? assignedModules.filter((m) => m !== 'CRM') : [...assignedModules, 'CRM']
                );
              }}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                assignedModules.includes('CRM')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">CRM</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    assignedModules.includes('CRM')
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {assignedModules.includes('CRM') ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-800">Customer Relationship Mgmt</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Sales deals pipeline, lead qualification, quotes, commercial contracts, and analytics.
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
