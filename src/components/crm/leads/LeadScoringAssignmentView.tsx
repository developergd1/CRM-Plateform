'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Target,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Flame,
  Zap,
  Snowflake,
  ShieldCheck,
  ChevronRight,
  Check,
} from 'lucide-react';
import { LeadRecord } from '@/types/crm';

interface SalesRep {
  id: string;
  name: string;
  role: string;
  avatar: string;
  activeLeads: number;
  capacity: number;
  conversionRate: string;
}

const DEFAULT_SALES_REPS: SalesRep[] = [
  { id: 'rep-1', name: 'Vikram Singhania (Sales Exec A)', role: 'Sr. Enterprise Executive', avatar: 'VS', activeLeads: 14, capacity: 25, conversionRate: '34%' },
  { id: 'rep-2', name: 'Priya Mehta (Sales Exec B)', role: 'Enterprise Account Exec', avatar: 'PM', activeLeads: 18, capacity: 25, conversionRate: '29%' },
  { id: 'rep-3', name: 'Rohit Verma', role: 'Inside Sales Specialist', avatar: 'RV', activeLeads: 12, capacity: 30, conversionRate: '22%' },
  { id: 'rep-4', name: 'Ananya Deshmukh', role: 'Sales Development Rep (SDR)', avatar: 'AD', activeLeads: 21, capacity: 35, conversionRate: '19%' },
];

