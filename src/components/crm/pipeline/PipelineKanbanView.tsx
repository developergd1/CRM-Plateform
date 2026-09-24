'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FileText,
  Briefcase,
  ChevronRight,
  PieChart,
  ArrowUpRight,
  Layers,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { DealItem } from '@/types/crm';
import {
  DEAL_STAGES,
  DealStage,
  DEAL_STAGE_CONFIG,
  WON_REASONS,
  LOST_REASONS,
  PROPOSAL_STATUS_CONFIG,
} from '@/lib/constants/crm';
import { clientCache } from '@/lib/client-cache';

interface PipelineKanbanViewProps {
  onSelectDeal?: (dealId: string) => void;
  onOpenCreateDeal?: () => void;
  initialLeadId?: string;
  initialOpportunityId?: string;
  initialOpenCreateModal?: boolean;
  onNavigateToCMSClient?: (clientId: string) => void;
}

// Stage progression order and visual theme — Teal Unified
const STAGE_FLOW_META: Record<
  DealStage,
  {
    step: number;
    title: string;
    description: string;
    accentColor: string;
    borderAccent: string;
    headerBg: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
    defaultProb: number;
  }
> = {
  NEW: {
    step: 1,
    title: 'Discovery & Needs',
    description: 'Initial inquiry & scope definition',
    accentColor: 'text-[#0D9488]',
    borderAccent: 'border-t-[#0D9488]',
    headerBg: 'bg-[#F0FDFA]',
    badgeBg: 'bg-[#0D9488]/10 border-[#0D9488]/30',
    badgeText: 'text-[#0D9488]',
    dotColor: 'bg-[#0D9488]',
    defaultProb: 20,
  },
  QUALIFIED: {
    step: 2,
    title: 'Solution Qualified',
    description: 'Budget, decision maker & feasibility confirmed',
    accentColor: 'text-[#0D9488]',
    borderAccent: 'border-t-[#0D9488]',
    headerBg: 'bg-[#F0FDFA]',
    badgeBg: 'bg-[#0D9488]/10 border-[#0D9488]/30',
    badgeText: 'text-[#0D9488]',
    dotColor: 'bg-[#0D9488]',
    defaultProb: 40,
  },
  PROPOSAL: {
    step: 3,
    title: 'Proposal & Quote',
    description: 'Commercial & SLA terms submitted',
    accentColor: 'text-amber-700',
    borderAccent: 'border-t-amber-600',
    headerBg: 'bg-amber-50/50',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
    defaultProb: 60,
  },
  NEGOTIATION: {
    step: 4,
    title: 'Negotiation & Legal',
    description: 'Final price revision & legal review',
    accentColor: 'text-amber-800',
    borderAccent: 'border-t-amber-700',
    headerBg: 'bg-amber-50/70',
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-900',
    dotColor: 'bg-amber-600',
    defaultProb: 80,
  },
  WON: {
    step: 5,
    title: 'Closed Won',
    description: 'Agreement signed, ready for onboarding',
    accentColor: 'text-emerald-700',
    borderAccent: 'border-t-emerald-600',
    headerBg: 'bg-emerald-50/50',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    dotColor: 'bg-emerald-600',
    defaultProb: 100,
  },
  LOST: {
    step: 6,
    title: 'Closed Lost',
    description: 'Deal disqualified or lost to competitor',
    accentColor: 'text-rose-700',
    borderAccent: 'border-t-rose-500',
    headerBg: 'bg-rose-50/50',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-800',
    dotColor: 'bg-rose-500',
    defaultProb: 0,
  },
};

