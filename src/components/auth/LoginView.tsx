'use client';

import React, { useState } from 'react';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 relative overflow-x-hidden selection:bg-growth-gold selection:text-slate-900">
      {/* Ambient background lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-growth-teal/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-growth-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="max-w-md w-full mx-auto my-auto py-8 z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl mb-3 backdrop-blur-md">
            <GrowthIndiaLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-growth-teal/10 border border-growth-teal/30 rounded-full text-xs font-bold text-growth-teal mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>CLIENT & EMPLOYEE PORTAL ACCESS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Growth India Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Sign in with your registered email address
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="w-full mb-5 p-4 bg-rose-950/90 border-2 border-rose-500/80 text-rose-200 text-xs rounded-2xl space-y-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 font-black text-rose-300">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Authentication Notice</span>
            </div>
            <p className="font-medium text-rose-100 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Clean Sign In Card */}
        <div className="w-full bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs md:text-sm text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-growth-teal focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs md:text-sm text-white font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-growth-teal focus:border-transparent transition-all"
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

            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-500">Trouble signing in?</span>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-growth-teal hover:text-teal-300 font-bold transition-all hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-growth-teal to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-tealGlow flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* Page Footer */}
      <footer className="text-center text-[11px] text-slate-500 z-10 py-2">
        Growth India Platform • Client & Employee Workspace Gateway
      </footer>
    </div>
  );
};

