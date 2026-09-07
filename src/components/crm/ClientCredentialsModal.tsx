'use client';

import React, { useState, useEffect } from 'react';
import { useModalScroll } from '@/hooks/useModalScroll';
import { Check, Copy, KeyRound, Building2, Mail, ShieldCheck, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [newPasswordInput, setNewPasswordInput] = useState('');
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
        setUpdateSuccessMsg(`✅ Password updated successfully for ${credentials.companyName || credentials.clientId}!`);
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full text-white shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-growth-gold to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-growth-gold/20 text-growth-gold border border-growth-gold/30">
                Admin Access Management
              </span>
              <h3 className="text-base font-black text-white mt-0.5">Client Credentials & Password</h3>
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
          {/* Success Alert */}
          {updateSuccessMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2">
              <span>{updateSuccessMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Client Profile Overview Card */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold">Client ID:</span>
              <span className="font-bold text-growth-gold">{credentials.clientId}</span>
            </div>

            {credentials.companyName && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans font-semibold">Company:</span>
                <span className="font-sans font-bold text-slate-200 truncate max-w-[220px]">{credentials.companyName}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold">Login Email:</span>
              <span className="text-teal-400 font-medium select-all">{credentials.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans font-semibold">Current Password:</span>
              <span className="text-white font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg select-all">
                {currentPassword || '••••••••'}
              </span>
            </div>
          </div>

          {/* Reset / Change Password Form */}
          <form onSubmit={handleUpdatePassword} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit / Set New Password</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] font-bold text-growth-gold hover:text-amber-300 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Type new password or click Auto-Generate"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-growth-gold"
              />
              <button
                type="submit"
                disabled={updating || !newPasswordInput.trim()}
                className="px-4 py-2 bg-growth-gold hover:bg-growth-goldDark disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Updating the password immediately replaces the client’s portal login credential and resets any account lockouts.
            </p>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800/80 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-tealGlow transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy All Credentials</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};