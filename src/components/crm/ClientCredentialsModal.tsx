'use client';

import React, { useState, useEffect } from 'react';
import { useModalScroll } from '@/hooks/useModalScroll';
import { Check, Copy, KeyRound, Building2, Mail, ShieldCheck, X, Sparkles, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    id?: string;
    clientId: string;
    companyName?: string;
    email: string;
    password?: string;
  } | null;
  onPasswordUpdated?: () => void;
}

export const ClientCredentialsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  credentials,
  onPasswordUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && credentials) {
      setCurrentPassword(credentials.password || '');
      setNewPasswordInput('');
      setUpdateSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, credentials]);

  const scrollRef = useModalScroll<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen || !credentials) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Client#${rand}${Math.floor(100 + Math.random() * 900)}`;
    setNewPasswordInput(generated);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    setUpdating(true);
    setErrorMsg(null);
    setUpdateSuccessMsg(null);

    try {
      const targetId = credentials.id || credentials.clientId;
      const res = await fetch(`/api/clients/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentPassword(newPasswordInput.trim());
        setUpdateSuccessMsg(`Password updated successfully for ${credentials.companyName || credentials.clientId}!`);
        onPasswordUpdated?.();
      } else {
        setErrorMsg(data.error || 'Failed to update client password.');
      }
    } catch (e: any) {
      setErrorMsg('Network error while updating password.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopy = () => {
    const text = `Growth India CRM - Client Portal Access\nCompany: ${credentials.companyName || 'Corporate Client'}\nClient ID: ${credentials.clientId}\nLogin Email / ID: ${credentials.email}\nPassword: ${currentPassword || newPasswordInput || '[Preset Password]'}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full text-slate-800 shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white flex items-center justify-between border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Client Credentials & Access</h3>
            <p className="text-xs text-slate-500 mt-0.5">{credentials.companyName || credentials.clientId}</p>
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
          {/* Success Alert */}
          {updateSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{updateSuccessMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Client Profile Overview Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans font-semibold">Client ID:</span>
              <span className="font-bold text-teal-800">{credentials.clientId}</span>
            </div>

            {credentials.companyName && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-sans font-semibold">Company:</span>
                <span className="font-sans font-bold text-slate-900 truncate max-w-[220px]">{credentials.companyName}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-sans font-semibold">Login Email:</span>
              <span className="text-teal-700 font-medium select-all">{credentials.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-sans font-semibold">Current Password:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg select-all">
                  {currentPassword ? (showCurrentPassword ? currentPassword : '••••••••••••') : '••••••••'}
                </span>
                {currentPassword && (
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={showCurrentPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reset / Change Password Form */}
          <form onSubmit={handleUpdatePassword} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Edit / Set New Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Type new password or click Auto-Generate"
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title={showNewPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={updating || !newPasswordInput.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                {updating ? (
                  <span>Saving...</span>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50/50 border-t border-slate-100 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Credentials</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};