export const LeadScoringAssignmentView: React.FC<{ onNavigateToLead?: (id: string) => void }> = ({ onNavigateToLead }) => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL');
  const [salesReps, setSalesReps] = useState<SalesRep[]>(DEFAULT_SALES_REPS);

  // Assignment Modal / Popover state
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<LeadRecord | null>(null);
  const [assignedOwnerMap, setAssignedOwnerMap] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Simulator state
  const [simBudget, setSimBudget] = useState<'HIGH' | 'MED' | 'LOW'>('HIGH');
  const [simRole, setSimRole] = useState<'CXO' | 'MANAGER' | 'STAFF'>('CXO');
  const [simSource, setSimSource] = useState<'REFERRAL' | 'WEBSITE' | 'CAMPAIGN' | 'COLDCALL'>('WEBSITE');
  const [simUrgency, setSimUrgency] = useState<'IMMEDIATE' | 'MODERATE' | 'EXPLORING'>('IMMEDIATE');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/leads');
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load leads for scoring:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const calculateLeadScore = (lead: LeadRecord): number => {
    let score = 25; // baseline

    // Budget weighting
    const budget = Number(lead.estimatedValue || (lead as any).budget) || 0;
    if (budget >= 1000000) score += 30;
    else if (budget >= 300000) score += 20;
    else if (budget > 0) score += 10;

    // Source intent weighting
    const src = (lead.source || '').toUpperCase();
    if (src.includes('REFERRAL')) score += 25;
    else if (src.includes('WEBSITE') || src.includes('INBOUND')) score += 20;
    else if (src.includes('CAMPAIGN') || src.includes('LINKEDIN')) score += 15;
    else score += 10;

    // Contact readiness
    if (lead.phone && lead.email) score += 10;

    // Status qualification
    if (lead.status === 'QUALIFIED') score += 15;
    else if (lead.status === 'CONTACTED') score += 10;

    return Math.min(100, Math.max(15, score));
  };

  const getTier = (score: number) => {
    if (score >= 80) return { label: 'Hot Lead', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: Flame, autoAssignee: 'Vikram Singhania (Sales Exec A)' };
    if (score >= 50) return { label: 'Warm Lead', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Zap, autoAssignee: 'Priya Mehta (Sales Exec B)' };
    return { label: 'Cold Lead', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400', icon: Snowflake, autoAssignee: 'Ananya Deshmukh (SDR Pool)' };
  };

  const handleAssignOwner = (leadId: string, repName: string) => {
    setAssignedOwnerMap((prev) => ({ ...prev, [leadId]: repName }));
    setSelectedLeadForAssign(null);
    setToastMsg(`Lead successfully assigned to ${repName}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Calculate simulated score
  const simScore = (() => {
    let s = 10;
    if (simBudget === 'HIGH') s += 35;
    else if (simBudget === 'MED') s += 20;
    else s += 10;

    if (simRole === 'CXO') s += 25;
    else if (simRole === 'MANAGER') s += 15;
    else s += 5;

    if (simSource === 'REFERRAL') s += 20;
    else if (simSource === 'WEBSITE') s += 15;
    else if (simSource === 'CAMPAIGN') s += 10;
    else s += 5;

    if (simUrgency === 'IMMEDIATE') s += 15;
    else if (simUrgency === 'MODERATE') s += 10;
    else s += 5;

    return Math.min(100, s);
  })();

  const simTier = getTier(simScore);

  const filteredLeads = leads.filter((l) => {
    const score = calculateLeadScore(l);
    const matchesSearch =
      (l.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.leadNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (tierFilter === 'HOT') return score >= 80;
    if (tierFilter === 'WARM') return score >= 50 && score < 80;
    if (tierFilter === 'COLD') return score < 50;
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-lg border border-teal-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Flow Visualizer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lead Scoring & Assignment Engine</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated scoring models and intelligent sales executive assignment rules based on conversion probability.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLeads}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh Rules</span>
          </button>
        </div>

        {/* Prospecting Flow Visualizer */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            CRM Inbound Prospecting Flow
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              1. Lead Source
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              2. Lead Enters CRM
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 font-bold text-teal-800 shadow-2xs">
              3. Lead Scoring
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-300 font-bold text-teal-800 shadow-2xs">
              4. Lead Assignment
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              5. Sales Follow-up
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              6. Qualification
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
              7. Deal Closed
            </span>
          </div>
        </div>
      </div>

      {/* Simulator & Assignment Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Scoring Simulator */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lead Scoring Simulator</h2>
              <p className="text-[11px] text-slate-500">Test how prospect criteria determine score & routing</p>
            </div>
            <Sliders className="w-4 h-4 text-teal-600" />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deal Budget Size</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimBudget('HIGH')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simBudget === 'HIGH' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  &gt; ₹10 Lakhs
                </button>
                <button
                  type="button"
                  onClick={() => setSimBudget('MED')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simBudget === 'MED' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  ₹3L - ₹10L
                </button>
                <button
                  type="button"
                  onClick={() => setSimBudget('LOW')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simBudget === 'LOW' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  &lt; ₹3 Lakhs
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Decision Maker Level</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimRole('CXO')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simRole === 'CXO' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  CXO / Director
                </button>
                <button
                  type="button"
                  onClick={() => setSimRole('MANAGER')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simRole === 'MANAGER' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Dept. Manager
                </button>
                <button
                  type="button"
                  onClick={() => setSimRole('STAFF')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simRole === 'STAFF' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Inbound Channel</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimSource('WEBSITE')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simSource === 'WEBSITE' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Direct Website (High)
                </button>
                <button
                  type="button"
                  onClick={() => setSimSource('REFERRAL')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simSource === 'REFERRAL' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Client Referral (Top)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Buying Urgency</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSimUrgency('IMMEDIATE')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simUrgency === 'IMMEDIATE' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  &lt; 15 Days
                </button>
                <button
                  type="button"
                  onClick={() => setSimUrgency('MODERATE')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simUrgency === 'MODERATE' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  1 - 3 Months
                </button>
                <button
                  type="button"
                  onClick={() => setSimUrgency('EXPLORING')}
                  className={`py-1.5 px-2 rounded-lg border text-center font-semibold cursor-pointer ${
                    simUrgency === 'EXPLORING' ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Evaluating
                </button>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Calculated Lead Score</span>
              <span className="text-2xl font-black text-slate-900">{simScore} / 100</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  simScore >= 80 ? 'bg-rose-500' : simScore >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                }`}
                style={{ width: `${simScore}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${simTier.color}`}>
                {simTier.label}
              </span>
              <span className="text-[11px] font-bold text-slate-700">
                → Auto Assign: <span className="text-teal-700">{simTier.autoAssignee}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Active Sales Reps & Capacity Matrix */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sales Ownership & Auto-Routing Roster</h2>
              <p className="text-[11px] text-slate-500">Active executives receiving scored leads based on capacity</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Round-Robin Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {salesReps.map((rep) => {
              const utilPercent = Math.round((rep.activeLeads / rep.capacity) * 100);
              return (
                <div key={rep.id} className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {rep.avatar}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{rep.name}</p>
                        <p className="text-[10px] text-slate-500">{rep.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {rep.conversionRate} Win
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Active Load: {rep.activeLeads} / {rep.capacity}</span>
                      <span className="font-bold text-slate-700">{utilPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${utilPercent > 80 ? 'bg-amber-500' : 'bg-teal-600'}`}
                        style={{ width: `${utilPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                <strong>Assignment Rule:</strong> Leads with Score ≥ 80 are routed immediately to <strong>Sales Executive A (Vikram Singhania)</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scored Prospects List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter scored prospects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Tier:</span>
            {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  tierFilter === t ? 'bg-teal-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Prospect / Company</th>
                <th className="py-3 px-4">Source Channel</th>
                <th className="py-3 px-4">Lead Score</th>
                <th className="py-3 px-4">Priority Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Sales Owner</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-teal-600 mb-1" />
                    Calculating scores and evaluating assignment rules...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No leads found matching current score criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const score = calculateLeadScore(lead);
                  const tier = getTier(score);
                  const TierIcon = tier.icon;
                  const currentOwner = assignedOwnerMap[lead.id] || lead.assignedTo?.fullName || tier.autoAssignee;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{lead.fullName || 'Unnamed Prospect'}</p>
                        <p className="text-[11px] text-slate-500">{lead.companyName || 'Corporate Entity'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {lead.source || 'Direct'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black">{score}</span>
                          <span className="text-[10px] text-slate-400">/ 100</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.color}`}>
                          <TierIcon className="w-3 h-3" />
                          <span>{tier.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{currentOwner}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForAssign(lead)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors cursor-pointer"
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Sales Owner Modal (Clean White Light Theme) */}
      {selectedLeadForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Assign Sales Owner</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign {selectedLeadForAssign.fullName} ({selectedLeadForAssign.companyName}) to an executive.
              </p>
            </div>

            <div className="space-y-2">
              {salesReps.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => handleAssignOwner(selectedLeadForAssign.id, rep.name)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 flex items-center justify-between text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      {rep.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rep.name}</p>
                      <p className="text-[10px] text-slate-400">{rep.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{rep.activeLeads} leads</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeadForAssign(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
