'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Lock,
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
      setErrorMsg('Please enter both Administrator Email and Password.');
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
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMsg('Network connectivity error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans selection:bg-teal-600 selection:text-white">
      {/* Clean, subtle ambient brand accents matching platform gateway */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* Main Admin Card */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/70 p-8 sm:p-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-3.5 mb-8">
            <div className="transition-transform duration-200 hover:scale-[1.02]">
              <GrowthIndiaLogo size="lg" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
              </span>
              <span className="text-[11px] font-mono tracking-wider uppercase">
                Admin Command Center
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium max-w-xs">
              Secure authentication gateway for platform administration
            </p>
          </div>

          {/* Error Banner with Slide Animation */}
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
            {/* Dummy hidden inputs to absorb browser autofill */}
            <input
              type="text"
              name="fake_user"
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="username"
            />
            <input
              type="password"
              name="fake_pass"
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="current-password"
            />

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 ml-0.5">
                Admin Email ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="admin_user_login"
                  id="admin_user_login"
                  autoComplete="off"
                  required
                  placeholder="Enter your email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all font-medium outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 ml-0.5">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="admin_pass_login"
                  id="admin_pass_login"
                  autoComplete="new-password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/25 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
                    <span>Sign In to Admin Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
