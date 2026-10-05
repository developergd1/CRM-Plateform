'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User,
  Phone,
  Briefcase,
  Building,
  Check,
  Copy,
  Sparkles,
  AlertTriangle,
  Lock,
  ExternalLink,
  MessageCircle,
  FileText,
  CheckCircle2,
  Users,
  Settings,
  Layers,
} from 'lucide-react';

interface AdminInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

const AVAILABLE_PERMISSIONS = [
  {
    id: 'cms_full',
    label: 'Client Management (CMS)',
    desc: 'Client onboarding, corporate accounts, subscription access, and tenant isolation.',
    category: 'CMS Module',
  },
  {
    id: 'hrm_full',
    label: 'Enterprise HRM Suite',
    desc: 'Employee directory, recruitment pipelines, appraisals, and staff records.',
    category: 'HRM Module',
  },
  {
    id: 'workforce_full',
    label: 'Workforce & Attendance',
    desc: 'Live punch monitoring, shifts, geofencing rules, and holiday calendars.',
    category: 'Workforce Module',
  },
  {
    id: 'payroll_admin',
    label: 'Payroll & Compensation',
    desc: 'Salary structures, payroll finalization, compliance, and reimbursements.',
    category: 'Payroll Module',
  },
  {
    id: 'tasks_admin',
    label: 'Global Tasks & Delegation',
    desc: 'Enterprise-wide task assignment, progress oversight, and workflow delegation.',
    category: 'Operations',
  },
  {
    id: 'security_audit',
    label: 'Security & Audit Governance',
    desc: 'Immutable audit logs, staff suspension/blocking, and credential oversight.',
    category: 'Security',
  },
  {
    id: 'system_settings',
    label: 'System Administration',
    desc: 'Platform settings, administrative team invites, and root parameter controls.',
    category: 'Root Governance',
  },
];

