'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Sparkles,
  CheckCircle2,
  Clock,
  PlusCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Filter,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import {
  LEAD_STATUS_CONFIG,
  OPPORTUNITY_STAGE_CONFIG,
  DEAL_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  LeadStatus,
  OpportunityStage,
  DealStatus,
} from '@/lib/constants/crm';

interface CrmModuleViewProps {
  module: 'leads' | 'contacts' | 'opportunities' | 'deals' | 'tasks';
}

export const CrmModuleView: React.FC<CrmModuleViewProps> = ({ module }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state for creation
  const [formData, setFormData] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const endpointMap = {
    leads: '/api/crm/leads',
    contacts: '/api/crm/contacts',
    opportunities: '/api/crm/opportunities',
    deals: '/api/crm/deals',
    tasks: '/api/crm/tasks/v2',
  };

  const titleMap = {
    leads: { title: 'Leads & Inquiries', desc: 'Capture, score, and qualify inbound corporate leads' },
    contacts: { title: 'Contacts Directory', desc: 'Key client stakeholders, decision makers, and executives' },
    opportunities: { title: 'Pipeline Opportunities', desc: 'Track deals across qualification, proposal, and negotiation stages' },
    deals: { title: 'Deals & Revenue', desc: 'Active contracts, contract values, and closed wins' },
    tasks: { title: 'Tasks & CRM Activities', desc: 'Pending follow-ups, scheduled calls, and action items' },
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = `${endpointMap[module]}?search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || json.items || []);
      }
    } catch (e) {
      console.error('Error fetching CRM items:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [module]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(endpointMap[module], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create record');
      }
      setShowCreateModal(false);
      setFormData({});
      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const currentInfo = titleMap[module];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{currentInfo.title}</h1>
          <p className="text-xs text-slate-500 mt-1">{currentInfo.desc}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchItems();
            }}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-growth-teal' : ''}`} />
          </button>

          <button
            onClick={() => {
              setErrorMsg(null);
              setFormData({});
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {module === 'leads'
                ? 'Add New Lead'
                : module === 'contacts'
                ? 'Add Contact'
                : module === 'opportunities'
                ? 'New Opportunity'
                : module === 'deals'
                ? 'Create Deal'
                : 'Create Task'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${currentInfo.title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-growth-teal/30 focus:bg-white transition-all"
          />
        </form>
        <button
          type="button"
          onClick={() => fetchItems()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
        >
          Search
        </button>
      </div>

      {/* Content Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              {module === 'leads' ? (
                <Users className="w-6 h-6" />
              ) : module === 'deals' ? (
                <DollarSign className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-800">No {currentInfo.title} Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No entries match your search or filter. Click the button above to add your first record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">ID / Reference</th>
                  <th className="py-3 px-4">Title / Name</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Status / Stage</th>
                  <th className="py-3 px-4">Value / Owner</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item: any) => {
                  const refNumber =
                    item.leadNumber ||
                    item.contactNumber ||
                    item.opportunityNumber ||
                    item.dealNumber ||
                    item.taskNumber ||
                    'REC-000';
                  const title = item.fullName || item.title || item.subject || 'Untitled';
                  const org = item.client?.companyName || item.companyName || '—';
                  const status = item.status || item.stage || 'ACTIVE';
                  const value = item.value || item.amount || item.estimatedValue || 0;
                  const owner = item.assignedTo?.fullName || item.performedBy?.fullName || 'Unassigned';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-growth-teal">
                        {refNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{title}</div>
                        {item.phone && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {org}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {value > 0 ? (
                          <div className="font-bold text-emerald-600">₹{Number(value).toLocaleString()}</div>
                        ) : null}
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>{owner}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">
                {module === 'leads'
                  ? 'Add Inbound Lead'
                  : module === 'contacts'
                  ? 'Add Organization Contact'
                  : module === 'opportunities'
                  ? 'Create Pipeline Opportunity'
                  : module === 'deals'
                  ? 'Create Closed Deal'
                  : 'Add CRM Task'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              {module === 'leads' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company / Enterprise</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech India"
                      value={formData.companyName || ''}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estimated Value (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={formData.estimatedValue || ''}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                </>
              )}

              {module === 'contacts' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Priya Nair"
                      value={formData.fullName || ''}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. VP Operations"
                      value={formData.designation || ''}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. +91 98000 11111"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      placeholder="Email ID"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization Client ID *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. CLI-00001"
                      value={formData.clientId || ''}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                </>
              )}

              {(module === 'opportunities' || module === 'deals') && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 50 Dedicated Staff Deployment"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contract / Deal Value (₹) *</label>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 1200000"
                      value={formData.value || formData.amount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, value: val, amount: val });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client ID (Organization) *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. CLI-00001"
                      value={formData.clientId || ''}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                </>
              )}

              {module === 'tasks' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Follow-up on enterprise proposal"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Priority</label>
                    <select
                      value={formData.priority || 'MEDIUM'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-teal"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-growth-teal text-white rounded-xl hover:bg-growth-tealDark font-bold disabled:opacity-50"
                >
                  {submitLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
