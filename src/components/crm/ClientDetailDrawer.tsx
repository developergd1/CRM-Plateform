'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  Clock,
  User,
  Tag,
  ArrowRight,
  UserCheck,
  Plus,
  CheckCircle,
  FileText,
  Send,
  MessageSquare,
  Sparkles,
  History,
  AlertCircle,
  Pin,
} from 'lucide-react';
import { canReassignClients } from '@/lib/rbac';
import { SearchableSelect } from '@/components/common/SearchableSelect';

interface DrawerProps {
  clientId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ClientDetailDrawer: React.FC<DrawerProps> = ({ clientId, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks' | 'assignments'>('timeline');

  // Form states
  const [newNote, setNewNote] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [activityType, setActivityType] = useState('CALL_MADE');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  
  // Follow-up task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskType, setTaskType] = useState('FOLLOW_UP');

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [targetEmpId, setTargetEmpId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Stage change modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [stageRemarks, setStageRemarks] = useState('');
  const [stageDealValue, setStageDealValue] = useState('');

  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
        setTargetStage(data.client.stage);
        setStageDealValue(data.client.estimatedValue?.toString() || '');
      }
    } catch (e) {
      console.error('Error fetching client:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployeesList(data.employees || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchClientDetails();
    fetchEmployees();
  }, [clientId]);

  if (!clientId) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const res = await fetch(`/api/crm/clients/${client.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote, isPinned }),
    });

    if (res.ok) {
      setNewNote('');
      setIsPinned(false);
      await fetchClientDetails();
      onRefresh();
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    const res = await fetch(`/api/crm/clients/${client.id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityType,
        title: activityTitle,
        description: activityDesc,
      }),
    });

    if (res.ok) {
      setActivityTitle('');
      setActivityDesc('');
      await fetchClientDetails();
      onRefresh();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;

    const res = await fetch(`/api/crm/clients/${client.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskTitle,
        dueDate: taskDueDate,
        priority: taskPriority,
        taskType,
      }),
    });

    if (res.ok) {
      setTaskTitle('');
      setTaskDueDate('');
      await fetchClientDetails();
      onRefresh();
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const res = await fetch(`/api/crm/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    if (res.ok) {
      await fetchClientDetails();
      onRefresh();
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpId) return;

    const res = await fetch(`/api/crm/clients/${client.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetEmployeeId: targetEmpId,
        assignmentReason: reassignReason,
      }),
    });

    if (res.ok) {
      setShowReassignModal(false);
      setReassignReason('');
      await fetchClientDetails();
      onRefresh();
    }
  };

  const handleStageShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStage) return;

    const res = await fetch(`/api/crm/clients/${client.id}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: targetStage,
        remarks: stageRemarks,
        dealValue: stageDealValue,
      }),
    });

    if (res.ok) {
      setShowStageModal(false);
      setStageRemarks('');
      await fetchClientDetails();
      onRefresh();
    }
  };

  const stagesList = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'FOLLOW_UP',
    'PROPOSAL',
    'NEGOTIATION',
    'WON',
    'LOST',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-growth-teal" />
          </div>
        ) : !client ? (
          <div className="p-8 text-center text-slate-500">Client details not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black px-2.5 py-1 bg-growth-teal text-white rounded-lg shadow-sm">
                    {client.clientId}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {client.priority} Priority
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-growth-gold/20 text-growth-gold border border-growth-gold/30">
                    Stage: {client.stage}
                  </span>
                </div>
                <h2 className="text-xl font-black mt-2 tracking-tight text-white">
                  {client.name}
                </h2>
                {client.company && (
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-growth-gold" />
                    <span>{client.company}</span>
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Key Actions: Advance Stage & Reassign */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Owner</span>
                  <span className="font-bold text-slate-800">
                    {client.assignedEmployee?.fullName || 'Unassigned'} ({client.assignedEmployee?.employeeId})
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Deal Value</span>
                  <span className="font-extrabold text-growth-teal text-sm">
                    ₹{(client.estimatedValue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStageModal(true)}
                  className="px-3 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Update Stage</span>
                </button>

                {canReassignClients(user?.role) && (
                  <button
                    onClick={() => setShowReassignModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-growth-goldDark" />
                    <span>Reassign</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Body Tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Client Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Phone</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-growth-teal" />
                    <span>{client.phone}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Email</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-growth-teal" />
                    <span className="truncate">{client.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Location</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-growth-teal" />
                    <span>{client.location || 'Pan India'}</span>
                  </div>
                </div>
                <div className="col-span-full pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block mb-0.5">Requirement</span>
                  <p className="text-slate-700 font-medium">{client.requirement || 'No specific requirement entered yet.'}</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'timeline'
                      ? 'border-growth-teal text-growth-teal'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Activity Timeline ({client.activities?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'tasks'
                      ? 'border-growth-teal text-growth-teal'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Tasks & Follow-ups ({client.tasks?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'notes'
                      ? 'border-growth-teal text-growth-teal'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Internal Notes ({client.notes?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'assignments'
                      ? 'border-growth-teal text-growth-teal'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Ownership Chain ({client.assignments?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Chronological Activity Timeline */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Quick Activity Form */}
                  <form onSubmit={handleLogActivity} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-growth-teal" />
                        <span>Log Client Interaction (Call, Meeting, Note)</span>
                      </span>
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="CALL_MADE">Phone Call</option>
                        <option value="MEETING_HELD">Meeting / Demo</option>
                        <option value="NOTE_ADDED">General Update</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Title: e.g. Discovery call regarding pricing terms..."
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />

                    <textarea
                      rows={2}
                      placeholder="Add summary notes or discussion points..."
                      value={activityDesc}
                      onChange={(e) => setActivityDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Post to Timeline</span>
                      </button>
                    </div>
                  </form>

                  {/* Chronological Timeline Feed */}
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {client.activities?.map((act: any) => (
                      <div key={act.id} className="relative group">
                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-growth-teal group-hover:scale-125 transition-transform" />
                        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{act.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(act.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-xs text-slate-600">{act.description}</p>
                          )}
                          <div className="text-[10px] font-semibold text-growth-teal flex items-center gap-1 pt-1">
                            <User className="w-3 h-3" />
                            <span>Logged by: {act.actorEmployee?.fullName || 'System'} ({act.actorEmployee?.employeeId})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Tasks & Follow-ups */}
              {activeTab === 'tasks' && (
                <div className="space-y-6">
                  {/* Create Task Form */}
                  <form onSubmit={handleCreateTask} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-xs font-bold text-slate-700 block">
                      Schedule Follow-up or Task
                    </span>
                    <input
                      type="text"
                      placeholder="Task Title: e.g. Contract review call with MD..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Priority</label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Type</label>
                        <select
                          value={taskType}
                          onChange={(e) => setTaskType(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="FOLLOW_UP">Follow-up</option>
                          <option value="CALL_REMINDER">Call Reminder</option>
                          <option value="MEETING_REMINDER">Meeting</option>
                          <option value="PROPOSAL_DUE">Proposal Due</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </form>

                  {/* Task List */}
                  <div className="space-y-3">
                    {client.tasks?.map((tsk: any) => (
                      <div
                        key={tsk.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          tsk.status === 'COMPLETED'
                            ? 'bg-emerald-50/50 border-emerald-200 opacity-80'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{tsk.taskId}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tsk.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {tsk.priority}
                            </span>
                            <span className="font-bold text-slate-800">{tsk.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-3">
                            <span>Due: {new Date(tsk.dueDate).toLocaleDateString()}</span>
                            <span>Assigned to: {tsk.assignedTo?.fullName}</span>
                          </div>
                        </div>

                        {tsk.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => handleCompleteTask(tsk.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddNote} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <textarea
                      rows={3}
                      placeholder="Add an internal observation, meeting memo, or requirement..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPinned}
                          onChange={(e) => setIsPinned(e.target.checked)}
                          className="rounded text-growth-teal focus:ring-growth-teal"
                        />
                        <span>Pin this note to top</span>
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-bold rounded-xl shadow-sm"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {client.notes?.map((n: any) => (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                          n.isPinned ? 'bg-amber-50/60 border-growth-gold/40' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            {n.isPinned && <Pin className="w-3.5 h-3.5 text-growth-goldDark fill-current" />}
                            <span>{n.author?.fullName} ({n.author?.employeeId})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Ownership & Assignment Chain */}
              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-xs font-extrabold text-slate-800 block mb-1">
                      Complete Client Ownership Chain
                    </span>
                    <p className="text-xs text-slate-500">
                      Every reassignment is recorded with timestamp, assigner, and business reason.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {client.assignments?.map((asg: any, idx: number) => (
                      <div key={asg.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            Assigned to: {asg.toEmployee?.fullName} ({asg.toEmployee?.employeeId})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(asg.assignedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">Reason: {asg.assignmentReason || 'Direct assignment'}</p>
                        <div className="text-[10px] font-semibold text-growth-teal">
                          Assigned by: {asg.assignedBy?.fullName} ({asg.assignedBy?.employeeId})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reassign Modal */}
            {showReassignModal && (
              <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
                <form onSubmit={handleReassign} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-base">Reassign Client</h3>
                    <button type="button" onClick={() => setShowReassignModal(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div>
                    <SearchableSelect
                      label="Select New Owner"
                      required={true}
                      iconType="user"
                      options={employeesList.map((emp) => ({
                        value: emp.employeeId,
                        label: emp.fullName,
                        subLabel: emp.designation,
                        badge: emp.employeeId,
                      }))}
                      value={targetEmpId}
                      onChange={(val) => setTargetEmpId(val)}
                      placeholder="Type employee name or ID to search..."
                      defaultEmptyLabel="-- Select Employee --"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Reassignment Reason</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Territory realignment, senior executive demo escalation..."
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReassignModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Confirm Reassignment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Stage Change Modal */}
            {showStageModal && (
              <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
                <form onSubmit={handleStageShift} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-base">Advance CRM Pipeline Stage</h3>
                    <button type="button" onClick={() => setShowStageModal(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Stage</label>
                    <select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {stagesList.map((stg) => (
                        <option key={stg} value={stg}>
                          {stg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Deal Value (₹)</label>
                    <input
                      type="number"
                      value={stageDealValue}
                      onChange={(e) => setStageDealValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Progression Remarks / Outcome Note</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Delivered quote, received technical signoff..."
                      value={stageRemarks}
                      onChange={(e) => setStageRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowStageModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      Update Stage
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