export const AdminInviteModal: React.FC<AdminInviteModalProps> = ({
  isOpen,
  onClose,
  onInviteSent,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN' | 'ADMIN_HR'>('ADMIN');
  const [designation, setDesignation] = useState('System Administrator');
  const [department, setDepartment] = useState('Operations & Governance');
  const [notes, setNotes] = useState('');
  const [permissions, setPermissions] = useState<string[]>([
    'cms_full',
    'hrm_full',
    'workforce_full',
    'tasks_admin',
    'security_audit',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{
    token: string;
    invitationUrl: string;
    name: string;
    email: string;
    role: string;
    designation: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleRoleSelect = (newRole: 'ADMIN' | 'SUPER_ADMIN' | 'ADMIN_HR') => {
    setRole(newRole);
    if (newRole === 'SUPER_ADMIN') {
      setDesignation('Chief Technology Officer / Principal Admin');
      setDepartment('Platform Architecture & Governance');
      setPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id));
    } else if (newRole === 'ADMIN_HR') {
      setDesignation('HR & Payroll Director');
      setDepartment('Human Resources & People Ops');
      setPermissions(['hrm_full', 'workforce_full', 'payroll_admin', 'tasks_admin']);
    } else {
      setDesignation('System Administrator');
      setDepartment('Operations & Governance');
      setPermissions(['cms_full', 'hrm_full', 'workforce_full', 'tasks_admin', 'security_audit']);
    }
  };

  const handleTogglePermission = (permId: string) => {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSelectAllPermissions = () => {
    setPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id));
  };

  const handleClearPermissions = () => {
    setPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Please provide administrator full name and email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          designation: designation.trim(),
          department: department.trim(),
          permissions,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create administrator invitation.');
      }

      setCreatedInvite({
        token: data.invitation.token,
        invitationUrl: data.invitation.invitationUrl,
        name: data.invitation.name,
        email: data.invitation.email,
        role: data.invitation.role,
        designation: data.invitation.designation,
      });

      onInviteSent();
    } catch (err: any) {
      setError(err.message || 'Error generating administrator invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInvite) return;
    navigator.clipboard.writeText(createdInvite.invitationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!createdInvite) return;
    const msg = `*Growth India Platform — Administrator Invitation*\n\nHello *${createdInvite.name}*,\nYou have been invited to join the Growth India Administrative Governance Console as *${createdInvite.role}* (${createdInvite.designation}).\n\n*Activate your Admin Account:*\n${createdInvite.invitationUrl}\n\n_Note: This single-use link requires configuring your secure administrator password._`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!createdInvite) return;
    const subject = `Administrator Invitation — Growth India Enterprise Platform`;
    const body = `Hello ${createdInvite.name},\n\nYou have been invited to join the Growth India Platform as an Administrator with the role: ${createdInvite.role} (${createdInvite.designation}).\n\nPlease complete your account activation and configure your administrative credentials by opening the link below:\n\n${createdInvite.invitationUrl}\n\nSecurity notice: This is a single-use high-privilege onboarding token.\n\nRegards,\nGrowth India System Administration`;
    window.open(`mailto:${createdInvite.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleResetForAnother = () => {
    setCreatedInvite(null);
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
    handleRoleSelect('ADMIN');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Invite Platform Administrator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                  Isolated Admin DB
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision isolated high-privilege credentials with dedicated governance scopes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {createdInvite ? (
            /* Success & Share State */
            <div className="space-y-6 py-2 animate-in fade-in">
              <div className="p-6 rounded-2xl bg-[#F0FDFA] border border-[#0D9488]/30 text-center space-y-3">
                <div className="w-12 h-12 bg-[#0D9488] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Administrator Invitation Generated!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                    A dedicated high-privilege onboarding token has been created for{' '}
                    <strong className="font-bold text-slate-900">{createdInvite.name}</strong> ({createdInvite.email}) with role{' '}
                    <span className="font-mono font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-md">
                      {createdInvite.role}
                    </span>.
                  </p>
                </div>
              </div>

              {/* Single-Use URL Box */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Secure Single-Use Onboarding Link
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={createdInvite.invitationUrl}
                    className="flex-1 bg-transparent px-3 text-xs font-mono text-slate-800 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0D9488] hover:bg-[#0F766E] text-white'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </button>
                <button
                  onClick={handleShareEmail}
                  className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Share via Email</span>
                </button>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={handleResetForAnother}
                  className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                >
                  + Invite Another Administrator
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            /* Invite Creation Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Administrative Role Selection */}
              <div>
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block mb-2.5">
                  1. Select Administrative Role & Governance Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* ADMIN */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('ADMIN')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      role === 'ADMIN'
                        ? 'border-[#0D9488] bg-[#F0FDFA] shadow-xs ring-2 ring-[#0D9488]/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-slate-900">ADMIN</span>
                        {role === 'ADMIN' && <Check className="w-4 h-4 text-[#0D9488]" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Platform Operations, Workforce & Client CMS
                      </p>
                    </div>
                  </button>

                  {/* ADMIN_HR */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('ADMIN_HR')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      role === 'ADMIN_HR'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-slate-900">ADMIN_HR</span>
                        {role === 'ADMIN_HR' && <Check className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        HRMS Suite, Leaves, Attendance & Payroll
                      </p>
                    </div>
                  </button>

                  {/* SUPER_ADMIN */}
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('SUPER_ADMIN')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      role === 'SUPER_ADMIN'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-indigo-900 flex items-center gap-1">
                          SUPER_ADMIN
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        </span>
                        {role === 'SUPER_ADMIN' && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Root Governance, Full Security & Audit
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Administrator Details */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider block">
                  2. Administrator Profile & Contact
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Vikramaditya Singhania"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Administrator Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@growthindia.co"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="System Administrator"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Administration & Governance"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Internal Onboarding Memo (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Lead administrator for Northern region client accounts"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0D9488] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Delegated Operational Scopes */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    3. Delegated Operational Permissions ({permissions.length}/{AVAILABLE_PERMISSIONS.length})
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="text-[11px] font-bold text-[#0D9488] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearPermissions}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = permissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked
                            ? 'bg-[#F0FDFA] border-[#0D9488]/40 text-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#0D9488] focus:ring-[#0D9488] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight text-slate-900">{perm.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{perm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security Isolation Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Zero-Tenancy Isolation:</strong> Records are stored exclusively in the isolated <code className="font-bold text-amber-800">admin_invitations</code> collection. Upon activation, the account is granted an official <code className="font-bold text-amber-800">GI-ADM-XXXX</code> code with no client cross-talk.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Secure Invite...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Generate Administrator Invite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
