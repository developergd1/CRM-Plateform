'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant, HrmWorkflow } from '@/lib/hrmStore';
import {
  Sliders,
  Play,
  Plus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bell,
  Layers,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface HrmWorkflowEngineViewProps {
  currentTenant: HrmTenant;
}

export const HrmWorkflowEngineView: React.FC<HrmWorkflowEngineViewProps> = ({ currentTenant }) => {
  const [workflows, setWorkflows] = useState<HrmWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [triggerEvent, setTriggerEvent] = useState<'LEAVE_APPLIED' | 'ATTENDANCE_LATE' | 'CANDIDATE_HIRED' | 'ASSET_ALLOCATED' | 'TICKET_CREATED'>('LEAVE_APPLIED');
  const [field, setField] = useState('days');
  const [operator, setOperator] = useState<'GREATER_THAN' | 'LESS_THAN' | 'EQUALS'>('GREATER_THAN');
  const [value, setValue] = useState(3);
  const [step1Role, setStep1Role] = useState('MANAGER');
  const [step2Role, setStep2Role] = useState('HR');
  const [actionDetails, setActionDetails] = useState('Update employee record and deduct quota');

  // Custom Fields state
  const [customFields, setCustomFields] = useState([
    { id: 'cf-1', entity: 'EMPLOYEE', label: 'Emergency Blood Group', type: 'SELECT', required: true },
    { id: 'cf-2', entity: 'EMPLOYEE', label: 'LinkedIn Profile URL', type: 'TEXT', required: false },
    { id: 'cf-3', entity: 'CANDIDATE', label: 'Expected Notice Period (Days)', type: 'NUMBER', required: true },
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldEntity, setNewFieldEntity] = useState('EMPLOYEE');
  const [newFieldType, setNewFieldType] = useState('TEXT');

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/workflows?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [currentTenant]);

  const handleTestExecute = async (workflowId: string) => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/hrm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          action: 'TEST_EXECUTE',
          workflowId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSimulationResult(data.simulation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const res = await fetch('/api/hrm/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          title,
          triggerEvent,
          condition: { field, operator, value },
          steps: [
            { stepName: `${step1Role} Stage Review`, approverRole: step1Role, timeoutHours: 24 },
            { stepName: `${step2Role} Final Approval`, approverRole: step2Role, timeoutHours: 48 },
          ],
          action: { type: 'UPDATE_RECORD', details: actionDetails },
          notifications: [
            { targetRole: 'EMPLOYEE', channel: 'EMAIL', message: `Workflow rule evaluated and completed.` },
          ],
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setTitle('');
        await fetchWorkflows();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel) return;
    setCustomFields([
      ...customFields,
      {
        id: `cf-${Date.now()}`,
        entity: newFieldEntity,
        label: newFieldLabel,
        type: newFieldType,
        required: false,
      },
    ]);
    setNewFieldLabel('');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">Customization & Workflow Engine</h1>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              Core Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define dynamic approval workflows: <strong className="text-[#0D9488]">Event → Conditions → Approval Steps → Action → Notification</strong>
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow Rule</span>
        </button>
      </div>

      {/* Visual Workflow Rules Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#0D9488]" />
          <span>Active Organization Workflows</span>
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs hover:border-[#0D9488]/50 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{wf.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Event Trigger: {wf.triggerEvent}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    LIVE ACTIVE
                  </span>
                  <button
                    onClick={() => handleTestExecute(wf.id)}
                    disabled={simulating}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-xs flex items-center gap-1.5 transition-colors border border-orange-200 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-orange-500" />
                    <span>Simulate & Execute Trigger</span>
                  </button>
                </div>
              </div>

              {/* Visual Pipeline Flow */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                {/* 1. Trigger */}
                <div className="w-full md:w-auto p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">1. Trigger Event</span>
                  <p className="font-bold text-[#0D9488] font-mono mt-0.5">{wf.triggerEvent}</p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

                {/* 2. Condition */}
                <div className="w-full md:w-auto p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">2. Condition Check</span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">
                    {wf.condition?.field} {wf.condition?.operator === 'GREATER_THAN' ? '>' : '='} {wf.condition?.value}
                  </p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

                {/* 3. Steps */}
                <div className="w-full md:w-auto p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">3. Approval Chain</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {wf.steps?.map((s) => s.approverRole).join(' → ')}
                  </p>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

                {/* 4. Action */}
                <div className="w-full md:w-auto p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">4. Action & Notify</span>
                  <p className="font-bold text-[#0D9488] mt-0.5">Automate Ledger + Alert</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Execution Monitor Output (Clean White Surface) */}
      {simulationResult && (
        <div className="bg-white border border-[#0D9488]/40 rounded-3xl p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-900">Live Workflow Engine Execution Report</h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Trigger Status: SUCCESS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p><span className="text-slate-400">Workflow:</span> <strong className="text-slate-900">{simulationResult.workflowTitle}</strong></p>
              <p><span className="text-slate-400">Event Received:</span> <strong className="font-mono text-[#0D9488]">{simulationResult.eventReceived}</strong></p>
              <p><span className="text-slate-400">Condition Evaluated:</span> <strong className="text-emerald-600">TRUE (Criteria Met)</strong></p>
            </div>
            <div className="space-y-1">
              <p><span className="text-slate-400">Scheduled Action:</span> <strong className="text-slate-900">{simulationResult.actionScheduled}</strong></p>
              <p><span className="text-slate-400">Notifications Sent:</span> <strong className="text-orange-600">{simulationResult.notificationsDispatched?.length} alerts dispatched</strong></p>
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400">Steps Dispatched to Task Queue:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {simulationResult.stepsExecuted?.map((s: any) => (
                <div key={s.step} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Step {s.step}: {s.name}</p>
                    <p className="text-[10px] text-slate-400">Assigned to: {s.approver}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#0D9488] font-bold">{s.deadline}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields Engine Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Custom Form Fields Engine</h3>
            <p className="text-xs text-slate-500">Extend employee profiles, job openings, and leave forms with custom metadata.</p>
          </div>
          <span className="text-xs font-mono text-[#0D9488] font-bold">{customFields.length} active custom fields</span>
        </div>

        {/* Existing Custom Fields Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Entity Module</th>
                <th className="px-4 py-2.5">Field Label</th>
                <th className="px-4 py-2.5">Data Type</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customFields.map((cf) => (
                <tr key={cf.id} className="hover:bg-[#F0FDFA]/70">
                  <td className="px-4 py-2.5 font-bold text-[#0D9488] font-mono text-[11px]">{cf.entity}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{cf.label}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">{cf.type}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Field Inline Form */}
        <form onSubmit={handleAddCustomField} className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">New Field Label</label>
            <input
              type="text"
              required
              placeholder="e.g. Passport Expiry Date"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div className="w-40">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Entity</label>
            <select
              value={newFieldEntity}
              onChange={(e) => setNewFieldEntity(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="CANDIDATE">Candidate ATS</option>
              <option value="LEAVE">Leave Request</option>
            </select>
          </div>

          <div className="w-32">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Type</label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
            >
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="DATE">Date</option>
              <option value="SELECT">Select</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Add Field
          </button>
        </form>
      </div>

      {/* New Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Workflow Automation Rule</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Workflow Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asset Allocation Security Signoff"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">1. Trigger Event</label>
                <select
                  value={triggerEvent}
                  onChange={(e: any) => setTriggerEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
                >
                  <option value="LEAVE_APPLIED">Employee Applies for Leave (LEAVE_APPLIED)</option>
                  <option value="ATTENDANCE_LATE">Late Attendance Arrival (ATTENDANCE_LATE)</option>
                  <option value="CANDIDATE_HIRED">Candidate Marked Hired (CANDIDATE_HIRED)</option>
                  <option value="ASSET_ALLOCATED">Hardware Asset Allocated (ASSET_ALLOCATED)</option>
                  <option value="TICKET_CREATED">New Grievance Ticket (TICKET_CREATED)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Field</label>
                  <input
                    type="text"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator</label>
                  <select
                    value={operator}
                    onChange={(e: any) => setOperator(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
                  >
                    <option value="GREATER_THAN">&gt; Greater than</option>
                    <option value="LESS_THAN">&lt; Less than</option>
                    <option value="EQUALS">= Equals</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approval Step 1</label>
                  <select
                    value={step1Role}
                    onChange={(e) => setStep1Role(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
                  >
                    <option value="MANAGER">Reporting Manager</option>
                    <option value="HR">HR Lead</option>
                    <option value="FINANCE">Finance Approver</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approval Step 2</label>
                  <select
                    value={step2Role}
                    onChange={(e) => setStep2Role(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white"
                  >
                    <option value="HR">HR Lead</option>
                    <option value="DIRECTOR">Managing Director</option>
                    <option value="SYSTEM">Auto System Check</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Final Automated Action</label>
                <input
                  type="text"
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Compile & Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
