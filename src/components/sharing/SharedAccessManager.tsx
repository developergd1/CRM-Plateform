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
  Eye,
  Monitor,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AccountInvitationItem } from '@/types';
import { InviteMemberModal } from './InviteMemberModal';
import { InvitedMember360Modal } from './InvitedMember360Modal';

interface SharedAccessManagerProps {
  role: 'ADMIN' | 'CLIENT';
}

export const SharedAccessManager: React.FC<SharedAccessManagerProps> = ({ role }) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<AccountInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selected360Member, setSelected360Member] = useState<AccountInvitationItem | null>(null);
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
      <div className="panel-premium bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="title-interactive-hover text-xl font-black text-slate-900 tracking-tight cursor-pointer">
                Shared Team Access & Delegated RBAC
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold shrink-0">
                Live Security
              </span>
            </div>
            <p className="subtitle-interactive-hover text-xs text-slate-500 font-medium mt-0.5">
              {role === 'ADMIN'
                ? 'Share access to specific Admin CRM modules with assistants without revealing your master password.'
                : 'Invite colleagues and team members to your Client workspace with strictly assigned privileges.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            onClick={fetchInvitations}
            disabled={loading}
            className="interactive-btn-hover flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
            title="Refresh invitations"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="interactive-btn-hover flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite Person / Share Account</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invitations</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">{invitations.length}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Invited team members</div>
          </div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active & Authorized</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-600 font-mono">{activeCount}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">Access enabled</div>
          </div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Accepted Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-sky-600 font-mono">{acceptedCount}</div>
            <div className="text-[11px] text-sky-700 font-medium mt-1">Activated members</div>
          </div>
        </div>

        <div className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Revoked / Suspended</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-600 font-mono">{revokedCount}</div>
            <div className="text-[11px] text-rose-700 font-medium mt-1">Access disabled</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="panel-premium bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-growth-teal focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-growth-teal transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Showing <strong className="text-slate-800">{filtered.length}</strong> of {invitations.length} members
        </div>
      </div>

      {/* Invitations & Members Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden panel-premium">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading delegated team members...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center border border-slate-200">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Shared Members Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No members match your search criteria.'
                  : 'You haven\'t shared your account with anyone yet. Click below to create your first secure invite.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="interactive-btn-hover py-2 px-4 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all inline-flex items-center gap-2 cursor-pointer"
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
                <tr className="bg-slate-50/90 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-5">Invited Person</th>
                  <th className="py-3.5 px-4">Status & Live Presence</th>
                  <th className="py-3.5 px-4">Granted Permissions</th>
                  <th className="py-3.5 px-4">Date Created</th>
                  <th className="py-3.5 px-5 text-right">Sharing & Access Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((inv) => {
                  const isRevoked = inv.status === 'REVOKED';
                  const isAccepted = inv.status === 'ACCEPTED';
                  const isCopied = copiedTokenId === inv.id;
                  const isActionLoading = actionLoadingId === inv.id;
                  const isOnline = Boolean(inv.presence?.isOnline);
                  const currentPage = inv.presence?.currentPage;

                  return (
                    <tr
                      key={inv.id}
                      className={`interactive-row-hover hover:bg-teal-50/20 transition-all border-b border-slate-100 cursor-pointer ${
                        isRevoked ? 'opacity-70 bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Person Details */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                                isRevoked
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : isOnline
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                  : isAccepted
                                  ? 'bg-teal-50 text-growth-teal border border-teal-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {inv.name.charAt(0).toUpperCase()}
                            </div>
                            {isAccepted && (
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                                title={isOnline ? 'Online Now' : 'Offline'}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelected360Member(inv)}
                              className="title-interactive-hover font-bold text-slate-900 hover:text-growth-teal transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                              title="Click to open 360° View"
                            >
                              <span>{inv.name}</span>
                              {isAccepted && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                  In Use
                                </span>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-500 truncate">{inv.email}</div>
                            {inv.designation && (
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{inv.designation}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status & Live Presence */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" />
                              <span>Revoked / Inactive</span>
                            </span>
                          ) : isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Online Now</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              <span>Active (Offline)</span>
                            </span>
                          )}

                          {currentPage && isOnline ? (
                            <div className="text-[10px] text-teal-700 font-medium flex items-center gap-1 truncate max-w-[200px]" title={currentPage}>
                              <Monitor className="w-3 h-3 text-growth-teal shrink-0" />
                              <span className="truncate">{currentPage}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-growth-teal" />
                              <span>Valid until revoked</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Permissions Badges */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {inv.permissions.slice(0, 3).map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {perm}
                            </span>
                          ))}
                          {inv.permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 text-growth-teal border border-teal-200">
                              +{inv.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-500 text-[11px] whitespace-nowrap font-medium">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 360° View Button */}
                          <button
                            onClick={() => setSelected360Member(inv)}
                            title="Open 360° View, Live Presence & Activity History"
                            className="interactive-btn-hover px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-growth-teal text-growth-teal hover:text-white border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>360° View</span>
                          </button>

                          {/* 1-Click Copy Link */}
                          <button
                            onClick={() => handleCopyLink(inv)}
                            title="Copy Invitation Link"
                            className={`interactive-btn-hover p-2 rounded-xl border transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Share via WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppShare(inv)}
                            title="Share on WhatsApp"
                            className="interactive-btn-hover p-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke / Reactivate Button */}
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            disabled={isActionLoading}
                            title={isRevoked ? 'Reactivate Access' : 'Revoke & Disable Access'}
                            className={`interactive-btn-hover px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                              isRevoked
                                ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200'
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
                            className="interactive-btn-hover p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
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

      {/* 360° Member View Modal */}
      {selected360Member && (
        <InvitedMember360Modal
          isOpen={Boolean(selected360Member)}
          onClose={() => setSelected360Member(null)}
          invitation={selected360Member}
          onStatusChange={fetchInvitations}
        />
      )}

      {/* The Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={fetchInvitations}
        inviterRole={role}
      />
    </div>
  );
};
