'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Copy,
  Check,
  Share2,
  Shield,
  CheckSquare,
  Square,
  Sparkles,
  Lock,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  inviterRole: 'ADMIN' | 'CLIENT';
}

interface PermissionOption {
  key: string;
  label: string;
  description: string;
  category: string;
}

const ADMIN_PERMISSIONS: PermissionOption[] = [
  // CRM Modules
  { key: 'crm-dashboard', label: 'CRM Dashboard', description: 'View CRM sales performance and executive stats', category: 'CRM Suite' },
  { key: 'crm-leads', label: 'Leads Management', description: 'View, add, and manage CRM leads & prospects', category: 'CRM Suite' },
  { key: 'crm-contacts', label: 'Contacts Directory', description: 'Access verified business contacts & accounts', category: 'CRM Suite' },
  { key: 'crm-deals', label: 'Deals & Revenue', description: 'Manage sales deals, revenue stages, and contracts', category: 'CRM Suite' },
  { key: 'crm-pipeline', label: 'Sales Pipeline (Kanban)', description: 'Interactive drag-and-drop sales pipeline', category: 'CRM Suite' },
  { key: 'crm-activities', label: 'Activities & Calls', description: 'Log client meetings, calls, and interactions', category: 'CRM Suite' },
  { key: 'crm-followups', label: 'Tasks & Follow-ups', description: 'Track scheduled follow-ups and deadlines', category: 'CRM Suite' },
  { key: 'crm-reports', label: 'CRM Analytics & Reports', description: 'View advanced revenue analytics and charts', category: 'CRM Suite' },

  // Workforce Modules
  { key: 'clients', label: 'Clients Directory', description: 'View corporate client profiles and accounts', category: 'Workforce & Clients' },
  { key: 'employees', label: 'Employees Directory', description: 'Access staff records, documents, and profiles', category: 'Workforce & Clients' },
  { key: 'attendance', label: 'Attendance & Workforce', description: 'View attendance logs, check-ins, and timesheets', category: 'Workforce & Clients' },
  { key: 'leave', label: 'Leave Management', description: 'Review leave applications and approvals', category: 'Workforce & Clients' },

  // Security Modules
  { key: 'block-history', label: 'Block / Unblock History', description: 'View and manage security blocks on employees', category: 'Security & Governance' },
  { key: 'password-requests', label: 'Password Reset Requests', description: 'Process employee password reset approvals', category: 'Security & Governance' },
  { key: 'audit-logs', label: 'Audit Logs & Governance', description: 'View audit trails, security events, and logins', category: 'Security & Governance' },
];

