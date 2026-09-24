'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Shield,
  Search,
  RefreshCw,
  Sun,
  Moon,
  Sunset,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface ShiftPolicy {
  id: string;
  name: string;
  code: string;
  clientId?: string;
  clientName?: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
  graceMinutes: number; // e.g. 15
  halfDayHours: number; // e.g. 4.5
  fullDayHours: number; // e.g. 8.5
  weeklyOffDays: string[]; // ["SATURDAY", "SUNDAY"]
  isDefault: boolean;
  activeEmployeesCount?: number;
}

export const ShiftsPolicyView: React.FC = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftPolicy[]>([]);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftPolicy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: 'General Shift',
    code: 'GEN-01',
    clientId: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    halfDayHours: 4.5,
    fullDayHours: 8.5,
    weeklyOffDays: ['SATURDAY', 'SUNDAY'],
    isDefault: false,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workforce/shifts');
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error('Failed to load shifts', err);
      showToast('Failed to load shift policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchClients();
  }, []);

  const openCreateModal = () => {
    setEditingShift(null);
    setFormData({
      name: '',
      code: '',
      clientId: '',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      halfDayHours: 4.5,
      fullDayHours: 8.5,
      weeklyOffDays: ['SATURDAY', 'SUNDAY'],
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (shift: ShiftPolicy) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      code: shift.code,
      clientId: shift.clientId || '',
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      halfDayHours: shift.halfDayHours,
      fullDayHours: shift.fullDayHours,
      weeklyOffDays: shift.weeklyOffDays,
      isDefault: shift.isDefault,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        id: editingShift?.id,
      };

      const res = await fetch('/api/workforce/shifts', {
        method: editingShift ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingShift ? 'Shift policy updated successfully' : 'Shift policy created successfully');
        setIsModalOpen(false);
        fetchShifts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save shift policy', 'error');
      }
    } catch (err) {
      showToast('Network error while saving shift policy', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete shift policy "${name}"?`)) return;
    try {
      const res = await fetch(`/api/workforce/shifts?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Shift policy "${name}" deleted`);
        fetchShifts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete shift policy', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting shift policy', 'error');
    }
  };

  const filteredShifts = shifts.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesClient = !clientFilter || s.clientId === clientFilter;
    return matchesSearch && matchesClient;
  });

  const getShiftIcon = (start: string) => {
    const hour = parseInt(start.split(':')[0], 10);
    if (hour >= 6 && hour < 12) return <Sun className="w-5 h-5 text-orange-500" />;
    if (hour >= 12 && hour < 18) return <Sunset className="w-5 h-5 text-growth-teal" />;
    return <Moon className="w-5 h-5 text-slate-600" />;
  };

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 bg-rose-50 text-rose-800 border-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Shifts & Working Hours Policy
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                Workforce Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configure organizational shifts, grace periods, half-day cutoffs, and client-specific timing rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchShifts}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>
          {isAdminOrHR(user?.role) && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shift Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shift name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Clients (Universal & Client-specific)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shift Policy Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Shift Policies Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create shift policies to govern punch schedules, grace allowances, and automated late detection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      {getShiftIcon(shift.startTime)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900">{shift.name}</h3>
                        {shift.isDefault && (
                          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">{shift.code}</span>
                    </div>
                  </div>

                  {isAdminOrHR(user?.role) && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(shift)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-growth-teal rounded-lg transition-colors cursor-pointer"
                        title="Edit Policy"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!shift.isDefault && (
                        <button
                          onClick={() => handleDelete(shift.id, shift.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Timing Badge */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Working Window</span>
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {shift.startTime} - {shift.endTime}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {shift.fullDayHours} hrs/day
                    </span>
                  </div>
                </div>

                {/* Rules Details */}
                <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Late Grace Window:</span>
                    <span className="font-bold text-amber-600">{shift.graceMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Half-Day Threshold:</span>
                    <span className="font-bold text-slate-700">{shift.halfDayHours} hours min</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 font-medium">Assigned Client:</span>
                    <span className="font-bold text-growth-teal truncate max-w-[140px]">
                      {shift.clientName || 'Universal (All Clients)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly Off Days */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Weekly Off Days</span>
                <div className="flex flex-wrap gap-1">
                  {daysOfWeek.map((day) => {
                    const isOff = (shift.weeklyOffDays || []).includes(day);
                    return (
                      <span
                        key={day}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          isOff
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingShift ? 'Edit Shift Policy' : 'Create New Shift Policy'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Define working hours, late punch grace limits, and assignment.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Morning Shift"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Shift Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SHIFT-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Applicable Client</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-growth-teal"
                >
                  <option value="">Universal (Applies to all clients without custom policy)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Grace Window (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.graceMinutes}
                    onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Half-Day (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={formData.halfDayHours}
                    onChange={(e) => setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) || 4 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Full-Day (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="16"
                    value={formData.fullDayHours}
                    onChange={(e) => setFormData({ ...formData, fullDayHours: parseFloat(e.target.value) || 8 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Weekly Off Days</label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day) => {
                    const isChecked = formData.weeklyOffDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, weeklyOffDays: [...formData.weeklyOffDays, day] });
                            } else {
                              setFormData({
                                ...formData,
                                weeklyOffDays: formData.weeklyOffDays.filter((d) => d !== day),
                              });
                            }
                          }}
                          className="rounded text-rose-600 focus:ring-0"
                        />
                        <span>{day.slice(0, 3)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-growth-teal focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isDefault" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Mark as Default Organization Policy
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
