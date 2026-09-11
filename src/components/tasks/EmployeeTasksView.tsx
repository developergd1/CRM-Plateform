'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Send,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  History,
  CheckSquare,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';

export const EmployeeTasksView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState('TODO'); // TODO, IN_PROGRESS, REVIEW, COMPLETED
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState<'work' | 'comments' | 'review' | 'history'>('work');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Submission form state
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal expand state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);

  const fetchTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/tasks?view=my-tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Fetch full details (including comments & history) for selected task
  const fetchTaskDetails = useCallback(async (taskId: string, keepTab = true) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const fullTask = await res.json();
        setSelectedTask(fullTask);
        if (!keepTab) {
          setActiveTaskTab('work');
        }
      }
    } catch (e) {
      console.error('Error loading task details:', e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    fetchTaskDetails(task.id, false);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (res.ok) {
        setCommentText('');
        await fetchTaskDetails(selectedTask.id, true);
        await fetchTasks(false);
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAction = async (taskId: string, action: string, payload: any = {}) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => ({}));
        if (action === 'SUBMIT') {
          setSummary('');
          setNotes('');
          setLinks('');
        }
        await fetchTaskDetails(taskId, true);
        await fetchTasks(false);
      }
    } catch (e) {
      console.error(`Error during ${action}:`, e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (viewTab === 'TODO') return ['TODO', 'ACCEPTED', 'OVERDUE', 'CHANGES_REQUESTED'].includes(t.status);
    if (viewTab === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (viewTab === 'REVIEW') return t.status === 'WAITING_FOR_REVIEW';
    if (viewTab === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">✓ ACCEPTED</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">IN PROGRESS</span>;
      case 'WAITING_FOR_REVIEW':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">PENDING REVIEW</span>;
      case 'COMPLETED':
        return <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">COMPLETED</span>;
      case 'CHANGES_REQUESTED':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">CHANGES REQUESTED</span>;
      case 'OVERDUE':
        return <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">OVERDUE</span>;
      default:
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">{status}</span>;
    }
  };

  const commentsCount = selectedTask?.comments?.length || selectedTask?._count?.comments || 0;
  const hasChangesRequested = selectedTask?.status === 'CHANGES_REQUESTED';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 h-full font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">My Assigned Tasks</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-growth-teal border border-teal-200 rounded-full">
              Deliverables Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your assignments, communicate with clients, and submit verified deliverables
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTasks(true)}
            disabled={loading}
            className="interactive-btn-hover flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            title="Refresh Tasks List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh Tasks</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex gap-6 text-xs font-bold overflow-x-auto shrink-0">
        <button
          onClick={() => setViewTab('TODO')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            viewTab === 'TODO' ? 'border-growth-teal text-growth-teal font-black' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          To Do & Pending
        </button>
        <button
          onClick={() => setViewTab('IN_PROGRESS')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            viewTab === 'IN_PROGRESS' ? 'border-growth-teal text-growth-teal font-black' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setViewTab('REVIEW')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            viewTab === 'REVIEW' ? 'border-growth-teal text-growth-teal font-black' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Waiting for Review
        </button>
        <button
          onClick={() => setViewTab('COMPLETED')}
          className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
            viewTab === 'COMPLETED' ? 'border-growth-teal text-growth-teal font-black' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col md:flex-row gap-6 min-h-0">
        {/* Left: Task List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-3 overflow-y-auto shrink-0 pr-1">
          {loading ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-growth-teal" />
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-xs text-slate-400 bg-white p-8 rounded-2xl border border-slate-200 text-center font-medium">
              No tasks in this view.
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isSelected = selectedTask?.id === t.id;
              const tComments = t._count?.comments || t.comments?.length || 0;

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTask(t)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/50 border-growth-teal shadow-md ring-1 ring-growth-teal/30'
                      : 'bg-white border-slate-200 hover:border-growth-teal hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] font-mono font-bold text-slate-400">{t.taskNumber}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-2">{t.title}</h3>

                  {t.client?.companyName && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 mb-2">
                      <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="truncate">{t.client.companyName}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No Due Date'}</span>
                    </div>

                    {tComments > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/50">
                        <MessageSquare className="w-3 h-3" />
                        <span>{tComments}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Task Work & Collaboration Center */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          {selectedTask ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Task Header */}
              <div className="p-6 border-b border-slate-200 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-400">{selectedTask.taskNumber}</span>
                      {getStatusBadge(selectedTask.status)}
                      {selectedTask.client?.companyName && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          <span>{selectedTask.client.companyName}</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          selectedTask.priority === 'URGENT'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : selectedTask.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Priority: {selectedTask.priority}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedTask.title}</h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => fetchTaskDetails(selectedTask.id, true)}
                      disabled={detailLoading}
                      className="interactive-btn-hover p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
                      title="Refresh details & comments"
                    >
                      <RefreshCw className={`w-4 h-4 ${detailLoading ? 'animate-spin text-growth-teal' : ''}`} />
                    </button>

                    <button
                      onClick={() => {
                        setModalTaskId(selectedTask.id);
                        setIsModalOpen(true);
                      }}
                      className="interactive-btn-hover flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                      title="Open full interactive dialogue hub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Full Hub View</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tabs: Work, Comments, Review, History */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-bold">
                  <button
                    onClick={() => setActiveTaskTab('work')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTaskTab === 'work'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Work & Deliverables</span>
                  </button>

                  <button
                    onClick={() => setActiveTaskTab('comments')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTaskTab === 'comments'
                        ? 'bg-growth-teal text-white shadow-tealGlow'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comments & Chat</span>
                    {commentsCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        activeTaskTab === 'comments' ? 'bg-white text-growth-teal' : 'bg-growth-teal text-white'
                      }`}>
                        {commentsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTaskTab('review')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTaskTab === 'review'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : hasChangesRequested
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Review & Feedback</span>
                    {hasChangesRequested && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTaskTab('history')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      activeTaskTab === 'history'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>
                </div>
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {/* 1. WORK & DELIVERABLES TAB */}
                {activeTaskTab === 'work' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Assignment Brief</h3>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description || 'No detailed instructions provided.'}
                      </div>
                    </div>

                    {selectedTask.expectedDeliverable && (
                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                        <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Expected Deliverable</span>
                        </h3>
                        <p className="text-sm font-semibold text-amber-800">{selectedTask.expectedDeliverable}</p>
                      </div>
                    )}

                    {hasChangesRequested && selectedTask.feedbackNotes && (
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
                        <h3 className="text-xs font-black text-rose-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Client Feedback & Requested Changes</span>
                        </h3>
                        <p className="text-sm font-medium text-rose-800">{selectedTask.feedbackNotes}</p>
                      </div>
                    )}

                    {/* Submission Details if already submitted */}
                    {(selectedTask.submissionSummary || selectedTask.submissionLinks?.length > 0) && (
                      <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200">
                        <h3 className="text-xs font-black text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-growth-teal" />
                          <span>Your Current Deliverables Submission</span>
                        </h3>
                        <div className="space-y-2 text-xs text-slate-700">
                          <div>
                            <strong className="text-slate-900">Summary: </strong>
                            <span>{selectedTask.submissionSummary}</span>
                          </div>
                          {selectedTask.submissionNotes && (
                            <div>
                              <strong className="text-slate-900">Notes: </strong>
                              <span>{selectedTask.submissionNotes}</span>
                            </div>
                          )}
                          {selectedTask.submissionLinks?.length > 0 && (
                            <div>
                              <strong className="text-slate-900 block mb-1">Deliverable Links:</strong>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {selectedTask.submissionLinks.map((l: string, i: number) => (
                                  <li key={i}>
                                    <a href={l} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                      {l}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submission Form for IN_PROGRESS or CHANGES_REQUESTED */}
                    {(selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'CHANGES_REQUESTED') && (
                      <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                          <Send className="w-4 h-4 text-growth-teal" />
                          <span>Submit Work for Client Review</span>
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Work Summary *</label>
                            <textarea
                              rows={3}
                              value={summary}
                              onChange={(e) => setSummary(e.target.value)}
                              placeholder="Detail the work performed, milestones reached, or results..."
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Deliverable Links (Comma separated URLs)
                            </label>
                            <input
                              type="text"
                              value={links}
                              onChange={(e) => setLinks(e.target.value)}
                              placeholder="https://drive.google.com/..., https://github.com/..."
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Issues / Blocker Notes</label>
                            <textarea
                              rows={2}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Any clarifications or context for the client..."
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. COMMENTS & DISCUSSION TAB */}
                {activeTaskTab === 'comments' && (
                  <div className="flex flex-col h-full min-h-[400px]">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                      {selectedTask.comments?.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                          <p className="text-xs font-bold text-slate-600">No comments posted on this task yet.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Use the message box below to ask questions or send updates to the client.
                          </p>
                        </div>
                      ) : (
                        selectedTask.comments?.map((c: any) => {
                          const isClient = c.isClientAuthor || c.authorRole === 'CLIENT';
                          const isAdmin = c.authorRole === 'ADMIN' || c.authorRole === 'SUPER_ADMIN';
                          const authorName = c.authorName || c.author?.fullName || (isClient ? 'Corporate Client' : 'Team Member');

                          return (
                            <div
                              key={c.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isClient
                                  ? 'bg-blue-50/50 border-blue-200'
                                  : isAdmin
                                  ? 'bg-purple-50/50 border-purple-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900">{authorName}</span>
                                  {isClient ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                      <Building2 className="w-2.5 h-2.5" /> Client
                                    </span>
                                  ) : isAdmin ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                                      Staff
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(c.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Post Comment Form */}
                    <form onSubmit={handlePostComment} className="flex gap-2.5 pt-3 border-t border-slate-200 mt-auto shrink-0">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment or reply to the client..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none"
                      />
                      <button
                        type="submit"
                        disabled={commentSubmitting || !commentText.trim()}
                        className="interactive-btn-hover px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{commentSubmitting ? 'Posting...' : 'Post'}</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. REVIEW & FEEDBACK TAB */}
                {activeTaskTab === 'review' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Current Review State</span>
                        {getStatusBadge(selectedTask.status)}
                      </div>

                      {selectedTask.feedbackNotes ? (
                        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400">Reviewer Feedback</span>
                          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{selectedTask.feedbackNotes}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No feedback remarks submitted yet.</p>
                      )}

                      {selectedTask.reviewedBy && (
                        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                          Reviewed by <strong className="text-slate-800">{selectedTask.reviewedBy.fullName}</strong>
                          {selectedTask.reviewedAt && ` on ${new Date(selectedTask.reviewedAt).toLocaleString()}`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. ACTIVITY HISTORY TAB */}
                {activeTaskTab === 'history' && (
                  <div className="space-y-3">
                    {selectedTask.history?.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                        No activity history recorded for this task.
                      </div>
                    ) : (
                      selectedTask.history?.map((h: any) => (
                        <div key={h.id} className="flex gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                            <History className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-bold text-slate-900">{h.action}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(h.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {h.remarks && <p className="text-xs text-slate-600 mb-1">{h.remarks}</p>}
                            <span className="text-[10px] text-slate-400 font-medium">By {h.actor?.fullName || 'System'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer (Only active when in Work Tab) */}
              <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-medium">
                  Status: <strong className="text-slate-800">{selectedTask.status}</strong>
                </div>

                <div className="flex items-center gap-2.5">
                  {selectedTask.status === 'TODO' || selectedTask.status === 'OVERDUE' ? (
                    <button
                      onClick={() => handleAction(selectedTask.id, 'ACCEPT')}
                      disabled={submitting}
                      className="interactive-btn-hover px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Updating...' : 'Accept Task'}</span>
                    </button>
                  ) : selectedTask.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => handleAction(selectedTask.id, 'START')}
                      disabled={submitting}
                      className="interactive-btn-hover px-5 py-2 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-tealGlow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Starting...' : 'Start Work'}</span>
                    </button>
                  ) : selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'CHANGES_REQUESTED' ? (
                    <button
                      onClick={() =>
                        handleAction(selectedTask.id, 'SUBMIT', {
                          summary,
                          notes,
                          links: links
                            .split(',')
                            .map((l) => l.trim())
                            .filter(Boolean),
                        })
                      }
                      disabled={submitting || !summary.trim()}
                      className="interactive-btn-hover px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Submitting...' : 'Submit for Review'}</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      {selectedTask.status === 'WAITING_FOR_REVIEW'
                        ? 'Pending Client / Admin Review'
                        : 'Task Completed & Verified'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700">Select a task from the left list</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                View assignment deliverables, communicate in real-time with the corporate client, and submit your work.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal Pop-up (Expand mode matching Image 2) */}
      {modalTaskId && (
        <TaskDetailModal
          taskId={modalTaskId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalTaskId(null);
            fetchTasks(false);
            if (selectedTask) fetchTaskDetails(selectedTask.id, true);
          }}
        />
      )}
    </div>
  );
};
