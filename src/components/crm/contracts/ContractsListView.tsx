'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { ContractRecord } from '@/types/crm';

export const ContractsListView: React.FC = () => {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New contract form state
  const [formData, setFormData] = useState({
    contractNumber: '',
    accountName: '',
    contractType: 'MASTER_SERVICE_AGREEMENT',
    value: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    terms: 'Standard Annual MSA with 30-day notice and 99.9% uptime SLA commitment.',
    documentName: 'Master_Services_Agreement_2026.pdf',
    renewalTerms: 'Automatic annual renewal unless cancelled 30 days prior to expiry.',
  });

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/contracts');
      if (res.ok) {
        const json = await res.json();
        setContracts(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const newContract: any = {
      id: `ctr-${Date.now()}`,
      contractNumber: formData.contractNumber || `GI-CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      accountId: 'acc-demo',
      account: { id: 'acc-demo', companyName: formData.accountName || 'Apex Enterprises' },
      contractType: formData.contractType,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate,
      value: Number(formData.value) || 750000,
      terms: formData.terms,
      documentUrl: '/docs/contracts/GI-SAMPLE-AGREEMENT.pdf',
    };

    setContracts([newContract, ...contracts]);
    setIsCreateModalOpen(false);
    showToast(`Contract ${newContract.contractNumber} created successfully`);
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.contractNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.account?.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  const totalValue = contracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-teal-700 text-white px-4 py-2.5 rounded-xl shadow-lg border border-teal-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Client Contracts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Commercial agreements, Master Service Agreements (MSAs), signed terms, and document governance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchContracts}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Contract</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Contract Value</span>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">₹{totalValue.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">{contracts.length} Total Contracts Managed</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Agreements</span>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">{activeCount} In Force</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Legally binding and current</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upcoming Expiry / Renewals</span>
          <p className="text-xl font-bold text-amber-600 mt-1 font-mono">
            {contracts.filter((c) => c.status === 'EXPIRED').length} Requiring Attention
          </p>
          <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">Managed in dedicated Renewals view</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contracts or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>

        {/* Contracts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Contract ID</th>
                <th className="py-3 px-4">Client / Account</th>
                <th className="py-3 px-4">Agreement Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Start / End Date</th>
                <th className="py-3 px-4">Terms & Renewal Clause</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-teal-600 mb-1" />
                    Loading active commercial agreements...
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No contracts found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const statusColors: Record<string, string> = {
                    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
                    EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
                    TERMINATED: 'bg-rose-50 text-rose-700 border-rose-200',
                  };

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-900">
                        {c.contractNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{c.account?.companyName || 'Corporate Client'}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.contractType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${statusColors[c.status] || 'bg-slate-100 text-slate-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>
                          <span>{new Date(c.startDate).toLocaleDateString()}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="font-bold text-slate-800">{new Date(c.endDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        <p className="truncate text-[11px]" title={c.terms || 'Standard Agreement'}>
                          {c.terms || 'Annual MSA with 30-day notice'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{(Number(c.value) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => showToast(`Opening document for ${c.contractNumber}`)}
                            className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
                            title="View Document"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

      {/* Create Contract Modal (Clean White Light Theme) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Client Contract</h3>
                <p className="text-xs text-slate-500 mt-0.5">Record a legally binding agreement and terms</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contract ID / Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GI-CTR-2026-101"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client / Account Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Infosys Ltd"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agreement Type</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                  >
                    <option value="MASTER_SERVICE_AGREEMENT">Master Service Agreement</option>
                    <option value="ANNUAL_MAINTENANCE">Annual Maintenance (AMC)</option>
                    <option value="SUBSCRIPTION_SLA">SaaS Subscription SLA</option>
                    <option value="FIXED_BID">Fixed Scope Project</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contract Value (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1200000"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
