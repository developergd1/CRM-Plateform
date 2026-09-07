'use client';

import React, { useState } from 'react';
import { X, KeyRound, ArrowRight, ShieldCheck, Building2, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'EMPLOYEE' | 'CLIENT';
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'EMPLOYEE',
}) => {
  const [accountType, setAccountType] = useState<'EMPLOYEE' | 'CLIENT'>(defaultRole);
  const [identifier, setIdentifier] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    targetName: string;
    targetRole: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your Phone Number, Email, or Account ID.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          accountType,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessInfo({
          message: data.message,
          targetName: data.targetName,
          targetRole: data.targetRole,
        });
      } else {
        setErrorMsg(data.error || 'Failed to submit reset request.');
      }
    } catch (e) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessInfo(null);
    setIdentifier('');
    setReason('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Forgot Password</h2>
              <p className="text-xs text-slate-400 mt-0.5">Account Recovery & Reset Request</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successInfo ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Request Sent Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed px-4">
                Your password reset request has been securely forwarded to:
              </p>
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl font-bold text-growth-teal text-xs mt-2">
                {successInfo.targetName}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {successInfo.targetRole === 'CLIENT'
                ? 'Your Client Employer has been notified. They can reset and share your credentials with you directly.'
                : 'Growth India System Administrator has been notified to reset your credentials.'}
            </p>
            <div className="pt-2">
              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
            {/* Account Type Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Account Role</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountType('EMPLOYEE')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    accountType === 'EMPLOYEE'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Employee / Staff</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('CLIENT')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                    accountType === 'CLIENT'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Client / Employer</span>
                </button>
              </div>
            </div>

            {/* Routing Notice */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset Destination</span>
              </div>
              <p className="leading-snug">
                {accountType === 'EMPLOYEE'
                  ? 'Request will be sent to your assigned Client Employer to reset your password.'
                  : 'Request will be sent directly to Growth India HQ System Administrator.'}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Registered Phone, Email, or Account ID *
              </label>
              <input
                type="text"
                required
                placeholder={
                  accountType === 'EMPLOYEE'
                    ? 'e.g. +91 98330 22222 or GI-EMP-000001'
                    : 'e.g. +91 99112 34567 or CLI-00001'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason / Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Forgot my previous password, need access reinstated..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-tealGlow flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Sending Request...' : 'Send Reset Request'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
