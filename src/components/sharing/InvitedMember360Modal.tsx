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
    if (!invitation?.invitationUrl) return;
    navigator.clipboard.writeText(invitation.invitationUrl);
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <PlusCircle className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('ARCHIVE') || a.includes('REVOKE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <Trash2 className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (a.includes('LOGIN') || a.includes('AUTH') || entityType === 'AUTH') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <LogIn className="w-3 h-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
        <Edit3 className="w-3 h-3" />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] my-auto overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-800 bg-slate-900/95 shrink-0 z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar with Live Indicator */}
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-lg ${
                  isRevoked
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : presence.isOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-growth-teal/20 text-growth-teal border border-growth-teal/30'
                }`}
              >
                {invitation.name.charAt(0).toUpperCase()}
              </div>
              {/* Online pulse dot */}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                  presence.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
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
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {invitation.name}
                </h2>
                {presence.isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ONLINE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    OFFLINE
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-growth-teal border border-slate-700 uppercase">
                  {invitation.inviterRole === 'ADMIN' ? 'Delegated Admin' : 'Delegated Client'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {invitation.email} {invitation.designation ? `• ${invitation.designation}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchMember360(true)}
              disabled={refreshing}
              title="Refresh Member Data & Live Logs"
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-200">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-growth-teal mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Gathering complete 360° audit logs & live presence...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TOP CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Live Presence & Page Card */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-growth-teal" />
                      Live Presence & Screen
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        presence.isOnline
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {presence.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Current Screen / Active Page:</div>
                      <div className="text-xs font-bold text-white bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/80 mt-1 truncate">
                        {presence.currentPage ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                            {presence.currentPage}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not actively browsing</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Last Active:</span>
                        <span className="font-medium text-slate-300">
                          {presence.lastActiveAt ? getRelativeTime(presence.lastActiveAt) : 'Never'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Last Login:</span>
                        <span className="font-medium text-slate-300 truncate block" title={formatTimestamp(presence.lastLoginAt)}>
                          {presence.lastLoginAt ? getRelativeTime(presence.lastLoginAt) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {presence.ipAddress && (
                    <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span>IP: {presence.ipAddress}</span>
                      <span>{presence.isOnline ? '🟢 Connected' : '⚪ Disconnected'}</span>
                    </div>
                  )}
                </div>

                {/* 2. Operations & Activity Counters Card */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-growth-gold" />
                      Activity Metrics
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Total: {stats.totalActions}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <div className="text-xs font-bold text-emerald-400">+{stats.createdCount}</div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Created</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                      <div className="text-xs font-bold text-sky-400">{stats.updatedCount}</div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Edited</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <div className="text-xs font-bold text-rose-400">{stats.deletedCount}</div>
                      <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Deleted</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <span>Successful Logins:</span>
                    <span className="font-bold text-slate-200">{stats.authCount} times</span>
                  </div>
                </div>

                {/* 3. Delegated Security & Access Card */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-growth-teal" />
                      Granted Permissions
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isRevoked
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {(invitation.permissions || []).map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {perm}
                      </span>
                    ))}
                    {(!invitation.permissions || invitation.permissions.length === 0) && (
                      <span className="text-slate-500 text-xs italic">No specific permissions assigned</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
                    <button
                      onClick={handleCopyLink}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        copiedLink
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Invite Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AUDIT LOGS & HISTORY TIMELINE SECTION */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-growth-teal" />
                      Real-Time Activity Logs & Modification History
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Complete immutable log of all additions, edits, deletions and logins performed by this invited member
                    </p>
                  </div>

                  {/* Search filter */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search activity or entity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-growth-teal transition-colors"
                    />
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'ALL'
                        ? 'bg-growth-teal text-white shadow-tealGlow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    All History ({stats.totalActions})
                  </button>
                  <button
                    onClick={() => setActiveFilter('CREATE')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'CREATE'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    ➕ Created ({stats.createdCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('UPDATE')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'UPDATE'
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-sky-400'
                    }`}
                  >
                    ✏️ Edited ({stats.updatedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('DELETE')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'DELETE'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    🗑️ Deleted ({stats.deletedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('AUTH')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === 'AUTH'
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    🔐 Logins / Auth ({stats.authCount})
                  </button>
                </div>

                {/* Audit Logs List */}
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      {searchQuery
                        ? 'No activity logs match your search filter'
                        : activeFilter !== 'ALL'
                        ? `No ${activeFilter.toLowerCase()} activities recorded for this member`
                        : 'No activity logs recorded yet'}
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
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
                          className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 hover:border-slate-700 transition-all space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {getActionBadge(log.action, log.entityType)}

                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {log.entityType}
                              </span>

                              {log.entityId && (
                                <span className="text-xs font-mono font-bold text-slate-200">
                                  {log.entityId}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                              <span title={formatTimestamp(log.timestamp)} className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{getRelativeTime(log.timestamp)}</span>
                              </span>

                              {hasData && (
                                <button
                                  onClick={() => toggleExpand(log.id)}
                                  className="flex items-center gap-1 text-[11px] text-growth-teal hover:underline cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Hide Details' : 'View Changes'}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {log.reason && (
                            <p className="text-[11px] text-slate-400 italic">
                              Reason / Note: {log.reason}
                            </p>
                          )}

                          {/* Expandable Before / After Details */}
                          {hasData && isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80 text-[11px]">
                              {log.previousData && (
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-900/30">
                                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                                    Previous State (Before)
                                  </span>
                                  <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                                    {typeof log.previousData === 'object'
                                      ? JSON.stringify(log.previousData, null, 2)
                                      : log.previousData}
                                  </pre>
                                </div>
                              )}

                              {log.newData && (
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-900/30">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                                    Updated / New State (After)
                                  </span>
                                  <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                                    {typeof log.newData === 'object'
                                      ? JSON.stringify(log.newData, null, 2)
                                      : log.newData}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {log.ipAddress && (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                              <span>IP: {log.ipAddress}</span>
                              <span className="text-slate-600">{formatTimestamp(log.timestamp)}</span>
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

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/95 shrink-0 z-10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live audit tracking active • Auto-refreshes every 15s</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close 360° View
          </button>
        </div>
      </div>
    </div>
  );
};
