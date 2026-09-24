'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  TrendingUp,
  Users,
  Target,
  ArrowRight,
  RefreshCw,
  Plus,
  Globe,
  Share2,
  PhoneCall,
  Mail,
  Linkedin,
  Megaphone,
  Layers,
  ChevronRight,
  CheckCircle2,
  X,
  Power,
} from 'lucide-react';
import { LEAD_SOURCES, LeadSource } from '@/lib/constants/crm';

interface SourceStat {
  source: string;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  lostLeads: number;
  pipelineValue: number;
  wonRevenue: number;
  conversionRate: number;
  isEnabled?: boolean;
}

interface LeadSourcesViewProps {
  onNavigateToLeadsWithSource?: (source: string) => void;
  onSelectLead?: (id: string) => void;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  WEBSITE: <Globe className="w-4 h-4 text-teal-600" />,
  REFERRAL: <Share2 className="w-4 h-4 text-emerald-600" />,
  COLD_CALL: <PhoneCall className="w-4 h-4 text-blue-600" />,
  EMAIL: <Mail className="w-4 h-4 text-amber-600" />,
  LINKEDIN: <Linkedin className="w-4 h-4 text-sky-600" />,
  ADVERTISEMENT: <Megaphone className="w-4 h-4 text-orange-600" />,
  CAMPAIGN: <Target className="w-4 h-4 text-rose-600" />,
  MANUAL: <Users className="w-4 h-4 text-slate-600" />,
  OTHER: <Layers className="w-4 h-4 text-slate-500" />,
};

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  WEBSITE: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', bar: 'bg-teal-500' },
  REFERRAL: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  COLD_CALL: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' },
  EMAIL: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
  LINKEDIN: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', bar: 'bg-sky-500' },
  ADVERTISEMENT: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
  CAMPAIGN: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500' },
  MANUAL: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', bar: 'bg-slate-500' },
  OTHER: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', bar: 'bg-slate-400' },
};

