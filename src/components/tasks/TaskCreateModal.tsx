'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2, AlertCircle, Briefcase, User, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const isClient = user?.role === 'CLIENT';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    expectedDeliverable: '',
    assignedToId: '',
    clientId: user?.clientId || '',
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      fetch('/api/employees')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.employees || [];
          setEmployees(list);
          if (list.length === 1 && !formData.assignedToId) {
            setFormData((prev) => ({ ...prev, assignedToId: list[0].id }));
          }
        })
        .catch(console.error);

      if (!isClient) {
        fetch('/api/crm/clients')
          .then((res) => res.json())
          .then((data) => {
            setClients(Array.isArray(data) ? data : data.clients || []);
          })
          .catch(console.error);
      }
    }
  }, [isOpen, isClient]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.assignedToId) {
      setErrorMsg('Please provide a Task Title and select an Assignee.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          clientId: isClient ? (user?.clientId || undefined) : (formData.clientId || undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      onTaskCreated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Assign New Task</h2>
              {isClient && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-growth-teal border border-teal-200">
                  {user?.companyName || 'Client Portal'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isClient
                ? 'Assign work deliverable directly to personnel onboarded under your company'
                : 'Provide clear instructions, deadlines, and deliverables for the workforce'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Task Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Search 50 leads for the company"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assign To *</label>
                <select
                  required
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId || 'Staff'}) {emp.designation ? `• ${emp.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent (Immediate)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
                />
              </div>

              {!isClient ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Related Client (Optional)</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
                  >
                    <option value="">No Client (Internal)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.clientId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company Entity</label>
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs">
                    {user?.companyName} ({user?.clientId})
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Description & Instructions</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed instructions, sources, and step-by-step guidance for the employee..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expected Deliverable</label>
              <input
                type="text"
                value={formData.expectedDeliverable}
                onChange={(e) => setFormData({ ...formData, expectedDeliverable: e.target.value })}
                placeholder="e.g. Give me in CSV File / Excel Sheet / PDF"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-growth-teal outline-none font-medium text-sm"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white text-sm font-bold rounded-xl shadow-tealGlow flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Assigning...' : 'Assign Task'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
