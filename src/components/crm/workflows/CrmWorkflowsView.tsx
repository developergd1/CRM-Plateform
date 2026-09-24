'use client';

import React, { useState, useEffect } from 'react';
import { Workflow, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CrmWorkflowsView: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('DEAL_WON');
  const [actionTitle, setActionTitle] = useState('Client Onboarding Handoff Task');

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/workflows');
      if (res.ok) {
        const json = await res.json();
        setWorkflows(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          trigger,
          conditions: [],
          actions: [{ type: 'CREATE_TASK', payload: { title: actionTitle, priority: 'HIGH' } }],
        }),
      });

      if (res.ok) {
        setShowAdd(false);
        setName('');
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Error creating workflow:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Automation & Workflow Rules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Trigger-condition-action commercial workflow automation, automated follow-up generation, and notifications
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workflow</span>
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Workflow Triggers</h2>
          <button onClick={fetchWorkflows} className="p-1.5 rounded-lg border border-[#E2E8F0] text-slate-500 hover:bg-[#F0FDFA]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No custom workflow rules active. Standard triggers (Deal Won Handoff) are enabled by default.
            </div>
          ) : (
            workflows.map((wf) => (
              <div key={wf.id} className="p-4 flex items-center justify-between hover:bg-[#F0FDFA]/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{wf.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0D9488]/10 text-[#0D9488]">
                      {wf.trigger}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Auto-trigger on business event • Active status
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-sm font-black text-slate-900">Create Automation Workflow</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Won Deal Followup Generator"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Event Trigger</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="DEAL_WON">Deal Marked Won</option>
                  <option value="LEAD_QUALIFIED">Lead Qualified</option>
                  <option value="LEAD_CREATED">New Lead Created</option>
                  <option value="DEAL_STAGE_CHANGED">Deal Stage Changed</option>
                  <option value="CONTRACT_EXPIRING">Contract Expiring (30 Days)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Action: Task Title</label>
                <input
                  type="text"
                  required
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0D9488] text-white font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
