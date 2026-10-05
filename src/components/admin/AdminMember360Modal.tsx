'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Phone,
  Building,
  Briefcase,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Key,
  Calendar,
  AlertTriangle,
  Layers,
  Edit3,
} from 'lucide-react';

export interface AdminInvitationItem {
  id: string;
  token: string;
  name: string;
  email: string;
  phone?: string | null;
  designation: string;
  department: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ADMIN_HR';
  permissions: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  inviterAdminName: string;
  inviterAdminEmail?: string | null;
  notes?: string | null;
  acceptedAt?: string | null;
  acceptedUserId?: string | null;
  acceptedEmployeeId?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  invitationUrl: string;
  isOnline?: boolean;
  lastActiveAt?: string | null;
  lastLoginAt?: string | null;
}

interface AdminMember360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: AdminInvitationItem | null;
  onUpdate?: () => void;
  currentUserRole?: string;
}

const PERMISSION_DESCRIPTIONS: Record<string, { label: string; desc: string; category: string }> = {
  cms_full: {
    label: 'Client Management System (CMS)',
    desc: 'Client onboarding, corporate accounts, contracts, and tenant workspace isolation.',
    category: 'CMS Suite',
  },
  hrm_full: {
    label: 'Enterprise HRM Platform',
    desc: 'Employee directory, recruitment pipelines, appraisals, and staff records.',
    category: 'HRM Suite',
  },
  workforce_full: {
    label: 'Workforce & Attendance Monitoring',
    desc: 'Live punch logs, geofencing rules, shift schedules, and holiday calendars.',
    category: 'Workforce',
  },
  payroll_admin: {
    label: 'Payroll & Compensation Administration',
    desc: 'Salary slips, tax compliance, deductions, reimbursements, and finalization.',
    category: 'Finance',
  },
  tasks_admin: {
    label: 'Global Tasks & Delegation Workflow',
    desc: 'Enterprise-wide task assignment, project milestones, and workflow governance.',
    category: 'Operations',
  },
  security_audit: {
    label: 'Security & Immutable Audit Governance',
    desc: 'Platform audit logs, employee blocking/suspension, and credential oversight.',
    category: 'Security',
  },
  system_settings: {
    label: 'System Administration & Delegated Access',
    desc: 'Platform configuration, administrator team invites, and root parameter controls.',
    category: 'Governance',
  },
};

