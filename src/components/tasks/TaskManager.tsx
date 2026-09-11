'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  User,
  Filter,
  ArrowRight,
  Briefcase,
  Building2,
  RefreshCw,
  Layers,
  Sparkles,
  CheckSquare,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskDetailModal } from './TaskDetailModal';
import { clientCache } from '@/lib/client-cache';

export const TaskManager: React.FC = () => {
  const { user } = useAuth();
  const isAdminUser = user?.role === 'ADMIN' || (user as any)?.role?.name === 'ADMIN' || (user as any)?.role?.name === 'SUPER_ADMIN';
  const isClientUser = user?.role === 'CLIENT';

  const [viewTab, setViewTab] = useState('all'); // all, client-tasks, admin-tasks, my-tasks, assigned-by-me
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [clients, setClients] = useState<any[]>([]);

  const cacheKey = `tasks_list_${user?.id || 'admin'}_${viewTab}_${search}_${selectedClientId}_${selectedStatus}`;
  const cached = clientCache.get<any[]>(cacheKey, 15 * 60 * 1000);

  const [tasks, setTasks] = useState<any[]>(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Fetch client list for Admin filter
  useEffect(() => {
    if (isAdminUser) {
      fetch('/api/clients')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.clients || [];
          setClients(list);
        })
        .catch(console.error);
    }
  }, [isAdminUser]);

  const fetchTasks = async (forceRefresh = false) => {
    const currentKey = `tasks_list_${user?.id || 'admin'}_${viewTab}_${search}_${selectedClientId}_${selectedStatus}`;
    const cachedData = !forceRefresh ? clientCache.get<any[]>(currentKey, 15 * 60 * 1000) : null;
    if (!cachedData) setLoading(true);
    if (forceRefresh) setRefreshing(true);

    try {
      let url = `/api/tasks?view=${viewTab}&search=${encodeURIComponent(search)}`;
      if (selectedClientId && selectedClientId !== 'ALL') {
        url += `&clientId=${encodeURIComponent(selectedClientId)}`;
      }
      if (selectedStatus && selectedStatus !== 'ALL') {
        url += `&status=${encodeURIComponent(selectedStatus)}`;
      }

      const result = await clientCache.swrFetch(
        currentKey,
        async () => {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Error fetching tasks');
          return await res.json();
        },
        {
          forceRefresh,
          onUpdate: (data) => setTasks(data || []),
        }
      );
      if (result) setTasks(result);
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks(false);
  }, [viewTab, search, selectedClientId, selectedStatus]);

  // Dynamic status badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TODO':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">TODO</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">ACCEPTED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> IN PROGRESS</span>;
      case 'WAITING_FOR_REVIEW':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">REVIEW PENDING</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">CHANGES REQ</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-600" /> COMPLETED</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-100 text-red-800 border border-red-200">OVERDUE</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800">URGENT</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700">MED</span>;
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">LOW</span>;
      default:
        return null;
    }
  };

  // KPI telemetry summary stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED').length;
    const reviewPending = tasks.filter((t) => t.status === 'WAITING_FOR_REVIEW').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    return { total, inProgress, reviewPending, completed };
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 h-full font-sans">
      {/* ========================================================================= */}
      {/* Header & Controls */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-growth-teal/10 flex items-center justify-center text-growth-teal font-black shadow-xs">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Task & Deliverables Manager</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 text-growth-teal border border-teal-200 rounded-full">
                Live Governance
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isAdminUser
                ? 'Comprehensive visibility: Track tasks assigned by Corporate Clients, Admin, and Team Leads'
                : 'Assign, execute, and verify staff deliverables'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search task title, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-growth-teal w-52 sm:w-60 outline-none"
            />
          </div>

          {/* Client Filter Dropdown for Admin */}
          {isAdminUser && (
            <div className="flex items-center">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="px-3 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-growth-teal outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL">All Clients / Orgs</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.clientId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-growth-teal outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_REVIEW">Review Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="interactive-btn-hover flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Role-Based Operational View Tabs */}
      {/* ========================================================================= */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center gap-3 text-xs font-bold overflow-x-auto shrink-0">
        {isAdminUser ? (
          <>
            <button
              onClick={() => setViewTab('all')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'all'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Tasks (Global Overview)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
                {viewTab === 'all' ? tasks.length : ''}
              </span>
            </button>

            <button
              onClick={() => setViewTab('client-tasks')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'client-tasks'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Client Delegated Tasks</span>
            </button>

            <button
              onClick={() => setViewTab('admin-tasks')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'admin-tasks'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Internal / Admin Tasks</span>
            </button>

            <button
              onClick={() => setViewTab('my-tasks')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'my-tasks'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Direct Tasks</span>
            </button>
          </>
        ) : isClientUser ? (
          <>
            <button
              onClick={() => setViewTab('all')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'all'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Company Staff Tasks</span>
            </button>

            <button
              onClick={() => setViewTab('assigned-by-me')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'assigned-by-me'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Assigned by Me</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewTab('my-tasks')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'my-tasks'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Assigned Tasks</span>
            </button>

            <button
              onClick={() => setViewTab('all')}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewTab === 'all'
                  ? 'border-growth-teal text-growth-teal font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Team Deliverables</span>
            </button>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Micro Status Summary Ribbon */}
      {/* ========================================================================= */}
      <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-4 text-xs shrink-0 overflow-x-auto">
        <span className="font-black text-slate-600 uppercase text-[10px] tracking-wider">Overview:</span>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-700">
            Total: <span className="font-mono font-black text-slate-900">{stats.total}</span>
          </div>
          <div className="px-2.5 py-1 bg-white rounded-lg border border-indigo-200 shadow-2xs font-bold text-indigo-700">
            In Progress: <span className="font-mono font-black">{stats.inProgress}</span>
          </div>
          <div className="px-2.5 py-1 bg-white rounded-lg border border-amber-200 shadow-2xs font-bold text-amber-800">
            Review Pending: <span className="font-mono font-black">{stats.reviewPending}</span>
          </div>
          <div className="px-2.5 py-1 bg-white rounded-lg border border-emerald-200 shadow-2xs font-bold text-emerald-700">
            Completed: <span className="font-mono font-black">{stats.completed}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Main Content Area: Tasks Table */}
      {/* ========================================================================= */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-growth-teal rounded-full animate-spin mb-3" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Syncing Deliverables...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 bg-white border border-slate-200 border-dashed rounded-3xl p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900">No Tasks Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search || selectedClientId !== 'ALL' || selectedStatus !== 'ALL'
                ? 'No tasks match your selected search filters. Try resetting the filter.'
                : 'There are currently no active tasks matching this view category.'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2.5 bg-growth-navy hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-growth-teal" />
              <span>Assign New Task</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Task ID & Deliverable</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned Staff</th>
                    <th className="py-3.5 px-4">Client / Organization</th>
                    <th className="py-3.5 px-4">Assigned By</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task.id)}
                      className="hover:bg-teal-50/20 transition-colors group cursor-pointer"
                    >
                      {/* Task ID & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-black text-growth-teal">
                            {task.taskNumber}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="font-bold text-slate-900 mt-1 line-clamp-1 group-hover:text-growth-teal transition-colors">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-700 shrink-0">
                            {task.assignedTo?.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {task.assignedTo?.fullName || 'Unassigned'}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {task.assignedTo?.employeeId || ''} • {task.assignedTo?.designation || 'Staff'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client / Organization */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.client ? (
                          <div className="inline-flex flex-col">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                              {task.client.companyName}
                            </span>
                            <span className="font-mono text-[9px] text-slate-400 mt-0.5">
                              {task.client.clientId}
                            </span>
                          </div>
                        ) : task.deal ? (
                          <span className="text-[11px] font-medium text-slate-600">
                            Deal: {task.deal.dealNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Internal Platform</span>
                        )}
                      </td>

                      {/* Assigned By Origin */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.client && !task.createdBy ? (
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            Client ({task.client.contactPerson || task.client.companyName})
                          </span>
                        ) : task.createdBy ? (
                          <div>
                            <div className="font-bold text-slate-800 text-[11px]">
                              {task.createdBy.fullName}
                            </div>
                            <div className="font-mono text-[9px] text-slate-400">
                              {task.createdBy.employeeId || 'Administrator'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500">System Admin</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <div className="text-[11px] font-semibold flex items-center gap-1.5 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(task.dueDate).toLocaleDateString('en-IN')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task.id);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-growth-teal hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <TaskCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            fetchTasks(true);
          }}
          onTaskCreated={() => {
            fetchTasks(true);
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          taskId={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => {
            setSelectedTask(null);
            fetchTasks(true);
          }}
        />
      )}
    </div>
  );
};
