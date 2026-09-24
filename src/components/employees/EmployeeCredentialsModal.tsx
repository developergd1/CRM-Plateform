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
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full text-slate-800 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shadow-xs shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  {credentials.isNewlyCreated ? 'Employee Onboarding Complete' : 'Login Credentials & Access'}
                </span>
                <span className="font-mono text-xs font-bold text-teal-800">
                  {credentials.employeeId}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Employee Login Credentials</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={scrollRef}
          tabIndex={0}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 focus:outline-none"
        >
          <p className="text-xs text-slate-500 leading-relaxed">
            Employee can log in to the workspace using their <strong className="text-teal-700 font-semibold">Employee ID</strong>, <strong className="text-slate-800 font-semibold">Mobile Number</strong>, or <strong className="text-slate-800 font-semibold">Email Address</strong> along with this password.
          </p>

          {/* Status Alerts */}
          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Credentials Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 font-mono text-xs">
            {/* Employee ID */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Employee ID (Login ID):</span>
              </span>
              <span className="font-bold text-teal-800 text-sm select-all">{credentials.employeeId}</span>
            </div>

            {/* Full Name */}
            {credentials.fullName && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Full Name:</span>
                <span className="font-sans font-bold text-slate-900 select-all">{credentials.fullName}</span>
              </div>
            )}

            {/* Client Company */}
            {credentials.companyName && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Assigned Client:</span>
                </span>
                <span className="font-sans font-bold text-slate-800 select-all">{credentials.companyName}</span>
              </div>
            )}

            {/* Mobile */}
            {credentials.phone && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile (Login ID):</span>
                </span>
                <span className="text-slate-800 select-all font-semibold">{credentials.phone}</span>
              </div>
            )}

            {/* Email */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600" />
                <span>Login Email:</span>
              </span>
              <span className="text-teal-700 select-all font-semibold break-all">{credentials.email}</span>
            </div>

            {/* Password Field */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 font-sans font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                <span>Password:</span>
              </span>

              {hasPassword ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-bold bg-white border border-slate-200 px-3 py-1 rounded-lg select-all text-sm tracking-wider font-mono">
                    {showPassword ? credentials.password : '••••••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <span className="text-amber-800 text-[11px] font-sans font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Encrypted in Database
                </span>
              )}
            </div>
          </div>

          {/* Inline Password Assign / Reset Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-sans font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                <span>{hasPassword ? 'Change / Re-assign Password:' : 'Assign / Set New Password:'}</span>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Generate</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter new password or click Quick Generate"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
              />
              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
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
            className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
