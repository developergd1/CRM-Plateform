'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  Mail,
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newContact: any) => void;
  preselectedLeadId?: string;
  preselectedClientId?: string;
}

export const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedLeadId,
  preselectedClientId,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    department: '',
    isDecisionMaker: false,
    isPrimary: false,
    notes: '',
    clientId: preselectedClientId || '',
    leadId: preselectedLeadId || '',
  });

  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchLookups = async () => {
      setLoadingLookups(true);
      try {
        const [cliRes, leadRes] = await Promise.all([
          fetch('/api/clients?limit=100').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/crm/leads?limit=100').then((r) => r.json()).catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setClients(cliRes.data || cliRes.clients || []);
          setLeads(leadRes.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    fetchLookups();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setWarningMsg(null);

    if (!formData.fullName.trim() || !formData.phone.trim()) {
      setErrorMsg('Full Name and Phone Number are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        fullName: formData.fullName.trim(),
        designation: formData.designation.trim() || undefined,
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        department: formData.department.trim() || undefined,
        isDecisionMaker: formData.isDecisionMaker,
        isPrimary: formData.isPrimary,
        notes: formData.notes.trim() || undefined,
        clientId: formData.clientId || undefined,
        leadId: formData.leadId || undefined,
      };

      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create contact');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating contact');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Clean Header without extra icon and subtitle */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Add Corporate Stakeholder</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Vikram Singhania"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Designation / Title
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder="e.g. Chief Financial Officer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alternate Phone</label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  placeholder="Optional secondary phone"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email ID</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Finance / Operations"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Lead</label>
                <select
                  name="leadId"
                  value={formData.leadId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
                >
                  <option value="">-- No Lead Linked --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.leadNumber} - {l.fullName || l.contactPerson} ({l.companyName || 'Lead'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link to Client Org</label>
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 transition-all"
                >
                  <option value="">-- No Client Linked --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="isDecisionMaker"
                  checked={formData.isDecisionMaker}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Is Decision Maker</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="isPrimary"
                  checked={formData.isPrimary}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Is Primary Organization Contact</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Background notes on stakeholder..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