export const LeadSourcesView: React.FC<LeadSourcesViewProps> = ({
  onNavigateToLeadsWithSource,
}) => {
  const [sources, setSources] = useState<SourceStat[]>([]);
  const [enabledState, setEnabledState] = useState<Record<string, boolean>>({});
  const [summary, setSummary] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    totalPipelineValue: 0,
    totalWonRevenue: 0,
    overallConversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'total' | 'conversion' | 'revenue'>('total');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Add source modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('WEBSITE');
  const [newSourceDesc, setNewSourceDesc] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchSourceData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/lead-sources');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const fetchedSources: SourceStat[] = json.data.sources || [];
          setSources(fetchedSources);
          setSummary(json.data.summary || {});

          // Default all to enabled initially if not set
          const initialEnabled: Record<string, boolean> = {};
          fetchedSources.forEach((s) => {
            initialEnabled[s.source] = true;
          });
          setEnabledState((prev) => ({ ...initialEnabled, ...prev }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch lead sources analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourceData();
  }, [fetchSourceData]);

  const toggleSourceEnabled = (sourceName: string) => {
    setEnabledState((prev) => {
      const newState = !prev[sourceName];
      showToast(`Lead Source "${sourceName.replace(/_/g, ' ')}" is now ${newState ? 'Enabled' : 'Disabled'}`);
      return { ...prev, [sourceName]: newState };
    });
  };

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;

    const formattedKey = newSourceName.trim().toUpperCase().replace(/\s+/g, '_');
    const newEntry: SourceStat = {
      source: formattedKey,
      totalLeads: 0,
      newLeads: 0,
      contactedLeads: 0,
      qualifiedLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      pipelineValue: 0,
      wonRevenue: 0,
      conversionRate: 0,
      isEnabled: true,
    };

    setSources([newEntry, ...sources]);
    setEnabledState((prev) => ({ ...prev, [formattedKey]: true }));
    setIsAddModalOpen(false);
    setNewSourceName('');
    setNewSourceDesc('');
    showToast(`Lead Source "${newSourceName}" created and enabled.`);
  };

  // Sort logic
  const sortedSources = [...sources].sort((a, b) => {
    if (sortBy === 'conversion') return b.conversionRate - a.conversionRate;
    if (sortBy === 'revenue') return b.wonRevenue - a.wonRevenue;
    return b.totalLeads - a.totalLeads;
  });

  return (
    <div className="space-y-6 pb-16 font-sans select-none text-slate-800">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-lg border border-teal-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Lead Acquisition Sources
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Manage acquisition channels (Website, LinkedIn, Referral, Cold Call, Campaign, Ads), configure tracking, and enable or disable sources.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSourceData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Sources"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Top Aggregation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Inbound</span>
          <p className="text-xl font-bold text-slate-900 font-mono mt-1">{summary.totalLeads}</p>
          <span className="text-[11px] text-slate-500 font-medium">All monitored channels</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Qualified Leads</span>
          <p className="text-xl font-bold text-teal-700 font-mono mt-1">{summary.qualifiedLeads}</p>
          <span className="text-[11px] text-teal-600 font-medium">Passed scoring criteria</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Converted Clients</span>
          <p className="text-xl font-bold text-emerald-700 font-mono mt-1">{summary.convertedLeads}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Closed deals</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg Conv. Rate</span>
          <p className="text-xl font-bold text-indigo-700 font-mono mt-1">{summary.overallConversionRate}%</p>
          <span className="text-[11px] text-slate-500 font-medium">Channel efficiency</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Won Revenue</span>
          <p className="text-lg font-bold text-slate-900 font-mono mt-1 truncate">₹{summary.totalWonRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-slate-500 font-medium">Realized contract value</span>
        </div>
      </div>

      {/* Sorting bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-900">
          Configured Channels ({sources.length})
        </span>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Sort:</span>
          <button
            type="button"
            onClick={() => setSortBy('total')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'total' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => setSortBy('conversion')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'conversion' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Conversion Rate
          </button>
          <button
            type="button"
            onClick={() => setSortBy('revenue')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sortBy === 'revenue' ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Won Revenue
          </button>
        </div>
      </div>

      {/* Grid of Sources Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs font-semibold">Aggregating lead source performance...</p>
          </div>
        ) : (
          sortedSources.map((item) => {
            const conf = SOURCE_COLORS[item.source] || SOURCE_COLORS.OTHER;
            const icon = SOURCE_ICONS[item.source] || SOURCE_ICONS.OTHER;
            const volumePercent = summary.totalLeads > 0 ? Math.round((item.totalLeads / summary.totalLeads) * 100) : 0;
            const isEnabled = enabledState[item.source] !== false;

            return (
              <div
                key={item.source}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all relative flex flex-col justify-between ${
                  !isEnabled ? 'opacity-60 bg-slate-50/70 border-slate-200' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${conf.bg} ${conf.border}`}>
                        {icon}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">
                          {item.source.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          {volumePercent}% total volume
                        </p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSourceEnabled(item.source)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                        title={isEnabled ? 'Click to Disable Source' : 'Click to Enable Source'}
                      >
                        <Power className="w-2.5 h-2.5" />
                        <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Volume share bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Volume</span>
                      <span className="font-mono text-slate-800">{item.totalLeads} Leads ({item.conversionRate}% Conv.)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${conf.bar}`}
                        style={{ width: `${Math.min(volumePercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Funnel Metrics */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-slate-50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">New</span>
                      <span className="font-bold text-slate-800 font-mono mt-0.5 block">{item.newLeads}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-orange-50/60">
                      <span className="text-[9px] uppercase font-bold text-orange-600 block">Contacted</span>
                      <span className="font-bold text-orange-800 font-mono mt-0.5 block">{item.contactedLeads}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-teal-50/60">
                      <span className="text-[9px] uppercase font-bold text-teal-600 block">Qualified</span>
                      <span className="font-bold text-teal-800 font-mono mt-0.5 block">{item.qualifiedLeads}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50">
                      <span className="text-[9px] uppercase font-bold text-emerald-600 block">Won</span>
                      <span className="font-bold text-emerald-800 font-mono mt-0.5 block">{item.convertedLeads}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Won Revenue</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      ₹{item.wonRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {onNavigateToLeadsWithSource && (
                    <button
                      type="button"
                      onClick={() => onNavigateToLeadsWithSource(item.source)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      View Leads →
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Lead Source Modal (Clean Light Theme) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Lead Source Channel</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure a new inbound or outbound lead origin</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Source Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Partner Portal, Trade Expo 2026"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category / Type</label>
                <select
                  value={newSourceCategory}
                  onChange={(e) => setNewSourceCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                >
                  <option value="WEBSITE">Website Inbound</option>
                  <option value="LINKEDIN">LinkedIn & Social</option>
                  <option value="REFERRAL">Client Referral</option>
                  <option value="COLD_CALL">Outbound Cold Call</option>
                  <option value="CAMPAIGN">Marketing Campaign</option>
                  <option value="ADVERTISEMENT">Digital Advertising</option>
                  <option value="OTHER">Other Partner Channel</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={newSourceDesc}
                  onChange={(e) => setNewSourceDesc(e.target.value)}
                  placeholder="Tracking parameters, UTM tags, or campaign details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                >
                  Create & Enable Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
