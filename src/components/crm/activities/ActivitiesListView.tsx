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
} from 'lucide-react';

export const ActivitiesListView: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filtered = activities.filter((act) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
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
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'NOTE':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'STAGE_CHANGE':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case 'TASK':
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const colors: Record<string, string> = {
      CALL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      EMAIL: 'bg-blue-50 text-blue-700 border-blue-200',
      MEETING: 'bg-purple-50 text-purple-700 border-purple-200',
      NOTE: 'bg-amber-50 text-amber-700 border-amber-200',
      STAGE_CHANGE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      TASK: 'bg-teal-50 text-teal-700 border-teal-200',
      FOLLOW_UP: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm panel-premium">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl kpi-icon-container">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 title-interactive-hover">CRM Activities & Touchpoints</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5 subtitle-interactive-hover">
              Live chronological stream of calls, emails, meetings, and stage changes
            </p>
          </div>
        </div>

        <button
          onClick={fetchActivities}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 interactive-btn-hover"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between panel-premium">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity, entity, personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['ALL', 'CALL', 'EMAIL', 'MEETING', 'NOTE', 'STAGE_CHANGE', 'TASK'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all crm-filter-pill ${
                filterType === type
                  ? 'bg-purple-700 text-white shadow-sm active-pill'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'STAGE_CHANGE' ? 'Stage Changes' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 panel-premium">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
            Loading activities timeline...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No activities recorded yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Calls, meetings, emails, and follow-ups will show here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all interactive-row-hover"
              >
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                  {getActivityIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getActivityBadge(
                          act.type
                        )}`}
                      >
                        {act.type}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {act.title || act.type}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(act.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{act.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    {act.lead && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <User className="w-3 h-3 text-purple-600" />
                        Lead: {act.lead.fullName} ({act.lead.leadNumber})
                      </span>
                    )}
                    {act.contact && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <User className="w-3 h-3 text-blue-600" />
                        Contact: {act.contact.fullName}
                      </span>
                    )}
                    {act.deal && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        Deal: {act.deal.title}
                      </span>
                    )}
                    {act.client && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        Client: {act.client.companyName}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
