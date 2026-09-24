'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Building2,
  User,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LeadConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: {
    id: string;
    leadNumber: string;
    fullName?: string | null;
    contactPerson?: string | null;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    estimatedValue?: number | null;
  } | null;
  onSuccess: (data: any) => void;
}

export const LeadConversionModal: React.FC<LeadConversionModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [createAccount, setCreateAccount] = useState<boolean>(true);
  const [accountName, setAccountName] = useState<string>(
    lead?.companyName || lead?.fullName || 'New Account'
  );

  const [createContact, setCreateContact] = useState<boolean>(true);
  const [contactName, setContactName] = useState<string>(
    lead?.contactPerson || lead?.fullName || 'Primary Contact'
  );
  const [decisionRole, setDecisionRole] = useState<string>('DECISION_MAKER');

  const [createDeal, setCreateDeal] = useState<boolean>(true);
  const [dealTitle, setDealTitle] = useState<string>(
    `${lead?.companyName || lead?.fullName || 'Commercial'} Contract`
  );
  const [dealAmount, setDealAmount] = useState<number>(lead?.estimatedValue || 150000);
  const [dealProbability, setDealProbability] = useState<number>(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (lead) {
      setAccountName(lead.companyName || lead.fullName || 'New Account');
      setContactName(lead.contactPerson || lead.fullName || 'Primary Contact');
      setDealTitle(`${lead.companyName || lead.fullName || 'Commercial'} Contract`);
      setDealAmount(lead.estimatedValue || 150000);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createAccount,
          accountName,
          createContact,
          contactName,
          decisionRole,
          createDeal,
          dealTitle,
          dealAmount,
          dealProbability,
          expectedCloseDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert lead');
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Conversion error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-xl w-full overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Convert Lead to Commercial Customer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Converting <span className="font-mono font-bold text-[#0D9488]">{lead.leadNumber}</span> ({lead.fullName || lead.companyName})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Account Creation */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Commercial Account</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-[#0D9488]"
                />
                <span>Create Account</span>
              </label>
            </div>
            {createAccount && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Company / Account Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                />
              </div>
            )}
          </div>

          {/* 2. Contact Creation */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Primary Contact</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createContact}
                  onChange={(e) => setCreateContact(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-[#0D9488]"
                />
                <span>Create Contact</span>
              </label>
            </div>
            {createContact && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Decision Role</label>
                  <select
                    value={decisionRole}
                    onChange={(e) => setDecisionRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                  >
                    <option value="DECISION_MAKER">Decision Maker</option>
                    <option value="INFLUENCER">Influencer</option>
                    <option value="CHAMPION">Champion</option>
                    <option value="USER">User</option>
                    <option value="GATEKEEPER">Gatekeeper</option>
                    <option value="FINANCE">Finance</option>
                    <option value="PROCUREMENT">Procurement</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 3. Deal Creation */}
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0D9488]" />
                <span className="text-xs font-bold text-slate-800">Commercial Deal</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createDeal}
                  onChange={(e) => setCreateDeal(e.target.checked)}
                  className="rounded text-[#0D9488] focus:ring-[#0D9488]"
                />
                <span>Create Deal</span>
              </label>
            </div>
            {createDeal && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deal Title</label>
                  <input
                    type="text"
                    required
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Value (₹)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={dealAmount}
                      onChange={(e) => setDealAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={dealProbability}
                      onChange={(e) => setDealProbability(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Close</label>
                    <input
                      type="date"
                      value={expectedCloseDate}
                      onChange={(e) => setExpectedCloseDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Convert Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
