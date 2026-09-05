'use client';

import React, { useState } from 'react';
import { Check, Copy, KeyRound, Building2, Mail, ShieldCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    clientId: string;
    companyName?: string;
    email: string;
    password?: string;
  } | null;
}

export const ClientCredentialsModal: React.FC<Props> = ({ isOpen, onClose, credentials }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !credentials) return null;

  const handleCopy = () => {
    const text = `Growth India CRM - Client Portal Access\nCompany: ${credentials.companyName || 'Corporate Client'}\nClient ID: ${credentials.clientId}\nLogin Email / ID: ${credentials.email}\nPassword: ${credentials.password || '[Preset Password]'}\nPortal URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-growth-gold to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-growth-gold/20 text-growth-gold border border-growth-gold/30">
              Client Onboarding Complete
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">Client Login Credentials</h3>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The client account has been provisioned. Share these login credentials with the client representative. The client can log in at the main portal.
        </p>

        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-500 font-sans font-semibold">Client ID:</span>
            <span className="font-bold text-growth-gold">{credentials.clientId}</span>
          </div>

          {credentials.companyName && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-slate-500 font-sans font-semibold">Company:</span>
              <span className="font-sans font-bold text-slate-200 truncate max-w-[200px]">{credentials.companyName}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-slate-500 font-sans font-semibold">Login Email:</span>
            <span className="text-teal-400 select-all">{credentials.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-sans font-semibold">Password:</span>
            <span className="text-white font-bold bg-slate-800/80 px-2 py-1 rounded select-all">
              {credentials.password || '••••••••'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-growth-gold hover:bg-growth-goldDark text-slate-950 font-bold text-xs rounded-xl shadow-glow transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-900" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Credentials</span>
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
