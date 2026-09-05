'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarCheck,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  User,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ClientDetailDrawer } from '../crm/ClientDetailDrawer';

export const TasksView: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        // Flatten tasks across clients
        const allTasks: any[] = [];
        (data.clients || []).forEach((c: any) => {
          if (c.tasks) {
            c.tasks.forEach((t: any) => {
              allTasks.push({ ...t, client: c });
            });
          }
        });
        setTasks(allTasks);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleComplete = async (taskId: string) => {
    const res = await fetch(`/api/crm/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    if (res.ok) fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (!statusFilter) return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-growth-teal" />
            <span>Tasks & Follow-up Scheduler</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track call reminders, contract reviews, and scheduled client milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="">All Tasks</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((task) => (
          <div
            key={task.id}
            className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
              task.status === 'COMPLETED'
                ? 'bg-emerald-50/40 border-emerald-200'
                : task.status === 'OVERDUE'
                ? 'bg-rose-50/40 border-rose-200 shadow-sm'
                : 'bg-white border-slate-200 shadow-card'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded">
                  {task.taskId}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    task.priority === 'URGENT'
                      ? 'bg-rose-100 text-rose-700'
                      : task.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {task.priority} Priority
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                {task.title}
              </h3>

              {task.description && (
                <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
              )}

              <div
                onClick={() => setSelectedClientId(task.client?.id)}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block">{task.client?.clientId}</span>
                  <span className="font-bold text-slate-800">{task.client?.name} ({task.client?.company || 'Direct'})</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block">Due Date:</span>
                <span className="font-bold text-slate-800">{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>

              {task.status !== 'COMPLETED' ? (
                <button
                  onClick={() => handleComplete(task.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Done</span>
                </button>
              ) : (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Completed</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs font-medium">
            No scheduled tasks matching criteria.
          </div>
        )}
      </div>

      <ClientDetailDrawer
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
        onRefresh={fetchTasks}
      />
    </div>
  );
};
