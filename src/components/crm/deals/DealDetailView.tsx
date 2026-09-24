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
  FileCheck2,
  FileSignature,
  Plus,
  RefreshCw,
  SendHorizontal,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  DEAL_STAGES,
  DEAL_STAGE_CONFIG,
  DealStage,
  WON_REASONS,
  LOST_REASONS,
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
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'account' | 'quotes' | 'handoff' | 'activities' | 'timeline'
  >('overview');

  // Modals state
  const [showWonModal, setShowWonModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [wonReason, setWonReason] = useState<string>(WON_REASONS[0]);
  const [wonNotes, setWonNotes] = useState('');
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Create Quote Modal state
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [quoteItems, setQuoteItems] = useState([
    { description: 'Enterprise Platform Subscription', quantity: 1, unitPrice: 250000, discount: 0, taxRate: 18 },
  ]);
  const [quoteTerms, setQuoteTerms] = useState('Standard 30-day commercial terms. GST at 18% applicable.');

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

  useEffect(() => {
    if (dealId) fetchDealDetail();
  }, [dealId]);

  const handleStageChange = async (targetStage: string, reason?: string) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/crm/deals/${deal.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStage: targetStage,
          reason: reason || `Advanced to ${targetStage}`,
          override: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stage');

      setShowWonModal(false);
      setShowLostModal(false);
      fetchDealDetail();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error advancing deal stage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    try {
      // Find or create default product
      const prodRes = await fetch('/api/crm/products');
      const prodData = await prodRes.json();
      const defaultProdId = prodData.data?.[0]?.id;

      const itemsPayload = quoteItems.map((item) => ({
        productId: defaultProdId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
      }));

      const res = await fetch('/api/crm/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          accountId: deal.accountId || deal.account?.id || deal.clientId,
          terms: quoteTerms,
          items: itemsPayload,
        }),
      });

      if (res.ok) {
        setShowCreateQuote(false);
        fetchDealDetail();
      }
    } catch (err) {
      console.error('Error creating quote:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-xs text-slate-500 font-sans">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0D9488] mb-2" />
        Loading Deal 360 Workspace...
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-xs text-slate-400 font-sans">
        Deal not found.
        <div className="mt-4">
          {onBack && (
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold">
              Back to Deals
            </button>
          )}
        </div>
      </div>
    );
  }

  const stageCfg = DEAL_STAGE_CONFIG[deal.stage as DealStage] || {
    label: deal.pipelineStage?.name || deal.stage,
    color: 'text-[#0D9488]',
    bg: 'bg-[#0D9488]/10',
  };

  const companyName = deal.account?.companyName || deal.client?.companyName || deal.lead?.companyName || 'Corporate Prospect';
  const forecastValue = Math.round(((deal.amount || 0) * (deal.probability || 0)) / 100);

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      {/* Top Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-600 transition-colors"
                title="Back to Deals"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded border border-[#0D9488]/20">
                  {deal.dealNumber}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${stageCfg.bg} ${stageCfg.color}`}>
                  {stageCfg.label}
                </span>
                {deal.status === 'WON' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    CLOSED WON
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">{deal.title}</h1>
              <p className="text-xs text-slate-500 mt-1">
                Account: <span className="font-bold text-slate-800">{companyName}</span> • Owner: {deal.assignedTo?.fullName || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Quick Stage Controls */}
          <div className="flex items-center gap-2">
            {deal.stage !== 'WON' && (
              <button
                onClick={() => setShowWonModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Won (Client Handoff)</span>
              </button>
            )}
            {deal.stage !== 'LOST' && deal.stage !== 'WON' && (
              <button
                onClick={() => setShowLostModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark Lost</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateQuote(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-800 font-bold text-xs transition-all cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Create Quote</span>
            </button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#E2E8F0]">
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commercial Value</span>
            <p className="text-xl font-black text-[#111111] mt-1">₹{(deal.amount || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Probability</span>
            <p className="text-xl font-black text-slate-800 mt-1">{deal.probability || 0}%</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weighted Forecast</span>
            <p className="text-xl font-black text-[#0D9488] mt-1">₹{forecastValue.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected Close</span>
            <p className="text-sm font-black text-slate-700 mt-2 font-mono">
              {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : 'Not Set'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-2 border-t border-[#E2E8F0] overflow-x-auto text-xs">
          {[
            { id: 'overview', label: 'Commercial Overview' },
            { id: 'quotes', label: `Quotes (${deal.quotes?.length || 0})` },
            { id: 'handoff', label: 'Client Handoff' },
            { id: 'activities', label: `Activities (${deal.activities?.length || 0})` },
            { id: 'timeline', label: `Stage History (${deal.stageHistory?.length || 0})` },
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#F0FDFA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Scope</h2>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-slate-500">Product / Service Requirement</span>
              <span className="font-semibold text-slate-900">{deal.productService || 'Workforce Platform'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-slate-500">Terms & SLA</span>
              <span className="font-semibold text-slate-900">{deal.terms || 'Standard 30 Days'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="text-slate-500">Pipeline</span>
              <span className="font-semibold text-slate-900">{deal.pipeline?.name || 'Standard B2B Pipeline'}</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Associated Account</h2>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0D9488]" />
              <span className="font-bold text-slate-900 text-sm">{companyName}</span>
            </div>
            {deal.primaryContact && (
              <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                <p className="font-bold text-slate-800">Primary Contact: {deal.primaryContact.fullName}</p>
                <p className="text-slate-500">{deal.primaryContact.phone} • {deal.primaryContact.email || 'No email'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quotations for this Deal</h2>
            <button
              onClick={() => setShowCreateQuote(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Quote</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4">Quote Number</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Items</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {deal.quotes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      No quotes generated yet for this deal. Click "Create Quote" above.
                    </td>
                  </tr>
                ) : (
                  deal.quotes?.map((q: any) => (
                    <tr key={q.id} className="hover:bg-[#F0FDFA]/60">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{q.quoteNumber}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">{q.items?.length || 0}</td>
                      <td className="py-2.5 px-4 text-right font-black text-slate-900">₹{q.total.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{new Date(q.issueDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'handoff' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <SendHorizontal className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-sm font-black text-slate-900">Client Handoff Workflow Status</h2>
          </div>
          <p className="text-xs text-slate-500">
            When this deal reached Closed Won, a formal handoff event was generated for Client Management provisioning.
          </p>

          {deal.handoffs?.length > 0 ? (
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F0FDFA]/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Handoff Reference</span>
                <span className="font-mono font-bold text-slate-900">{deal.handoffs[0].handoffReference}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                  {deal.handoffs[0].status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Deal is currently in {deal.stage}. Once marked WON, the handoff event will trigger automatically.
            </p>
          )}
        </div>
      )}

      {/* Won Modal */}
      {showWonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
              <span>Mark Deal as Closed Won</span>
            </h2>
            <p className="text-slate-500">
              Moving this deal to Closed Won will automatically trigger a <strong>Client Handoff</strong> event to Client Management for client provisioning.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason for Win</label>
              <select
                value={wonReason}
                onChange={(e) => setWonReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
              >
                {WON_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Closing Notes</label>
              <textarea
                rows={2}
                value={wonNotes}
                onChange={(e) => setWonNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                placeholder="Contract notes, scope details..."
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWonModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleStageChange('WON', `${wonReason}: ${wonNotes}`)}
                className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold"
              >
                {submitting ? 'Processing...' : 'Confirm Won & Handoff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 text-rose-600">
              <XCircle className="w-4 h-4" />
              <span>Mark Deal as Closed Lost</span>
            </h2>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason for Loss *</label>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
              >
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Detailed Explanation</label>
              <textarea
                rows={2}
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                placeholder="Competitor price, feature gap..."
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleStageChange('LOST', `${lostReason}: ${lostNotes}`)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
              >
                {submitting ? 'Processing...' : 'Confirm Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Quote Modal */}
      {showCreateQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#0D9488]" />
              <span>Generate Commercial Quote</span>
            </h2>
            <form onSubmit={handleCreateQuote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Item Description</label>
                <input
                  type="text"
                  required
                  value={quoteItems[0].description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuoteItems([{ ...quoteItems[0], description: val }]);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={quoteItems[0].unitPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQuoteItems([{ ...quoteItems[0], unitPrice: val }]);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quoteItems[0].quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQuoteItems([{ ...quoteItems[0], quantity: val }]);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST (%)</label>
                  <input
                    type="number"
                    value={quoteItems[0].taxRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQuoteItems([{ ...quoteItems[0], taxRate: val }]);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={quoteTerms}
                  onChange={(e) => setQuoteTerms(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateQuote(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold"
                >
                  Create & Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
