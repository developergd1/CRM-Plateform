'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Plus,
  Search,
  Filter,
  Building,
  User,
  Clock,
  Phone,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ClientDetailDrawer } from './ClientDetailDrawer';
import { AddClientModal } from './AddClientModal';

export const CrmPipelineView: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error('Error fetching pipeline clients:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const stages = [
    { id: 'NEW', title: 'New Leads', color: 'border-blue-500 bg-blue-50/40 text-blue-700' },
    { id: 'CONTACTED', title: 'Contacted', color: 'border-indigo-500 bg-indigo-50/40 text-indigo-700' },
    { id: 'QUALIFIED', title: 'Qualified', color: 'border-cyan-500 bg-cyan-50/40 text-cyan-700' },
    { id: 'FOLLOW_UP', title: 'Follow-up', color: 'border-amber-500 bg-amber-50/40 text-amber-700' },
    { id: 'PROPOSAL', title: 'Proposal Sent', color: 'border-purple-500 bg-purple-50/40 text-purple-700' },
    { id: 'NEGOTIATION', title: 'Negotiation', color: 'border-orange-500 bg-orange-50/40 text-orange-700' },
    { id: 'WON', title: 'Deals Won', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-700' },
    { id: 'LOST', title: 'Lost / Dormant', color: 'border-rose-500 bg-rose-50/40 text-rose-700' },
  ];

  const filteredClients = clients.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.clientId?.toLowerCase().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      c.company?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8.5rem)] pb-2">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-growth-teal" />
            <span>CRM Pipeline Board</span>
          </h1>
          <p className="text-xs text-slate-500">
            Drag, click, and manage deal progression across all operational stages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter board..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal w-52"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {stages.map((stage) => {
            const stageClients = filteredClients.filter((c) => c.stage === stage.id);
            const totalStageValue = stageClients.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-72 bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col max-h-full shrink-0 shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white/80 rounded-t-2xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">
                        {stage.title}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                        {stageClients.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-growth-teal mt-0.5 block">
                      ₹{(totalStageValue / 1000).toFixed(0)}k volume
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {stageClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-card hover:shadow-md hover:border-growth-teal cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-growth-teal bg-teal-50 px-1.5 py-0.5 rounded">
                          {client.clientId}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            client.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700'
                              : client.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {client.priority}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-growth-teal transition-colors line-clamp-1">
                          {client.name}
                        </div>
                        {client.company && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{client.company}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="font-black text-slate-800">
                          ₹{(client.estimatedValue || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-growth-goldDark" />
                          <span>{client.assignedEmployee?.employeeId || 'Unassigned'}</span>
                        </span>
                      </div>
                    </div>
                  ))}

                  {stageClients.length === 0 && (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400 font-medium">
                      No clients in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer & Modal */}
      <ClientDetailDrawer
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onRefresh={fetchClients}
      />

      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientCreated={fetchClients}
      />
    </div>
  );
};
