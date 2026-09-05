'use client';

import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Tag, Sparkles, ShieldCheck, KeyRound } from 'lucide-react';
import { ClientCredentialsModal } from './ClientCredentialsModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: () => void;
}

export const AddClientModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [industry, setIndustry] = useState('IT & Software Services');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [canBlockEmployees, setCanBlockEmployees] = useState(false);
  const [canDeleteEmployees, setCanDeleteEmployees] = useState(false);
  const [customPassword, setCustomPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    companyName: string;
    email: string;
    password?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !mobile) {
      setErrorMsg('Company Name, Contact Person, and Mobile Number are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactPerson,
          mobile,
          email,
          address,
          industry,
          status,
          canBlockEmployees,
          canDeleteEmployees,
          customPassword: customPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onClientCreated();
        setCreatedCredentials({
          clientId: data.client.clientId,
          companyName: data.client.companyName,
          email: data.credentials?.email || data.client.email,
          password: data.credentials?.password,
        });
      } else {
        setErrorMsg(data.error || 'Failed to create client.');
      }
    } catch (e: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdCredentials) {
    return (
      <ClientCredentialsModal
        isOpen={true}
        onClose={() => {
          setCreatedCredentials(null);
          onClose();
        }}
        credentials={createdCredentials}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Add New Client / Company</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
                <span>Auto-generates sequential <strong className="text-growth-gold font-mono">CLI-XXXXX</strong> & Credentials</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Company / Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Industrial Logistics Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Singhania"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="+91 99112 34567"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email (Login ID)</label>
              <input
                type="email"
                placeholder="client@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Password (Optional)</label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Industry Sector</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              >
                <option value="IT & Software Services">IT & Software Services</option>
                <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                <option value="Banking & Financial Services">Banking & Financial Services</option>
                <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                <option value="Hospitality & Services">Hospitality & Services</option>
                <option value="Other Industry">Other Industry</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Client Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="INACTIVE">INACTIVE (Dormant)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Office / Corporate Address</label>
            <textarea
              rows={2}
              placeholder="e.g. Plot 42, Cyber City Phase 2, Gurugram, Haryana"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
            />
          </div>

          {/* Admin Governance Toggles */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-growth-teal" />
              <span>Client Governance Permissions</span>
            </div>

            <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={canBlockEmployees}
                onChange={(e) => setCanBlockEmployees(e.target.checked)}
                className="w-4 h-4 text-growth-teal rounded focus:ring-0"
              />
              <span>Allow this Client to Block / Unblock their own employees</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Client...' : 'Create Client & Generate ID'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
