'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  AlertTriangle,
  Send,
  Loader2,
  Sparkles,
  DollarSign,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_PRIORITIES } from '@/lib/constants/crm';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLead: any) => void;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    contactPerson: '',
    companyName: '',
    phone: '',
    alternatePhone: '',
    email: '',
    website: '',
    industry: '',
    location: '',
    city: '',
    state: '',
    country: 'India',
    source: 'WEBSITE',
    status: 'NEW',
    priority: 'MEDIUM',
    leadScore: 0,
    estimatedValue: '',
    description: '',
    nextFollowUpAt: '',
    assignedToId: '',
    clientId: '',
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Duplicate detection state
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

  // Fetch employees and clients for select dropdowns
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [empRes, cliRes] = await Promise.all([
          fetch('/api/employees?limit=100').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/clients?limit=100').then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setEmployees(empRes.data || empRes.employees || []);
          setClients(cliRes.data || cliRes.clients || []);
        }
      } catch (err) {
        console.error('Error fetching lookups:', err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Debounced duplicate detection
  useEffect(() => {
    if (!isOpen) return;
    const hasEnoughData =
      (formData.phone && formData.phone.length >= 5) ||
      (formData.email && formData.email.includes('@')) ||
      (formData.companyName && formData.companyName.length >= 3);

    if (!hasEnoughData) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const res = await fetch('/api/crm/leads/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: formData.phone,
            email: formData.email,
            companyName: formData.companyName,
            fullName: formData.fullName || formData.contactPerson,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          setDuplicateMatches(json.duplicates || []);
        }
      } catch (err) {
        console.error('Failed checking duplicates:', err);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.email, formData.companyName, formData.fullName, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const primaryName = (formData.fullName || formData.contactPerson).trim();
    if (!primaryName) {
      setErrorMsg('Full Name or Contact Person is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        fullName: primaryName,
        contactPerson: formData.contactPerson.trim() || primaryName,
        companyName: formData.companyName.trim() || undefined,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        location: formData.location.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || 'India',
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        leadScore: parseInt(formData.leadScore as any, 10) || 0,
        estimatedValue: parseFloat(formData.estimatedValue as any) || 0,
        description: formData.description.trim() || undefined,
        nextFollowUpAt: formData.nextFollowUpAt ? new Date(formData.nextFollowUpAt).toISOString() : undefined,
        assignedToId: formData.assignedToId || undefined,
        clientId: formData.clientId || undefined,
      };

      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create lead');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error('Error creating lead:', err);
      setErrorMsg(err.message || 'An error occurred while creating the lead.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Create Corporate Lead</h2>
              <p className="text-xs text-slate-400">Capture and qualify a new prospective corporate client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicate Warning Banner */}
        {duplicateMatches.length > 0 && (
          <div className="mx-6 mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">
                  ⚠️ Potential Duplicate Lead Detected ({duplicateMatches.length} match{duplicateMatches.length > 1 ? 'es' : ''})
                </p>
                <div className="text-xs text-slate-300 space-y-1">
                  {duplicateMatches.map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <span className="font-mono text-amber-400">{d.leadNumber}</span> —
                      <span className="font-medium text-white">{d.fullName || d.contactPerson}</span>
                      {d.companyName && <span>({d.companyName})</span>} —
                      <span>{d.phone}</span> —
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        Status: {d.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-400/80 pt-1">
                  You may still submit if this is a legitimate distinct inquiry.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Contact Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Primary Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contact Person / Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Primary Phone <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email ID</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email ID"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Alternate Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="Optional secondary phone"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Organization & Business Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Company & Organization
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Tata Steel Ltd"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Industry</label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g. Manufacturing, IT, BFSI"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Existing Client / Tenant (Optional)</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">-- Standalone Prospective Lead --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Lead Parameters & Assignment */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Lead Parameters & Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Lead Source</label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Initial Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  {LEAD_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Assign To Representative</label>
                <select
                  name="assignedToId"
                  value={formData.assignedToId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Estimated Value (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Lead Score (0-100)</label>
                <input
                  type="number"
                  name="leadScore"
                  value={formData.leadScore}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Schedule Next Follow-Up</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="datetime-local"
                    name="nextFollowUpAt"
                    value={formData.nextFollowUpAt}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Notes / Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Initial Notes / Requirements</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide background, service interest, headcount requirements, or specific notes..."
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Lead...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create Lead
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
