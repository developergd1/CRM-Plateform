'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Plus,
  Phone,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';

import { clientCache } from '@/lib/client-cache';

export const FollowUpDashboardView: React.FC = () => {
  const [filter, setFilter] = useState<'TODAY' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED' | 'ALL'>('TODAY');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const cacheKey = `crm_followups_${filter}_${page}_${limit}`;
  const cached = clientCache.get<{ data: any[]; summary: any; pagination: any }>(cacheKey, 15 * 60 * 1000);

  const [followUps, setFollowUps] = useState<any[]>(() => cached?.data || []);
  const [summary, setSummary] = useState(() => cached?.summary || { today: 0, upcoming: 0, overdue: 0, completed: 0, all: 0 });
  const [pagination, setPagination] = useState(() => cached?.pagination || { total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newLeadId, setNewLeadId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [targetType, setTargetType] = useState<'CLIENT' | 'LEAD'>('CLIENT');
  const [newAssignedToId, setNewAssignedToId] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchFollowUps = useCallback(async (forceRefresh = false) => {
    const currentKey = `crm_followups_${filter}_${page}_${limit}`;
    const cachedData = !forceRefresh ? clientCache.get<{ data: any[]; summary: any; pagination: any }>(currentKey, 15 * 60 * 1000) : null;
    if (!cachedData) setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('filter', filter);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const result = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(`/api/crm/followups?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch follow-ups');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (json) => {
            if (json.data) setFollowUps(json.data);
            if (json.summary) setSummary(json.summary);
            if (json.pagination) setPagination(json.pagination);
          },
        }
      );

      if (result?.data) setFollowUps(result.data);
      if (result?.summary) setSummary(result.summary);
      if (result?.pagination) setPagination(result.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, page, limit]);

  useEffect(() => {
    fetchFollowUps(false);
  }, [fetchFollowUps]);

  const loadModalData = async () => {
    try {
      const [leadsRes, empsRes, clientsRes] = await Promise.all([
        fetch('/api/crm/leads?limit=100').then((r) => r.ok ? r.json() : { data: [] }),
        fetch('/api/employees').then((r) => r.ok ? r.json() : { employees: [] }),
        fetch('/api/clients').then((r) => r.ok ? r.json() : { clients: [] }),
      ]);
      setLeads(leadsRes.data || []);
      setEmployees(empsRes.employees || []);
      setClients(clientsRes.clients || []);
    } catch (e) {
      console.error('Error loading modal reference data:', e);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`/api/crm/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      fetchFollowUps();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/crm/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          scheduledAt: new Date(newDate).toISOString(),
          priority: newPriority,
          assignedToId: newAssignedToId || undefined,
          leadId: targetType === 'LEAD' ? (newLeadId || undefined) : undefined,
          clientId: targetType === 'CLIENT' ? (newClientId || undefined) : undefined,
          remarks: newRemarks.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowScheduleModal(false);
        setNewTitle('');
        setNewDate('');
        setNewRemarks('');
        setNewLeadId('');
        setNewClientId('');
        setNewAssignedToId('');
        fetchFollowUps();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Executive Banner */}
      <div className="hero-banner-interactive flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 text-white border border-slate-700/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="chip-premium-highlight px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30 tracking-wide uppercase">
              CRM TASK FORCE
            </span>
            <span className="text-xs text-slate-300 font-medium">Customer Engagement & SLAs</span>
          </div>
          <h1 className="hero-title-interactive text-2xl lg:text-3xl font-black text-white tracking-tight">
            Tasks & Follow-ups Queue
          </h1>
          <p className="hero-subtitle-interactive text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Monitor time-sensitive interactions, schedule client check-ins, and ensure zero SLA breaches across your accounts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchFollowUps();
            }}
            className="interactive-btn-hover p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Refresh Follow-ups"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              loadModalData();
              setShowScheduleModal(true);
            }}
            className="interactive-btn-hover flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#0E8388] to-teal-500 hover:from-teal-600 hover:to-teal-400 text-white shadow-lg shadow-teal-900/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Schedule Follow-up
          </button>
        </div>
      </div>

      {/* 2. Tab Navigation Ribbon */}
      <div className="panel-premium flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setFilter('TODAY');
              setPage(1);
            }}
            className={`crm-filter-pill flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'TODAY'
                ? 'bg-[#0E8388] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Today Due</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === 'TODAY' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
              {summary.today}
            </span>
          </button>

          <button
            onClick={() => {
              setFilter('OVERDUE');
              setPage(1);
            }}
            className={`crm-filter-pill flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Overdue Alert</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                summary.overdue > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {summary.overdue}
            </span>
          </button>

          <button
            onClick={() => {
              setFilter('UPCOMING');
              setPage(1);
            }}
            className={`crm-filter-pill flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'UPCOMING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Upcoming</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === 'UPCOMING' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
              {summary.upcoming}
            </span>
          </button>

          <button
            onClick={() => {
              setFilter('COMPLETED');
              setPage(1);
            }}
            className={`crm-filter-pill flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
              {summary.completed}
            </span>
          </button>

          <button
            onClick={() => {
              setFilter('ALL');
              setPage(1);
            }}
            className={`crm-filter-pill px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Follow-ups ({summary.all})
          </button>
        </div>
      </div>

      {/* 3. Follow-ups Table */}
      <div className="panel-premium rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Follow-up ID</th>
                <th className="py-3.5 px-4">Subject & Objective</th>
                <th className="py-3.5 px-4">Prospect / Organization</th>
                <th className="py-3.5 px-4">Scheduled For</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Representative</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#0E8388]" />
                      Loading follow-ups queue...
                    </div>
                  </td>
                </tr>
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="title-interactive-hover text-base font-bold text-slate-900">No Follow-ups in this queue</h3>
                      <p className="subtitle-interactive-hover text-xs text-slate-500">
                        {filter === 'OVERDUE'
                          ? 'Great job! Zero overdue follow-up tasks.'
                          : 'No pending items found for the selected view.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                followUps.map((item) => {
                  const isItemOverdue = item.status === 'PENDING' && new Date(item.scheduledAt) < new Date();

                  return (
                    <tr key={item.id} className="interactive-row-hover hover:bg-teal-50/20 transition-colors text-slate-700">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#0E8388]">
                        {item.followUpNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="title-interactive-hover font-bold text-slate-900">{item.title}</div>
                        {item.remarks && (
                          <div className="subtitle-interactive-hover text-xs text-slate-500 line-clamp-1 mt-0.5">{item.remarks}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.lead ? (
                          <Link
                            href={`/growthIndia/crm/leads/${item.lead.id}`}
                            className="text-xs font-semibold text-[#0E8388] hover:underline block"
                          >
                            {item.lead.fullName} {item.lead.companyName ? `(${item.lead.companyName})` : ''}
                          </Link>
                        ) : item.client ? (
                          <span className="text-xs font-semibold text-slate-800">{item.client.companyName}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Unspecified Prospect</span>
                        )}
                        {item.contact && (
                          <span className="text-[11px] text-slate-500 block">Attn: {item.contact.fullName}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">
                          {new Date(item.scheduledAt).toLocaleDateString()}
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            isItemOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isItemOverdue && ' (OVERDUE)'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.priority === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isItemOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {item.assignedTo ? item.assignedTo.fullName : <span className="text-slate-400 italic">Unassigned</span>}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {item.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkComplete(item.id)}
                            className="interactive-btn-hover px-3 py-1.5 rounded-lg bg-[#0E8388] hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{followUps.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> follow-ups
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Follow-up Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule New Follow-up</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Title / Action Item <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Discuss revised manpower pricing"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Associated Lead</label>
              <select
                value={newLeadId}
                onChange={(e) => setNewLeadId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Standalone Follow-up --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.leadNumber} - {l.fullName} ({l.companyName || 'Prospect'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Remarks</label>
              <textarea
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                rows={2}
                placeholder="Key talking points or deliverables..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || !newTitle.trim() || !newDate}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
