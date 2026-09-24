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
  initialClientId?: string;
}

export const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onSuccess, initialClientId }) => {
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
    clientId: initialClientId || '',
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
    if (initialClientId) {
      setFormData((prev) => ({ ...prev, clientId: initialClientId }));
    }
    return () => {
      mounted = false;
    };
  }, [isOpen, initialClientId]);

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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 md:p-6 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Create Corporate Lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Duplicate Warning Banner */}
            {duplicateMatches.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-300">
                      Potential Duplicate Lead Detected ({duplicateMatches.length} match{duplicateMatches.length > 1 ? 'es' : ''})
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
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Section 1: Contact Details */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Primary Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person / Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email ID"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="Optional secondary phone"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Organization & Business Details */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Company & Organization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Tata Steel Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    placeholder="e.g. Manufacturing, IT, BFSI"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Existing Client / Tenant (Optional)</label>
                  <select
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
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
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Lead Parameters & Assignment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
                  >
                    {LEAD_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign To Representative</label>
                  <select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Value (₹)</label>
                  <input
                    type="number"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl font-mono text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Score (0-100)</label>
                  <input
                    type="number"
                    name="leadScore"
                    value={formData.leadScore}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl font-mono text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Next Follow-Up</label>
                  <input
                    type="datetime-local"
                    name="nextFollowUpAt"
                    value={formData.nextFollowUpAt}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Notes / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Notes / Requirements</label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide background, service interest, headcount requirements, or specific notes..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all resize-none"
              />
            </div>
          </div>

          {/* Actions (Pinned Footer) */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Lead...</span>
                </>
              ) : (
                'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
