'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Building2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Trash2,
  Edit2,
  ExternalLink,
  Briefcase,
  AlertCircle,
  X,
} from 'lucide-react';
import { OpportunityItem } from '@/types/crm';
import {
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_CONFIG,
  OpportunityStage,
} from '@/lib/constants/crm';

import { clientCache } from '@/lib/client-cache';

interface OpportunitiesListViewProps {
  onSelectOpportunity?: (id: string) => void;
  onCreateDealFromOpp?: (opp: OpportunityItem) => void;
}

export const OpportunitiesListView: React.FC<OpportunitiesListViewProps> = ({
  onSelectOpportunity,
  onCreateDealFromOpp,
}) => {
  const cachedOpps = clientCache.get<OpportunityItem[]>('crm_opportunities_list', 15 * 60 * 1000);
  const cachedLeads = clientCache.get<any[]>('crm_leads_dropdown', 15 * 60 * 1000);
  const cachedClients = clientCache.get<any[]>('crm_clients_list', 15 * 60 * 1000);
  const cachedEmps = clientCache.get<any[]>('admin_employees_list', 15 * 60 * 1000);

  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() => cachedOpps || []);
  const [loading, setLoading] = useState(() => !cachedOpps);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    stage: 'PROSPECTING',
    probability: '20',
    productService: '',
    competitor: '',
    expectedCloseDate: '',
    leadId: '',
    clientId: '',
    assignedToId: '',
  });

  // Supporting data for dropdowns
  const [leads, setLeads] = useState<any[]>(() => cachedLeads || []);
  const [clients, setClients] = useState<any[]>(() => cachedClients || []);
  const [employees, setEmployees] = useState<any[]>(() => cachedEmps || []);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchOpportunities(false);
    fetchSupportingData(false);
  }, [refreshKey]);

  const fetchOpportunities = async (forceRefresh = false) => {
    const cached = !forceRefresh ? clientCache.get<OpportunityItem[]>('crm_opportunities_list', 15 * 60 * 1000) : null;
    if (!cached) setLoading(true);

    try {
      const result = await clientCache.swrFetch(
        'crm_opportunities_list',
        async () => {
          const res = await fetch('/api/crm/opportunities');
          if (!res.ok) throw new Error('Failed to load opportunities');
          const json = await res.json();
          return json.data || [];
        },
        {
          forceRefresh,
          onUpdate: (fresh) => setOpportunities(fresh),
        }
      );
      if (result) setOpportunities(result);
    } catch (e) {
      console.error('Failed to load opportunities:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportingData = async (forceRefresh = false) => {
    try {
      clientCache.swrFetch('crm_leads_dropdown', async () => {
        const res = await fetch('/api/crm/leads?take=100');
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      }, { forceRefresh, onUpdate: (data) => setLeads(data) }).then(data => data && setLeads(data));

      clientCache.swrFetch('crm_clients_list', async () => {
        const res = await fetch('/api/clients');
        if (!res.ok) return [];
        const data = await res.json();
        return data.clients || [];
      }, { forceRefresh, onUpdate: (data) => setClients(data) }).then(data => data && setClients(data));

      clientCache.swrFetch('admin_employees_list', async () => {
        const res = await fetch('/api/employees');
        if (!res.ok) return [];
        const data = await res.json();
        return (data.employees || []).filter((e: any) => e.employeeId !== 'GI-EMP-000001');
      }, { forceRefresh, onUpdate: (data) => setEmployees(data) }).then(data => data && setEmployees(data));
    } catch (e) {
      console.error('Error fetching supporting data:', e);
    }
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (selectedStage && opp.stage !== selectedStage) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNum = opp.opportunityNumber?.toLowerCase().includes(q);
        const matchesTitle = opp.title?.toLowerCase().includes(q);
        const matchesCompany =
          opp.client?.companyName?.toLowerCase().includes(q) ||
          opp.lead?.companyName?.toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesCompany) return false;
      }
      return true;
    });
  }, [opportunities, selectedStage, searchQuery]);

  const totalValue = useMemo(() => {
    return opportunities.reduce((acc, o) => acc + (o.value || 0), 0);
  }, [opportunities]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        value: parseFloat(formData.value) || 0,
        stage: formData.stage,
        probability: parseInt(formData.probability, 10) || 20,
        productService: formData.productService,
        competitor: formData.competitor,
        expectedCloseDate: formData.expectedCloseDate || null,
        leadId: formData.leadId || undefined,
        clientId: formData.clientId || undefined,
        assignedToId: formData.assignedToId || undefined,
      };

      const res = await fetch('/api/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          description: '',
          value: '',
          stage: 'PROSPECTING',
          probability: '20',
          productService: '',
          competitor: '',
          expectedCloseDate: '',
          leadId: '',
          clientId: '',
          assignedToId: '',
        });
        setRefreshKey((k) => k + 1);
      } else {
        setErrorMsg(data.error || 'Failed to create opportunity');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Are you sure you want to delete opportunity ${num}?`)) return;
    try {
      const res = await fetch(`/api/crm/opportunities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete opportunity');
      }
    } catch (e) {
      console.error('Delete failed:', e);
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
              <span>CRM • Sales Exploration & Proposals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hero-title-interactive">
              Enterprise Opportunities
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hero-subtitle-interactive">
              Track qualified leads moving through discovery, pitch proposals, commercial preparation, and closed business.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 interactive-btn-hover"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 interactive-btn-hover"
            >
              <Plus className="w-4 h-4" />
              <span>New Opportunity</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Total Opportunities</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1.5 group-hover:text-growth-teal transition-colors">{opportunities.length}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Active & closed in portfolio</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-growth-teal uppercase tracking-wider">Total Estimated Value</div>
          <div className="text-2xl font-black text-growth-teal font-mono mt-1.5">₹{totalValue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Gross prospective volume</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Closed Won</div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1.5">
            {opportunities.filter((o) => o.stage === 'CLOSED_WON').length}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Successfully realized</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm panel-premium">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, number, or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-growth-teal focus:ring-1 focus:ring-growth-teal transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:bg-white focus:outline-none focus:border-growth-teal transition-all"
          >
            <option value="">All Stages</option>
            {OPPORTUNITY_STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm panel-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Opportunity</th>
                <th className="py-3.5 px-4">Organization / Lead</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Value</th>
                <th className="py-3.5 px-4">Probability</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4">Expected Close</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                      <p className="text-xs">Loading commercial opportunities...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No opportunities found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const stageCfg =
                    OPPORTUNITY_STAGE_CONFIG[opp.stage as OpportunityStage] || {
                      label: opp.stage,
                      color: 'text-slate-700',
                    };
                  const companyName =
                    opp.client?.companyName || opp.lead?.companyName || 'Unlinked Account';
                  const isClient = !!opp.client;

                  const getStageBadge = (stage: string) => {
                    switch (stage) {
                      case 'CLOSED_WON':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'CLOSED_LOST':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'PROPOSAL':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'NEGOTIATION':
                        return 'bg-purple-50 text-purple-700 border-purple-200';
                      default:
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                    }
                  };

                  return (
                    <tr
                      key={opp.id}
                      className="interactive-row-hover hover:bg-teal-50/20 transition-colors group cursor-pointer border-b border-slate-100"
                      onClick={() => onSelectOpportunity?.(opp.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-growth-teal font-bold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            {opp.opportunityNumber}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-growth-teal transition-colors truncate max-w-xs">{opp.title}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{companyName}</span>
                          {isClient && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-50 text-growth-teal border border-teal-200 rounded">
                              CLIENT
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getStageBadge(opp.stage)}`}>
                          {stageCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-xs">
                        ₹{(opp.value || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-growth-teal rounded-full"
                              style={{ width: `${opp.probability || 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">{opp.probability}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {opp.assignedTo?.fullName || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {opp.expectedCloseDate
                          ? new Date(opp.expectedCloseDate).toLocaleDateString('en-IN')
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onCreateDealFromOpp && (
                            <button
                              onClick={() => onCreateDealFromOpp(opp)}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 text-growth-teal hover:bg-growth-teal hover:text-white border border-teal-200 transition-all"
                              title="Create Commercial Deal"
                            >
                              + Deal
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(opp.id, opp.opportunityNumber)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Opportunity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE OPPORTUNITY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create New Opportunity</h3>
                  <p className="text-xs text-slate-400">Add sales prospecting or pitch opportunity</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Opportunity Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FY26 Staffing Expansion - 50 Associates"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link to Qualified Lead
                  </label>
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value, clientId: '' })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None / Select Lead</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.companyName} ({l.leadNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Or Link to Existing Client
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value, leadId: '' })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None / Select Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.clientId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estimated Value (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="500000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => {
                      const st = e.target.value as OpportunityStage;
                      const defProb = OPPORTUNITY_STAGE_CONFIG[st]?.defaultProbability ?? 20;
                      setFormData({ ...formData, stage: st, probability: String(defProb) });
                    }}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {OPPORTUNITY_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product / Service</label>
                  <input
                    type="text"
                    placeholder="e.g. Manpower Staffing / Payroll Outsourcing"
                    value={formData.productService}
                    onChange={(e) => setFormData({ ...formData, productService: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Key Competitor</label>
                  <input
                    type="text"
                    placeholder="e.g. TeamLease / Quess"
                    value={formData.competitor}
                    onChange={(e) => setFormData({ ...formData, competitor: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Sales Owner</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Scope Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on client requirements, initial discussion points..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
