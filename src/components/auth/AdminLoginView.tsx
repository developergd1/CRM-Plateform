'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';

export const AdminLoginView: React.FC = () => {
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both Admin Email/ID and Password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portalType: 'ADMIN' }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user?.role !== 'ADMIN' && data.user?.role !== 'SUPER_ADMIN') {
          setErrorMsg('Access Denied: This portal is strictly for Platform Administrators.');
          return;
        }
        await refreshAuth();
      } else {
        setErrorMsg(data.error || 'Admin authentication failed. Check credentials.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 relative overflow-x-hidden selection:bg-growth-gold selection:text-slate-900">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-growth-teal/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="max-w-lg w-full mx-auto my-auto py-8 z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-amber-500/30 shadow-2xl mb-3 backdrop-blur-md">
            <GrowthIndiaLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-black text-growth-gold mb-2">
            <ShieldCheck className="w-4 h-4 text-growth-gold" />
            <span>PLATFORM GOVERNANCE & SUPER ADMIN CONSOLE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Administrator Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Full governance access: Client Management, Staff Onboarding, ID Generation & Block/Unblock Control
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="w-full mb-5 p-4 bg-rose-950/90 border-2 border-rose-500/80 text-rose-200 text-xs rounded-2xl space-y-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 font-black text-rose-300">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Administrative Security Notice</span>
            </div>
            <p className="font-medium text-rose-100 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Admin Login Form */}
        <div className="w-full bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Admin Email ID / Admin ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="admin@growthindia.in or GI-EMP-000001"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs md:text-sm text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs md:text-sm text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 bg-gradient-to-r from-growth-gold to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs md:text-sm rounded-xl shadow-glow flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Authenticate Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Return link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Client or Employee?</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-bold text-growth-teal hover:text-teal-300 hover:underline transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Normal Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="text-center text-[11px] text-slate-500 z-10 py-2">
        Growth India CRM Platform • Super Admin Governance Gateway
      </footer>
    </div>
  );
};
