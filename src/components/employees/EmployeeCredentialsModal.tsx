'use client';

import React, { useState } from 'react';
import { useModalScroll } from '@/hooks/useModalScroll';
import { Check, Copy, KeyRound, User, Mail, Building2, Phone, X, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';

export interface EmployeeCredentialData {
  id?: string;
  employeeId: string;
  fullName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  password?: string;
  isNewlyCreated?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  credentials: EmployeeCredentialData | null;
  onPasswordUpdated?: () => void;
}

export const EmployeeCredentialsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  credentials: initialCredentials,
  onPasswordUpdated,
}) => {
  const [credentials, setCredentials] = useState<EmployeeCredentialData | null>(initialCredentials);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // In-modal password assignment state
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  React.useEffect(() => {
    setCredentials(initialCredentials);
    setPasswordSuccess(null);
    setPasswordError(null);
    setNewPassword('');
  }, [initialCredentials]);

  const scrollRef = useModalScroll<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen || !credentials) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Emp#${rand}${Math.floor(10 + Math.random() * 90)}`;
    setNewPassword(generated);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const targetId = credentials.id || credentials.employeeId;
      const res = await fetch(`/api/employees/${targetId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setCredentials((prev) =>
          prev
            ? {
                ...prev,
                password: newPassword.trim(),
              }
            : null
        );
        setPasswordSuccess('Password assigned successfully! You can now copy the complete credentials.');
        setNewPassword('');
        if (onPasswordUpdated) onPasswordUpdated();
      } else {
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError('Network error while updating password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCopy = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const pwdText = credentials.password || '[Password not assigned yet]';
    
    const text = `=========================================
GROWTH INDIA - EMPLOYEE LOGIN CREDENTIALS
=========================================
Employee Name: ${credentials.fullName || 'Staff Member'}
Employee ID:   ${credentials.employeeId}
Client/Org:    ${credentials.companyName || 'Growth India HQ'}
Login ID:      ${credentials.employeeId} (or ${credentials.email})
Login Phone:   ${credentials.phone || 'N/A'}
Login Email:   ${credentials.email}
Password:      ${pwdText}
-----------------------------------------
Portal Login:  ${origin}
(You can log in using Employee ID, Phone, or Email)
=========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const hasPassword = Boolean(credentials.password && !credentials.password.startsWith('[Encrypted'));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-white shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-growth-teal to-teal-700 flex items-center justify-center text-white font-black shadow-lg shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-growth-teal/20 text-growth-teal border border-growth-teal/30">
                  {credentials.isNewlyCreated ? 'Employee Onboarding Complete' : 'Login Credentials & Access'}
                </span>
                <span className="font-mono text-xs font-bold text-growth-gold">
                  {credentials.employeeId}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5">Employee Login Credentials</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          tabIndex={0}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-slate-800"
        >
        

        <p className="text-xs text-slate-400 leading-relaxed">
          Employee can log in to the workspace using their <strong className="text-growth-teal">Employee ID</strong>, <strong className="text-growth-gold">Phone Number</strong>, or <strong className="text-white">Email Address</strong> along with this password.
        </p>

        {/* Status Alerts */}
        {passwordSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold px-4 py-2.5 rounded-xl">
            {passwordError}
          </div>
        )}

        {/* Credentials Card */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 font-mono text-xs">
          {/* Employee ID */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-growth-teal" />
              <span>Employee ID (Login ID):</span>
            </span>
            <span className="font-bold text-growth-teal text-sm select-all">{credentials.employeeId}</span>
          </div>

          {/* Full Name */}
          {credentials.fullName && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold">Full Name:</span>
              <span className="font-sans font-bold text-slate-200 select-all">{credentials.fullName}</span>
            </div>
          )}

          {/* Client Company */}
          {credentials.companyName && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-growth-gold" />
                <span>Assigned Client:</span>
              </span>
              <span className="font-sans font-bold text-growth-gold select-all">{credentials.companyName}</span>
            </div>
          )}

          {/* Mobile */}
          {credentials.phone && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile (Login ID):</span>
              </span>
              <span className="text-slate-200 select-all font-semibold">{credentials.phone}</span>
            </div>
          )}

          {/* Email */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              <span>Login Email:</span>
            </span>
            <span className="text-teal-400 select-all font-semibold break-all">{credentials.email}</span>
          </div>

          {/* Password Field */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 font-sans font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Password:</span>
            </span>

            {hasPassword ? (
              <div className="flex items-center gap-2">
                <span className="text-growth-gold font-bold bg-slate-900 border border-growth-gold/30 px-3 py-1 rounded-lg select-all text-sm tracking-wider">
                  {showPassword ? credentials.password : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <span className="text-amber-400 text-[11px] font-sans font-semibold bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                Encrypted in Database
              </span>
            )}
          </div>
        </div>

        {/* Inline Password Assign / Reset Box (Available directly in this modal) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-sans font-bold text-xs text-slate-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-growth-teal" />
              <span>{hasPassword ? 'Change / Re-assign Password:' : 'Assign / Set New Password:'}</span>
            </div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-[11px] font-bold text-growth-teal hover:text-teal-300 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
              <span>Quick Generate</span>
            </button>
          </div>

          <form onSubmit={handleSaveNewPassword} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Mohit@2026 or click Quick Generate"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-growth-teal"
            />
            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword.trim()}
              className="px-4 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              {isUpdatingPassword ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-growth-teal to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-glow transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied Credentials to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Full Credentials</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
