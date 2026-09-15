'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Sparkles,
  Key,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AccountInvitationItem } from '@/types';
import { InviteMemberModal } from './InviteMemberModal';

interface SharedAccessManagerProps {
  role: 'ADMIN' | 'CLIENT';
}

export const SharedAccessManager: React.FC<SharedAccessManagerProps> = ({ role }) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<AccountInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopyLink = (invitation: AccountInvitationItem) => {
    if (!invitation.invitationUrl) return;
    navigator.clipboard.writeText(invitation.invitationUrl);
    setCopiedTokenId(invitation.id);
    setTimeout(() => setCopiedTokenId(null), 2500);
    showToast('Invitation link copied to clipboard!');
  };

  const handleWhatsAppShare = (invitation: AccountInvitationItem) => {
    if (!invitation.invitationUrl) return;
    const inviterTitle = user?.fullName || (role === 'ADMIN' ? 'Platform Administrator' : 'Client Management');
    const roleType = role === 'ADMIN' ? 'Admin Team Member' : 'Corporate Client Workspace';

    const message = `*Growth India CRM Invitation*\n\nHello *${invitation.name}*,\n\nYou have been invited by *${inviterTitle}* to access the *Growth India CRM Platform* (${roleType}).\n\n👉 *Click here to set your password and activate your account:*\n${invitation.invitationUrl}\n\n_Note: This secure link remains active until manually revoked._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleToggleStatus = async (invitation: AccountInvitationItem) => {
    const isCurrentlyActive = invitation.status === 'ACTIVE' || invitation.status === 'ACCEPTED';
    const action = isCurrentlyActive ? 'REVOKE' : 'REACTIVATE';

    if (
      isCurrentlyActive &&
      !window.confirm(
        `Are you sure you want to deactivate and revoke access for "${invitation.name}" (${invitation.email})? They will be immediately locked out of the platform.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(invitation.id);
      const res = await fetch(`/api/invitations/${invitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      showToast(data.message || 'Status updated successfully');
      fetchInvitations();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (invitation: AccountInvitationItem) => {
    if (
      !window.confirm(
        `Are you sure you want to completely delete the invitation for "${invitation.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(invitation.id);
      const res = await fetch(`/api/invitations/${invitation.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete invitation');

      showToast('Invitation deleted and access removed.');
      fetchInvitations();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = invitations.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.name.toLowerCase().includes(q) ||
      inv.email.toLowerCase().includes(q) ||
      (inv.designation && inv.designation.toLowerCase().includes(q))
    );
  });

  const activeCount = invitations.filter((i) => i.status === 'ACTIVE' || i.status === 'ACCEPTED').length;
  const revokedCount = invitations.filter((i) => i.status === 'REVOKED').length;
  const acceptedCount = invitations.filter((i) => i.status === 'ACCEPTED').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-slideDown ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950 border-rose-500/50 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-growth-teal/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-growth-teal/20 text-growth-teal flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Shared Team Access & Delegated RBAC</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-growth-gold/20 text-growth-gold border border-growth-gold/30">
                    Live Security
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  {role === 'ADMIN'
                    ? 'Share access to specific Admin CRM modules with assistants without revealing your master password.'
                    : 'Invite colleagues and team members to your Client workspace with strictly assigned privileges.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={fetchInvitations}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
              title="Refresh invitations"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            </button>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex-1 md:flex-none py-2.5 px-5 bg-gradient-to-r from-growth-teal to-growth-tealDark hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Invite Person / Share Account</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 mt-6">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invitations</div>
            <div className="text-xl font-black text-white mt-1">{invitations.length}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Active & Authorized</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{activeCount}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Accepted Accounts</div>
            <div className="text-xl font-black text-blue-400 mt-1">{acceptedCount}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Revoked / Suspended</div>
            <div className="text-xl font-black text-rose-400 mt-1">{revokedCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-growth-teal text-xs text-white rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none transition-all placeholder-slate-500"
          />
        </div>
      </div>

      {/* Invitations & Members Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading delegated team members...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Shared Members Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No members match your search criteria.'
                  : 'You haven\'t shared your account with anyone yet. Click below to create your first secure invite.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="py-2 px-4 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite First Person</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Invited Person</th>
                  <th className="py-4 px-4">Status & Validity</th>
                  <th className="py-4 px-4">Granted Permissions</th>
                  <th className="py-4 px-4">Date Created</th>
                  <th className="py-4 px-5 text-right">Sharing & Access Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((inv) => {
                  const isRevoked = inv.status === 'REVOKED';
                  const isAccepted = inv.status === 'ACCEPTED';
                  const isCopied = copiedTokenId === inv.id;
                  const isActionLoading = actionLoadingId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isRevoked ? 'opacity-60 bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Person Details */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isRevoked
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isAccepted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-growth-teal/20 text-growth-teal border border-growth-teal/30'
                            }`}
                          >
                            {inv.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-100 truncate flex items-center gap-1.5">
                              <span>{inv.name}</span>
                              {isAccepted && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  In Use
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{inv.email}</div>
                            {inv.designation && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{inv.designation}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status & Expiry */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <Lock className="w-3 h-3" />
                              <span>Revoked / Inactive</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Unlock className="w-3 h-3" />
                              <span>Active & Authorized</span>
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-growth-teal" />
                            <span>Valid until manually revoked</span>
                          </div>
                        </div>
                      </td>

                      {/* Permissions Badges */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {inv.permissions.slice(0, 3).map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {perm}
                            </span>
                          ))}
                          {inv.permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-growth-teal border border-slate-700">
                              +{inv.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Copy Link */}
                          <button
                            onClick={() => handleCopyLink(inv)}
                            title="Copy Invitation Link"
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Share via WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppShare(inv)}
                            title="Share on WhatsApp"
                            className="p-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-slate-950 border border-[#25D366]/40 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke / Reactivate Button */}
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            disabled={isActionLoading}
                            title={isRevoked ? 'Reactivate Access' : 'Revoke & Disable Access'}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                              isRevoked
                                ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/40'
                                : 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40'
                            }`}
                          >
                            {isActionLoading ? (
                              <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                            ) : isRevoked ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Revoke Access</span>
                              </>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(inv)}
                            disabled={isActionLoading}
                            title="Permanently Delete Invitation"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* The Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchInvitations}
        inviterRole={role}
      />
    </div>
  );
};
