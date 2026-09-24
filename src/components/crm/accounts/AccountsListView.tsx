'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Briefcase,
  FileCheck2,
  FileSignature,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { AccountItem } from '@/types/crm';

interface AccountsListViewProps {
  onSelectAccount: (accountId: string) => void;
}

export const AccountsListView: React.FC<AccountsListViewProps> = ({ onSelectAccount }) => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Account Form State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let url = `/api/crm/accounts?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, industry, phone, email, city }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCompanyName('');
        setIndustry('');
        setPhone('');
        setEmail('');
        setCity('');
        fetchAccounts();
      }
    } catch (err) {
      console.error('Failed to create account:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Accounts / Client 360
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Commercial enterprise accounts, client relationship history, and active contract portfolios
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Account</span>
          </button>

          <a
            href="/api/crm/export?entity=accounts"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-700 font-semibold text-xs shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts, codes, phones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488] text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CUSTOMER">Active Customer</option>
            <option value="INACTIVE">Inactive</option>
            <option value="FORMER_CUSTOMER">Former Customer</option>
          </select>

          <button
            type="button"
            onClick={fetchAccounts}
            className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0D9488] mb-2" />
            Loading accounts directory...
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No accounts found matching search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry & City</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Deals</th>
                  <th className="py-3 px-4 text-center">Client Portal</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {acc.accountCode}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{acc.companyName}</p>
                      <p className="text-[10px] text-slate-500">{acc.phone} • {acc.email || 'No email'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p className="font-medium">{acc.industry || 'General'}</p>
                      <p className="text-[10px] text-slate-400">{acc.city || 'India'}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {acc.owner?.fullName || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.status === 'CUSTOMER'
                          ? 'bg-[#0D9488]/10 text-[#0D9488]'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {acc._count?.deals || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {acc.client ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0D9488]/10 text-[#0D9488]">
                          {acc.client.clientId}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Provisioned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectAccount(acc.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-white border border-[#E2E8F0] hover:bg-[#0D9488] hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        <span>View 360</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-900">Create Commercial Account</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Industry</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
