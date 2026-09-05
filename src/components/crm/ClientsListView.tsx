'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  UserPlus,
  ArrowUpRight,
  Filter,
  RefreshCw,
  X,
  Download,
  KeyRound,
  Trash2,
  Shield,
} from 'lucide-react';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { AddEmployeeModal } from '../employees/AddEmployeeModal';
import { ClientCredentialsModal } from './ClientCredentialsModal';
import { isAdminOrHR } from '@/lib/rbac';
import { ClientItem } from '@/types';

export const ClientsListView: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [onboardClientTarget, setOnboardClientTarget] = useState<string | null>(null);
  const [viewingCredentialsClient, setViewingCredentialsClient] = useState<any | null>(null);
  const [deleteClientTarget, setDeleteClientTarget] = useState<ClientItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter) query.set('status', statusFilter);
      if (industryFilter) query.set('industry', industryFilter);

      const res = await fetch(`/api/clients?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error('Error fetching clients:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter, industryFilter]);

  const viewClientDetails = async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClient(data.client);
      }
    } catch (e) {
      console.error('Error fetching client details:', e);
    }
  };

  const exportClientsCSV = () => {
    const headers = ['Client ID', 'Company Name', 'Contact Person', 'Mobile', 'Email', 'Industry', 'Status', 'Date Added', 'Employees'];
    const rows = clients.map((c) => [
      c.clientId,
      `"${c.companyName}"`,
      `"${c.contactPerson}"`,
      `"${c.mobile}"`,
      `"${c.email || ''}"`,
      `"${c.industry || ''}"`,
      c.status,
      new Date(c.dateAdded || c.createdAt).toLocaleDateString(),
      c._count?.employees || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GrowthIndia_Clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClient = async () => {
    if (!deleteClientTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/clients/${deleteClientTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAlertMsg(`🗑️ ${deleteClientTarget.companyName} (${deleteClientTarget.clientId}) has been deleted.`);
        setDeleteClientTarget(null);
        await fetchClients();
        setTimeout(() => setAlertMsg(null), 4000);
      } else {
        alert(data.error || 'Failed to delete client.');
      }
    } catch (e) {
      alert('Network error while deleting client.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Notice */}
      {alertMsg && (
        <div className="p-4 bg-slate-900 border border-growth-teal/40 rounded-2xl text-xs text-teal-300 font-bold shadow-lg animate-in fade-in">
          {alertMsg}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-growth-teal" />
            <span>Client Management Directory</span>
          </h1>
          <p className="text-xs text-slate-500">
            Manage corporate client accounts with unique <strong className="text-growth-goldDark font-mono">CLI-XXXXX</strong> identifiers, login credentials & permissions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportClientsCSV()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client / Company</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Client ID, Company, Contact, Mobile, Industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-growth-teal"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Industries</option>
            <option value="IT & Software Services">IT & Software</option>
            <option value="Logistics & Supply Chain">Logistics</option>
            <option value="Banking & Financial Services">Banking/Finance</option>
            <option value="Healthcare & Life Sciences">Healthcare</option>
            <option value="Manufacturing & Industrial">Manufacturing</option>
            <option value="Retail & E-Commerce">Retail</option>
          </select>

          <button
            onClick={() => fetchClients()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Client ID</th>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Mobile & Email</th>
                <th className="py-3.5 px-4">Industry</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Added</th>
                <th className="py-3.5 px-4 text-center">Staff Count</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-growth-teal border-t-transparent rounded-full animate-spin" />
                      <span>Loading clients registry...</span>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No clients found matching the search criteria.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Client ID */}
                      <td className="py-3.5 px-4 font-mono font-black text-growth-teal tracking-tight whitespace-nowrap">
                        <button
                          onClick={() => viewClientDetails(client.id)}
                          className="hover:underline flex items-center gap-1 text-growth-teal"
                        >
                          <span>{client.clientId}</span>
                        </button>
                      </td>

                      {/* Company Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{client.companyName}</span>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold">
                        {client.contactPerson}
                      </td>

                      {/* Mobile & Email */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-mono text-[11px] font-medium">{client.mobile}</div>
                        {client.email && (
                          <div className="text-[10px] text-slate-400 truncate">{client.email}</div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {client.industry || 'General'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            client.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {client.status === 'ACTIVE' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{client.status}</span>
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(client.dateAdded || client.createdAt).toLocaleDateString()}
                      </td>

                      {/* Enrolled Employees */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                          {client._count?.employees ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setOnboardClientTarget(client.id)}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-growth-teal border border-teal-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                            title="Onboard Employee under this Client"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add Staff</span>
                          </button>

                          <button
                            onClick={() => {
                              setViewingCredentialsClient({
                                clientId: client.clientId,
                                companyName: client.companyName,
                                email: client.email || client.clientId.toLowerCase() + '@growthindia.in',
                                password: '[Encrypted - Set on Creation / Reset in Edit]',
                              });
                            }}
                            className="p-1.5 hover:bg-amber-50 text-slate-600 hover:text-growth-goldDark rounded-lg transition-colors"
                            title="View Client Login Credentials"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {isAdminOrHR(user?.role) && (
                            <>
                              <button
                                onClick={() => setEditingClient(client)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors"
                                title="Edit Client Information"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeleteClientTarget(client)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Delete Client"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => viewClientDetails(client.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-growth-teal rounded-lg transition-colors"
                            title="View Client Details"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* Client Credentials Modal */}
      {viewingCredentialsClient && (
        <ClientCredentialsModal
          isOpen={true}
          onClose={() => setViewingCredentialsClient(null)}
          credentials={viewingCredentialsClient}
        />
      )}

      {/* Delete Client Confirmation Modal */}
      {deleteClientTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Client Record</h3>
                <p className="text-xs text-slate-500">{deleteClientTarget.companyName} ({deleteClientTarget.clientId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this client? The client account and its associated user credentials will be removed.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteClient}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteClientTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientCreated={() => fetchClients()}
      />

      {/* Edit Client Modal */}
      {editingClient && (
        <EditClientModal
          isOpen={true}
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onClientUpdated={() => {
            fetchClients();
            if (selectedClient?.id === editingClient.id) {
              viewClientDetails(editingClient.id);
            }
          }}
        />
      )}

      {/* Add Employee under Client Modal */}
      {onboardClientTarget && (
        <AddEmployeeModal
          isOpen={true}
          preselectedClientId={onboardClientTarget}
          onClose={() => setOnboardClientTarget(null)}
          onEmployeeCreated={() => fetchClients()}
        />
      )}

      {/* Client Detail Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-growth-teal to-growth-gold flex items-center justify-center font-bold text-lg text-white shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-growth-gold bg-amber-950/80 px-2 py-0.5 rounded border border-growth-gold/30">
                      {selectedClient.clientId}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        selectedClient.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {selectedClient.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-1 text-white tracking-tight">
                    {selectedClient.companyName}
                  </h2>
                  <p className="text-xs text-slate-400">{selectedClient.industry || 'Corporate Account'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdminOrHR(user?.role) && (
                  <button
                    onClick={() => setEditingClient(selectedClient)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                    title="Edit Client"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelectedClient(null)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Client Info Grid */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Person</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedClient.contactPerson}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Mobile Contact</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedClient.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Email Address</span>
                  <span className="font-semibold text-slate-800">{selectedClient.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Date Added</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedClient.dateAdded || selectedClient.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedClient.address && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Corporate Address</span>
                  <span className="font-medium text-slate-800">{selectedClient.address}</span>
                </div>
              )}

              {/* Enrolled Employees Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-growth-teal" />
                    <span>Enrolled Employees ({selectedClient.employees?.length || 0})</span>
                  </span>

                  <button
                    onClick={() => {
                      const target = selectedClient.id;
                      setSelectedClient(null);
                      setOnboardClientTarget(target);
                    }}
                    className="px-3 py-1 bg-growth-teal hover:bg-growth-tealDark text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Employee</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedClient.employees?.map((emp: any) => (
                    <div
                      key={emp.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {emp.employeeId} • {emp.designation}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          emp.status === 'BLOCKED' || emp.isBlocked
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </div>
                  ))}

                  {selectedClient.employees?.length === 0 && (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                      No employees enrolled under this client yet. Click &quot;Add Employee&quot; to onboard.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
