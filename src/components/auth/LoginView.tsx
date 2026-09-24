'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Users,
} from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginView: React.FC = () => {
  const { refreshAuth } = useAuth();

  // Sign In State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Clear browser-forced autofill on initial mount
    const timer = setTimeout(() => {
      setIdentifier('');
      setPassword('');
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier,
          password,
          portalType: 'STANDARD',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await refreshAuth();
      } else {
        setErrorMsg(data.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans selection:bg-teal-600 selection:text-white">
      {/* Clean, subtle ambient brand accents matching platform gateway */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-500/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-orange-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* Main Workspace Card */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/70 p-8 sm:p-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-3.5 mb-8">
            <div className="transition-transform duration-200 hover:scale-[1.02]">
              <GrowthIndiaLogo size="lg" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide shadow-xs">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-[11px] font-mono tracking-wider uppercase">
                Client & Employee Portal
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Growth India Workspace
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Sign in with your registered email ID and credentials
              </p>
            </div>
          </div>

          {/* Global Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            {/* Dummy hidden inputs to absorb browser autofill */}
            <input type="text" name="fake_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="username" />
            <input type="password" name="fake_pass" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="current-password" />

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 ml-0.5">
                Email ID
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="workspace_user_login"
                  id="workspace_user_login"
                  autoComplete="off"
                  required
                  placeholder="Enter your email ID"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="workspace_pass_login"
                  id="workspace_pass_login"
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

            {/* Trouble signing in / Forgot password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 text-[11px]">Trouble signing in?</span>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-teal-600 hover:text-teal-700 font-bold transition-all hover:underline cursor-pointer text-xs"
              >
                Forgot Password?
              </button>
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
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Page Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6 font-medium">
          Growth India Platform • Client & Employee Workspace Gateway
        </p>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

