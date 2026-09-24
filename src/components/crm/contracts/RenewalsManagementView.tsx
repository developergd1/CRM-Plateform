'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  FileSignature,
  Building2,
  BellRing,
} from 'lucide-react';

interface RenewalItem {
  id: string;
  contractNumber: string;
  accountName: string;
  contactPerson: string;
  currentValue: number;
  proposedValue: number;
  expiryDate: string;
  renewalDueDate: string;
  daysRemaining: number;
  status: 'IN_NEGOTIATION' | 'PROPOSAL_SENT' | 'DECISION_PENDING' | 'RENEWED' | 'NOT_RENEWED';
  owner: string;
  renewalTerms: string;
  lastFollowUp: string;
}

const INITIAL_RENEWALS: RenewalItem[] = [
  {
    id: 'rnw-1',
    contractNumber: 'GI-CTR-2025-089',
    accountName: 'Tata Consultancy Services',
    contactPerson: 'Suresh Narayanan',
    currentValue: 1250000,
    proposedValue: 1450000,
    expiryDate: '2026-10-15',
    renewalDueDate: '2026-10-01',
    daysRemaining: 18,
    status: 'IN_NEGOTIATION',
    owner: 'Vikram Singhania (Sales Exec A)',
    renewalTerms: 'Annual MSA renewal with 15% tier expansion',
    lastFollowUp: 'Yesterday (Call done)',
  },
  {
    id: 'rnw-2',
    contractNumber: 'GI-CTR-2025-092',
    accountName: 'Reliance Retail Logistics',
    contactPerson: 'Kavita Chawla',
    currentValue: 850000,
    proposedValue: 920000,
    expiryDate: '2026-10-25',
    renewalDueDate: '2026-10-10',
    daysRemaining: 28,
    status: 'PROPOSAL_SENT',
    owner: 'Priya Mehta (Sales Exec B)',
    renewalTerms: 'Fixed price SaaS SLA with dedicated support',
    lastFollowUp: '3 days ago (Proposal emailed)',
  },
  {
    id: 'rnw-3',
    contractNumber: 'GI-CTR-2025-077',
    accountName: 'HDFC Securities Ltd',
    contactPerson: 'Amitabh Joshi',
    currentValue: 2400000,
    proposedValue: 2650000,
    expiryDate: '2026-11-12',
    renewalDueDate: '2026-10-28',
    daysRemaining: 46,
    status: 'DECISION_PENDING',
    owner: 'Vikram Singhania (Sales Exec A)',
    renewalTerms: 'Multi-year enterprise contract extension',
    lastFollowUp: '5 days ago (Board approval pending)',
  },
  {
    id: 'rnw-4',
    contractNumber: 'GI-CTR-2025-061',
    accountName: 'Mahindra Auto Components',
    contactPerson: 'Rajeev Bansal',
    currentValue: 620000,
    proposedValue: 680000,
    expiryDate: '2026-09-30',
    renewalDueDate: '2026-09-20',
    daysRemaining: 4,
    status: 'IN_NEGOTIATION',
    owner: 'Rohit Verma',
    renewalTerms: 'Quarterly rollover with 10% indexation',
    lastFollowUp: 'Today (Final commercial alignment)',
  },
  {
    id: 'rnw-5',
    contractNumber: 'GI-CTR-2025-045',
    accountName: 'Zomato Enterprise Services',
    contactPerson: 'Deepika Sen',
    currentValue: 1100000,
    proposedValue: 1250000,
    expiryDate: '2026-09-15',
    renewalDueDate: '2026-09-01',
    daysRemaining: -9,
    status: 'RENEWED',
    owner: 'Priya Mehta (Sales Exec B)',
    renewalTerms: 'Renewed for FY27 with +13.6% ARR increase',
    lastFollowUp: 'Signed & Closed',
  },
];

