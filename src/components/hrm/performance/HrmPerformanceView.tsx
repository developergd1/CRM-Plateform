'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant } from '@/lib/hrmStore';
import {
  Target,
  Plus,
  Star,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Calendar,
  Award,
  Layers,
  FileText,
  UserCheck,
  ArrowRight,
  Filter,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Check,
  X,
  Clock,
  Sparkles,
  BarChart3,
  User,
  Building,
} from 'lucide-react';

interface HrmPerformanceViewProps {
  currentTenant: HrmTenant;
}

export const HrmPerformanceView: React.FC<HrmPerformanceViewProps> = ({ currentTenant }) => {
  // Navigation tabs matching Section 3 & 27:
  // Goals / OKRs | Goal Assignment | Progress Tracking | Performance Reviews | Appraisals | Performance Reports
  const [activeTab, setActiveTab] = useState<
    'goals' | 'assignment' | 'progress' | 'reviews' | 'appraisals' | 'reports'
  >('goals');

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);

  // New Goal Form
  const [goalForm, setGoalForm] = useState({
    employeeId: '',
    title: '',
    description: '',
    category: 'INDIVIDUAL',
    targetValue: 100,
    weightage: 25,
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Review Submission Form
  const [reviewForm, setReviewForm] = useState({
    cycleId: '',
    employeeId: '',
    selfRating: 4.5,
    selfComments: '',
    managerRating: 4.5,
    managerComments: '',
  });

  // Appraisal Form
  const [appraisalForm, setAppraisalForm] = useState({
    employeeId: '',
    performanceRating: 4.8,
    decisionType: 'INCREMENT' as 'INCREMENT' | 'BONUS' | 'PROMOTION' | 'PIP' | 'NONE',
    incrementPercentage: 10,
    bonusAmount: 25000,
    effectiveDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPmsData = async () => {
    try {
      setLoading(true);
      const [perfRes, apprRes, empRes] = await Promise.all([
        fetch('/api/hrm/performance'),
        fetch('/api/hrm/pms/appraisals'),
        fetch('/api/employees?limit=100'),
      ]);

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setGoals(perfData.goals || []);
        setCycles(perfData.cycles || []);
        setReviews(perfData.reviews || []);
      }

      if (apprRes.ok) {
        const apprData = await apprRes.json();
        setAppraisals(apprData.appraisals || []);
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
        if (empData.employees?.length > 0) {
          setGoalForm((prev) => ({ ...prev, employeeId: prev.employeeId || empData.employees[0].id }));
          setReviewForm((prev) => ({ ...prev, employeeId: prev.employeeId || empData.employees[0].id }));
          setAppraisalForm((prev) => ({ ...prev, employeeId: prev.employeeId || empData.employees[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching PMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPmsData();
  }, [currentTenant]);

  // Goal Creation
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title || !goalForm.employeeId) return;

    try {
      const res = await fetch('/api/hrm/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalForm),
      });

      if (res.ok) {
        showToast('Goal assigned successfully to employee.');
        setShowGoalModal(false);
        setGoalForm((prev) => ({
          ...prev,
          title: '',
          description: '',
          weightage: 25,
        }));
        await fetchPmsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create goal');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Progress Update
  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      const res = await fetch('/api/hrm/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_PROGRESS',
          goalId,
          currentValue: newProgress,
        }),
      });

      if (res.ok) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  progress: newProgress,
                  status: newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
                }
              : g
          )
        );
      }
    } catch (err) {
      console.error('Failed to update progress', err);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hrm/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REVIEW',
          ...reviewForm,
        }),
      });

      if (res.ok) {
        showToast('Performance review recorded.');
        setShowReviewModal(false);
        await fetchPmsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit review');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Propose Appraisal
  const handleCreateAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hrm/pms/appraisals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appraisalForm,
          incrementPercentage:
            appraisalForm.decisionType === 'INCREMENT' ? Number(appraisalForm.incrementPercentage) : null,
          bonusAmount:
            appraisalForm.decisionType === 'BONUS' ? Number(appraisalForm.bonusAmount) : null,
        }),
      });

      if (res.ok) {
        showToast('Appraisal decision proposal submitted for executive governance approval.');
        setShowAppraisalModal(false);
        await fetchPmsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create appraisal proposal');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve / Reject Appraisal (Executes PMS -> Payroll Bridge)
  const handleApproveAppraisal = async (appraisalId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${decision} this appraisal decision? ${decision === 'APPROVED' ? 'This will execute the bridge into Payroll (generating an adjustment or salary increment).' : ''}`)) {
      return;
    }

    try {
      const res = await fetch(`/api/hrm/pms/appraisals/${appraisalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        showToast(
          decision === 'APPROVED'
            ? 'Appraisal approved! Executed bridge into Payroll (Adjustment / Salary revision created).'
            : 'Appraisal decision marked as rejected.'
        );
        await fetchPmsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to execute appraisal decision');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered Goals
  const filteredGoals = goals.filter((g) => {
    const matchesCat = categoryFilter === 'ALL' || g.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      g.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.employee?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-xl text-xs font-bold animate-slideDown">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Performance Management (PMS)</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              Enterprise OKR & Appraisal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Continuous goal management, performance review cycles, and governance-approved appraisal bridges to Payroll.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGoalModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create / Assign Goal</span>
          </button>
          <button
            onClick={() => setShowAppraisalModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Propose Appraisal</span>
          </button>
        </div>
      </div>

      {/* PMS Sub-Navigation Bar matching Section 3 & 27 */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
        {[
          { id: 'goals', label: 'Goals / OKRs', icon: Target, badge: goals.length },
          { id: 'assignment', label: 'Goal Assignment', icon: Layers },
          { id: 'progress', label: 'Progress Tracking', icon: TrendingUp },
          { id: 'reviews', label: 'Performance Reviews', icon: UserCheck, badge: reviews.length },
          { id: 'appraisals', label: 'Appraisals & Outcomes', icon: Award, badge: appraisals.filter((a) => a.status === 'PENDING').length, badgeColor: 'bg-amber-500' },
          { id: 'reports', label: 'Performance Reports', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                    tab.badgeColor || 'bg-white/20'
                  } text-white`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GOALS / OKRs */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search goals by title or employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-hidden focus:border-[#0D9488]"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 cursor-pointer focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value="ALL">All Categories</option>
                <option value="COMPANY">Company</option>
                <option value="DEPARTMENT">Department</option>
                <option value="TEAM">Team</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 cursor-pointer focus:outline-hidden focus:border-[#0D9488]"
              >
                <option value="ALL">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AT_RISK">At Risk</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{filteredGoals.length}</strong> goals
            </div>
          </div>

          {/* Goals Grid */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading PMS goals...</div>
          ) : filteredGoals.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3">
              <Target className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Goals Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No goals match your active filter criteria. Assign a new goal to kick off the performance cycle.
              </p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="px-4 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Assign First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal) => {
                const isComplete = goal.status === 'COMPLETED' || goal.progress >= 100;
                return (
                  <div
                    key={goal.id}
                    className="bg-white border border-[#E2E8F0] hover:border-[#0D9488] transition-all rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                          {goal.category} • {goal.weightage}% Weight
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : goal.status === 'AT_RISK'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-teal-50 text-[#0D9488] border-teal-200'
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{goal.description}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Owner: <strong className="text-slate-800">{goal.employee?.fullName || 'Assigned Staff'}</strong></span>
                          {goal.employee?.employeeId && (
                            <span className="font-mono text-[10px] text-slate-400">({goal.employee.employeeId})</span>
                          )}
                        </p>
                      </div>

                      {/* Interactive Progress Slider */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500 text-[11px]">Current Progress</span>
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
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Target: {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'End of Cycle'}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {goal.goalNumber}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GOAL ASSIGNMENT */}
      {activeTab === 'assignment' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-2xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Assign Goal / KRA to Workforce</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign OKRs linked to the master unified Employee entity with measurable milestone metrics.
            </p>
          </div>

          <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Employee *</label>
                <select
                  required
                  value={goalForm.employeeId}
                  onChange={(e) => setGoalForm({ ...goalForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:border-[#0D9488]"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId}) — {emp.designation || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Category *</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:border-[#0D9488]"
                >
                  <option value="COMPANY">Company Strategic</option>
                  <option value="DEPARTMENT">Departmental</option>
                  <option value="TEAM">Team Objective</option>
                  <option value="INDIVIDUAL">Individual Contribution</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Goal Statement / Key Result *</label>
              <input
                type="text"
                required
                placeholder="e.g. Deliver multi-tenant invoice billing automation with 99.9% uptime"
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description & Success Criteria</label>
              <textarea
                rows={3}
                placeholder="Detailed deliverables, acceptance metrics, and dependencies..."
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Weightage (%)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={goalForm.weightage}
                  onChange={(e) => setGoalForm({ ...goalForm, weightage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={goalForm.startDate}
                  onChange={(e) => setGoalForm({ ...goalForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Assign Goal</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PROGRESS TRACKING */}
      {activeTab === 'progress' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Workforce OKR Progress Tracking</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of milestones, self check-ins, and target fulfillment percentages.
              </p>
            </div>
            <span className="text-xs font-mono text-[#0D9488] font-bold">
              {goals.filter((g) => g.status === 'COMPLETED').length} / {goals.length} Completed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Goal # / Title</th>
                  <th className="px-6 py-3">Assigned Employee</th>
                  <th className="px-6 py-3">Category & Weight</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3 text-center">Progress %</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Quick Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-[10px] text-slate-400 block">{goal.goalNumber}</span>
                      <strong className="text-slate-900 text-xs">{goal.title}</strong>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-slate-800">{goal.employee?.fullName}</span>
                      <span className="text-[10px] text-slate-400 block">{goal.employee?.designation}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {goal.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1.5">{goal.weightage}%</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                      {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="w-24 mx-auto space-y-1">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#0D9488] transition-all"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#0D9488]">{goal.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          goal.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-teal-50 text-[#0D9488] border-teal-200'
                        }`}
                      >
                        {goal.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateProgress(goal.id, Math.min(100, goal.progress + 25))}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-[#0D9488] hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          +25%
                        </button>
                        <button
                          onClick={() => handleUpdateProgress(goal.id, 100)}
                          className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-[10px] transition-all cursor-pointer"
                        >
                          Complete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Annual & Quarterly Performance Reviews</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-stage review lifecycle: Employee Self-Review → Manager Assessment → Final Calibration.
              </p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Performance Review</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3">Cycle</th>
                    <th className="px-6 py-3 text-center">Self Rating</th>
                    <th className="px-6 py-3 text-center">Manager Rating</th>
                    <th className="px-6 py-3 text-center">Final Rating</th>
                    <th className="px-6 py-3">Review Status</th>
                    <th className="px-6 py-3">Feedback Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                        No performance reviews submitted yet. Click "Submit Performance Review" to start a review.
                      </td>
                    </tr>
                  ) : (
                    reviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5">
                          <strong className="text-slate-900">{rev.employee?.fullName}</strong>
                          <span className="font-mono text-[10px] text-slate-400 block">{rev.employee?.employeeId}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-slate-700">{rev.cycle?.title || 'FY 2026 Annual'}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-700">
                          {rev.selfRating ? `${rev.selfRating} / 5` : <span className="text-slate-400 italic">Pending</span>}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-[#0D9488]">
                          {rev.managerRating ? `${rev.managerRating} / 5` : <span className="text-slate-400 italic">Pending</span>}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {rev.finalRating ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1 w-fit mx-auto">
                              <Star className="w-3 h-3 fill-current text-amber-500" />
                              <span>{rev.finalRating}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">In Progress</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              rev.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {rev.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 max-w-xs truncate text-[11px] text-slate-500">
                          {rev.managerComments || rev.selfComments || 'No comments provided'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: APPRAISALS & DECISION OUTCOMES (BRIDGING TO PAYROLL) */}
      {activeTab === 'appraisals' && (
        <div className="space-y-4">
          <div className="bg-[#F0FDFA] border border-[#0D9488]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Governance-Enforced Appraisal to Payroll Bridge</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  In accordance with business rules, performance scores DO NOT automatically mutate salary. Only an explicitly approved appraisal decision generates an adjustment or salary increment.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAppraisalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Propose New Appraisal</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Employee</th>
                    <th className="px-6 py-3 text-center">Score</th>
                    <th className="px-6 py-3">Decision Outcome</th>
                    <th className="px-6 py-3">Benefit Amount / Rate</th>
                    <th className="px-6 py-3">Effective Date</th>
                    <th className="px-6 py-3">Governance Status</th>
                    <th className="px-6 py-3 text-right">HR Action / Payroll Bridge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {appraisals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                        No appraisal decisions proposed yet. Click "Propose New Appraisal" to submit an outcome.
                      </td>
                    </tr>
                  ) : (
                    appraisals.map((appr) => {
                      const isApproved = appr.status === 'APPROVED' || appr.status === 'PROCESSED_IN_PAYROLL';
                      const isPending = appr.status === 'PENDING';
                      return (
                        <tr key={appr.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5">
                            <strong className="text-slate-900">{appr.employeeName || appr.employee?.fullName}</strong>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {appr.employeeCode || appr.employee?.employeeId}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="font-bold text-amber-600 text-xs flex items-center justify-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{appr.performanceRating} / 5</span>
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                appr.decisionType === 'INCREMENT'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : appr.decisionType === 'BONUS'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : appr.decisionType === 'PROMOTION'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {appr.decisionType}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-bold text-slate-900">
                            {appr.decisionType === 'INCREMENT' && (
                              <span className="text-blue-600">+{appr.incrementPercentage}% CTC Hike</span>
                            )}
                            {appr.decisionType === 'BONUS' && (
                              <span className="text-emerald-600">₹{appr.bonusAmount?.toLocaleString('en-IN')} Bonus</span>
                            )}
                            {appr.decisionType !== 'INCREMENT' && appr.decisionType !== 'BONUS' && (
                              <span className="text-slate-500 font-normal">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-[11px] text-slate-600">
                            {new Date(appr.effectiveDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : appr.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {appr.status}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveAppraisal(appr.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve & Bridge</span>
                                </button>
                                <button
                                  onClick={() => handleApproveAppraisal(appr.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : isApproved ? (
                              <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bridged to Payroll</span>
                              </div>
                            ) : (
                              <span className="text-rose-500 font-bold text-[10px]">Rejected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PERFORMANCE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total OKRs Tracked</span>
              <p className="text-2xl font-black text-slate-900">{goals.length}</p>
              <p className="text-[11px] text-[#0D9488] font-bold">
                {goals.filter((g) => g.status === 'COMPLETED').length} Fulfilled
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Avg Goal Progress</span>
              <p className="text-2xl font-black text-[#0D9488]">
                {goals.length > 0
                  ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
                  : 0}
                %
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Across all departments</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Appraisals Approved</span>
              <p className="text-2xl font-black text-emerald-700">
                {appraisals.filter((a) => a.status === 'APPROVED').length}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold">Executed in Payroll</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Avg Appraisal Rating</span>
              <p className="text-2xl font-black text-amber-500">
                {appraisals.length > 0
                  ? (appraisals.reduce((s, a) => s + a.performanceRating, 0) / appraisals.length).toFixed(1)
                  : '4.8'}{' '}
                / 5
              </p>
              <p className="text-[11px] text-slate-500 font-medium">Merit calibration</p>
            </div>
          </div>

          {/* Departmental Performance Breakdown */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Category & Department Alignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL'].map((cat) => {
                const count = goals.filter((g) => g.category === cat).length;
                const completed = goals.filter((g) => g.category === cat && g.status === 'COMPLETED').length;
                const pct = count > 0 ? Math.round((completed / count) * 100) : 0;
                return (
                  <div key={cat} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black uppercase text-slate-700">{cat}</span>
                      <span className="font-mono text-xs font-bold text-[#0D9488]">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-[#0D9488]" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400">{completed} of {count} goals achieved</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Define & Assign Performance Goal</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Employee *</label>
                <select
                  required
                  value={goalForm.employeeId}
                  onChange={(e) => setGoalForm({ ...goalForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden focus:border-[#0D9488]"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Statement / Key Result *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reduce customer onboarding cycle from 14 days to 4 days"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white cursor-pointer"
                  >
                    <option value="COMPANY">Company</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="TEAM">Team</option>
                    <option value="INDIVIDUAL">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={goalForm.weightage}
                    onChange={(e) => setGoalForm({ ...goalForm, weightage: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Assign Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT REVIEW */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Conduct Performance Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Cycle</label>
                <select
                  value={reviewForm.cycleId}
                  onChange={(e) => setReviewForm({ ...reviewForm, cycleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Default Active Cycle (FY 2026)</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reviewee Employee *</label>
                <select
                  required
                  value={reviewForm.employeeId}
                  onChange={(e) => setReviewForm({ ...reviewForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Self Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={reviewForm.selfRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, selfRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manager Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={reviewForm.managerRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, managerRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Manager Evaluation Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Evaluation comments, strengths, growth areas..."
                  value={reviewForm.managerComments}
                  onChange={(e) => setReviewForm({ ...reviewForm, managerComments: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PROPOSE APPRAISAL (BRIDGING TO PAYROLL) */}
      {showAppraisalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Propose Appraisal Outcome</h3>
                <p className="text-[11px] text-slate-500">Requires executive HR approval before executing in Payroll</p>
              </div>
              <button onClick={() => setShowAppraisalModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppraisal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Employee *</label>
                <select
                  required
                  value={appraisalForm.employeeId}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Calibrated Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={appraisalForm.performanceRating}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, performanceRating: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Decision Outcome *</label>
                  <select
                    value={appraisalForm.decisionType}
                    onChange={(e: any) => setAppraisalForm({ ...appraisalForm, decisionType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white cursor-pointer font-bold text-slate-800"
                  >
                    <option value="INCREMENT">Salary Increment (%)</option>
                    <option value="BONUS">Merit Performance Bonus (₹)</option>
                    <option value="PROMOTION">Promotion / Title Elevation</option>
                    <option value="PIP">Performance Improvement Plan</option>
                    <option value="NONE">No Compensation Change</option>
                  </select>
                </div>
              </div>

              {appraisalForm.decisionType === 'INCREMENT' && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                  <label className="block font-bold text-blue-900 mb-1">Increment Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={appraisalForm.incrementPercentage}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, incrementPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-xl bg-white font-bold"
                  />
                  <p className="text-[10px] text-blue-700">
                    When approved, this will close the current salary assignment with effectiveTo and create a new versioned EmployeeSalaryAssignment.
                  </p>
                </div>
              )}

              {appraisalForm.decisionType === 'BONUS' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <label className="block font-bold text-emerald-900 mb-1">Bonus Amount (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={appraisalForm.bonusAmount}
                    onChange={(e) => setAppraisalForm({ ...appraisalForm, bonusAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl bg-white font-bold"
                  />
                  <p className="text-[10px] text-emerald-700">
                    When approved, this will auto-generate an approved PayrollAdjustment (BONUS) for the next payroll run.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={appraisalForm.effectiveDate}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Executive Justification / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Reason for reward or calibration notes..."
                  value={appraisalForm.remarks}
                  onChange={(e) => setAppraisalForm({ ...appraisalForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAppraisalModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Propose Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
