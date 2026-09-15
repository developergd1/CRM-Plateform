'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  Globe,
  Monitor,
  Calendar,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  PlusCircle,
  Edit3,
  Trash2,
  LogIn,
  Eye,
  Key,
} from 'lucide-react';
import { AccountInvitationItem } from '@/types';

interface InvitedMember360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: AccountInvitationItem | null;
  onStatusChange?: () => void;
}

export const InvitedMember360Modal: React.FC<InvitedMember360ModalProps> = ({
  isOpen,
  onClose,
  invitation,
  onStatusChange,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters for audit logs
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'AUTH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch Member 360 data
  const fetchMember360 = async (silent = false) => {
    if (!invitation?.id) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${invitation.id}/member-360`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to load member 360 data');
      }
      const json = await res.json();
      setData(json.member360);
    } catch (err: any) {
      console.error('Member 360 fetch error:', err);
      setError(err.message || 'Error loading member details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && invitation?.id) {
      fetchMember360();
      // Auto refresh presence and logs every 15 seconds while modal is open
      const timer = setInterval(() => fetchMember360(true), 15000);
      return () => clearInterval(timer);
    } else {
      setData(null);
    }
  }, [isOpen, invitation?.id]);

  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  const handleCopyLink = () => {
    if (!invitation) return;
    const token =
      invitation.token ||
      (invitation.invitationUrl && invitation.invitationUrl.includes('token=')
        ? invitation.invitationUrl.split('token=')[1].split('&')[0]
        : '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://growth-india-crm.onrender.com';
    const finalUrl = `${origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(finalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    if (!data?.auditLogs) return [];
    return data.auditLogs.filter((log: any) => {
      const actionUpper = (log.action || '').toUpperCase();

      // Category filter
      if (activeFilter === 'CREATE') {
        const isCreate = actionUpper.includes('CREATE') || actionUpper.includes('ADD') || actionUpper.includes('INVITE');
        if (!isCreate) return false;
      } else if (activeFilter === 'UPDATE') {
        const isUpdate = actionUpper.includes('UPDATE') || actionUpper.includes('EDIT') || actionUpper.includes('STATUS') || actionUpper.includes('ASSIGN');
        if (!isUpdate) return false;
      } else if (activeFilter === 'DELETE') {
        const isDelete = actionUpper.includes('DELETE') || actionUpper.includes('REMOVE') || actionUpper.includes('ARCHIVE') || actionUpper.includes('REVOKE');
        if (!isDelete) return false;
      } else if (activeFilter === 'AUTH') {
        const isAuth = actionUpper.includes('LOGIN') || actionUpper.includes('AUTH') || log.entityType === 'AUTH';
        if (!isAuth) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesEntity = (log.entityType || '').toLowerCase().includes(q);
        const matchesEntityId = (log.entityId || '').toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q);
        return matchesAction || matchesEntity || matchesEntityId || matchesReason;
      }

      return true;
    });
  }, [data?.auditLogs, activeFilter, searchQuery]);

  if (!isOpen || !invitation) return null;

  const presence = data?.presence || { isOnline: false };
  const stats = data?.stats || { totalActions: 0, createdCount: 0, updatedCount: 0, deletedCount: 0, authCount: 0 };
  const isRevoked = invitation.status === 'REVOKED';

  // Helper for action badges
  const getActionBadge = (action: string, entityType: string) => {
    const a = (action || '').toUpperCase();
    if (a.includes('CREATE') || a.includes('ADD') || a.includes('INVITE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
          {action}
        </span>
      );
    }
    if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('ARCHIVE') || a.includes('REVOKE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          {action}
        </span>
      );
    }
    if (a.includes('LOGIN') || a.includes('AUTH') || entityType === 'AUTH') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          <LogIn className="w-3.5 h-3.5 text-amber-600" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
        <Edit3 className="w-3.5 h-3.5 text-sky-600" />
        {action}
      </span>
    );
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return 'Never / Not yet';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 md:p-6 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl bg-white border-2 border-slate-300 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[88vh] max-h-[88vh] my-auto overflow-hidden ring-1 ring-slate-900/5">
        {/* Header - Clean Crisp Contrasting Header with Border */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90 shrink-0 z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar with Live Indicator */}
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md ${
                  isRevoked
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-gradient-to-br from-teal-500 to-teal-700 text-white'
                }`}
              >
                {invitation.name.charAt(0).toUpperCase()}
              </div>
              {/* Online pulse dot */}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                  presence.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                title={presence.isOnline ? 'Online Now' : 'Offline'}
              >
                {presence.isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="title-interactive-hover text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {invitation.name}
                </h2>
                {presence.isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE ONLINE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    OFFLINE
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-teal-50 text-growth-teal border border-teal-200 uppercase shrink-0">
                  {invitation.inviterRole === 'ADMIN' ? 'Delegated Admin' : 'Delegated Client'}
                </span>
              </div>
              <p className="subtitle-interactive-hover text-xs text-slate-500 font-medium truncate mt-0.5">
                {invitation.email} {invitation.designation ? `• ${invitation.designation}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchMember360(true)}
              disabled={refreshing}
              title="Refresh Member Data & Live Logs"
              className="interactive-btn-hover p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="interactive-btn-hover p-2.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-sm"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - Properly Contained with min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/40 text-slate-800">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-growth-teal mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Gathering complete 360° audit logs & live presence...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          ) : (
            <>
              {/* TOP 3 CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {/* 1. Live Presence & Screen Card */}
                <div className="card-premium interactive-box-hover p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 min-w-0">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Monitor className="w-3.5 h-3.5 text-growth-teal shrink-0" />
                      Live Presence & Screen
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        presence.isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {presence.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-w-0">
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-500 font-semibold mb-1">Current Screen / Active Page:</div>
                      <div className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 min-w-0 overflow-hidden">
                        {presence.currentPage ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span
                              className="font-mono text-growth-teal font-bold text-xs truncate min-w-0 block"
                              title={presence.currentPage}
                            >
                              {presence.currentPage}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not actively browsing</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 min-w-0">
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Last Active</span>
                        <span className="font-bold text-slate-800 text-xs block truncate mt-0.5">
                          {presence.lastActiveAt ? getRelativeTime(presence.lastActiveAt) : 'Never'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Last Login</span>
                        <span
                          className="font-bold text-slate-800 text-xs block truncate mt-0.5"
                          title={formatTimestamp(presence.lastLoginAt)}
                        >
                          {presence.lastLoginAt ? getRelativeTime(presence.lastLoginAt) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-100 flex items-center justify-between min-w-0">
                    <span className="truncate" title={`IP: ${presence.ipAddress || 'Unknown'}`}>
                      IP: {presence.ipAddress || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${presence.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-[11px] font-sans font-medium text-slate-600">
                        {presence.isOnline ? 'Connected' : 'Offline'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. Operations & Activity Counters Card */}
                <div className="card-premium interactive-box-hover p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 min-w-0">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <Activity className="w-3.5 h-3.5 text-growth-gold shrink-0" />
                      Activity Metrics
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      Total: {stats.totalActions}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-center hover:bg-emerald-100/60 transition">
                      <div className="text-sm font-black text-emerald-700">+{stats.createdCount}</div>
                      <div className="text-[9px] text-emerald-800/80 font-bold uppercase mt-0.5">Created</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-200/70 text-center hover:bg-sky-100/60 transition">
                      <div className="text-sm font-black text-sky-700">{stats.updatedCount}</div>
                      <div className="text-[9px] text-sky-800/80 font-bold uppercase mt-0.5">Edited</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/70 text-center hover:bg-rose-100/60 transition">
                      <div className="text-sm font-black text-rose-700">{stats.deletedCount}</div>
                      <div className="text-[9px] text-rose-800/80 font-bold uppercase mt-0.5">Deleted</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between min-w-0">
                    <span className="font-medium truncate">Successful Logins:</span>
                    <span className="font-mono font-bold text-slate-900 shrink-0">{stats.authCount} times</span>
                  </div>
                </div>

                {/* 3. Delegated Security & Access Card */}
                <div className="card-premium interactive-box-hover p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3 min-w-0">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
                      <ShieldCheck className="w-3.5 h-3.5 text-growth-teal shrink-0" />
                      Granted Permissions
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isRevoked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                    {(invitation.permissions || []).map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 hover:border-growth-teal hover:bg-teal-50 hover:text-growth-teal transition"
                      >
                        {perm}
                      </span>
                    ))}
                    {(!invitation.permissions || invitation.permissions.length === 0) && (
                      <span className="text-slate-400 text-xs italic">No specific permissions assigned</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className={`interactive-btn-hover flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        copiedLink
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Invite Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AUDIT LOGS & HISTORY TIMELINE SECTION */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="title-interactive-hover text-base font-black text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-growth-teal" />
                      Real-Time Activity Logs & Modification History
                    </h3>
                    <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5">
                      Complete immutable log of all additions, edits, deletions and logins performed by this invited member
                    </p>
                  </div>

                  {/* Search filter */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search activity or entity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:ring-1 focus:ring-growth-teal transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'ALL'
                        ? 'bg-growth-teal text-white shadow-tealGlow'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    All History ({stats.totalActions})
                  </button>
                  <button
                    onClick={() => setActiveFilter('CREATE')}
                    className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'CREATE'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                    }`}
                  >
                    ➕ Created ({stats.createdCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('UPDATE')}
                    className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'UPDATE'
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200'
                    }`}
                  >
                    ✏️ Edited ({stats.updatedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('DELETE')}
                    className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'DELETE'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                    }`}
                  >
                    🗑️ Deleted ({stats.deletedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('AUTH')}
                    className={`interactive-btn-hover px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'AUTH'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                    }`}
                  >
                    🔐 Logins / Auth ({stats.authCount})
                  </button>
                </div>

                {/* Audit Logs List */}
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal mx-auto flex items-center justify-center border border-teal-100">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {searchQuery
                        ? 'No activity logs match your search filter'
                        : activeFilter !== 'ALL'
                        ? `No ${activeFilter.toLowerCase()} activities recorded for this member`
                        : 'No activity logs recorded yet'}
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Any actions taken by this member (creating leads, modifying contacts, deleting tasks, or logging in) will appear here live with full audit diffs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredLogs.map((log: any) => {
                      const isExpanded = Boolean(expandedLogIds[log.id]);
                      const hasData = log.newData || log.previousData;

                      return (
                        <div
                          key={log.id}
                          className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-4 hover:border-growth-teal transition-all shadow-sm space-y-2.5 min-w-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                              {getActionBadge(log.action, log.entityType)}

                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {log.entityType}
                              </span>

                              {log.entityId && (
                                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-xs">
                                  {log.entityId}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                              <span title={formatTimestamp(log.timestamp)} className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{getRelativeTime(log.timestamp)}</span>
                              </span>

                              {hasData && (
                                <button
                                  onClick={() => toggleExpand(log.id)}
                                  className="interactive-btn-hover flex items-center gap-1 text-xs font-bold text-growth-teal hover:text-growth-tealDark cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Hide Details' : 'View Changes'}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {log.reason && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="font-semibold text-slate-700">Reason / Note:</span> {log.reason}
                            </p>
                          )}

                          {/* Expandable Before / After Details */}
                          {hasData && isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                              {log.previousData && (
                                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 min-w-0">
                                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1">
                                    Previous State (Before)
                                  </span>
                                  <pre className="font-mono text-[10px] text-rose-950 overflow-x-auto whitespace-pre-wrap max-h-40 bg-white/70 p-2 rounded-lg border border-rose-200/50">
                                    {typeof log.previousData === 'object'
                                      ? JSON.stringify(log.previousData, null, 2)
                                      : log.previousData}
                                  </pre>
                                </div>
                              )}

                              {log.newData && (
                                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 min-w-0">
                                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block mb-1">
                                    Updated / New State (After)
                                  </span>
                                  <pre className="font-mono text-[10px] text-emerald-950 overflow-x-auto whitespace-pre-wrap max-h-40 bg-white/70 p-2 rounded-lg border border-emerald-200/50">
                                    {typeof log.newData === 'object'
                                      ? JSON.stringify(log.newData, null, 2)
                                      : log.newData}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {log.ipAddress && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-100">
                              <span>IP: {log.ipAddress}</span>
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer - Clean Fixed Distinct Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 shrink-0 z-10 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Live audit tracking active • Auto-refreshes every 15s</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="interactive-btn-hover px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Close 360° View
          </button>
        </div>
      </div>
    </div>
  );
};