const CLIENT_PERMISSIONS: PermissionOption[] = [
  { key: 'overview', label: 'Dashboard Overview', description: 'View company KPI summary and team count', category: 'Client Operations' },
  { key: 'employees', label: 'My Employees Directory', description: 'Access staff assigned to your company', category: 'Client Operations' },
  { key: 'attendance', label: 'Attendance & Timesheets', description: 'View staff check-ins and monthly timesheets', category: 'Client Operations' },
  { key: 'tasks', label: 'Tasks & Follow-ups', description: 'Assign tasks and track execution status', category: 'Client Operations' },
  { key: 'requests', label: 'Password Reset Requests', description: 'View and approve employee credentials resets', category: 'Client Operations' },
  { key: 'history', label: 'Security & Block History', description: 'View employee status audit logs and history', category: 'Client Operations' },
  { key: 'canBlockEmployees', label: 'Authority to Block Staff', description: 'Allow invited member to block/suspend personnel', category: 'Governance Privileges' },
  { key: 'canDeleteEmployees', label: 'Authority to Delete Staff', description: 'Allow invited member to soft-delete employee records', category: 'Governance Privileges' },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  inviterRole,
}) => {
  const { user } = useAuth();
  const permissionsList = inviterRole === 'ADMIN' ? ADMIN_PERMISSIONS : CLIENT_PERMISSIONS;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() =>
    inviterRole === 'ADMIN'
      ? ['crm-dashboard', 'crm-leads', 'crm-contacts', 'crm-deals']
      : ['overview', 'employees', 'attendance']
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Generated Result State
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    invitationUrl: string;
    name: string;
    email: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedPermissions(permissionsList.map((p) => p.key));
  };

  const handleSelectNone = () => {
    setSelectedPermissions([]);
  };

  const handlePresetReadOnly = () => {
    if (inviterRole === 'ADMIN') {
      setSelectedPermissions(['crm-dashboard', 'crm-reports', 'attendance']);
    } else {
      setSelectedPermissions(['overview', 'attendance']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter the person\'s full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (selectedPermissions.length === 0) {
      setErrorMessage('Please select at least one permission to grant');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          designation: designation.trim() || (inviterRole === 'ADMIN' ? 'Admin Associate' : 'Team Member'),
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      const resolveInviteUrl = (url?: string | null, token?: string | null) => {
        const t = token || (url && url.includes('token=') ? url.split('token=')[1].split('&')[0] : '');
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://growth-india-crm.onrender.com';
        return `${origin}/accept-invite?token=${t}`;
      };

      const finalUrl = resolveInviteUrl(data.invitation.invitationUrl, data.invitation.token);

      setGeneratedInvite({
        token: data.invitation.token,
        invitationUrl: finalUrl,
        name: data.invitation.name,
        email: data.invitation.email,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!generatedInvite) return;
    const inviterTitle = user?.fullName || (inviterRole === 'ADMIN' ? 'Platform Administrator' : 'Client Management');
    const roleType = inviterRole === 'ADMIN' ? 'Admin Team Member' : 'Corporate Client Workspace';

    const message = `*Growth India CRM Invitation*\n\nHello *${generatedInvite.name}*,\n\nYou have been invited by *${inviterTitle}* to access the *Growth India CRM Platform* as an authorized member (${roleType}).\n\n👉 *Click here to set your password and activate your account:*\n${generatedInvite.invitationUrl}\n\n_Note: This secure link will remain active until manually revoked._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleResetModal = () => {
    setGeneratedInvite(null);
    setFullName('');
    setEmail('');
    setDesignation('');
    setErrorMessage('');
    setSelectedPermissions(
      inviterRole === 'ADMIN'
        ? ['crm-dashboard', 'crm-leads', 'crm-contacts', 'crm-deals']
        : ['overview', 'employees', 'attendance']
    );
  };

  // Group permissions by category
  const categories = Array.from(new Set(permissionsList.map((p) => p.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal/20 text-growth-teal flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{inviterRole === 'ADMIN' ? 'Admin Account Sharing & Invite' : 'Client Team Member Invite'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-growth-teal/20 text-growth-teal border border-growth-teal/30">
                  Granular RBAC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Invite team members with custom permissions without sharing your password.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {generatedInvite ? (
            /* SUCCESS STATE WITH WHATSAPP AND COPY LINK */
            <div className="space-y-6 text-center py-2 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Invitation Link Generated!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Access link for <strong className="text-white">{generatedInvite.name}</strong> ({generatedInvite.email}) is ready. They will set their own password upon opening.
                </p>
              </div>

              {/* Infinite Expiry Notice */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-left flex items-start gap-3">
                <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  <strong>Infinite Validity:</strong> This invitation link has no expiration time limit. It will remain active until you explicitly click <strong>"Revoke / Deactivate Access"</strong> in your team management table.
                </div>
              </div>

              {/* Link Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInvite.invitationUrl}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2.5 rounded-xl font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                      copied
                        ? 'bg-emerald-500 text-white shadow-emeraldGlow'
                        : 'bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions (WhatsApp + Test) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <MessageCircle className="w-4 h-4 fill-slate-950" />
                  <span>Share via WhatsApp (1-Click)</span>
                </button>

                <a
                  href={generatedInvite.invitationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700"
                >
                  <ExternalLink className="w-4 h-4 text-growth-teal" />
                  <span>Test Link in New Tab</span>
                </a>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetModal}
                  className="text-xs font-bold text-growth-teal hover:underline"
                >
                  + Invite Another Person
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* INVITATION FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Member Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-growth-teal rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-growth-teal rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Designation / Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={inviterRole === 'ADMIN' ? 'e.g. Assistant Operations Manager' : 'e.g. Project Lead / Operations'}
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-growth-teal rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Permissions Header & Presets */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-growth-teal" />
                      <span>Delegated Permissions Matrix</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      The invited person can ONLY view and interact with checked features.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handlePresetReadOnly}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors font-medium"
                    >
                      View Only
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectNone}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Categories & Checkboxes */}
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                      <h4 className="text-[11px] font-extrabold text-growth-teal uppercase tracking-wider">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {permissionsList
                          .filter((p) => p.category === category)
                          .map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() => togglePermission(perm.key)}
                                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                                  isChecked
                                    ? 'bg-growth-teal/10 border-growth-teal/40 text-white shadow-sm'
                                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                <div className="mt-0.5 text-growth-teal">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 fill-growth-teal text-slate-900" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold leading-tight flex items-center gap-1">
                                    <span className={isChecked ? 'text-slate-100' : 'text-slate-300'}>
                                      {perm.label}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Selected: <span className="font-bold text-white">{selectedPermissions.length}</span> permissions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2.5 px-6 bg-gradient-to-r from-growth-teal to-growth-tealDark hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        <span>Generating Link...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create & Get Invite Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
