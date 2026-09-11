'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Star,
  Eye,
  Clock,
  Activity,
  X,
  Calendar,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { CreateContactModal } from './CreateContactModal';
import { clientCache } from '@/lib/client-cache';

export const ContactsListView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isDecisionMaker, setIsDecisionMaker] = useState('');
  const [isPrimary, setIsPrimary] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const cacheKey = `crm_contacts_${search}_${isDecisionMaker}_${isPrimary}_${page}_${limit}`;
  const cached = clientCache.get<{ data: any[]; pagination: any }>(cacheKey, 15 * 60 * 1000);

  const [contacts, setContacts] = useState<any[]>(() => cached?.data || []);
  const [pagination, setPagination] = useState(() => cached?.pagination || { total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetail, setContactDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchContacts = useCallback(async (forceRefresh = false) => {
    const currentKey = `crm_contacts_${search}_${isDecisionMaker}_${isPrimary}_${page}_${limit}`;
    const cachedData = !forceRefresh ? clientCache.get<{ data: any[]; pagination: any }>(currentKey, 15 * 60 * 1000) : null;
    if (!cachedData) setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (isDecisionMaker) params.append('isDecisionMaker', isDecisionMaker);
      if (isPrimary) params.append('isPrimary', isPrimary);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const result = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(`/api/crm/contacts?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch contacts');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (json) => {
            if (json.data) setContacts(json.data);
            if (json.pagination) setPagination(json.pagination);
          },
        }
      );

      if (result?.data) setContacts(result.data);
      if (result?.pagination) setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, isDecisionMaker, isPrimary, page, limit]);

  useEffect(() => {
    if (!selectedContactId) {
      setContactDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/crm/contacts/${selectedContactId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setContactDetail(json.data);
      })
      .catch((err) => console.error('Failed to load contact detail:', err))
      .finally(() => setLoadingDetail(false));
  }, [selectedContactId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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
              <span>CRM • Stakeholder & Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hero-title-interactive">
              Corporate Contacts Directory
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hero-subtitle-interactive">
              Unified directory of corporate decision-makers, procurement officers, and primary business points of contact.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 interactive-btn-hover"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-growth-teal transition-colors">Total Contacts</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-growth-teal transition-colors" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1.5 group-hover:text-growth-teal transition-colors">{pagination.total || contacts.length}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Corporate profiles</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Decision Makers</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1.5">{contacts.filter((c) => c.isDecisionMaker).length}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Executive authority</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-growth-teal">
            <span className="text-[10px] font-black uppercase tracking-wider text-growth-teal">Primary Points</span>
            <UserCheck className="w-4 h-4 text-growth-teal" />
          </div>
          <p className="text-2xl font-black text-growth-teal font-mono mt-1.5">{contacts.filter((c) => c.isPrimary).length}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Main client liaison</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm interactive-box-hover group">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Corporate Accounts</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{contacts.filter((c) => c.client).length}</p>
          <span className="text-[11px] text-slate-500 font-semibold">Linked to clients</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm panel-premium">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by contact name, email or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-growth-teal focus:ring-1 focus:ring-growth-teal transition-all"
            />
          </div>

          <select
            value={isDecisionMaker}
            onChange={(e) => {
              setIsDecisionMaker(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Roles</option>
            <option value="true">Decision Makers Only</option>
            <option value="false">Non-Decision Makers</option>
          </select>

          <select
            value={isPrimary}
            onChange={(e) => {
              setIsPrimary(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Contacts</option>
            <option value="true">Primary Only</option>
            <option value="false">Secondary Only</option>
          </select>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchContacts();
            }}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm panel-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Contact ID</th>
                <th className="py-3 px-4">Contact Name</th>
                <th className="py-3 px-4">Role & Dept</th>
                <th className="py-3 px-4">Organization / Lead</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                      <p className="text-xs">Loading contact directory...</p>
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">No Contacts Found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        No contacts match the selected criteria. Create a new corporate contact to begin managing client and lead relations.
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-md transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add First Contact</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className="interactive-row-hover hover:bg-teal-50/20 transition-colors text-slate-700 cursor-pointer group border-b border-slate-100"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-growth-teal group-hover:underline">
                      {c.contactNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-growth-teal transition-colors">
                        {c.fullName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 font-semibold">{c.designation || 'Key Contact'}</div>
                      {c.department && (
                        <div className="text-[11px] text-slate-500">{c.department}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.client ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{c.client.companyName}</span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">({c.client.clientId})</span>
                        </div>
                      ) : c.lead ? (
                        <Link
                          href={`/growthIndia/crm/leads/${c.lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-growth-teal hover:underline font-medium"
                        >
                          <span>Lead: {c.lead.companyName || c.lead.fullName}</span>
                          <span className="font-mono text-[10px] text-slate-400">({c.lead.leadNumber})</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Independent</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {c.isDecisionMaker && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                            Decision Maker
                          </span>
                        )}
                        {c.isPrimary && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 border border-teal-200 text-growth-teal">
                            Primary
                          </span>
                        )}
                        {!c.isDecisionMaker && !c.isPrimary && (
                          <span className="text-[11px] text-slate-400 font-medium">Standard</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{contacts.length}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> contacts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Interaction History Drawer */}
      {selectedContactId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {contactDetail?.contactNumber || 'Contact'}
                  </span>
                  {contactDetail?.isDecisionMaker && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Decision Maker
                    </span>
                  )}
                  {contactDetail?.isPrimary && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-growth-teal border border-teal-200">
                      Primary
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1.5">
                  {contactDetail?.fullName || 'Contact Profile'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {contactDetail?.designation || 'Key Contact'} {contactDetail?.department ? `• ${contactDetail.department}` : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedContactId(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                <p className="text-xs text-slate-400 font-medium">Loading interaction timeline...</p>
              </div>
            ) : !contactDetail ? (
              <div className="text-center py-12 text-slate-400 text-xs">Failed to load contact intelligence.</div>
            ) : (
              <div className="space-y-6 flex-1">
                {/* Organization Link & Contact Info */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Relationship
                  </div>
                  {contactDetail.client ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Client Account:</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-growth-teal" />
                        {contactDetail.client.companyName} ({contactDetail.client.clientId})
                      </span>
                    </div>
                  ) : contactDetail.lead ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Inbound Lead:</span>
                      <span className="font-bold text-growth-teal flex items-center gap-1.5">
                        {contactDetail.lead.companyName || contactDetail.lead.fullName} ({contactDetail.lead.leadNumber})
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Independent Contact</div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Phone</span>
                      <span className="font-mono text-slate-800 font-medium">{contactDetail.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Email</span>
                      <span className="font-mono text-slate-800 font-medium truncate block">{contactDetail.email || 'N/A'}</span>
                    </div>
                  </div>

                  {contactDetail.notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Notes</span>
                      <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{contactDetail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Interaction History Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-growth-teal" />
                      Complete Interaction History
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {(contactDetail.activities?.length || 0) + (contactDetail.followUps?.length || 0)} Events
                    </span>
                  </div>

                  {/* Combined Timeline */}
                  <div className="space-y-3">
                    {/* Follow-ups */}
                    {contactDetail.followUps && contactDetail.followUps.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase text-amber-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" /> Follow-ups
                        </div>
                        {contactDetail.followUps.map((flw: any) => (
                          <div
                            key={flw.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{flw.title}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                                  flw.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {flw.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Scheduled: {new Date(flw.scheduledAt).toLocaleString()} • Assigned: {flw.assignedTo?.fullName || 'N/A'}
                            </div>
                            {flw.remarks && <p className="text-slate-600 text-[11px]">{flw.remarks}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Activities */}
                    {contactDetail.activities && contactDetail.activities.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase text-growth-teal flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Logged Activities
                        </div>
                        {contactDetail.activities.map((act: any) => (
                          <div
                            key={act.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-growth-teal font-mono font-bold">
                                  {act.type}
                                </span>
                                {act.subject}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(act.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {act.description && <p className="text-slate-600 text-[11px]">{act.description}</p>}
                            <div className="text-[10px] text-slate-400 font-mono">
                              Logged by: {act.performedBy?.fullName || 'System'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      contactDetail.followUps?.length === 0 && (
                        <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                          No logged calls, meetings, emails, or follow-ups recorded for this contact yet.
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateContactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchContacts()}
      />
    </div>
  );
};
