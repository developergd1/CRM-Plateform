'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  MessageCircle,
  Mail,
  Clock,
  Sparkles,
  Activity,
  AlertCircle,
  Building,
  Briefcase,
  X,
  Phone,
  Eye,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminInviteModal } from './AdminInviteModal';
import { AdminMember360Modal, AdminInvitationItem } from './AdminMember360Modal';

interface AdminAccessManagerProps {
  isModal?: boolean;
  onClose?: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  cms_full: 'Client CMS',
  hrm_full: 'HRM Suite',
  workforce_full: 'Workforce & Attendance',
  payroll_admin: 'Payroll & Comp',
  tasks_admin: 'Tasks & Delegation',
  security_audit: 'Security & Audit',
  system_settings: 'Root Governance',
};

export const AdminAccessManager: React.FC<AdminAccessManagerProps> = ({
  isModal = false,
  onClose,
}) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<AdminInvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'NAME' | 'ACTIVE'>('NEWEST');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selected360Admin, setSelected360Admin] = useState<AdminInvitationItem | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const showBanner = (message: string, type: 'success' | 'error' = 'success') => {
    setBannerNotice({ message, type });
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleCopyLink = (inv: AdminInvitationItem) => {
    navigator.clipboard.writeText(inv.invitationUrl);
    setCopiedId(inv.id);
    showBanner(`Invitation link for ${inv.name} copied!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyPortalLink = (inv: AdminInvitationItem) => {
    const portalUrl = `${window.location.origin}/growthIndia?email=${encodeURIComponent(inv.email)}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedId(inv.id);
    showBanner(`Admin Portal login link for ${inv.name} copied!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReissueLink = async (inv: AdminInvitationItem) => {
    if (
      !window.confirm(
        `Generate a fresh activation link for ${inv.name}? This resets status to PENDING and lets them configure a new password.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(inv.id);
      const res = await fetch(`/api/admin/invitations/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGENERATE_TOKEN' }),
      });

      if (res.ok) {
        const data = await res.json();
        const freshUrl = `${window.location.origin}/admin/accept-invite?token=${data.invitation.token}`;
        navigator.clipboard.writeText(freshUrl);
        showBanner(`Fresh activation link generated & copied to clipboard for ${inv.name}!`, 'success');
        fetchInvitations();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reissue invitation token.');
      }
    } catch (e: any) {
      showBanner(e.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleShareWhatsApp = (inv: AdminInvitationItem) => {
    const msg = `*Growth India Platform — Administrator Invitation*\n\nHello *${inv.name}*,\nYou have been invited to join the Growth India Administrative Governance Console as *${inv.role}* (${inv.designation}).\n\n*Activate your Admin Account:*\n${inv.invitationUrl}\n\n_Note: This single-use link requires configuring your secure administrator password._`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShareEmail = (inv: AdminInvitationItem) => {
    const subject = `Administrator Invitation — Growth India Enterprise Platform`;
    const body = `Hello ${inv.name},\n\nYou have been invited to join the Growth India Platform as an Administrator with the role: ${inv.role} (${inv.designation}).\n\nPlease complete your account activation and configure your administrative credentials by opening the link below:\n\n${inv.invitationUrl}\n\nSecurity notice: This is a single-use high-privilege onboarding token.\n\nRegards,\nGrowth India System Administration`;
    window.open(`mailto:${inv.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleToggleRevoke = async (inv: AdminInvitationItem) => {
    const isCurrentlyRevoked = inv.status === 'REVOKED';
    const action = isCurrentlyRevoked ? 'REINSTATE' : 'REVOKE';
    const confirmPrompt = isCurrentlyRevoked
      ? `Re-activate administrator access for ${inv.name}?`
      : `Are you sure you want to revoke administrator access for ${inv.name}? Their login will be immediately disabled.`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setActionLoadingId(inv.id);
      const res = await fetch(`/api/admin/invitations/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        showBanner(
          isCurrentlyRevoked
            ? `Administrator invite for ${inv.name} has been reinstated.`
            : `Administrator access for ${inv.name} has been revoked.`
        );
        fetchInvitations();
        if (selected360Admin?.id === inv.id) {
          setSelected360Admin(null);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update invitation status.');
      }
    } catch (e: any) {
      showBanner(e.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteInvite = async (inv: AdminInvitationItem) => {
    if (!window.confirm(`Permanently remove invitation record for ${inv.name} (${inv.email}) from database?`)) {
      return;
    }

    try {
      setActionLoadingId(inv.id);
      const res = await fetch(`/api/admin/invitations/${inv.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showBanner(`Invitation record removed.`, 'success');
        fetchInvitations();
        if (selected360Admin?.id === inv.id) {
          setSelected360Admin(null);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete invitation.');
      }
    } catch (e: any) {
      showBanner(e.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalCount = invitations.length;
  const activeCount = invitations.filter((i) => i.status === 'ACCEPTED').length;
  const pendingCount = invitations.filter((i) => i.status === 'PENDING').length;
  const revokedCount = invitations.filter((i) => i.status === 'REVOKED').length;
  const onlineCount = invitations.filter((i) => i.isOnline).length;

  const filtered = invitations
    .filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        inv.name.toLowerCase().includes(q) ||
        inv.email.toLowerCase().includes(q) ||
        (inv.designation && inv.designation.toLowerCase().includes(q)) ||
        (inv.department && inv.department.toLowerCase().includes(q)) ||
        (inv.acceptedEmployeeId && inv.acceptedEmployeeId.toLowerCase().includes(q)) ||
        inv.role.toLowerCase().includes(q);

      const matchRole = roleFilter === 'ALL' || inv.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const matchOnline = !onlineOnly || !!inv.isOnline;

      return matchSearch && matchRole && matchStatus && matchOnline;
    })
    .sort((a, b) => {
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'ACTIVE') {
        const aActive = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bActive = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bActive - aActive;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return null;
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  // Main UI
  const content = (
    <>
      {/* Top Banner Notice */}
      {bannerNotice && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerNotice.message}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modern KPI Cards Row (Interactive Filters!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Invitations */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setOnlineOnly(false);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none bg-white ${
            statusFilter === 'ALL' && !onlineOnly
              ? 'border-[#0D9488] ring-2 ring-[#0D9488]/15 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              Total Invitations
            </span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">All-time</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Click to view all records</p>
        </div>

        {/* Active Administrators */}
        <div
          onClick={() => {
            setStatusFilter('ACCEPTED');
            setOnlineOnly(false);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none bg-white ${
            statusFilter === 'ACCEPTED'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              Active Admins
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900 tracking-tight">{activeCount}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Authenticated</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Fully activated operators</p>
        </div>

        {/* Pending Activations */}
        <div
          onClick={() => {
            setStatusFilter('PENDING');
            setOnlineOnly(false);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none bg-white ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/15 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">
              Pending Activations
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 tracking-tight">{pendingCount}</span>
            <span className="text-[10px] text-amber-600 font-medium">Awaiting setup</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Single-use links sent</p>
        </div>

        {/* Live Online Now */}
        <div
          onClick={() => setOnlineOnly(!onlineOnly)}
          className={`p-4 rounded-2xl border transition-all cursor-pointer select-none bg-white ${
            onlineOnly
              ? 'border-[#0D9488] ring-2 ring-[#0D9488]/15 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[#0D9488] text-[10px] font-bold uppercase tracking-wider">
              Live Online
            </span>
            <div className="w-7 h-7 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0D9488]">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-2xl font-black text-slate-900 tracking-tight">{onlineCount}</span>
            </div>
            <span className="text-[10px] text-[#0D9488] font-medium">Real-time</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
            {onlineOnly ? 'Filtering: Online only' : 'Click to filter online'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or GI-ADM code..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0D9488] focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setOnlineOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' && !onlineOnly
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ACCEPTED');
                setOnlineOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ACCEPTED'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('PENDING');
                setOnlineOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('REVOKED');
                setOnlineOnly(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'REVOKED'
                  ? 'bg-white text-rose-800 shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Revoked ({revokedCount})
            </button>
          </div>

          {/* Role Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0D9488] cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="ADMIN_HR">ADMIN_HR</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0D9488] cursor-pointer"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="NAME">Name (A-Z)</option>
            <option value="ACTIVE">Recently Active</option>
          </select>
        </div>
      </div>

      {/* Main Registry List */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0D9488] border-t-transparent" />
            <p className="text-xs text-slate-500 font-bold">Loading administrator registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-800">No Administrator Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || onlineOnly
                ? 'No administrator accounts match the current filter or search criteria.'
                : 'No administrator invitations have been created yet. Generate your first secure admin invite.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Platform Administrator</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((inv) => {
              const isAccepted = inv.status === 'ACCEPTED';
              const isRevoked = inv.status === 'REVOKED';
              const isPending = inv.status === 'PENDING';
              const relativeSeen = getRelativeTime(inv.lastActiveAt);

              return (
                <div
                  key={inv.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Identity, Badges, Details */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Avatar with Presence Dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base text-white shadow-xs ${
                          inv.role === 'SUPER_ADMIN'
                            ? 'bg-gradient-to-br from-indigo-700 to-violet-900'
                            : inv.role === 'ADMIN_HR'
                            ? 'bg-gradient-to-br from-teal-700 to-emerald-800'
                            : 'bg-gradient-to-br from-slate-900 to-teal-800'
                        }`}
                      >
                        {inv.name.charAt(0).toUpperCase()}
                      </div>
                      {inv.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full ring-2 ring-emerald-500/20" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {inv.name}
                        </h4>

                        {/* GI-ADM code if present */}
                        {inv.acceptedEmployeeId && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                            {inv.acceptedEmployeeId}
                          </span>
                        )}

                        {/* Role Badge */}
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                            inv.role === 'SUPER_ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1'
                              : inv.role === 'ADMIN_HR'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20'
                          }`}
                        >
                          {inv.role === 'SUPER_ADMIN' && <Sparkles className="w-3 h-3 text-amber-500" />}
                          {inv.role}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isAccepted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRevoked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isAccepted && <Check className="w-2.5 h-2.5" />}
                          {isRevoked && <Lock className="w-2.5 h-2.5" />}
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          <span>{inv.status}</span>
                        </span>

                        {/* Live Online Badge */}
                        {inv.isOnline && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Live Online
                          </span>
                        )}
                      </div>

                      {/* Hierarchy & Contact Details */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                        <a
                          href={`mailto:${inv.email}`}
                          className="font-medium text-slate-700 hover:text-[#0D9488] hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.email}</span>
                        </a>

                        <span>•</span>

                        <span className="flex items-center gap-1 text-slate-600">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.designation}</span>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1 text-slate-600">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.department}</span>
                        </span>

                        {inv.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{inv.phone}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Timeline info */}
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Invited by {inv.inviterAdminName} on {formatDate(inv.createdAt)}</span>
                        {inv.acceptedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">
                              Activated {formatDate(inv.acceptedAt)}
                            </span>
                          </>
                        )}
                        {relativeSeen && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500">Active {relativeSeen}</span>
                          </>
                        )}
                      </div>

                      {/* Delegated Permissions Chips */}
                      {inv.permissions && inv.permissions.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {inv.permissions.map((p) => (
                            <span
                              key={p}
                              className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/80"
                            >
                              {PERMISSION_LABELS[p] || p.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions Toolbar */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                    {isAccepted ? (
                      <>
                        {/* Copy Portal Sign-In Link */}
                        <button
                          type="button"
                          onClick={() => handleCopyPortalLink(inv)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                            copiedId === inv.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title="Copy direct Admin Portal sign-in link"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              <span>Portal Link</span>
                            </>
                          )}
                        </button>

                        {/* Reissue Activation Link */}
                        <button
                          type="button"
                          onClick={() => handleReissueLink(inv)}
                          disabled={actionLoadingId === inv.id}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Generate a fresh activation link if the administrator lost access or needs to reset password"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoadingId === inv.id ? 'animate-spin' : ''}`} />
                          <span>Reissue</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(inv)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                            copiedId === inv.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title="Copy Single-Use Admin Activation Link"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Invite Link</span>
                            </>
                          )}
                        </button>

                        {/* WhatsApp Share */}
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(inv)}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs"
                          title="Share Invitation via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {/* Email Share */}
                        <button
                          type="button"
                          onClick={() => handleShareEmail(inv)}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                          title="Share Invitation via Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* View Admin 360 / Details */}
                    <button
                      onClick={() => setSelected360Admin(inv)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-[#F0FDFA] text-slate-700 hover:text-[#0D9488] hover:border-[#0D9488]/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="View Administrator 360 & Scopes"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Details</span>
                    </button>

                    {/* Revoke / Reinstate */}
                    <button
                      onClick={() => handleToggleRevoke(inv)}
                      disabled={actionLoadingId === inv.id}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                        isRevoked
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200'
                      }`}
                      title={isRevoked ? 'Reinstate Administrator Access' : 'Revoke Administrator Access'}
                    >
                      {isRevoked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>

                    {/* Delete (SUPER_ADMIN only) */}
                    {user?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDeleteInvite(inv)}
                        disabled={actionLoadingId === inv.id}
                        className="p-2 rounded-xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-all cursor-pointer shadow-2xs"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Invite Modal */}
      <AdminInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={() => {
          fetchInvitations();
        }}
      />

      {/* Admin Member 360 Modal */}
      <AdminMember360Modal
        isOpen={!!selected360Admin}
        onClose={() => setSelected360Admin(null)}
        invitation={selected360Admin}
        onUpdate={() => {
          fetchInvitations();
        }}
        currentUserRole={user?.role}
      />
    </>
  );

  // If rendered as a standalone modal (e.g. from AdminPlatformGateway):
  if (isModal) {
    return (
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 my-auto">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-slate-900 text-white rounded-md">
                Admin Console
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                <span>Isolated DB (`admin_invitations`)</span>
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              Platform Administrator Team & Delegated Governance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Invite and govern internal system administrators, HR directors, and root operators with isolated credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchInvitations}
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200 shadow-2xs cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Administrator</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
          {content}
        </div>
      </div>
    );
  }

  // If rendered inside page view (e.g. AppShell tabs):
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                Admin Console
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
                <span>Isolated DB (`admin_invitations`)</span>
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2">
              Platform Administrator Team & Delegated Governance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Invite and govern internal system administrators, HR directors, and root operators with separated credentials and dedicated collections.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchInvitations}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Administrator</span>
            </button>
          </div>
        </div>
      </div>

      {content}
    </div>
  );
};
