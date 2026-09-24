'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Layers,
  ArrowUpRight,
  MoreVertical,
  Activity,
  Check,
} from 'lucide-react';

interface ClientItem {
  id: string;
  clientId: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string | null;
  industry: string | null;
  companyType?: string | null;
  gstNumber?: string | null;
  status: string;
  dateAdded: string;
  assignedModules?: string[];
  subscriptionPlan?: string;
  _count?: {
    employees: number;
  };
}

interface CmsClientsListViewProps {
  onSelectClient: (clientId: string, initialTab?: string) => void;
  onNavigateToOnboarding: () => void;
}

export const CmsClientsListView: React.FC<CmsClientsListViewProps> = ({
  onSelectClient,
  onNavigateToOnboarding,
}) => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      showToast(err.message || 'Error loading client directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleStatus = async (client: ClientItem) => {
    const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmPrompt = window.confirm(
      `Are you sure you want to change status of "${client.companyName}" to ${newStatus}?`
    );
    if (!confirmPrompt) return;

    try {
      setActionLoadingId(client.id);
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update client status');

      showToast(`Client ${client.clientId} is now ${newStatus}`);
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c))
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick edit modal submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      setActionLoadingId(editingClient.id);
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: editingClient.companyName,
          contactPerson: editingClient.contactPerson,
          mobile: editingClient.mobile,
          email: editingClient.email,
          industry: editingClient.industry,
          companyType: editingClient.companyType,
          assignedModules: editingClient.assignedModules,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update client');

      showToast(`Client ${editingClient.clientId} updated successfully!`);
      setClients((prev) =>
        prev.map((c) => (c.id === editingClient.id ? { ...c, ...editingClient } : c))
      );
      setEditingClient(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const industries = Array.from(new Set(clients.map((c) => c.industry).filter(Boolean)));

  const filtered = clients.filter((c) => {
    // Status filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    // Industry filter
    if (industryFilter !== 'ALL' && c.industry !== industryFilter) return false;

    // Search query matching: Client ID, Company Name, Contact Person, Mobile, Email
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesId = c.clientId?.toLowerCase().includes(q);
      const matchesName = c.companyName?.toLowerCase().includes(q);
      const matchesContact = c.contactPerson?.toLowerCase().includes(q);
      const matchesMobile = c.mobile?.toLowerCase().includes(q);
      const matchesEmail = c.email?.toLowerCase().includes(q);
      return matchesId || matchesName || matchesContact || matchesMobile || matchesEmail;
    }

    return true;
  });

  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = clients.filter((c) => c.status === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{toastMsg.text}</span>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Clients & Organizations Directory</span>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {filtered.length} of {clients.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Production directory of all enterprise tenants, accounts, and assigned modules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchClients}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToOnboarding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Onboard New Client</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Client ID (CLI-XXXXX), Company Name, Contact Person, Mobile, or Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          {/* Industry Filter */}
          {industries.length > 0 && (
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-[#0D9488] focus:outline-none"
            >
              <option value="ALL">All Industries</option>
              {industries.map((ind) => (
                <option key={ind as string} value={ind as string}>
                  {ind}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Client ID</th>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Mobile & Email</th>
                <th className="py-3.5 px-4">Industry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Modules</th>
                <th className="py-3.5 px-4">Date Added</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-[#0D9488] animate-spin" />
                      <span>Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No clients matching your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const modules = Array.isArray(client.assignedModules) && client.assignedModules.length > 0
                    ? client.assignedModules
                    : ['EMS'];

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Client ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {client.clientId}
                        </span>
                      </td>

                      {/* Company Name */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectClient(client.id, 'profile')}
                          className="font-bold text-slate-900 hover:text-[#0D9488] hover:underline text-left cursor-pointer"
                        >
                          {client.companyName}
                        </button>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {client.companyType || 'Private Limited'}
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {client.contactPerson}
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-mono text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{client.mobile}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate max-w-[160px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {client.industry || 'General Services'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            client.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              client.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{client.status}</span>
                        </span>
                      </td>

                      {/* Assigned Modules */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {modules.map((m) => (
                            <span
                              key={m}
                              className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {client.dateAdded ? new Date(client.dateAdded).toLocaleDateString('en-IN') : 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {/* 1. Open Client EMS Button */}
                        <button
                          type="button"
                          onClick={() => onSelectClient(client.id, 'ems')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                          title="Open Client-Specific EMS"
                        >
                          <span>Open EMS</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>

                        {/* 2. View Profile Button */}
                        <button
                          type="button"
                          onClick={() => onSelectClient(client.id, 'profile')}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 3. Edit Button */}
                        <button
                          type="button"
                          onClick={() => setEditingClient({ ...client, assignedModules: modules })}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Client"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* 4. Activate / Deactivate Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(client)}
                          disabled={actionLoadingId === client.id}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            client.status === 'ACTIVE'
                              ? 'text-emerald-600 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={client.status === 'ACTIVE' ? 'Deactivate Client' : 'Activate Client'}
                        >
                          {client.status === 'ACTIVE' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
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

      {/* QUICK EDIT CLIENT MODAL */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                Edit Client: {editingClient.clientId}
              </h3>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editingClient.companyName}
                  onChange={(e) => setEditingClient({ ...editingClient, companyName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={editingClient.contactPerson}
                    onChange={(e) => setEditingClient({ ...editingClient, contactPerson: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    required
                    value={editingClient.mobile}
                    onChange={(e) => setEditingClient({ ...editingClient, mobile: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>

              {/* Module Toggles */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Assigned Modules</label>
                <div className="grid grid-cols-3 gap-2">
                  {['EMS', 'CRM', 'HRM'].map((mod) => {
                    const isChecked = editingClient.assignedModules?.includes(mod);
                    return (
                      <div
                        key={mod}
                        onClick={() => {
                          const current = editingClient.assignedModules || ['EMS'];
                          const next = current.includes(mod)
                            ? current.filter((m) => m !== mod)
                            : [...current, mod];
                          if (next.length > 0) {
                            setEditingClient({ ...editingClient, assignedModules: next });
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-center cursor-pointer font-bold text-xs select-none transition-all ${
                          isChecked
                            ? 'bg-[#0D9488]/10 border-[#0D9488] text-[#0D9488]'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {mod}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === editingClient.id}
                  className="px-5 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {actionLoadingId === editingClient.id ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