export const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  onSelectDeal,
  onOpenCreateDeal,
  initialLeadId,
  initialOpportunityId,
  initialOpenCreateModal,
  onNavigateToCMSClient,
}) => {
  const cachedDeals = clientCache.get<DealItem[]>('crm_deals_list', 15 * 60 * 1000);
  const [deals, setDeals] = useState<DealItem[]>(() => cachedDeals || []);
  const [loading, setLoading] = useState(() => !cachedDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [activeStageTab, setActiveStageTab] = useState<'ALL' | 'ACTIVE' | 'WON' | 'LOST'>('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialOpenCreateModal);
  const [wonModalDeal, setWonModalDeal] = useState<DealItem | null>(null);
  const [lostModalDeal, setLostModalDeal] = useState<DealItem | null>(null);
  const [convertModalDeal, setConvertModalDeal] = useState<DealItem | null>(null);

  // Form states for modals
  const [wonReason, setWonReason] = useState<string>(WON_REASONS[0]);
  const [wonNotes, setWonNotes] = useState('');
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [convertStatus, setConvertStatus] = useState<any>(null);

  // Form states for creating a new deal
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    stage: 'NEW',
    probability: '20',
    proposalStatus: 'NOT_REQUIRED',
    productService: '',
    competitor: '',
    expectedCloseDate: '',
    terms: '',
    opportunityId: initialOpportunityId || '',
    leadId: initialLeadId || '',
    clientId: '',
    assignedToId: '',
  });

  // Supporting Dropdown Lists
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

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

  useEffect(() => {
    fetchDeals(false);
    loadSupportingData();
  }, [refreshKey]);

  const loadSupportingData = async () => {
    try {
      const [resLeads, resClients, resEmployees] = await Promise.all([
        fetch('/api/crm/leads?take=100').then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
        fetch('/api/clients').then((r) => (r.ok ? r.json() : { clients: [] })).catch(() => ({ clients: [] })),
        fetch('/api/employees').then((r) => (r.ok ? r.json() : { employees: [] })).catch(() => ({ employees: [] })),
      ]);
      if (resLeads.data) setLeads(resLeads.data);
      if (resClients.clients) setClients(resClients.clients);
      if (resEmployees.employees) {
        setEmployees(resEmployees.employees.filter((e: any) => e.employeeId !== 'GI-EMP-000001'));
      }
    } catch (err) {
      console.error('Error loading dropdown resources:', err);
    }
  };

  const fetchDeals = async (forceRefresh = false) => {
    const cached = !forceRefresh ? clientCache.get<DealItem[]>('crm_deals_list', 15 * 60 * 1000) : null;
    if (!cached) setLoading(true);

    try {
      const result = await clientCache.swrFetch(
        'crm_deals_list',
        async () => {
          const res = await fetch('/api/crm/deals');
          if (!res.ok) throw new Error('Failed to fetch deals for pipeline');
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
      console.error('Failed to fetch deals for pipeline:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNum = deal.dealNumber?.toLowerCase().includes(q);
        const matchesTitle = deal.title?.toLowerCase().includes(q);
        const matchesCompany =
          deal.client?.companyName?.toLowerCase().includes(q) ||
          deal.lead?.companyName?.toLowerCase().includes(q);
        if (!matchesNum && !matchesTitle && !matchesCompany) return false;
      }
      if (selectedOwner && deal.assignedToId !== selectedOwner) {
        return false;
      }
      if (activeStageTab === 'ACTIVE' && (deal.stage === 'WON' || deal.stage === 'LOST')) {
        return false;
      }
      if (activeStageTab === 'WON' && deal.stage !== 'WON') {
        return false;
      }
      if (activeStageTab === 'LOST' && deal.stage !== 'LOST') {
        return false;
      }
      if (selectedStageFilter !== 'ALL' && deal.stage !== selectedStageFilter) {
        return false;
      }
      return true;
    });
  }, [deals, searchQuery, selectedOwner, activeStageTab, selectedStageFilter]);

  // Distinct owners for filter
  const owners = useMemo(() => {
    const map = new Map<string, string>();
    deals.forEach((d) => {
      if (d.assignedTo) {
        map.set(d.assignedTo.id, d.assignedTo.fullName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [deals]);

  // Overall metrics calculation
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

    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    return {
      totalPipeline,
      weightedPipeline,
      wonRevenue,
      winRate,
      activeCount: deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST').length,
      totalCount: deals.length,
    };
  }, [deals]);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, DealItem[]> = {
      NEW: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      WON: [],
      LOST: [],
    };
    filteredDeals.forEach((deal) => {
      const stage = (deal.stage as DealStage) || 'NEW';
      if (map[stage]) {
        map[stage].push(deal);
      } else {
        map.NEW.push(deal);
      }
    });
    return map;
  }, [filteredDeals]);

  // Stage advance helper
  const handleAdvanceStage = async (deal: DealItem, targetStage: DealStage) => {
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: targetStage }),
      });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update stage');
      }
    } catch (e) {
      console.error('Stage advance failed:', e);
    }
  };

  // Submit Won
  const handleMarkWonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wonModalDeal) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/crm/deals/${wonModalDeal.id}/won`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wonReason, closingNotes: wonNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setWonModalDeal(null);
        setWonNotes('');
        setRefreshKey((k) => k + 1);
      } else {
        setErrorMsg(data.error || 'Failed to mark deal as won.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error marking won.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Lost
  const handleMarkLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalDeal) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/crm/deals/${lostModalDeal.id}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lostReason, closingNotes: lostNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        setLostModalDeal(null);
        setLostNotes('');
        setRefreshKey((k) => k + 1);
      } else {
        setErrorMsg(data.error || 'Failed to mark deal as lost.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error marking lost.');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert to Client
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

  // Submit Create Deal
  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount) || 0,
          stage: formData.stage,
          probability: parseInt(formData.probability) || 20,
          proposalStatus: formData.proposalStatus,
          productService: formData.productService,
          competitor: formData.competitor,
          expectedCloseDate: formData.expectedCloseDate || null,
          terms: formData.terms,
          opportunityId: formData.opportunityId || null,
          leadId: formData.leadId || null,
          clientId: formData.clientId || null,
          assignedToId: formData.assignedToId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          amount: '',
          stage: 'NEW',
          probability: '20',
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
        setErrorMsg(data.error || 'Failed to create deal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating deal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Executive Banner */}
      <div className="bg-white rounded-2xl p-6 text-slate-900 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30 tracking-wide uppercase">
              Sales Pipeline & Deals
            </span>
            <span className="text-xs text-slate-500 font-medium">Stage Velocity & Commercial Conversion</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Commercial Pipeline & Deals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Unified pipeline tracking across 6 progression stages: Discovery, Qualified, Proposal, Negotiation, Won, and Lost.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Refresh Pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setErrorMsg('');
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0D9488] hover:bg-[#115E59] text-white shadow-xs transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">{metrics.activeCount}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Total: {metrics.totalCount} deals</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ₹{metrics.totalPipeline.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Unweighted volume</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weighted Forecast</span>
            <div className="w-8 h-8 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 text-[#0D9488] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-[#0D9488] font-mono tracking-tight">
              ₹{Math.round(metrics.weightedPipeline).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Probability adjusted</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs bg-gradient-to-b from-emerald-50/30 to-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Won Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              ₹{metrics.wonRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Closed business</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Rate</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">{metrics.winRate}%</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">Closed won efficiency</div>
          </div>
        </div>
      </div>

      {/* 3. Stage Progression Stepper & View Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedStageFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStageFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Stages ({deals.length})
            </button>

            {DEAL_STAGES.map((stage, idx) => {
              const meta = STAGE_FLOW_META[stage];
              const count = (dealsByStage[stage] || []).length;
              const isSelected = selectedStageFilter === stage;

              return (
                <React.Fragment key={stage}>
                  <button
                    onClick={() => setSelectedStageFilter(isSelected ? 'ALL' : stage)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.badgeText} shadow-xs ring-2 ring-[#0D9488]/20`
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                    <span>{meta.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white border border-slate-200/80 text-slate-700">
                      {count}
                    </span>
                  </button>
                  {idx < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden xl:inline shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>
        </div>

        {/* Search and Owner Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals, code, client, or lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0D9488] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {owners.length > 0 && (
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:border-[#0D9488]"
              >
                <option value="">All Deal Owners</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 4. Kanban Columns or Table View Mode */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
          {DEAL_STAGES.map((stage) => {
            const meta = STAGE_FLOW_META[stage];
            const stageDeals = dealsByStage[stage] || [];
            const colTotal = stageDeals.reduce((acc, d) => acc + (d.amount || 0), 0);
            const colWeighted = stageDeals.reduce(
              (acc, d) => acc + (d.weightedValue ?? (d.amount * d.probability) / 100),
              0
            );

            // Skip column if filtered out
            if (activeStageTab === 'ACTIVE' && (stage === 'WON' || stage === 'LOST')) return null;
            if (activeStageTab === 'WON' && stage !== 'WON') return null;
            if (activeStageTab === 'LOST' && stage !== 'LOST') return null;
            if (selectedStageFilter !== 'ALL' && stage !== selectedStageFilter) return null;

            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dealId = e.dataTransfer.getData('text/plain');
                  if (!dealId) return;
                  const targetDeal = deals.find((d) => d.id === dealId);
                  if (!targetDeal || targetDeal.stage === stage) return;
                  if (stage === 'WON') {
                    setWonModalDeal(targetDeal);
                  } else if (stage === 'LOST') {
                    setLostModalDeal(targetDeal);
                  } else {
                    handleAdvanceStage(targetDeal, stage as DealStage);
                  }
                }}
                className={`bg-slate-50/90 border border-slate-200/90 ${meta.borderAccent} border-t-4 rounded-2xl p-3.5 flex flex-col h-[calc(100vh-240px)] min-h-[500px] max-h-[800px] transition-all shadow-xs hover:shadow-sm`}
              >
                {/* Column Header */}
                <div className="pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColor}`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${meta.accentColor}`}>
                        {meta.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-800 shadow-xs">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-col gap-0.5">
                    <div className="text-sm font-black text-slate-900 font-mono">
                      ₹{colTotal.toLocaleString('en-IN')}
                    </div>
                    {stage !== 'WON' && stage !== 'LOST' && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        Forecast: <span className="font-bold text-[#0D9488] font-mono">₹{Math.round(colWeighted).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deals List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageDeals.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-white/60">
                      <Briefcase className="w-6 h-6 text-slate-300 mb-1.5" />
                      <p className="text-xs text-slate-500 font-semibold">No deals in {meta.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Drag & drop deals here</p>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const clientName =
                        deal.client?.companyName || deal.lead?.companyName || 'Unassigned Organization';
                      const isClient = !!deal.client;
                      const prob = deal.probability || meta.defaultProb;

                      return (
                        <div
                          key={deal.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', deal.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:border-[#0D9488]/60 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing"
                        >
                          {/* Header: Deal number & Stage probability */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/20 px-2 py-0.5 rounded-md">
                              {deal.dealNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.badgeBg} ${meta.badgeText}`}>
                              {prob}% Probability
                            </span>
                          </div>

                          {/* Probability Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                            <div
                              className={`h-full transition-all duration-300 ${
                                prob >= 80 ? 'bg-emerald-500' : prob >= 50 ? 'bg-[#0D9488]' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, prob))}%` }}
                            />
                          </div>

                          {/* Deal Title */}
                          <h4
                            onClick={() => onSelectDeal?.(deal.id)}
                            className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-[#0D9488] cursor-pointer transition-colors leading-snug"
                          >
                            {deal.title}
                          </h4>

                          {/* Organization / Lead link */}
                          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate font-medium">{clientName}</span>
                            {isClient ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded shrink-0">
                                CLIENT
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0">
                                LEAD
                              </span>
                            )}
                          </div>

                          {/* Proposal Status if active */}
                          {deal.proposalStatus && deal.proposalStatus !== 'NOT_REQUIRED' && (
                            <div className="mt-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                                Proposal: {deal.proposalStatus}
                              </span>
                            </div>
                          )}

                          {/* Financial Box */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 bg-slate-50/70 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Deal Value</div>
                                <div className="text-xs font-black text-slate-900 font-mono">
                                  ₹{(deal.amount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                              {stage !== 'WON' && stage !== 'LOST' && (
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Forecast</div>
                                  <div className="text-xs font-black text-[#0D9488] font-mono">
                                    ₹{Math.round(deal.weightedValue || 0).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Owner & Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{deal.assignedTo?.fullName || 'Unassigned'}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {stage === 'NEW' && (
                                  <button
                                    onClick={() => handleAdvanceStage(deal, 'QUALIFIED')}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold transition-all shadow-xs"
                                    title="Advance to Qualified"
                                  >
                                    Next <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage === 'QUALIFIED' && (
                                  <button
                                    onClick={() => handleAdvanceStage(deal, 'PROPOSAL')}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition-all shadow-xs"
                                    title="Advance to Proposal"
                                  >
                                    Quote <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage === 'PROPOSAL' && (
                                  <button
                                    onClick={() => handleAdvanceStage(deal, 'NEGOTIATION')}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition-all shadow-xs"
                                    title="Advance to Negotiation"
                                  >
                                    Negotiate <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {/* WON quick trigger */}
                                {stage !== 'WON' && (
                                  <button
                                    onClick={() => {
                                      setWonModalDeal(deal);
                                      setErrorMsg('');
                                    }}
                                    className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                    title="Mark Deal as Won"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* LOST quick trigger */}
                                {stage !== 'LOST' && (
                                  <button
                                    onClick={() => {
                                      setLostModalDeal(deal);
                                      setErrorMsg('');
                                    }}
                                    className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                                    title="Mark Deal as Lost"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Convert to Client trigger for WON deals */}
                                {stage === 'WON' && !deal.isConvertedToClient && (
                                  <button
                                    onClick={() => {
                                      setConvertModalDeal(deal);
                                      setConvertStatus(null);
                                      setErrorMsg('');
                                    }}
                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#0D9488] hover:bg-[#115E59] text-white shadow-xs transition-colors"
                                    title="Convert to Corporate Client Account"
                                  >
                                    + Convert
                                  </button>
                                )}
                                {stage === 'WON' && deal.isConvertedToClient && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DEAL TABLE VIEW MODE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Deal ID</th>
                  <th className="py-3 px-4">Title & Organization</th>
                  <th className="py-3 px-4">Stage Milestone</th>
                  <th className="py-3 px-4">Contract Amount</th>
                  <th className="py-3 px-4">Probability</th>
                  <th className="py-3 px-4">Forecast Value</th>
                  <th className="py-3 px-4">Deal Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No deals match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const clientName =
                      deal.client?.companyName || deal.lead?.companyName || 'Unassigned';
                    const isClient = !!deal.client;
                    const stageMeta = STAGE_FLOW_META[deal.stage as DealStage] || STAGE_FLOW_META.NEW;

                    return (
                      <tr
                        key={deal.id}
                        className="hover:bg-[#F0FDFA] transition-colors group cursor-pointer"
                        onClick={() => onSelectDeal?.(deal.id)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0D9488]">
                          {deal.dealNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-[#0D9488] transition-colors">
                            {deal.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{clientName}</span>
                            {isClient && (
                              <span className="text-[9px] font-bold px-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                CLIENT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={deal.stage}
                            onChange={(e) => {
                              const target = e.target.value as DealStage;
                              if (target === 'WON') setWonModalDeal(deal);
                              else if (target === 'LOST') setLostModalDeal(deal);
                              else handleAdvanceStage(deal, target);
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none ${stageMeta.badgeBg} ${stageMeta.badgeText}`}
                          >
                            {DEAL_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_FLOW_META[s].title}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900">
                          ₹{(deal.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#0D9488] rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, deal.probability || 0))}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-700 font-bold">{deal.probability}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0D9488]">
                          ₹{Math.round(deal.weightedValue || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {deal.assignedTo?.fullName || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {deal.stage !== 'WON' && (
                              <button
                                onClick={() => setWonModalDeal(deal)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold"
                              >
                                Won
                              </button>
                            )}
                            {deal.stage !== 'LOST' && (
                              <button
                                onClick={() => setLostModalDeal(deal)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md text-[10px] font-bold"
                              >
                                Lost
                              </button>
                            )}
                            {deal.stage === 'WON' && !deal.isConvertedToClient && (
                              <button
                                onClick={() => setConvertModalDeal(deal)}
                                className="px-2.5 py-1 bg-[#0D9488] hover:bg-[#115E59] text-white rounded-md text-[10px] font-bold"
                              >
                                Convert
                              </button>
                            )}
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
      )}

      {/* 5. CREATE NEW DEAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Commercial Deal</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a new deal to the active sales pipeline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateDealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deal Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Workforce Platform Deployment"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deal Value (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 500000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488] transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Pipeline Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => {
                      const st = e.target.value as DealStage;
                      setFormData({
                        ...formData,
                        stage: st,
                        probability: String(STAGE_FLOW_META[st]?.defaultProb || 20),
                      });
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_FLOW_META[s]?.title || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Lead (Optional)</label>
                  <select
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">No Lead Linked</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.leadNumber} — {l.companyName || l.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Related Account / Client (Optional)</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">No Client Linked</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientId} — {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deal Owner / Sales Rep</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product / Service</label>
                  <input
                    type="text"
                    placeholder="e.g. EMS Enterprise License + Setup"
                    value={formData.productService}
                    onChange={(e) => setFormData({ ...formData, productService: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Commercial Terms</label>
                <textarea
                  rows={2}
                  placeholder="Key milestones, deliverables, payment terms..."
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:bg-white focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D9488] hover:bg-[#115E59] text-white transition-all shadow-md shadow-[#0D9488]/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MARK WON MODAL */}
      {wonModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Mark Deal as WON</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {wonModalDeal.dealNumber} — {wonModalDeal.title}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMarkWonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Won Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={wonReason}
                  onChange={(e) => setWonReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-emerald-500"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Closing Notes / Key Terms</label>
                <textarea
                  value={wonNotes}
                  onChange={(e) => setWonNotes(e.target.value)}
                  placeholder="Details on agreed contract terms, payment terms, or special promises..."
                  rows={3}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWonModalDeal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Won Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MARK LOST MODAL */}
      {lostModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Mark Deal as LOST</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {lostModalDeal.dealNumber} — {lostModalDeal.title}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleMarkLostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Lost Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-rose-500"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Loss Analysis Notes</label>
                <textarea
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="Competitor chosen, price budget mismatch, feedback received..."
                  rows={3}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLostModalDeal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Deal Lost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. CONVERT WON DEAL TO CLIENT MODAL */}
      {convertModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Convert Won Deal to Corporate Client</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {convertModalDeal.dealNumber} — ₹{(convertModalDeal.amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* If duplicate candidate found */}
            {convertStatus?.duplicateFound && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Existing Corporate Client Record Detected
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  A registered client account named <strong className="text-slate-900">{convertStatus.candidate.companyName}</strong> (
                  <span className="font-mono text-[#0D9488] font-bold">{convertStatus.candidate.clientId}</span>) already exists.
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
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs cursor-pointer"
                  >
                    Link to {convertStatus.candidate.clientId}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(convertModalDeal, true)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  >
                    Create Separate Account
                  </button>
                </div>
              </div>
            )}

            {/* Conversion Success */}
            {convertStatus?.success && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Corporate Client Successfully Created!
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Client <strong className="text-slate-900">{convertStatus.client?.companyName}</strong> (
                  <span className="font-mono text-[#0D9488] font-bold">{convertStatus.client?.clientId}</span>) is now active in Workforce Management, Employee Roster, and Invoicing.
                </p>
                {convertStatus.credentials && (
                  <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs font-mono text-slate-700 space-y-1">
                    <div>Portal Login: <span className="font-bold text-slate-900">{convertStatus.credentials.email}</span></div>
                    <div>Temporary Password: <span className="font-bold text-slate-900">{convertStatus.credentials.temporaryPassword}</span></div>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-end gap-2">
                  {onNavigateToCMSClient && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = convertStatus.client?.id || convertStatus.client?.clientId;
                        setConvertModalDeal(null);
                        setConvertStatus(null);
                        onNavigateToCMSClient(targetId);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D9488] hover:bg-[#115E59] text-white shadow-xs cursor-pointer"
                    >
                      Open in CMS Clients
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setConvertModalDeal(null);
                      setConvertStatus(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Standard Conversion Pre-flight */}
            {!convertStatus?.duplicateFound && !convertStatus?.success && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Converting this won deal will automatically provision a new corporate client record (
                  <span className="font-mono text-[#0D9488] font-bold">CLI-XXXXX</span>), establish access credentials, link all deal history, and enable immediate workforce attendance deployment.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 font-medium">
                  <div>Company: <span className="text-slate-900 font-bold">{convertModalDeal.client?.companyName || convertModalDeal.lead?.companyName || convertModalDeal.title}</span></div>
                  <div>Deal Value: <span className="text-[#0D9488] font-black">₹{(convertModalDeal.amount || 0).toLocaleString('en-IN')}</span></div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConvertModalDeal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(convertModalDeal, false)}
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#0D9488] hover:bg-[#115E59] text-white transition-all shadow-md shadow-[#0D9488]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Converting...' : 'Proceed to Convert'}
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
