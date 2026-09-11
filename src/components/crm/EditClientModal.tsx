'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Tag, Edit, KeyRound, FileText } from 'lucide-react';
import { ClientItem } from '@/types';
import { useModalScroll } from '@/hooks/useModalScroll';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientItem | null;
  onClientUpdated: () => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onClientUpdated,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsTemporary, setSameAsTemporary] = useState(false);
  const [industry, setIndustry] = useState('IT & Software Services');
  const [customIndustry, setCustomIndustry] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [hasGst, setHasGst] = useState(true);
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useModalScroll<HTMLDivElement>({
    isOpen,
    onClose,
  });

  useEffect(() => {
    if (isOpen && client) {
      setCompanyName(client.companyName || '');
      setContactPerson(client.contactPerson || '');
      setMobile(client.mobile || '');
      setEmail(client.email || '');

      const clientGst = client.gstNumber || '';
      const clientPan = client.panNumber || '';
      setGstNumber(clientGst);
      setPanNumber(clientPan);
      setHasGst(Boolean(clientGst) || !clientPan);

      let temp = '';
      let perm = '';
      const rawAddr = client.address || '';
      if (rawAddr.includes('Temporary:') || rawAddr.includes('Permanent:')) {
        const parts = rawAddr.split('\n');
        parts.forEach((p) => {
          if (p.startsWith('Temporary:')) temp = p.replace('Temporary:', '').trim();
          if (p.startsWith('Permanent:')) perm = p.replace('Permanent:', '').trim();
        });
      } else {
        temp = rawAddr;
        perm = (client as any).location || rawAddr;
      }

      setTemporaryAddress(temp);
      setPermanentAddress(perm);
      setSameAsTemporary(temp !== '' && temp === perm);

      const standardIndustries = [
        'IT & Software Services',
        'Logistics & Supply Chain',
        'Banking & Financial Services',
        'Healthcare & Life Sciences',
        'Manufacturing & Industrial',
        'Retail & E-Commerce',
        'Hospitality & Services',
      ];
      const clientInd = client.industry || 'IT & Software Services';
      if (standardIndustries.includes(clientInd)) {
        setIndustry(clientInd);
        setCustomIndustry('');
      } else {
        setIndustry('Other Industry');
        setCustomIndustry(clientInd === 'Other Industry' ? '' : clientInd);
      }

      setStatus(client.status || 'ACTIVE');
      setNewPassword('');
      setShowPassword(false);
    }
  }, [isOpen, client]);

  if (!isOpen || !client) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !mobile) {
      setErrorMsg('Company Name, Contact Person, and Phone Number are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const finalAddress = temporaryAddress && permanentAddress
      ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
      : (temporaryAddress || permanentAddress || '');

    const effectiveGst = hasGst ? gstNumber.trim().toUpperCase() : '';
    const effectivePan = hasGst && gstNumber.trim().length >= 12
      ? gstNumber.trim().toUpperCase().slice(2, 12)
      : panNumber.trim().toUpperCase();

    const finalIndustry = industry === 'Other Industry'
      ? (customIndustry.trim() || 'Other Industry')
      : industry;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactPerson,
          mobile,
          email,
          gstNumber: effectiveGst,
          panNumber: effectivePan,
          aadharNumber: '',
          address: finalAddress,
          temporaryAddress,
          permanentAddress,
          industry: finalIndustry,
          status,
          newPassword: newPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onClientUpdated();
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to update client.');
      }
    } catch (e: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold shrink-0">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-growth-gold bg-amber-950/80 px-2 py-0.5 rounded border border-growth-gold/30">
                  {client.clientId}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">Edit Client Information</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200 shrink-0">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div
            ref={scrollRef}
            tabIndex={0}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs focus:outline-none focus:ring-1 focus:ring-inset focus:ring-slate-100"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
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
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 99112 34567"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email ID</label>
                <input
                  type="email"
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Industry Sector</label>
                <select
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    if (e.target.value !== 'Other Industry') {
                      setCustomIndustry('');
                    }
                  }}
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
                {industry === 'Other Industry' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Industry Sector *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EdTech, Real Estate, Automotive..."
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Business Tax & Registration (GST / PAN Flow) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-growth-teal" />
                  <span>Business Tax Registration</span>
                </label>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setHasGst(true)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      hasGst ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Has GST Number
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasGst(false)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      !hasGst ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    No GST (Provide PAN)
                  </button>
                </div>
              </div>

              {hasGst ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 text-xs">GST Number (GSTIN) *</label>
                    {gstNumber.length === 15 && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Auto-Linked PAN: {gstNumber.slice(2, 12)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 07ABCDE1234F1Z5 (15 Characters)"
                    value={gstNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setGstNumber(val);
                      if (val.length >= 12) {
                        setPanNumber(val.slice(2, 12));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-growth-teal text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    GSTIN is sufficient for client billing and business compliance.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">PAN Card Number *</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F (10 Characters)"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono uppercase text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-growth-teal text-xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Required for unregistered corporate accounts or sole proprietorships without active GST.
                  </p>
                </div>
              )}
            </div>

            {/* Two Address Boxes: Temporary Address and Permanent Address */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 4th Floor, Cyber City, Sector 29, Gurugram"
                  value={temporaryAddress}
                  onChange={(e) => {
                    setTemporaryAddress(e.target.value);
                    if (sameAsTemporary) setPermanentAddress(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Permanent Address</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sameAsTemporary}
                      onChange={(e) => {
                        setSameAsTemporary(e.target.checked);
                        if (e.target.checked) setPermanentAddress(temporaryAddress);
                      }}
                      className="w-3.5 h-3.5 text-growth-teal rounded focus:ring-0"
                    />
                    <span>Same as Temporary Address</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  disabled={sameAsTemporary}
                  placeholder="e.g. Regus Tower, Nariman Point, Mumbai"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              >
                <option value="ACTIVE">ACTIVE (Operational)</option>
                <option value="INACTIVE">INACTIVE (Dormant)</option>
              </select>
            </div>

            {/* Reset / Change Client Password */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Reset / Change Client Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                    let rand = '';
                    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
                    setNewPassword(`Client#${rand}`);
                    setShowPassword(true);
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline"
                >
                  Auto-Generate
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Leave blank to keep current password, or enter new password to reset"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
              />
              <p className="text-[10px] text-amber-800/80">
                Enter a new password (min 4 chars) to update this client&#39;s login credential.
              </p>
            </div>
          </div>

          {/* Modal Footer - Fixed at bottom */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Client Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
