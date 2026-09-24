'use client';

import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  ArrowUp,
  ArrowDown,
  Shield,
  Percent,
  Sparkles,
} from 'lucide-react';

interface Stage {
  id?: string;
  name: string;
  order: number;
  probability: number;
  colorToken: string;
  isWon?: boolean;
  isLost?: boolean;
  _count?: { deals: number };
}

interface Pipeline {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  stages: Stage[];
  _count?: { deals: number };
}

export const PipelineSettingsView: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New pipeline modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPipeName, setNewPipeName] = useState('');
  const [newPipeCode, setNewPipeCode] = useState('');

  // New stage input state
  const [newStageName, setNewStageName] = useState('');
  const [newStageProb, setNewStageProb] = useState(25);
  const [newStageColor, setNewStageColor] = useState('blue');

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/crm/pipelines');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pipelines');
      setPipelines(data.pipelines || []);
      if (data.pipelines && data.pipelines.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(data.pipelines[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading pipelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const currentPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipeName.trim() || !newPipeCode.trim()) return;

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await fetch('/api/crm/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPipeName.trim(),
          code: newPipeCode.trim(),
          isDefault: pipelines.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pipeline');
      setSuccessMsg(`Pipeline "${data.pipeline.name}" created successfully`);
      setIsCreateOpen(false);
      setNewPipeName('');
      setNewPipeCode('');
      await fetchPipelines();
      setSelectedPipelineId(data.pipeline.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating pipeline');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPipeline || !newStageName.trim()) return;

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await fetch(`/api/crm/pipelines/${currentPipeline.id}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStageName.trim(),
          probability: Number(newStageProb),
          colorToken: newStageColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create stage');
      setSuccessMsg(`Stage "${data.stage.name}" added successfully`);
      setNewStageName('');
      setNewStageProb(25);
      await fetchPipelines();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding stage');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (!currentPipeline) return;
    const stages = [...currentPipeline.stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const [moved] = stages.splice(index, 1);
    stages.splice(targetIndex, 0, moved);

    const reordered = stages.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    // Optimistic UI update
    setPipelines((prev) =>
      prev.map((p) => (p.id === currentPipeline.id ? { ...p, stages: reordered } : p))
    );

    try {
      const res = await fetch(`/api/crm/pipelines/${currentPipeline.id}/stages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: reordered }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update order');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reordering stages');
      await fetchPipelines();
    }
  };

  const handleDeletePipeline = async (pipeId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;
    try {
      setSaving(true);
      setErrorMsg('');
      const res = await fetch(`/api/crm/pipelines/${pipeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete pipeline');
      setSuccessMsg('Pipeline deleted successfully');
      setSelectedPipelineId('');
      await fetchPipelines();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting pipeline');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
        <p className="text-sm font-semibold">Loading Commercial Pipelines & Stages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <GitPullRequest className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pipelines & Deal Stages Configuration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build bespoke sales funnels, set closing probabilities, define milestone gates, and synchronize with Kanban board.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Pipeline</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pipeline Selector List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider px-1">
            Pipelines ({pipelines.length})
          </h2>

          <div className="space-y-2">
            {pipelines.map((p) => {
              const isSelected = p.id === selectedPipelineId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#F0FDFA] border-[#0D9488] shadow-xs'
                      : 'bg-white border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{p.name}</span>
                    {p.isDefault && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0D9488] text-white">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="font-mono text-[10px] text-slate-400">{p.code}</span>
                    <span>{p.stages?.length || 0} stages • {p._count?.deals || 0} deals</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Pipeline Stages Manager */}
        <div className="lg:col-span-3 space-y-6">
          {currentPipeline ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                <div>
                  <h3 className="text-base font-black text-slate-900">{currentPipeline.name}</h3>
                  <p className="text-xs text-slate-500">
                    Code: <span className="font-mono text-slate-700">{currentPipeline.code}</span> • Total Deals Assigned:{' '}
                    <span className="font-bold text-[#0D9488]">{currentPipeline._count?.deals || 0}</span>
                  </p>
                </div>

                {!currentPipeline.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeletePipeline(currentPipeline.id)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Pipeline</span>
                  </button>
                )}
              </div>

              {/* Stage sequence table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Sequential Progression Stages
                </h4>

                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                  {currentPipeline.stages?.map((stage, idx) => (
                    <div
                      key={stage.id || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{stage.name}</span>
                            {stage.isWon && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Won Stage
                              </span>
                            )}
                            {stage.isLost && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                Lost Stage
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Forecast Probability:{' '}
                            <span className="font-bold text-slate-700">{stage.probability}%</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'down')}
                          disabled={idx === (currentPipeline.stages?.length || 0) - 1}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Stage Form */}
              <form onSubmit={handleAddStage} className="pt-4 border-t border-[#E2E8F0] space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Add Milestone Stage
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Stage Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Legal & Contract Review"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newStageProb}
                      onChange={(e) => setNewStageProb(parseInt(e.target.value, 10))}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Color Token</label>
                    <select
                      value={newStageColor}
                      onChange={(e) => setNewStageColor(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    >
                      <option value="blue">Blue</option>
                      <option value="purple">Purple</option>
                      <option value="amber">Amber</option>
                      <option value="indigo">Indigo</option>
                      <option value="emerald">Emerald</option>
                      <option value="rose">Rose</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !newStageName.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Append Stage to Funnel</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white border border-[#E2E8F0] rounded-xl">
              No pipeline selected. Select or create one above.
            </div>
          )}
        </div>
      </div>

      {/* New Pipeline Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">Create New Sales Pipeline</h3>
            <p className="text-xs text-slate-500">
              Pipelines represent distinct sales lifecycles, such as Enterprise Deals, Channel Partners, or Retainers.
            </p>

            <form onSubmit={handleCreatePipeline} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pipeline Name</label>
                <input
                  type="text"
                  placeholder="e.g. Government & PSU Tenders"
                  value={newPipeName}
                  onChange={(e) => {
                    setNewPipeName(e.target.value);
                    if (!newPipeCode) {
                      setNewPipeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unique Code</label>
                <input
                  type="text"
                  placeholder="e.g. GOV_TENDERS"
                  value={newPipeCode}
                  onChange={(e) => setNewPipeCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newPipeName.trim() || !newPipeCode.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
