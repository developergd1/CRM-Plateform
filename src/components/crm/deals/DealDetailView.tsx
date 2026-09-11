'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  Briefcase,
  History,
  MessageSquare,
  AlertCircle,
  FileText,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { DealItem } from '@/types/crm';
import {
  DEAL_STAGES,
  DEAL_STAGE_CONFIG,
  DealStage,
  PROPOSAL_STATUS_CONFIG,
  WON_REASONS,
  LOST_REASONS,
  DEAL_STAGE_DEFAULT_PROBABILITIES,
} from '@/lib/constants/crm';

interface DealDetailViewProps {
  dealId: string;
  onBack?: () => void;
  onClientClick?: (clientId: string) => void;
  onLeadClick?: (leadId: string) => void;
}

export const DealDetailView: React.FC<DealDetailViewProps> = ({
  dealId,
  onBack,
  onClientClick,
  onLeadClick,
}) => {
  const [deal, setDeal] = useState<DealItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'activities' | 'followups'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [showWonModal, setShowWonModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Form inputs
  const [wonReason, setWonReason] = useState<string>(WON_REASONS[0]);
  const [wonNotes, setWonNotes] = useState('');
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [convertStatus, setConvertStatus] = useState<any>(null);

  useEffect(() => {
    fetchDealDetail();
  }, [dealId, refreshKey]);

  const fetchDealDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`);
      if (res.ok) {
        const json = await res.json();
        setDeal(json.data);
      }
    } catch (e) {
      console.error('Error fetching deal:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = async (targetStage: DealStage) => {
    if (!deal) return;
    if (deal.stage === targetStage) return;

    if (targetStage === 'WON') {
      setShowWonModal(true);
      return;
    }
    if (targetStage === 'LOST') {
      setShowLostModal(true);
      return;
    }

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
        alert(data.error || 'Failed to change stage');
      }
    } catch (e) {
      console.error('Failed to change stage:', e);
    }
  };

  const handleWonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/won`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wonReason, closingNotes: wonNotes }),
      });
      if (res.ok) {
        setShowWonModal(false);
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to mark won');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lostReason, closingNotes: lostNotes }),
      });
      if (res.ok) {
        setShowLostModal(false);
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to mark lost');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
      });
      if (res.ok) {
        setShowReopenModal(false);
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to reopen deal');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToClient = async (forceNew = false) => {
    if (!deal) return;
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
        setErrorMsg(data.error || 'Failed to convert deal to client.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error converting deal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !newNoteContent.trim()) return;
    try {
      const res = await fetch('/api/crm/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          content: newNoteContent.trim(),
        }),
      });
      if (res.ok) {
        setNewNoteContent('');
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      console.error('Error adding note:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mb-3" />
        <p className="text-sm font-medium">Loading Deal 360 Workspace...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">Deal Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">The requested commercial deal could not be located.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Back to Deals
          </button>
        )}
      </div>
    );
  }

  const stageCfg = DEAL_STAGE_CONFIG[deal.stage as DealStage] || {
    label: deal.stage,
    color: 'text-slate-400',
    bg: 'bg-slate-800',
  };

  const companyName = deal.client?.companyName || deal.lead?.companyName || 'Corporate Account';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                {deal.dealNumber}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${stageCfg.bg} ${stageCfg.color}`}>
                {stageCfg.label}
              </span>
              {deal.isConvertedToClient && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  CLIENT CONVERTED
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{deal.title}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {deal.stage !== 'WON' && (
            <button
              onClick={() => {
                setShowWonModal(true);
                setErrorMsg('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark WON
            </button>
          )}

          {deal.stage !== 'LOST' && (
            <button
              onClick={() => {
                setShowLostModal(true);
                setErrorMsg('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Mark LOST
            </button>
          )}

          {(deal.stage === 'WON' || deal.stage === 'LOST') && (
            <button
              onClick={() => {
                setShowReopenModal(true);
                setErrorMsg('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <History className="w-4 h-4 text-blue-400" />
              Reopen
            </button>
          )}

          {/* Critical Convert to Client Button */}
          {!deal.isConvertedToClient && (
            <button
              onClick={() => {
                setShowConvertModal(true);
                setConvertStatus(null);
                setErrorMsg('');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                deal.stage === 'WON'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
                  : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Convert to Client Account
            </button>
          )}
        </div>
      </div>

      {/* Interactive Sales Stage Progression Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Sales Stage Progression
          </span>
          <span className="text-xs font-semibold text-teal-400">
            Current Win Probability: {deal.probability}%
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {DEAL_STAGES.map((st, idx) => {
            const isCurrent = deal.stage === st;
            const currentIdx = DEAL_STAGES.indexOf(deal.stage as DealStage);
            const isPassed = currentIdx > idx && deal.stage !== 'LOST';
            const cfg = DEAL_STAGE_CONFIG[st];

            return (
              <button
                key={st}
                onClick={() => handleStageClick(st)}
                className={`py-3 px-3 rounded-xl text-left border transition-all relative overflow-hidden group ${
                  isCurrent
                    ? 'bg-teal-500/10 border-teal-500/60 shadow-lg shadow-teal-500/10'
                    : isPassed
                    ? 'bg-slate-950/60 border-slate-700/80 hover:border-slate-600'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">0{idx + 1}</span>
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />}
                  {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                </div>
                <div
                  className={`text-xs font-black uppercase tracking-wider truncate ${
                    isCurrent ? 'text-teal-400' : isPassed ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {cfg.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {DEAL_STAGE_DEFAULT_PROBABILITIES[st]}% default
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Commercial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contract Amount</div>
          <div className="text-2xl font-black text-white mt-1">₹{(deal.amount || 0).toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Currency: {deal.currency || 'INR'}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">Weighted Forecast Value</div>
          <div className="text-2xl font-black text-teal-400 mt-1">
            ₹{Math.round(deal.weightedValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{(deal.probability || 0)}% of total value</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Proposal Status</div>
          <div className="text-base font-bold text-white mt-1">
            {deal.proposalStatus ? deal.proposalStatus.replace(/_/g, ' ') : 'NOT REQUIRED'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Commercial Deliverable</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Target Close Date</div>
          <div className="text-base font-bold text-white mt-1">
            {deal.expectedCloseDate
              ? new Date(deal.expectedCloseDate).toLocaleDateString('en-IN')
              : deal.closingDate
              ? new Date(deal.closingDate).toLocaleDateString('en-IN')
              : 'Not scheduled'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {deal.closedAt ? `Closed on ${new Date(deal.closedAt).toLocaleDateString('en-IN')}` : 'Active pipeline'}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Commercial Details & Stakeholders
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Stage Audit History ({(deal.stageHistory || []).length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'activities'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Activities & Notes ({(deal.notes || []).length + (deal.activities || []).length})
          </button>
        </div>

        {/* Tab 1: Commercial Overview */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Organization & Relationships */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account & Relationship Mapping
                </h3>

                {/* Linked Organization / Lead */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Primary Organization</span>
                    {deal.client ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        CLIENT: {deal.client.clientId}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        PROSPECT LEAD
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-white">{companyName}</div>

                  {deal.client && onClientClick && (
                    <button
                      onClick={() => onClientClick(deal.client!.id)}
                      className="text-xs text-teal-400 hover:underline flex items-center gap-1 pt-1"
                    >
                      Open in Client Management <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {deal.lead && (
                    <div className="text-xs text-slate-400 pt-1 space-y-1">
                      <div>Lead Code: <span className="font-mono text-slate-200">{deal.lead.leadNumber}</span></div>
                      <div>Contact Person: <span className="text-slate-200">{deal.lead.contactName}</span></div>
                      <div>Phone: <span className="text-slate-200">{deal.lead.phone}</span></div>
                    </div>
                  )}
                </div>

                {/* Primary Contact Stakeholder */}
                {deal.primaryContact && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">Primary Contact Stakeholder</div>
                    <div className="text-sm font-bold text-white">{deal.primaryContact.fullName}</div>
                    <div className="text-xs text-slate-400">{deal.primaryContact.designation || 'Key Decision Maker'}</div>
                    <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {deal.primaryContact.phone}
                      </div>
                      {deal.primaryContact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {deal.primaryContact.email}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Assigned Sales Owner */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">Deal Owner</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {deal.assignedTo?.fullName || 'Unassigned'}
                    </div>
                    <div className="text-xs text-slate-500">{deal.assignedTo?.designation || 'Sales Account Rep'}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold">
                    {deal.assignedTo?.fullName?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>

              {/* Right Column: Commercial Scope & Competitive Analysis */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Product Scope & Commercial Terms
                </h3>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">Product / Service Offering</div>
                    <div className="text-sm font-semibold text-slate-200 mt-0.5">
                      {deal.productService || 'General Workforce & Security Services'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">Competitor Analysis</div>
                    <div className="text-sm font-semibold text-slate-200 mt-0.5">
                      {deal.competitor || 'None identified'}
                    </div>
                    {deal.competitorNotes && (
                      <p className="text-xs text-slate-400 mt-1">{deal.competitorNotes}</p>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">Terms & SLA Specifications</div>
                    <div className="text-xs text-slate-300 mt-0.5 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {deal.terms || 'Standard 30-day payment cycle, Growth India enterprise workforce agreement.'}
                    </div>
                  </div>

                  {/* Won / Lost Notes */}
                  {deal.wonReason && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <div className="font-bold text-emerald-400">Won Reason: {deal.wonReason}</div>
                      {deal.closingNotes && <div className="text-slate-300 mt-1">{deal.closingNotes}</div>}
                    </div>
                  )}

                  {deal.lostReason && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                      <div className="font-bold text-rose-400">Lost Reason: {deal.lostReason}</div>
                      {deal.closingNotes && <div className="text-slate-300 mt-1">{deal.closingNotes}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stage Progression Audit Trail */}
        {activeTab === 'history' && (
          <div className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Chronological Stage & Probability History
            </h3>

            {(!deal.stageHistory || deal.stageHistory.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No stage transitions recorded yet.
              </div>
            ) : (
              <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
                {deal.stageHistory.map((item, i) => (
                  <div key={item.id || i} className="relative">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-slate-900" />
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-teal-400 uppercase">
                            {item.toStage}
                          </span>
                          {item.fromStage && (
                            <span className="text-[11px] text-slate-500">
                              (from {item.fromStage})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.changedAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium">
                        {item.reason || 'Stage progression'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                        <span>Win Probability: {item.toProbability}%</span>
                        <span>Changed by: {item.changedBy?.fullName || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Activities & Notes */}
        {activeTab === 'activities' && (
          <div className="p-6 space-y-6">
            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Add Deal Note / Update
              </label>
              <textarea
                rows={2}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Log stakeholder call notes, procurement feedback, next steps..."
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNoteContent.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 disabled:opacity-50 transition-all"
                >
                  Post Note
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {(deal.notes || []).map((n) => (
                <div key={n.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-bold text-slate-300">{n.author?.fullName || 'Staff Member'}</span>
                    <span className="font-mono">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-slate-200 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}

              {(deal.activities || []).map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-teal-400">{a.subject}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{a.description}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(a.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MARK WON MODAL */}
      {showWonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mark Deal as WON</h3>
                <p className="text-xs text-slate-400">Commercial contract secured</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleWonSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Won Reason <span className="text-rose-400">*</span>
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
                  placeholder="Highlights on proposal acceptance, agreed commercials..."
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWonModal(false)}
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
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mark Deal as LOST</h3>
                <p className="text-xs text-slate-400">Commercial contract lost</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Lost Reason <span className="text-rose-400">*</span>
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
                  placeholder="Competitor chosen, price difference, feedback..."
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLostModal(false)}
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

      {/* REOPEN MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reopen Deal</h3>
                <p className="text-xs text-slate-400">Resume commercial negotiations</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReopenSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Reopening</label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Client requested revised commercial proposal..."
                  rows={3}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                >
                  {submitting ? 'Reopening...' : 'Reopen Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO CLIENT MODAL */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Convert Won Deal to Client Account</h3>
                <p className="text-xs text-slate-400">{deal.dealNumber} — {deal.title}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Duplicate Candidate Found */}
            {convertStatus?.duplicateFound && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  Existing Client Match Found
                </div>
                <p className="text-xs text-slate-300">
                  Client <strong className="text-white">{convertStatus.candidate.companyName}</strong> (
                  <span className="font-mono text-teal-400">{convertStatus.candidate.clientId}</span>) has matching details.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        const res = await fetch(`/api/crm/deals/${deal.id}/convert-to-client`, {
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
                    Link to {convertStatus.candidate.clientId}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  >
                    Create Separate Client
                  </button>
                </div>
              </div>
            )}

            {/* Conversion Success */}
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
                {convertStatus.credentials && (
                  <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                    <div>Portal Username: {convertStatus.credentials.email}</div>
                    <div>Temporary Password: {convertStatus.credentials.temporaryPassword}</div>
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false);
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
                  Converting this deal will generate a unique client code (
                  <span className="font-mono text-teal-400">CLI-XXXXX</span>), create corporate portal access, and make the
                  organization immediately available for employee deployment and attendance tracking.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvertToClient(false)}
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