export const RenewalsManagementView: React.FC = () => {
  const [renewals, setRenewals] = useState<RenewalItem[]>(INITIAL_RENEWALS);
  const [filterDays, setFilterDays] = useState<'ALL' | '30' | '60' | '90' | 'EXPIRED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/renewals')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (json.data && json.data.length > 0) {
          const mapped: RenewalItem[] = json.data.map((r: any) => {
            const renewalDate = new Date(r.renewalDate);
            const today = new Date();
            const diffDays = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: r.id,
              contractNumber: r.contract?.contractNumber || 'GI-CTR-2025-089',
              accountName: r.account?.companyName || 'Enterprise Account',
              contactPerson: r.account?.phone || 'Account Representative',
              currentValue: r.contract?.value || r.expectedValue || 1000000,
              proposedValue: r.expectedValue || (r.contract?.value ? r.contract.value * 1.15 : 1150000),
              expiryDate: r.contract?.endDate ? new Date(r.contract.endDate).toISOString().split('T')[0] : '2026-10-15',
              renewalDueDate: renewalDate.toISOString().split('T')[0],
              daysRemaining: diffDays,
              status: (r.status as any) || 'IN_NEGOTIATION',
              owner: 'Sales Lead',
              renewalTerms: 'Annual MSA renewal with SLA extension',
              lastFollowUp: 'Active in CRM',
            };
          });
          setRenewals(mapped);
        }
      })
      .catch((err) => console.error('Failed to load renewals:', err));
  }, []);

  // Decision Modal
  const [selectedRenewalForDecision, setSelectedRenewalForDecision] = useState<RenewalItem | null>(null);
  const [proposedValueInput, setProposedValueInput] = useState<number>(0);
  const [decisionNotes, setDecisionNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleUpdateStatus = (id: string, newStatus: RenewalItem['status']) => {
    setRenewals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    showToast(`Renewal status updated to ${newStatus.replace('_', ' ')}`);
    setSelectedRenewalForDecision(null);
  };

  const handleSendReminder = (item: RenewalItem) => {
    showToast(`Reminder notification dispatched to ${item.owner} for ${item.accountName}`);
  };

  const filteredRenewals = renewals.filter((r) => {
    const matchesSearch =
      r.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    if (filterDays === '30') return r.daysRemaining > 0 && r.daysRemaining <= 30;
    if (filterDays === '60') return r.daysRemaining > 0 && r.daysRemaining <= 60;
    if (filterDays === '90') return r.daysRemaining > 0 && r.daysRemaining <= 90;
    if (filterDays === 'EXPIRED') return r.daysRemaining <= 0;

    return true;
  });

  const totalRenewalPipeline = renewals
    .filter((r) => r.status !== 'NOT_RENEWED')
    .reduce((sum, r) => sum + r.proposedValue, 0);

  const expiringIn30Days = renewals.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 30).length;
  const renewedCount = renewals.filter((r) => r.status === 'RENEWED').length;

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#0D9488] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#115E59] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Flow Visualizer */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contract Renewals Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Proactive tracking of expiring commercial agreements, renewal terms, uplift calculations, and retention decisions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
              {expiringIn30Days} Expiring within 30 Days
            </span>
          </div>
        </div>

        {/* Contract to Renewal Relationship Bar */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Lifecycle Retention Flow
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              1. Client Account
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              2. Active Contract
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 font-bold text-amber-900">
              3. Expiry Approaching (90-30 Days)
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-[#0D9488]/10 border border-[#0D9488]/30 font-bold text-[#0D9488] shadow-2xs">
              4. Renewal Negotiation
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 font-bold text-emerald-900">
              5. New / Renewed Contract
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Renewal Pipeline</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
            ₹{totalRenewalPipeline.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#0D9488] font-semibold mt-0.5 block">+12.4% Avg Proposed Uplift</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiring in 30 Days</span>
          <p className="text-xl font-bold text-amber-600 mt-1 font-mono">{expiringIn30Days} Agreements</p>
          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">High urgency follow-ups</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewed & Retained</span>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">{renewedCount} Contracts</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Retained FY26-27 value</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Renewal Retention Rate</span>
          <p className="text-xl font-bold text-indigo-700 mt-1 font-mono">92.5%</p>
          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">Benchmark: &gt; 85%</span>
        </div>
      </div>

      {/* Main Renewals Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by account, contract #, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D9488]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-semibold">Expiry:</span>
              {(['ALL', '30', '60', '90', 'EXPIRED'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilterDays(d)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filterDays === d ? 'bg-[#0D9488] text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d === 'ALL' ? 'All' : d === 'EXPIRED' ? 'Overdue' : `≤ ${d}d`}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_NEGOTIATION">In Negotiation</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="DECISION_PENDING">Decision Pending</option>
              <option value="RENEWED">Renewed</option>
              <option value="NOT_RENEWED">Not Renewed</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Contract / Client Account</th>
                <th className="py-3 px-4">Expiry & Due Date</th>
                <th className="py-3 px-4">Current vs Proposed Value</th>
                <th className="py-3 px-4">Renewal Status</th>
                <th className="py-3 px-4">Renewal Owner</th>
                <th className="py-3 px-4">Last Follow-up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRenewals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No renewal records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRenewals.map((r) => {
                  const uplift = Math.round(((r.proposedValue - r.currentValue) / r.currentValue) * 100);

                  const statusBadges: Record<RenewalItem['status'], { label: string; class: string }> = {
                    IN_NEGOTIATION: { label: 'In Negotiation', class: 'bg-sky-50 text-sky-700 border-sky-200' },
                    PROPOSAL_SENT: { label: 'Proposal Sent', class: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/30' },
                    DECISION_PENDING: { label: 'Decision Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
                    RENEWED: { label: 'Renewed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' },
                    NOT_RENEWED: { label: 'Not Renewed', class: 'bg-rose-50 text-rose-700 border-rose-200' },
                  };

                  const badge = statusBadges[r.status];

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{r.accountName}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {r.contractNumber} • Contact: {r.contactPerson}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{r.expiryDate}</span>
                          {r.daysRemaining > 0 ? (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                r.daysRemaining <= 15
                                  ? 'bg-rose-50 text-rose-700'
                                  : r.daysRemaining <= 30
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.daysRemaining}d left
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Due: {r.renewalDueDate}</p>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1 text-slate-900 font-bold">
                          <span>₹{r.proposedValue.toLocaleString('en-IN')}</span>
                          {uplift > 0 && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 rounded">
                              +{uplift}%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-through">
                          ₹{r.currentValue.toLocaleString('en-IN')}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <UserCheck className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span className="truncate max-w-[150px]">{r.owner}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {r.lastFollowUp}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(r)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-[#0D9488] transition-colors cursor-pointer"
                            title="Send Follow-up Reminder"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRenewalForDecision(r);
                              setProposedValueInput(r.proposedValue);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-[#0D9488]/10 hover:text-[#0D9488] border border-slate-200 transition-colors cursor-pointer"
                          >
                            Decision
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

      {/* Renewal Decision Modal (Clean Light Theme) */}
      {selectedRenewalForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Renewal Decision & Action</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Contract: {selectedRenewalForDecision.contractNumber} • {selectedRenewalForDecision.accountName}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Value:</span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{selectedRenewalForDecision.currentValue.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Renewal Terms:</span>
                <span className="font-medium text-slate-700">{selectedRenewalForDecision.renewalTerms}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Proposed Value (₹)
              </label>
              <input
                type="number"
                value={proposedValueInput}
                onChange={(e) => setProposedValueInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Renewal Notes / Decision Reason
              </label>
              <textarea
                rows={2}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Details of client negotiation, terms agreed, or churn risk..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRenewalForDecision.id, 'RENEWED')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  ✓ Mark Renewed
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRenewalForDecision.id, 'NOT_RENEWED')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  ✕ Mark Not Renewed
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRenewalForDecision(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
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
