'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  type?: 'NATIONAL' | 'STATE' | 'COMPANY' | 'OPTIONAL';
  holidayType?: string;
  description?: string;
  clientId?: string | null;
  clientName?: string | null;
  isMandatory?: boolean;
}

export const HolidayCalendarView: React.FC = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    type: 'NATIONAL' | 'STATE' | 'COMPANY' | 'OPTIONAL';
    description: string;
    clientId: string;
    isMandatory: boolean;
  }>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'NATIONAL',
    description: '',
    clientId: '',
    isMandatory: true,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workforce/holidays?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (err) {
      console.error('Failed to load holidays', err);
      showToast('Failed to load holidays calendar', 'error');
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
    fetchHolidays();
    fetchClients();
  }, [selectedYear]);

  const openCreateModal = () => {
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      type: 'NATIONAL',
      description: '',
      clientId: '',
      isMandatory: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    const norm = getNormalizedType(h);
    const validCategory: 'NATIONAL' | 'STATE' | 'COMPANY' | 'OPTIONAL' =
      norm === 'COMPANY' ? 'COMPANY' : norm === 'STATE' ? 'STATE' : norm === 'OPTIONAL' ? 'OPTIONAL' : 'NATIONAL';

    setFormData({
      name: h.name,
      date: h.date,
      type: validCategory,
      description: h.description || '',
      clientId: h.clientId || '',
      isMandatory: h.isMandatory !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        id: editingHoliday?.id,
        year: parseInt(formData.date.split('-')[0], 10),
      };

      const res = await fetch('/api/workforce/holidays', {
        method: editingHoliday ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingHoliday ? 'Holiday updated successfully' : 'Holiday added successfully');
        setIsModalOpen(false);
        fetchHolidays();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save holiday', 'error');
      }
    } catch (err) {
      showToast('Network error while saving holiday', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete holiday "${name}"?`)) return;
    try {
      const res = await fetch(`/api/workforce/holidays?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Holiday "${name}" deleted`);
        fetchHolidays();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete holiday', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting holiday', 'error');
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getNormalizedType = (h: Holiday): string => {
    const raw = (h.type || h.holidayType || 'NATIONAL').toUpperCase();
    if (raw === 'PUBLIC') return 'NATIONAL';
    return raw;
  };

  const filteredHolidays = holidays.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || getNormalizedType(h) === typeFilter;
    const matchesClient = !clientFilter || h.clientId === clientFilter;
    const matchesMonth =
      selectedMonth === 'ALL' ||
      new Date(h.date).getMonth() === selectedMonth;
    return matchesSearch && matchesType && matchesClient && matchesMonth;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'NATIONAL':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'STATE':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'COMPANY':
        return 'bg-teal-50 text-growth-teal border-teal-200';
      case 'OPTIONAL':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

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
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Corporate Holiday Calendar
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-growth-teal border border-teal-200">
                Year {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage statutory, state, and corporate holidays with universal or client-specific allocation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Year Switcher */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedYear((prev) => prev - 1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-800">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear((prev) => prev + 1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchHolidays}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh</span>
          </button>

          {isAdminOrHR(user?.role) && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Month Selector */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Month Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          <button
            onClick={() => setSelectedMonth('ALL')}
            className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer font-bold ${
              selectedMonth === 'ALL'
                ? 'bg-growth-teal text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
            }`}
          >
            Full Year ({holidays.length})
          </button>
          {months.map((m, idx) => {
            const count = holidays.filter((h) => new Date(h.date).getMonth() === idx).length;
            const isSelected = selectedMonth === idx;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(idx)}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 font-bold ${
                  isSelected
                    ? 'bg-growth-teal text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                }`}
              >
                <span>{m.slice(0, 3)}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-growth-teal border border-teal-200/60'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between pt-3 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search holiday name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="NATIONAL">National Holiday</option>
              <option value="STATE">State / Regional</option>
              <option value="COMPANY">Company Holiday</option>
              <option value="OPTIONAL">Optional / Restricted</option>
            </select>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
            >
              <option value="">All Clients (Universal & Custom)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Holidays Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto mb-4" />
          <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Holidays Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No holidays matched your selected filters or month. Add official holidays to configure attendance calculations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHolidays.map((holiday) => {
            const hDate = new Date(holiday.date);
            const dayName = hDate.toLocaleDateString('en-US', { weekday: 'long' });
            const normType = getNormalizedType(holiday);

            return (
              <div
                key={holiday.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400/80 shadow-xs hover:shadow-md p-5 flex flex-col justify-between group transition-all min-h-[165px]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Date Badge */}
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center font-mono shrink-0 shadow-xs">
                        <span className="text-[10px] font-extrabold text-growth-teal uppercase leading-none">
                          {hDate.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base font-black text-slate-900 leading-tight mt-0.5">
                          {hDate.getDate()}
                        </span>
                      </div>

                      {/* Title & Day */}
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-extrabold text-sm text-slate-900 group-hover:text-growth-teal transition-colors truncate"
                          title={holiday.name}
                        >
                          {holiday.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                          {dayName}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {isAdminOrHR(user?.role) && (
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          onClick={() => openEditModal(holiday)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-growth-teal rounded-lg transition-colors cursor-pointer"
                          title="Edit Holiday"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id, holiday.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {holiday.description ? (
                    <p className="mt-3 text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {holiday.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400 italic">No additional notes</p>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`font-black uppercase px-2.5 py-0.5 rounded-md border text-[10px] tracking-wide ${getTypeBadge(
                      normType
                    )}`}
                  >
                    {normType}
                  </span>

                  <span
                    className="text-[11px] font-semibold text-slate-500 truncate max-w-[140px] flex items-center gap-1"
                    title={holiday.clientName || 'Universal'}
                  >
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{holiday.clientName || 'Universal'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingHoliday ? 'Edit Holiday' : 'Add Corporate Holiday'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Add to workforce calendar for leave and attendance tracking.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day, Diwali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-growth-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-growth-teal"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Category *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal"
                  >
                    <option value="NATIONAL">National Holiday</option>
                    <option value="STATE">State / Regional</option>
                    <option value="COMPANY">Company Holiday</option>
                    <option value="OPTIONAL">Optional / Restricted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Applicable Client</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-growth-teal"
                >
                  <option value="">Universal (Applies to all clients)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional context or notification details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                  className="rounded text-growth-teal focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isMandatory" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Mandatory Paid Holiday for all active employees
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
                  {actionLoading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