export const AdminMember360Modal: React.FC<AdminMember360ModalProps> = ({
  isOpen,
  onClose,
  invitation,
  onUpdate,
  currentUserRole,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isEditingScopes, setIsEditingScopes] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  useEffect(() => {
    if (invitation?.permissions) {
      setSelectedScopes(invitation.permissions);
    }
  }, [invitation]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invitation) return null;

  const isAccepted = invitation.status === 'ACCEPTED';
  const isRevoked = invitation.status === 'REVOKED';
  const isPending = invitation.status === 'PENDING';

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitation.invitationUrl);
    setCopiedLink(true);
    showNotice('Administrator invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const msg = `*Growth India Platform — Administrator Invitation*\n\nHello *${invitation.name}*,\nYou have been invited to join the Growth India Administrative Governance Console as *${invitation.role}* (${invitation.designation}).\n\n*Activate your Admin Account:*\n${invitation.invitationUrl}\n\n_Note: This single-use link requires configuring your secure administrator password._`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Administrator Invitation — Growth India Enterprise Platform`;
    const body = `Hello ${invitation.name},\n\nYou have been invited to join the Growth India Platform as an Administrator with the role: ${invitation.role} (${invitation.designation}).\n\nPlease complete your account activation and configure your administrative credentials by opening the link below:\n\n${invitation.invitationUrl}\n\nSecurity notice: This is a single-use high-privilege onboarding token.\n\nRegards,\nGrowth India System Administration`;
    window.open(`mailto:${invitation.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleToggleRevoke = async () => {
    const action = isRevoked ? 'REINSTATE' : 'REVOKE';
    const confirmPrompt = isRevoked
      ? `Re-activate administrator access for ${invitation.name}?`
      : `Are you sure you want to revoke administrator access for ${invitation.name}? Their login will be immediately disabled.`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        showNotice(
          isRevoked
            ? `Administrator invite for ${invitation.name} reinstated.`
            : `Administrator access for ${invitation.name} revoked.`
        );
        onUpdate?.();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invitation status.');
      }
    } catch (e: any) {
      showNotice(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    const confirmPrompt = isAccepted
      ? `Reissue a fresh activation link for ${invitation.name}? This will reset status to PENDING and allow the administrator to set a new password.`
      : `Generate a brand new single-use token for ${invitation.name}? The previous link will become permanently invalid.`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGENERATE_TOKEN' }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotice('Fresh onboarding activation link generated successfully!');
        if (data.invitation?.token) {
          navigator.clipboard.writeText(
            `${window.location.origin}/admin/accept-invite?token=${data.invitation.token}`
          );
        }
        onUpdate?.();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate token.');
      }
    } catch (e: any) {
      showNotice(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveScopes = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedScopes }),
      });

      if (res.ok) {
        showNotice('Administrative operational scopes updated successfully!');
        setIsEditingScopes(false);
        onUpdate?.();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update operational scopes.');
      }
    } catch (e: any) {
      showNotice(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleScope = (scopeKey: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeKey) ? prev.filter((k) => k !== scopeKey) : [...prev, scopeKey]
    );
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Not recorded';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoading) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-xs ${
                  invitation.role === 'SUPER_ADMIN'
                    ? 'bg-gradient-to-br from-indigo-700 to-violet-900'
                    : invitation.role === 'ADMIN_HR'
                    ? 'bg-gradient-to-br from-teal-700 to-emerald-800'
                    : 'bg-gradient-to-br from-slate-900 to-teal-800'
                }`}
              >
                {invitation.name.charAt(0).toUpperCase()}
              </div>
              {invitation.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full ring-2 ring-emerald-500/20" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 truncate">{invitation.name}</h3>
                {invitation.acceptedEmployeeId && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-200/70 text-slate-800 rounded-md border border-slate-300/60">
                    {invitation.acceptedEmployeeId}
                  </span>
                )}
                {/* Role Badge */}
                <span
                  className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    invitation.role === 'SUPER_ADMIN'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1'
                      : invitation.role === 'ADMIN_HR'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20'
                  }`}
                >
                  {invitation.role === 'SUPER_ADMIN' && <Sparkles className="w-3 h-3 text-amber-500" />}
                  {invitation.role}
                </span>

                {/* Status Badge */}
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isAccepted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isRevoked
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isAccepted && <Check className="w-3 h-3" />}
                  {isRevoked && <Lock className="w-3 h-3" />}
                  {isPending && <Clock className="w-3 h-3" />}
                  <span>{invitation.status}</span>
                </span>

                {invitation.isOnline && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online Now
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {invitation.designation} • {invitation.department}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice alert */}
        {notice && (
          <div
            className={`px-6 py-2.5 text-xs font-bold border-b flex items-center justify-between animate-in fade-in ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Identity & Account Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact & Department */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-[#0D9488]" />
                <span>Identity & Governance Profile</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Administrator Email:</span>
                  <a
                    href={`mailto:${invitation.email}`}
                    className="font-bold text-[#0D9488] hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{invitation.email}</span>
                  </a>
                </div>
                {invitation.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Phone Number:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{invitation.phone}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Designation:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{invitation.designation}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{invitation.department}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Lifecycle & Security Milestones */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0D9488]" />
                <span>Onboarding & Security Timestamps</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Invited By:</span>
                  <span className="font-bold text-slate-800">{invitation.inviterAdminName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Invitation Created:</span>
                  <span className="font-semibold text-slate-700">{formatDateTime(invitation.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Activation Status:</span>
                  <span className="font-semibold text-slate-700">
                    {invitation.acceptedAt ? formatDateTime(invitation.acceptedAt) : 'Pending user onboarding'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Last Session Activity:</span>
                  <span className="font-semibold text-slate-700">
                    {invitation.lastActiveAt ? formatDateTime(invitation.lastActiveAt) : 'No live activity recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Single-Use Invitation Link Box */}
          <div className="p-4 bg-[#F0FDFA] rounded-2xl border border-[#0D9488]/30 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-xs font-black uppercase text-[#0F766E] tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#0D9488]" />
                  <span>{isAccepted ? 'Onboarding & Sign-In Access' : 'Single-Use Onboarding Link'}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isAccepted
                    ? 'Account is activated. You can copy the portal direct sign-in link or reissue a fresh activation link.'
                    : 'Send this secure onboarding token to the administrator to configure their initial credentials.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAccepted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Account Activated
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={actionLoading}
                  className="text-[11px] font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-lg bg-white border border-teal-200 shadow-2xs hover:bg-teal-50"
                  title={isAccepted ? 'Generate a fresh onboarding activation link' : 'Generate a new token if the link was compromised or expired'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>{isAccepted ? 'Reissue Activation Link' : 'Regenerate Token'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={invitation.invitationUrl}
                className="flex-1 bg-transparent px-3 text-xs font-mono text-slate-800 outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleShareEmail}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Share via Email</span>
              </button>
              {isAccepted && (
                <button
                  type="button"
                  onClick={() => {
                    const portalUrl = `${window.location.origin}/growthIndia?email=${encodeURIComponent(invitation.email)}`;
                    navigator.clipboard.writeText(portalUrl);
                    showNotice('Portal direct login link copied to clipboard!');
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Copy direct portal sign-in link with prefilled email"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Portal Link</span>
                </button>
              )}
            </div>
          </div>

          {/* Delegated Operational Permissions Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0D9488]" />
                <span>Granted Operational Scopes ({invitation.permissions?.length || 0})</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (!isEditingScopes) {
                    setSelectedScopes(invitation.permissions || []);
                  }
                  setIsEditingScopes(!isEditingScopes);
                }}
                className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1.5 cursor-pointer bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingScopes ? 'Cancel' : 'Edit Scopes'}</span>
              </button>
            </div>

            {isEditingScopes ? (
              /* Scope Editing Mode */
              <div className="p-4 bg-white rounded-2xl border-2 border-[#0D9488]/40 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Select Platform Modules & Privileges</p>
                    <p className="text-[11px] text-slate-500">
                      Changes take effect immediately for this administrator across all consoles.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedScopes(Object.keys(PERMISSION_DESCRIPTIONS))}
                      className="text-[10px] font-bold text-[#0D9488] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedScopes([])}
                      className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(PERMISSION_DESCRIPTIONS).map(([key, permMeta]) => {
                    const isChecked = selectedScopes.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleScope(key)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-[#F0FDFA] border-[#0D9488] ring-1 ring-[#0D9488]/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#0D9488] focus:ring-[#0D9488] cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {permMeta.label}
                            </span>
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0">
                              {permMeta.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{permMeta.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScopes(invitation.permissions || []);
                      setIsEditingScopes(false);
                    }}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveScopes}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Scopes</span>
                  </button>
                </div>
              </div>
            ) : invitation.permissions && invitation.permissions.length > 0 ? (
              /* Scope View Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {invitation.permissions.map((permKey) => {
                  const permMeta = PERMISSION_DESCRIPTIONS[permKey] || {
                    label: permKey.replace(/_/g, ' ').toUpperCase(),
                    desc: 'Platform operational authority.',
                    category: 'System',
                  };
                  return (
                    <div
                      key={permKey}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#0D9488]/40 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                          <span>{permMeta.label}</span>
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {permMeta.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
                        {permMeta.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                No specific granular permissions assigned. Default role permissions apply.
              </div>
            )}
          </div>

          {/* Internal Memo / Notes if available */}
          {invitation.notes && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Internal Onboarding Memo
              </span>
              <p className="text-xs text-slate-700 italic">{invitation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <button
            onClick={handleToggleRevoke}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              isRevoked
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isRevoked ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Reinstate Access</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Revoke Administrator Access</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
