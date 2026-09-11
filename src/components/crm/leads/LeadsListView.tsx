'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Building2,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck,
  ArrowRightCircle,
  Clock,
  Sparkles,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_STATUS_CONFIG,
  LEAD_PRIORITY_CONFIG,
  LEAD_STATUS_TRANSITIONS,
  LeadStatus,
  LeadPriority,
} from '@/lib/constants/crm';
import { CreateLeadModal } from './CreateLeadModal';

interface LeadsListViewProps {
  onSelectLead?: (id: string) => void;
}

import { clientCache } from '@/lib/client-cache';

export const LeadsListView: React.FC<LeadsListViewProps> = ({ onSelectLead }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const leadsCacheKey = `crm_leads_${search}_${statusFilter}_${priorityFilter}_${sourceFilter}_${page}_${limit}`;
  const cachedLeads = clientCache.get<{ data: any[]; pagination: any }>(leadsCacheKey, 15 * 60 * 1000);
  const cachedStats = clientCache.get<any>('crm_leads_stats', 15 * 60 * 1000);

  const [leads, setLeads] = useState<any[]>(() => cachedLeads?.data || []);
  const [pagination, setPagination] = useState(() => cachedLeads?.pagination || { total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(() => !cachedLeads);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Status update modal state
  const [statusModalLead, setStatusModalLead] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Quick stats computed or fetched
  const [stats, setStats] = useState(() => cachedStats || {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    followUp: 0,
    lost: 0,
  });

  const fetchLeads = useCallback(async (forceRefresh = false) => {
    const currentKey = `crm_leads_${search}_${statusFilter}_${priorityFilter}_${sourceFilter}_${page}_${limit}`;
    const cached = !forceRefresh ? clientCache.get<{ data: any[]; pagination: any }>(currentKey, 15 * 60 * 1000) : null;
    
    if (!cached) {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const result = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(`/api/crm/leads?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch leads');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (json) => {
            if (json.data) setLeads(json.data);
            if (json.pagination) setPagination(json.pagination);
          },
        }
      );

      if (result?.data) setLeads(result.data);
      if (result?.pagination) setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, priorityFilter, sourceFilter, page, limit]);

  const fetchStats = async (forceRefresh = false) => {
    try {
      const freshStats = await clientCache.swrFetch(
        'crm_leads_stats',
        async () => {
          const res = await fetch('/api/analytics/dashboard');
          if (!res.ok) throw new Error('Failed to fetch stats');
          const json = await res.json();
          const crm = json.stats?.crm || {};
          return {
            total: crm.totalLeads || 0,
            new: crm.newLeads || 0,
            contacted: crm.contactedLeads || 0,
            qualified: crm.qualifiedLeads || 0,
            followUp: crm.followUpsDue || 0,
            lost: crm.lostLeads || 0,
          };
        },
        {
          forceRefresh,
          onUpdate: (updatedStats) => {
            setStats(updatedStats);
          },
        }
      );

      if (freshStats) setStats(freshStats);
    } catch (err) {
      console.error('Failed to fetch lead stats:', err);
    }
  };

  useEffect(() => {
    fetchLeads(false);
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats(false);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeads(true);
    fetchStats(true);
  };

  const openStatusChange = (lead: any, nextStatus: string) => {
    setStatusModalLead(lead);
    setTargetStatus(nextStatus);
    setStatusReason('');
    setStatusError(null);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalLead || !targetStatus) return;

    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/crm/leads/${statusModalLead.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: statusReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status');
      }

      setStatusModalLead(null);
      clientCache.clear('crm_leads_');
      clientCache.clear('exec_dashboard_');
      clientCache.clear('crm_dashboard_');
      fetchLeads(true);
      fetchStats(true);
    } catch (err: any) {
      setStatusError(err.message || 'Failed to change status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Executive Command Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-growth-navy to-slate-900 rounded-3xl p-6 text-white shadow-2xl border border-slate-800/80 relative overflow-hidden hero-banner-interactive">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-growth-teal/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-72 h-72 bg-growth-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-growth-gold mb-2 border border-white/10 backdrop-blur-md chip-premium-highlight cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
              <span>CRM • Lead Inquiries Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hero-title-interactive">
              Corporate Leads & Inquiries
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hero-subtitle-interactive">
              Track incoming prospect inquiries, qualify commercial readiness, and advance leads through the sales pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 interactive-btn-hover"
            >
              <Plus className="w-4 h-4" />
              <span>Create Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-growth-teal transition-colors">Total Leads</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-growth-teal transition-colors" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1.5 group-hover:text-growth-teal transition-colors">{pagination.total || stats.total}</p>
          <span className="text-[11px] text-slate-500 font-semibold">All corporate inquiries</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">New</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 font-mono mt-1.5">{stats.new}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Uncontacted</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Contacted</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1.5">{stats.contacted}</p>
          <span className="text-[11px] text-slate-500 font-semibold">In discussions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Qualified</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{stats.qualified}</p>
          <span className="text-[11px] text-slate-500 font-semibold">High intent</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Follow-ups Due</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 font-mono mt-1.5">{stats.followUp}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Scheduled today</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Lost / Unqual</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-700 font-mono mt-1.5">{stats.lost}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Closed out</span>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm panel-premium">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search leads by name, company, phone, email, city..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-growth-teal focus:ring-1 focus:ring-growth-teal transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Priorities</option>
            {LEAD_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            title="Refresh list"
            disabled={refreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden panel-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Lead ID & Date</th>
                <th className="py-3.5 px-4">Prospect & Company</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status & Stage</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4">Next Follow-up</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
                      Loading leads directory...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6 text-slate-500" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">No Corporate Leads Found</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {search || statusFilter || priorityFilter
                          ? 'No leads matched your filter criteria. Try clearing your search parameters.'
                          : 'Get started by creating your first corporate lead to qualify opportunities and assign owners.'}
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-md transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First Lead</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const allowedNextStatuses = LEAD_STATUS_TRANSITIONS[lead.status as LeadStatus] || [];

                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'NEW':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'CONTACTED':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'QUALIFIED':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'CONVERTED':
                        return 'bg-purple-50 text-purple-700 border-purple-200';
                      case 'LOST':
                      case 'UNQUALIFIED':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      default:
                        return 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                  };

                  const getPriorityBadge = (priority: string) => {
                    switch (priority) {
                      case 'URGENT':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'HIGH':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'MEDIUM':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      default:
                        return 'bg-slate-50 text-slate-600 border-slate-200';
                    }
                  };

                  return (
                    <tr
                      key={lead.id}
                      className="interactive-row-hover cursor-pointer transition-colors group text-slate-700 border-b border-slate-100"
                    >
                      {/* Lead ID & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {onSelectLead ? (
                          <span
                            onClick={() => onSelectLead(lead.id)}
                            className="font-mono text-xs font-bold text-growth-teal hover:underline transition-colors block cursor-pointer"
                          >
                            {lead.leadNumber}
                          </span>
                        ) : (
                          <Link
                            href={`/growthIndia/crm/leads/${lead.id}`}
                            className="font-mono text-xs font-bold text-growth-teal hover:underline transition-colors block"
                          >
                            {lead.leadNumber}
                          </Link>
                        )}
                        <span className="text-[11px] text-slate-400 block font-medium">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Prospect & Company */}
                      <td className="py-3.5 px-4">
                        {onSelectLead ? (
                          <span
                            onClick={() => onSelectLead(lead.id)}
                            className="font-bold text-slate-900 hover:text-growth-teal transition-colors line-clamp-1 cursor-pointer"
                          >
                            {lead.fullName || lead.contactPerson}
                          </span>
                        ) : (
                          <Link
                            href={`/growthIndia/crm/leads/${lead.id}`}
                            className="font-bold text-slate-900 hover:text-growth-teal transition-colors line-clamp-1"
                          >
                            {lead.fullName || lead.contactPerson}
                          </Link>
                        )}
                        {lead.companyName ? (
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 line-clamp-1 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {lead.companyName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Individual Prospect</span>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                        {lead.city && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{lead.city}</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                          {lead.source?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getPriorityBadge(
                            lead.priority
                          )}`}
                        >
                          {lead.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getStatusBadge(
                              lead.status
                            )}`}
                          >
                            {lead.status}
                          </span>

                          {/* Quick advance dropdown if allowed transitions exist */}
                          {allowedNextStatuses.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  openStatusChange(lead, e.target.value);
                                }
                              }}
                              className="bg-transparent border-0 text-slate-400 hover:text-growth-teal text-xs cursor-pointer p-0 w-4 focus:ring-0"
                              title="Advance Status"
                            >
                              <option value="" disabled>
                                ➔
                              </option>
                              {allowedNextStatuses.map((st) => (
                                <option key={st} value={st} className="bg-white text-slate-800">
                                  Advance to {st}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 text-growth-teal flex items-center justify-center text-[10px] font-bold">
                              {lead.assignedTo.fullName?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 line-clamp-1">
                                {lead.assignedTo.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {lead.assignedTo.employeeId}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Next Follow-up */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.nextFollowUpAt ? (
                          <div className="text-xs">
                            <span className="text-slate-700 font-bold block">
                              {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(lead.nextFollowUpAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <Link
                          href={`/growthIndia/crm/leads/${lead.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-growth-teal hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View 360</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{leads.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> leads
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchLeads();
          fetchStats();
        }}
      />

      {/* Status Transition Confirmation Modal */}
      {statusModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Advance Status: {statusModalLead.leadNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Transition status from{' '}
              <span className="font-bold text-slate-800">{statusModalLead.status}</span> to{' '}
              <span className="font-bold text-growth-teal">{targetStatus}</span>.
            </p>

            {statusError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {statusError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason / Activity Note (Optional)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Conducted discovery call; client confirmed budget and requirements."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-growth-teal resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalLead(null)}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusSubmit}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl bg-growth-teal hover:bg-growth-tealDark text-xs font-bold text-white shadow-md transition-all"
              >
                {updatingStatus ? 'Updating...' : `Confirm ➔ ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
