'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export const AdminLoginView: React.FC = () => {
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Clear browser-forced autofill on initial mount
    const timer = setTimeout(() => {
      setEmail('');
      setPassword('');
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
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
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-amber-500/30">
      {/* Left Column: Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-growth-teal/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="bg-white/5 inline-block p-4 rounded-xl border border-white/10 backdrop-blur-sm mb-12">
            <GrowthIndiaLogo size="lg" />
          </div>
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs font-black text-amber-500 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Governance</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              Centralized<br />Admin Console
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Securely manage your CRM, workforce, client configurations, and overarching platform settings from a single command center.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs font-mono text-slate-500">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Growth India CRM Enterprise System v2.0</span>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-24 xl:px-32 relative bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden flex justify-center mb-8">
          <GrowthIndiaLogo size="md" />
        </div>

        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
            <p className="text-sm text-slate-500 font-medium">Please authenticate to access governance controls.</p>
          </div>

          {/* Global Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm font-medium flex items-start gap-3">
              <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5" autoComplete="off">
            {/* Dummy hidden inputs to absorb browser autofill */}
            <input type="text" name="fake_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="username" />
            <input type="password" name="fake_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="current-password" />

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Administrator Email ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="admin_user_login"
                  id="admin_user_login"
                  autoComplete="off"
                  required
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent sm:text-sm font-medium transition-colors bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Secure Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="admin_pass_login"
                  id="admin_pass_login"
                  autoComplete="new-password"
                  required
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent sm:text-sm font-medium transition-colors bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Sign In to Admin Portal</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-200">
            <Link
              href="/"
              className="group flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Return to Standard Login</span>
            </Link>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center lg:hidden">
          <span className="text-[10px] text-slate-400 font-medium">Growth India CRM • Secure Administrator Access</span>
        </div>
      </div>
    </div>
  );
};
