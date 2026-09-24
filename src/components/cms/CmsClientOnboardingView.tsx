'use client';

import React, { useState } from 'react';
import {
  Building2,
  Users,
  Check,
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CmsClientOnboardingViewProps {
  onSuccess: (clientId: string) => void;
  onCancel: () => void;
}

export const CmsClientOnboardingView: React.FC<CmsClientOnboardingViewProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    industry: 'IT & Software Services',
    companyType: 'Private Limited',
    gst: '',
    status: 'ACTIVE',
    remarks: '',
    assignedModules: ['EMS'] as string[],
    customPassword: '',
  });

  const [customIndustry, setCustomIndustry] = useState('');
  const [customCompanyType, setCustomCompanyType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // One-time credential modal state
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    email: string;
    password: string;
    companyName: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleModule = (mod: string) => {
    setFormData((prev) => {
      const exists = prev.assignedModules.includes(mod);
      if (exists) {
        if (prev.assignedModules.length === 1) {
          // Keep at least one module
          return prev;
        }
        return {
          ...prev,
          assignedModules: prev.assignedModules.filter((m) => m !== mod),
        };
      } else {
        return {
          ...prev,
          assignedModules: [...prev.assignedModules, mod],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.companyName.trim() || !formData.contactPerson.trim() || !formData.mobile.trim()) {
      setErrorMsg('Company Name, Contact Person Name, and Mobile Number are required.');
      return;
    }

    const finalIndustry = formData.industry === 'Other'
      ? (customIndustry.trim() || 'Other')
      : formData.industry;

    const finalCompanyType = formData.companyType === 'Other'
      ? (customCompanyType.trim() || 'Other')
      : formData.companyType;

    try {
      setSubmitting(true);
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          contactPerson: formData.contactPerson.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          industry: finalIndustry,
          companyType: finalCompanyType,
          gst: formData.gst.trim() || undefined,
          status: formData.status,
          remarks: formData.remarks.trim() || undefined,
          assignedModules: formData.assignedModules,
          customPassword: formData.customPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to onboard client');
      }

      // Display secure one-time credentials
      setCreatedCredentials({
        clientId: data.client.clientId,
        email: data.credentials.email,
        password: data.credentials.password,
        companyName: data.client.companyName,
        id: data.client.id,
      });
    } catch (err: any) {
      console.error('Error onboarding client:', err);
      setErrorMsg(err.message || 'Error occurred while creating client.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Growth India Platform — Client Portal Credentials\nOrganization: ${createdCredentials.companyName}\nClient ID: ${createdCredentials.clientId}\nLogin Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nLogin URL: ${window.location.origin}/`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0D9488]" />
            <span>Client Onboarding Wizard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directly register an enterprise organization, generate sequential Client ID, assign modules, and provision account credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Organization Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              1. Organization & Legal Entity Details
            </h2>
            <p className="text-[11px] text-slate-500">Official business information for the corporate client record.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Global Technologies Pvt Ltd"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikramaditya Rathore"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email (Portal Login)
              </label>
              <input
                type="email"
                placeholder="e.g. admin@apextech.com (optional, auto-generated if blank)"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry Sector
              </label>
              <select
                value={formData.industry}
                onChange={(e) => {
                  setFormData({ ...formData, industry: e.target.value });
                  if (e.target.value !== 'Other') {
                    setCustomIndustry('');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              >
                <option value="IT & Software Services">IT & Software Services</option>
                <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                <option value="Financial & Banking">Financial & Banking</option>
                <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                <option value="Construction & Real Estate">Construction & Real Estate</option>
                <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                <option value="Other">Other</option>
              </select>
              {formData.industry === 'Other' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Specify Industry Sector *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EdTech, Agriculture, Automobile..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-medium"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Entity Type
              </label>
              <select
                value={formData.companyType}
                onChange={(e) => {
                  setFormData({ ...formData, companyType: e.target.value });
                  if (e.target.value !== 'Other') {
                    setCustomCompanyType('');
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              >
                <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                <option value="Public Limited">Public Limited</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Government / PSU">Government / PSU</option>
                <option value="Other">Other</option>
              </select>
              {formData.companyType === 'Other' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Specify Entity Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section 8 Company, Trust, Society, Joint Venture..."
                    value={customCompanyType}
                    onChange={(e) => setCustomCompanyType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-medium"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-bold"
              >
                <option value="ACTIVE">ACTIVE (Authorized to login)</option>
                <option value="INACTIVE">INACTIVE (Account locked)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Corporate Address
              </label>
              <textarea
                rows={2}
                placeholder="Registered office address, city, state, postal code"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Onboarding Remarks / Scope
              </label>
              <input
                type="text"
                placeholder="Internal onboarding notes, project reference, or contract number"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Assigned Modules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                2. Module Subscriptions & Entitlements
              </h2>
              <p className="text-[11px] text-slate-500">
                Select which software engines this client is authorized to access. Any combination is valid.
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md">
              {formData.assignedModules.length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* EMS Card */}
            <div
              onClick={() => toggleModule('EMS')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.assignedModules.includes('EMS')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">EMS</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    formData.assignedModules.includes('EMS')
                      ? 'bg-[#0D9488] text-white'
                      : 'border border-slate-300'
                  }`}
                >
                  {formData.assignedModules.includes('EMS') && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-700">Employee Management System</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Client-specific workforce directory, clock-in tracking, leaves, tasks, and document vault.
              </p>
            </div>

            {/* CRM Card */}
            <div
              onClick={() => toggleModule('CRM')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.assignedModules.includes('CRM')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">CRM</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    formData.assignedModules.includes('CRM')
                      ? 'bg-[#0D9488] text-white'
                      : 'border border-slate-300'
                  }`}
                >
                  {formData.assignedModules.includes('CRM') && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-700">Customer Relationship Mgmt</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Sales deals pipeline, lead qualification, quotes, commercial contracts, and analytics.
              </p>
            </div>

            {/* HRM Card */}
            <div
              onClick={() => toggleModule('HRM')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.assignedModules.includes('HRM')
                  ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">HRM</span>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center ${
                    formData.assignedModules.includes('HRM')
                      ? 'bg-[#0D9488] text-white'
                      : 'border border-slate-300'
                  }`}
                >
                  {formData.assignedModules.includes('HRM') && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-700">Enterprise Human Resources</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Recruitment ATS, automated payroll, salary slips, performance reviews, and OKRs.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Client Account & Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              3. Client Portal Account & Security Credentials
            </h2>
            <p className="text-[11px] text-slate-500">
              Client can sign in directly to the Client Portal using their email and this password.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Initial Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Leave blank to auto-generate secure password"
                  value={formData.customPassword}
                  onChange={(e) => setFormData({ ...formData, customPassword: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                If omitted, a secure password such as <span className="font-mono text-slate-600">Client#8392</span> will be created.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-900 leading-relaxed">
                <strong>Sequential Client ID:</strong> System will automatically generate an immutable ID in the standard format <span className="font-mono font-bold">CLI-XXXXX</span> upon submission.
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Onboarding Client...</span>
              </>
            ) : (
              <>
                <span>Complete Onboarding & Create Client</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* ONE-TIME SECURE CREDENTIALS MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Client Onboarded Successfully!</h3>
              <p className="text-xs text-slate-500">
                Client profile and login credentials have been provisioned in the database.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Client ID:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentials.clientId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Login ID / Email:</span>
                <span className="font-mono font-bold text-slate-900 select-all">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Initial Password:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded select-all">
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Notice:</strong> This password is shown only once and cannot be recovered in plaintext. Please copy and provide it securely to the client representative.
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Credentials Copied to Clipboard!' : 'Copy Full Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSuccess(createdCredentials.id)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Open Client Profile & EMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
