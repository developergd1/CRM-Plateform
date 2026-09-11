'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Calendar, CheckCircle2, AlertCircle, MessageSquare, History, FileText } from 'lucide-react';

interface TaskDetailModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'REVIEW' | 'COMMENTS' | 'HISTORY'>('DETAILS');
  
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) throw new Error('Failed to fetch task');
      const data = await res.json();
      setTask(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) fetchTask();
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const handleReview = async (isApproved: boolean) => {
    if (!isApproved && !reviewFeedback) {
      setErrorMsg('Please provide feedback for requesting changes.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVIEW',
          payload: { isApproved, feedback: reviewFeedback }
        })
      });
      if (!res.ok) throw new Error('Failed to submit review');
      fetchTask();
      setActiveTab('DETAILS');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText })
      });
      if (!res.ok) throw new Error('Failed to add comment');
      setCommentText('');
      fetchTask();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-growth-teal/20 text-growth-teal text-[10px] font-black rounded-lg uppercase">{task?.status || 'LOADING...'}</span>
              <h2 className="text-xl font-black tracking-tight">{task?.title || 'Task Details'}</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1.5 font-mono">{task?.taskNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-200 bg-slate-50 shrink-0">
          {['DETAILS', 'REVIEW', 'COMMENTS', 'HISTORY'].map(tab => {
            if (tab === 'REVIEW' && task?.status !== 'WAITING_FOR_REVIEW') return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === tab ? 'border-growth-teal text-growth-teal bg-white' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {loading ? (
             <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-growth-teal border-t-transparent rounded-full animate-spin"></div></div>
          ) : errorMsg ? (
             <div className="p-6"><div className="p-4 bg-rose-50 text-rose-700 text-sm font-bold rounded-xl">{errorMsg}</div></div>
          ) : (
            <div className="p-6">
              {activeTab === 'DETAILS' && (
                <div className="space-y-6">
                  {/* Task Meta */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Assignee</div>
                      <div className="text-sm font-bold text-slate-900">{task.assignedTo?.fullName || 'Unassigned'}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Due Date</div>
                      <div className="text-sm font-bold text-slate-900">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Due Date'}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Priority</div>
                      <div className="text-sm font-bold text-slate-900">{task.priority}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Client</div>
                      <div className="text-sm font-bold text-slate-900">{task.client?.companyName || 'None'}</div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900 mb-2">Description</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                  </div>

                  {task.expectedDeliverable && (
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                      <h3 className="text-xs font-black text-amber-900 mb-1 uppercase tracking-wider">Expected Deliverable</h3>
                      <p className="text-sm text-amber-800 font-medium">{task.expectedDeliverable}</p>
                    </div>
                  )}

                  {/* Submission Details if available */}
                  {(task.submissionSummary || task.submissionLinks?.length > 0) && (
                    <div className="bg-teal-50 p-5 rounded-2xl border border-teal-200">
                      <h3 className="text-sm font-black text-teal-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-growth-teal" /> Employee Submission
                      </h3>
                      <div className="space-y-3 text-sm text-teal-800">
                        <div>
                          <strong className="block text-[10px] uppercase text-teal-600 mb-1">Summary of Work</strong>
                          <p>{task.submissionSummary}</p>
                        </div>
                        {task.submissionNotes && (
                          <div>
                            <strong className="block text-[10px] uppercase text-teal-600 mb-1">Notes / Issues</strong>
                            <p>{task.submissionNotes}</p>
                          </div>
                        )}
                        {task.submissionLinks && task.submissionLinks.length > 0 && (
                          <div>
                            <strong className="block text-[10px] uppercase text-teal-600 mb-1">Deliverable Links</strong>
                            <ul className="list-disc pl-5">
                              {task.submissionLinks.map((link: string, i: number) => (
                                <li key={i}><a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{link}</a></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'REVIEW' && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mt-4">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Review Submission</h3>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-700 mb-2">Feedback Notes * (Required if requesting changes)</label>
                    <textarea
                      rows={4}
                      value={reviewFeedback}
                      onChange={e => setReviewFeedback(e.target.value)}
                      placeholder="Great work, but please update the logo..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleReview(false)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-all"
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => handleReview(true)}
                      disabled={submitting}
                      className="flex-1 py-3 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-tealGlow flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Approve & Complete
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'COMMENTS' && (
                <div className="flex flex-col h-[500px]">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {task.comments?.length === 0 ? (
                      <div className="text-center text-slate-500 text-sm py-10">No comments yet.</div>
                    ) : (
                      task.comments?.map((c: any) => {
                        const displayName = c.authorName || c.author?.fullName || 'User';
                        const isClient = c.isClientAuthor || c.authorRole === 'CLIENT';
                        const isAdmin = c.authorRole === 'ADMIN' || c.authorRole === 'SUPER_ADMIN';

                        return (
                          <div key={c.id} className={`p-4 rounded-2xl border shadow-xs transition-all ${
                            isClient ? 'bg-blue-50/40 border-blue-200/70' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{displayName}</span>
                                {isClient ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                                    Client
                                  </span>
                                ) : isAdmin ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                                    Staff
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handleAddComment} className="flex gap-3 mt-auto shrink-0">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-growth-teal outline-none"
                    />
                    <button type="submit" disabled={submitting || !commentText.trim()} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 transition-all">
                      Post
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'HISTORY' && (
                <div className="space-y-4">
                  {task.history?.map((h: any) => (
                    <div key={h.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                        <History className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-900">{h.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{h.remarks}</p>
                        <div className="text-[10px] text-slate-400">By {h.actor?.fullName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
