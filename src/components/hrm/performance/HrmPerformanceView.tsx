'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant, HrmGoal } from '@/lib/hrmStore';
import {
  Target,
  Plus,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface HrmPerformanceViewProps {
  currentTenant: HrmTenant;
}

export const HrmPerformanceView: React.FC<HrmPerformanceViewProps> = ({ currentTenant }) => {
  const [goals, setGoals] = useState<HrmGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState('');
  const [employeeName, setEmployeeName] = useState('Aarav Sharma');
  const [category, setCategory] = useState<'BUSINESS' | 'TECHNICAL' | 'LEADERSHIP' | 'LEARNING'>('BUSINESS');
  const [weightage, setWeightage] = useState(30);
  const [targetDate, setTargetDate] = useState('2026-10-31');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/performance?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [currentTenant]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const res = await fetch('/api/hrm/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          employeeId: 'hrm-emp-101',
          employeeName,
          title,
          category,
          weightage,
          targetDate,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle('');
        await fetchGoals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      const res = await fetch('/api/hrm/performance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          progress: newProgress,
        }),
      });
      if (res.ok) {
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? { ...g, progress: newProgress, status: newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS' } : g))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Performance & OKRs / KRAs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track business goals, continuous feedback, 360 appraisals, and employee performance scores.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Set New Goal / KRA</span>
        </button>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4 hover:border-[#0D9488] transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                  {goal.category} • {goal.weightage}% weight
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    goal.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30'
                  }`}
                >
                  {goal.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{goal.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Owner: <strong className="text-slate-800">{goal.employeeName}</strong></p>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-mono text-[#0D9488] font-bold">{goal.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress}
                  onChange={(e) => handleUpdateProgress(goal.id, Number(e.target.value))}
                  className="w-full accent-[#0D9488] cursor-pointer"
                />
              </div>

              {goal.managerFeedback && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
                  "{goal.managerFeedback}"
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Target: {goal.targetDate}</span>
              </span>
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{goal.rating || 4.8} / 5.0</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Set Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Define Performance Goal / OKR</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Statement / Key Result</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Reduce customer onboarding cycle from 14 days to 4 days"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
                  >
                    <option value="BUSINESS">Business & Revenue</option>
                    <option value="TECHNICAL">Engineering & Architecture</option>
                    <option value="LEADERSHIP">Leadership & Mentorship</option>
                    <option value="LEARNING">Skill Upskilling</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={weightage}
                    onChange={(e) => setWeightage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
