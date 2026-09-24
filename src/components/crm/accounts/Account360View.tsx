'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  FileCheck2,
  FileSignature,
  RefreshCw,
  Clock,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Plus,
} from 'lucide-react';

interface Account360ViewProps {
  accountId: string;
  onBack: () => void;
  onNavigateToDeal?: (dealId: string) => void;
}

export const Account360View: React.FC<Account360ViewProps> = ({
  accountId,
  onBack,
  onNavigateToDeal,
}) => {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contacts' | 'deals' | 'quotes' | 'contracts' | 'renewals' | 'activities'
  >('overview');

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/accounts/${accountId}`);
      if (res.ok) {
        const json = await res.json();
        setAccount(json.data);
      }
    } catch (err) {
      console.error('Error fetching account 360:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) fetchAccount();
  }, [accountId]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-xs text-slate-500 font-sans">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0D9488] mb-2" />
        Loading Account 360 profile...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-xs text-slate-400 font-sans">
        Account not found.
        <div className="mt-4">
          <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold">
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  const metrics = account.metrics || {
    totalDeals: 0,
    wonRevenue: 0,
    openPipeline: 0,
    weightedPipeline: 0,
    activeContractsCount: 0,
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-600 transition-colors"
              title="Back to Accounts"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                  {account.companyName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-[#E2E8F0]">
                  {account.accountCode}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  account.status === 'CUSTOMER' ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'bg-slate-100 text-slate-600'
                }`}>
                  {account.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Owner: <span className="font-semibold text-slate-800">{account.owner?.fullName || 'Unassigned'}</span> • Type: {account.accountType}
              </p>
            </div>
          </div>

          {/* Client Portal Bridge Status (No password fields) */}
          <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F0FDFA]/40 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Client Management Status
            </span>
            {account.client ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
                <span className="font-mono font-bold text-slate-900">{account.client.clientId}</span>
                <span className="text-[10px] text-slate-500">(Portal Provisioned)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Commercial Prospect (No Portal Access)</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Financial Metric Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#E2E8F0]">
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Open Pipeline</span>
            <p className="text-base font-black text-[#111111] mt-1">₹{metrics.openPipeline.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Won Revenue</span>
            <p className="text-base font-black text-[#0D9488] mt-1">₹{metrics.wonRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Deals</span>
            <p className="text-base font-black text-slate-900 mt-1">{metrics.totalDeals}</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F0FDFA]/50 border border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Contracts</span>
            <p className="text-base font-black text-slate-900 mt-1">{metrics.activeContractsCount}</p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 mt-6 pt-2 border-t border-[#E2E8F0] overflow-x-auto text-xs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'contacts', label: `Contacts (${account.contacts?.length || 0})` },
            { id: 'deals', label: `Deals (${account.deals?.length || 0})` },
            { id: 'quotes', label: `Quotes (${account.quotes?.length || 0})` },
            { id: 'contracts', label: `Contracts (${account.contracts?.length || 0})` },
            { id: 'renewals', label: `Renewals (${account.renewals?.length || 0})` },
            { id: 'activities', label: `Activities (${account.activities?.length || 0})` },
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
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Commercial Profile
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="text-slate-500">Industry</span>
                <span className="font-semibold text-slate-900">{account.industry || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="text-slate-500">Company Size</span>
                <span className="font-semibold text-slate-900">{account.companySize || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="text-slate-500">Annual Revenue</span>
                <span className="font-semibold text-slate-900">
                  {account.annualRevenue ? `₹${account.annualRevenue.toLocaleString('en-IN')}` : 'Not recorded'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="text-slate-500">Source</span>
                <span className="font-semibold text-slate-900">{account.source || 'Direct'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Communication & Address
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{account.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{account.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>{account.website || 'No website'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{account.address ? `${account.address}, ` : ''}{account.city || 'Jaipur'}, {account.country || 'India'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Deals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4">Deal Number</th>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">Stage</th>
                  <th className="py-2.5 px-4">Owner</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {account.deals?.map((deal: any) => (
                  <tr key={deal.id} className="hover:bg-[#F0FDFA]/60">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{deal.dealNumber}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{deal.title}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                        {deal.pipelineStage?.name || deal.stage}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{deal.assignedTo?.fullName || 'Unassigned'}</td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900">₹{(deal.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onNavigateToDeal && onNavigateToDeal(deal.id)}
                        className="px-2 py-1 rounded bg-white border border-[#E2E8F0] hover:bg-[#0D9488] hover:text-white text-slate-700 text-[10px] font-bold transition-all"
                      >
                        View 360
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Contacts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4">Contact Number</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Designation</th>
                  <th className="py-2.5 px-4">Decision Role</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {account.contacts?.map((contact: any) => (
                  <tr key={contact.id} className="hover:bg-[#F0FDFA]/60">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{contact.contactNumber}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{contact.fullName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{contact.designation || 'Not specified'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {contact.decisionRole || 'OTHER'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{contact.phone}</td>
                    <td className="py-2.5 px-4 text-slate-500">{contact.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
