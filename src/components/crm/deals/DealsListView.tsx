'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  TrendingUp,
  DollarSign,
  User,
  Calendar,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { DealItem } from '@/types/crm';
import {
  DEAL_STAGES,
  DEAL_STAGE_CONFIG,
  DealStage,
  DEAL_STAGE_DEFAULT_PROBABILITIES,
  PROPOSAL_STATUSES,
  WON_REASONS,
  LOST_REASONS,
} from '@/lib/constants/crm';

interface DealsListViewProps {
  onSelectDeal?: (id: string) => void;
  onOpenPipeline?: () => void;
  initialLeadId?: string;
  initialOpportunityId?: string;
  initialOpenCreateModal?: boolean;
}

import { clientCache } from '@/lib/client-cache';

export const DealsListView: React.FC<DealsListViewProps> = ({
  onSelectDeal,
  onOpenPipeline,
  initialLeadId,
  initialOpportunityId,
  initialOpenCreateModal,
}) => {
  const cachedDeals = clientCache.get<DealItem[]>('crm_deals_list', 15 * 60 * 1000);
  const cachedOpps = clientCache.get<any[]>('crm_opportunities_list', 15 * 60 * 1000);
  const cachedLeads = clientCache.get<any[]>('crm_leads_dropdown', 15 * 60 * 1000);
  const cachedClients = clientCache.get<any[]>('crm_clients_list', 15 * 60 * 1000);
  const cachedEmps = clientCache.get<any[]>('admin_employees_list', 15 * 60 * 1000);

  const [deals, setDeals] = useState<DealItem[]>(() => cachedDeals || []);
  const [loading, setLoading] = useState(() => !cachedDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialOpenCreateModal);
  const [wonModalDeal, setWonModalDeal] = useState<DealItem | null>(null);
  const [lostModalDeal, setLostModalDeal] = useState<DealItem | null>(null);
  const [convertModalDeal, setConvertModalDeal] = useState<DealItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    stage: 'NEW',
    probability: '10',
    proposalStatus: 'NOT_REQUIRED',
    productService: '',
    competitor: '',
    expectedCloseDate: '',
    terms: '',
    opportunityId: '',
    leadId: '',
    clientId: '',
    assignedToId: '',
  });

  const [wonReason, setWonReason] = useState<string>(WON_REASONS[0]);
  const [wonNotes, setWonNotes] = useState('');
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [convertStatus, setConvertStatus] = useState<any>(null);

  // Dropdown resources
  const [opportunities, setOpportunities] = useState<any[]>(() => cachedOpps || []);
  const [leads, setLeads] = useState<any[]>(() => cachedLeads || []);
  const [clients, setClients] = useState<any[]>(() => cachedClients || []);
  const [employees, setEmployees] = useState<any[]>(() => cachedEmps || []);

  useEffect(() => {
    fetchDeals(false);
    fetchSupportingData(false);
  }, [refreshKey]);

  useEffect(() => {
    if (initialOpenCreateModal) {
      setIsCreateModalOpen(true);
    }
    if (initialLeadId) {
      setFormData((prev) => ({ ...prev, leadId: initialLeadId }));
    }
    if (initialOpportunityId) {
      setFormData((prev) => ({ ...prev, opportunityId: initialOpportunityId }));
    }
  }, [initialOpenCreateModal, initialLeadId, initialOpportunityId]);

  const fetchDeals = async (forceRefresh = false) => {
    const cached = !forceRefresh ? clientCache.get<DealItem[]>('crm_deals_list', 15 * 60 * 1000) : null;
    if (!cached) setLoading(true);

    try {
      const result = await clientCache.swrFetch(
        'crm_deals_list',
        async () => {
          const res = await fetch('/api/crm/deals');
          if (!res.ok) throw new Error('Failed to load deals');
          const json = await res.json();
          return json.data || [];
        },
        {
          forceRefresh,
          onUpdate: (freshDeals) => setDeals(freshDeals),
        }
      );
      if (result) setDeals(result);
    } catch (e) {
      console.error('Failed to load deals:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportingData = async (forceRefresh = false) => {
    try {
      clientCache.swrFetch('crm_opportunities_list', async () => {
        const res = await fetch('/api/crm/opportunities');
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      }, { forceRefresh, onUpdate: (data) => setOpportunities(data) }).then(data => data && setOpportunities(data));

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
      console.error('Error loading supporting data:', e);
    }
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (selectedStage && deal.stage !== selectedStage) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNum = deal.dealNumber?.toLowerCase().includes(q);
        const matchesTitle = deal.title?.toLowerCase().includes(q);
        const matchesCompany =
          deal.client?.companyName?.toLowerCase().includes(q) ||
          deal.lead?.companyName?.toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesCompany) return false;
      }
      return true;
    });
  }, [deals, selectedStage, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalPipeline = 0;
    let weightedPipeline = 0;
    let wonRevenue = 0;
    let wonCount = 0;
    let totalClosed = 0;

    deals.forEach((d) => {
      const amt = d.amount || 0;
      const weighted = d.weightedValue ?? (amt * (d.probability || 0)) / 100;
      if (d.stage === 'WON') {
        wonRevenue += amt;
        wonCount += 1;
        totalClosed += 1;
      } else if (d.stage === 'LOST') {
        totalClosed += 1;
      } else {
        totalPipeline += amt;
        weightedPipeline += weighted;
      }
    });

    return {
      totalPipeline,
      weightedPipeline,
      wonRevenue,
      winRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
      activeCount: deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST').length,
    };
  }, [deals]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        title: formData.title,
        amount: parseFloat(formData.amount) || 0,
        stage: formData.stage,
        probability: parseInt(formData.probability, 10) || 10,
        proposalStatus: formData.proposalStatus,
        productService: formData.productService,
        competitor: formData.competitor,
        terms: formData.terms,
        expectedCloseDate: formData.expectedCloseDate || null,
        opportunityId: formData.opportunityId || undefined,
        leadId: formData.leadId || undefined,
        clientId: formData.clientId || undefined,
        assignedToId: formData.assignedToId || undefined,
      };

      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          amount: '',
          stage: 'NEW',
          probability: '10',
          proposalStatus: 'NOT_REQUIRED',
          productService: '',
          competitor: '',
          expectedCloseDate: '',
          terms: '',
          opportunityId: '',
          leadId: '',
          clientId: '',
          assignedToId: '',
        });
        setRefreshKey((k) => k + 1);
      } else {
        setErrorMsg(data.error || 'Failed to create deal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkWonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wonModalDeal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${wonModalDeal.id}/won`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wonReason, closingNotes: wonNotes }),
      });
      if (res.ok) {
        setWonModalDeal(null);
        setWonNotes('');
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to mark deal as won');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalDeal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${lostModalDeal.id}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lostReason, closingNotes: lostNotes }),
      });
      if (res.ok) {
        setLostModalDeal(null);
        setLostNotes('');
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to mark deal as lost');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToClient = async (deal: DealItem, forceNew = false) => {
    setSubmitting(true);
    setConvertStatus(null);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/convert-to-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmCreateNew: forceNew }),
      });
      const data = await res.json();
      if (res.ok) {
        setConvertStatus(data);
        setRefreshKey((k) => k + 1);
      } else if (res.status === 409 && data.duplicateFound) {
        setConvertStatus({ duplicateFound: true, candidate: data.candidate, message: data.message });
      } else {
        setErrorMsg(data.error || 'Failed to convert to client.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error during client conversion.');
    } finally {
      setSubmitting(false);
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
              <span>CRM • Commercial Contracts & Revenue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white hero-title-interactive">
              Deals & Revenue Contracts
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed hero-subtitle-interactive">
              Monitor deal values, win probabilities, stage progression, and conversion to corporate client accounts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenPipeline && (
              <button
                onClick={onOpenPipeline}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors interactive-btn-hover"
              >
                <TrendingUp className="w-4 h-4 text-growth-teal" />
                <span>Kanban Flow</span>
              </button>
            )}
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
              <span>New Deal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider group-hover:text-growth-teal transition-colors">Active Deals</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1.5 group-hover:text-growth-teal transition-colors">{metrics.activeCount}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Total Deals: {deals.length}</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Open Pipeline</div>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1.5">₹{metrics.totalPipeline.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Unweighted contract volume</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-growth-teal uppercase tracking-wider">Weighted Forecast</div>
          <div className="text-2xl font-black text-growth-teal font-mono mt-1.5">₹{Math.round(metrics.weightedPipeline).toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Probability adjusted</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm interactive-box-hover group">
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Won Revenue</div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1.5">₹{metrics.wonRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Win Rate: {metrics.winRate}%</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm panel-premium">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals, codes, clients..."
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
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm panel-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Deal</th>
                <th className="py-3.5 px-4">Organization / Lead</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Probability</th>
                <th className="py-3.5 px-4">Forecast Value</th>
                <th className="py-3.5 px-4">Sales Owner</th>
                <th className="py-3.5 px-4">Client Conversion</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                      <p className="text-xs">Loading commercial deals...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No deals found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => {
                  const stageCfg =
                    DEAL_STAGE_CONFIG[deal.stage as DealStage] || {
                      label: deal.stage,
                      color: 'text-slate-700',
                    };
                  const companyName =
                    deal.client?.companyName || deal.lead?.companyName || 'Unlinked Account';
                  const isClient = !!deal.client;

                  const getDealStageBadge = (stage: string) => {
                    switch (stage) {
                      case 'WON':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'LOST':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      case 'PROPOSAL':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'NEGOTIATION':
                        return 'bg-orange-50 text-orange-700 border-orange-200';
                      case 'QUALIFIED':
                        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      default:
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                    }
                  };

                  return (
                    <tr
                      key={deal.id}
                      className="interactive-row-hover hover:bg-teal-50/20 transition-colors group cursor-pointer border-b border-slate-100"
                      onClick={() => onSelectDeal?.(deal.id)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-growth-teal font-bold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            {deal.dealNumber}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-growth-teal transition-colors truncate max-w-xs">{deal.title}</span>
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
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${getDealStageBadge(deal.stage)}`}>
                          {stageCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-xs">
                        ₹{(deal.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-growth-teal rounded-full"
                              style={{ width: `${deal.probability || 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">{deal.probability}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-growth-teal font-mono text-xs">
                        ₹{Math.round(deal.weightedValue || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {deal.assignedTo?.fullName || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4">
                        {deal.isConvertedToClient ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Converted
                          </span>
                        ) : deal.stage === 'WON' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertModalDeal(deal);
                              setConvertStatus(null);
                              setErrorMsg('');
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-growth-teal hover:bg-growth-teal hover:text-white border border-teal-200 transition-all shadow-sm"
                          >
                            Convert Now
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Pending Won</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {deal.stage !== 'WON' && (
                            <button
                              onClick={() => {
                                setWonModalDeal(deal);
                                setErrorMsg('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                              title="Mark WON"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {deal.stage !== 'LOST' && (
                            <button
                              onClick={() => {
                                setLostModalDeal(deal);
                                setErrorMsg('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                              title="Mark LOST"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectDeal?.(deal.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-growth-teal transition-colors"
                            title="View Deal 360"
                          >
                            <ExternalLink className="w-4 h-4" />
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

      {/* CREATE DEAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Commercial Deal</h3>
                  <p className="text-xs text-slate-400">Register new contract and revenue opportunity</p>
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
                  Deal Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Workforce Contracting - 200 Personnel"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Link Opportunity</label>
                  <select
                    value={formData.opportunityId}
                    onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">None</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} ({o.opportunityNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Or Link Lead</label>
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value, clientId: '' })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">None</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.companyName} ({l.leadNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Or Link Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value, leadId: '' })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">None</option>
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
                    Contract Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="1200000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sales Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => {
                      const st = e.target.value as DealStage;
                      const defProb = DEAL_STAGE_DEFAULT_PROBABILITIES[st] ?? 10;
                      setFormData({ ...formData, stage: st, probability: String(defProb) });
                    }}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proposal Status</label>
                  <select
                    value={formData.proposalStatus}
                    onChange={(e) => setFormData({ ...formData, proposalStatus: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {PROPOSAL_STATUSES.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Security & Housekeeping"
                    value={formData.productService}
                    onChange={(e) => setFormData({ ...formData, productService: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Sales Owner</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Commercial Terms / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Payment terms, margin expectations, SLAs..."
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
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
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK WON MODAL */}
      {wonModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mark Deal as WON</h3>
                <p className="text-xs text-slate-400">{wonModalDeal.dealNumber} — {wonModalDeal.title}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMarkWonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Won Reason <span className="text-rose-400">*</span>
                </label>
                <select
                  value={wonReason}
                  onChange={(e) => setWonReason(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                >
                  {WON_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Closing Notes</label>
                <textarea
                  value={wonNotes}
                  onChange={(e) => setWonNotes(e.target.value)}
                  placeholder="Key highlights on why client chose Growth India..."
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWonModalDeal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Won'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK LOST MODAL */}
      {lostModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mark Deal as LOST</h3>
                <p className="text-xs text-slate-400">{lostModalDeal.dealNumber} — {lostModalDeal.title}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMarkLostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lost Reason <span className="text-rose-400">*</span>
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  required
                >
                  {LOST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Closing Notes</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Competitor chosen, price difference, reasons..."
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLostModalDeal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Lost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO CLIENT MODAL */}
      {convertModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Convert Won Deal to Client</h3>
                <p className="text-xs text-slate-400">
                  {convertModalDeal.dealNumber} — ₹{(convertModalDeal.amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {convertStatus?.duplicateFound && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  Existing Client Found
                </div>
                <p className="text-xs text-slate-300">
                  A client named <strong className="text-white">{convertStatus.candidate.companyName}</strong> (
                  <span className="font-mono text-teal-400">{convertStatus.candidate.clientId}</span>) already exists.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        const res = await fetch(`/api/crm/deals/${convertModalDeal.id}/convert-to-client`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ existingClientId: convertStatus.candidate.id }),
                        });
                        const data = await res.json();
                        setConvertStatus(data);
                        setRefreshKey((k) => k + 1);
                      } catch (err: any) {
                        setErrorMsg(err.message);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all"
                  >
                    Link to Existing Client
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(convertModalDeal, true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  >
                    Create Separate New Client
                  </button>
                </div>
              </div>
            )}

            {convertStatus?.success && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  Conversion Completed!
                </div>
                <p className="text-xs text-slate-300">
                  Client <strong className="text-white">{convertStatus.client?.companyName}</strong> (
                  <span className="font-mono text-teal-400">{convertStatus.client?.clientId}</span>) is now active in
                  Workforce & Client Management.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setConvertModalDeal(null);
                      setConvertStatus(null);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {!convertStatus?.duplicateFound && !convertStatus?.success && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Converting this deal provisions a new corporate client record (
                  <span className="font-mono text-teal-400">CLI-XXXXX</span>) and seamlessly integrates with employee directory
                  and attendance operations.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConvertModalDeal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(convertModalDeal, false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Converting...' : 'Proceed with Conversion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
