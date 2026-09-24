'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Phone,
  Mail,
  Calendar,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Building2,
  User,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

interface ActivitiesListViewProps {
  initialClientId?: string;
}

export const ActivitiesListView: React.FC<ActivitiesListViewProps> = ({ initialClientId }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Log Activity Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    type: 'CALL',
    subject: '',
    description: '',
    durationMinutes: 15,
    scheduledAt: '',
    status: 'COMPLETED',
    leadId: '',
    clientId: initialClientId || '',
    dealId: '',
  });

  // Dropdown resources
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterType === 'ALL' ? '/api/crm/activities' : `/api/crm/activities?type=${filterType}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data || []);
      }
    } catch (e) {
      console.error('Error fetching activities:', e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    // Load supporting dropdown data for the modal
    const loadDropdowns = async () => {
      try {
        const [resLeads, resClients, resDeals] = await Promise.all([
          fetch('/api/crm/leads?take=50').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
          fetch('/api/clients').then((r) => (r.ok ? r.json() : { clients: [] })).catch(() => ({ clients: [] })),
          fetch('/api/crm/deals').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
        ]);
        if (resLeads.data) setLeads(resLeads.data);
        if (resClients.clients) setClients(resClients.clients);
        if (resDeals.data) setDeals(resDeals.data);
      } catch (err) {
        console.error('Failed to load activity dropdown resources:', err);
      }
    };
    loadDropdowns();
  }, []);

  const handleLogActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          subject: formData.subject,
          description: formData.description,
          durationMinutes: Number(formData.durationMinutes) || 0,
          scheduledAt: formData.scheduledAt || null,
          completedAt: formData.status === 'COMPLETED' ? new Date().toISOString() : null,
          status: formData.status,
          leadId: formData.leadId || null,
          clientId: formData.clientId || null,
          dealId: formData.dealId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowLogModal(false);
        setFormData({
          type: 'CALL',
          subject: '',
          description: '',
          durationMinutes: 15,
          scheduledAt: '',
          status: 'COMPLETED',
          leadId: '',
          clientId: '',
          dealId: '',
        });
        fetchActivities();
      } else {
        setErrorMsg(data.error || 'Failed to log activity.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = activities.filter((act) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      act.subject?.toLowerCase().includes(term) ||
      act.title?.toLowerCase().includes(term) ||
      act.description?.toLowerCase().includes(term) ||
      act.lead?.fullName?.toLowerCase().includes(term) ||
      act.contact?.fullName?.toLowerCase().includes(term) ||
      act.client?.companyName?.toLowerCase().includes(term) ||
      act.deal?.title?.toLowerCase().includes(term) ||
      act.performedBy?.fullName?.toLowerCase().includes(term)
    );
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-sky-600" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4 text-[#0D9488]" />;
      case 'FOLLOW_UP':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'NOTE':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'STAGE_CHANGE':
        return <Sparkles className="w-4 h-4 text-orange-500" />;
      case 'TASK':
        return <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const colors: Record<string, string> = {
      CALL: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      EMAIL: 'bg-sky-50 text-sky-800 border-sky-200',
      MEETING: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/30',
      FOLLOW_UP: 'bg-amber-50 text-amber-800 border-amber-200',
      NOTE: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      STAGE_CHANGE: 'bg-orange-50 text-orange-800 border-orange-200',
      TASK: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/30',
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0D9488]/10 text-[#0D9488] rounded-xl border border-[#0D9488]/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">CRM Activities & Timeline</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Unified chronological tracking of calls, emails, meetings, follow-ups, notes, and tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setShowLogModal(true);
              setErrorMsg('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] hover:bg-[#115E59] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity, entity, personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0D9488] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'NOTE', 'TASK', 'STAGE_CHANGE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'STAGE_CHANGE' ? 'Stage Changes' : type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0D9488]" />
            Loading activities timeline...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No activities recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Calls, meetings, emails, follow-ups, and tasks will show here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((act) => {
              const displaySubject = act.subject || act.title || act.type;

              return (
                <div
                  key={act.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-[#0D9488]/30 hover:bg-[#F0FDFA] transition-all"
                >
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                    {getActivityIcon(act.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActivityBadge(
                            act.type
                          )}`}
                        >
                          {act.type.replace(/_/g, ' ')}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {displaySubject}
                        </h3>
                        {act.status && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                            act.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {act.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(act.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {act.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{act.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                      {act.lead && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3 h-3 text-[#0D9488]" />
                          Lead: <span className="font-semibold text-slate-800">{act.lead.fullName} ({act.lead.leadNumber})</span>
                        </span>
                      )}
                      {act.contact && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3 h-3 text-slate-500" />
                          Contact: <span className="font-semibold text-slate-800">{act.contact.fullName}</span>
                        </span>
                      )}
                      {act.deal && (
                        <span className="flex items-center gap-1 text-[#0D9488] font-medium">
                          <Building2 className="w-3 h-3 text-[#0D9488]" />
                          Deal: <span className="font-semibold text-slate-900">{act.deal.title}</span>
                        </span>
                      )}
                      {act.client && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Building2 className="w-3 h-3 text-[#0D9488]" />
                          Client: <span className="font-semibold text-slate-800">{act.client.companyName}</span>
                        </span>
                      )}
                      {act.performedBy && (
                        <span className="ml-auto text-slate-400 font-normal">
                          by <span className="font-semibold text-slate-700">{act.performedBy.fullName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log CRM Activity</h3>
                  <p className="text-xs text-slate-500 font-medium">Record a call, meeting, follow-up, note, or task</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogActivitySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="NOTE">Note</option>
                    <option value="TASK">Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending / Scheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discovery call on workforce software requirements"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="15"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled / Due Date</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Lead</label>
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">None</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.companyName || l.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Deal</label>
                  <select
                    value={formData.dealId}
                    onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">None</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.dealNumber} — {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Discussion Notes</label>
                <textarea
                  rows={3}
                  placeholder="Key discussion points, outcome, next steps..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D9488] hover:bg-[#115E59] text-white transition-all shadow-md shadow-[#0D9488]/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
