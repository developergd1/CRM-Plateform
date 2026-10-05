'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building,
  KeyRound,
  Shield,
  Briefcase,
} from 'lucide-react';

function AdminAcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No Administrator invitation token provided.');
      setLoading(false);
      return;
    }

    const verifyAdminToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/invitations/verify?token=${token}`);
        const data = await res.json();

        if (data.alreadyAccepted || data.error?.includes('already been accepted')) {
          setAlreadyAccepted(true);
          setInvitationData(data.invitation || null);
          setError(null);
        } else if (!res.ok || !data.valid) {
          setError(data.error || 'This Administrator invitation link is invalid or has expired.');
        } else {
          setInvitationData(data.invitation);
        }
      } catch (err: any) {
        setError('Network error verifying administrator token. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyAdminToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || password.length < 8) {
      setSubmitError('Administrator password must be at least 8 characters long for platform security compliance.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate Administrator account.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.redirectTo || '/growthIndia');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong while activating Administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-teal-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center">
            <GrowthIndiaLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Administrator Onboarding</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Activate Platform Administrator Account
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have received an elevated security invitation to join the Growth India Executive Governance Team.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">
                Verifying administrative cryptographic token...
              </p>
            </div>
          ) : alreadyAccepted ? (
            <div className="py-8 text-center space-y-5 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-white">Administrator Account Active</h3>
                <p className="text-xs text-emerald-400 font-semibold">
                  This Administrator invitation has already been accepted and activated.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Your platform administrator credentials have already been configured. You can sign in directly to access the Growth India Administrative Governance Console.
                </p>
              </div>

              {invitationData && (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Administrator Profile</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {invitationData.role || 'ADMIN'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{invitationData.name}</h4>
                    <p className="text-xs font-mono text-teal-300">{invitationData.email}</p>
                    {invitationData.designation && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{invitationData.designation}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/growthIndia?email=${encodeURIComponent(invitationData?.email || '')}`)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 cursor-pointer"
                >
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Invitation Link Inactive</h3>
                <p className="text-xs text-rose-400 max-w-sm mx-auto leading-relaxed">{error}</p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => router.push('/growthIndia')}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Go to Admin Login
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Platform Home
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  Administrator Access Activated!
                </h3>
                <p className="text-xs text-slate-300">
                  Redirecting to the Growth India Administrator Governance Console...
                </p>
              </div>
              <div className="w-32 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-teal-500 animate-pulse rounded-full" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Administrator</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {invitationData.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Invited by {invitationData.inviterAdminName}
                  </span>
                </div>

                <div className="border-t border-slate-700/60 pt-2.5 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white">{invitationData.name}</h4>
                    <p className="text-xs text-slate-400">{invitationData.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-300">{invitationData.designation}</p>
                    <p className="text-[11px] text-slate-500">{invitationData.department}</p>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Password Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Create Administrator Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 strong characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Confirm Administrator Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* High Privilege Advisory */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>Security & Audit Policy</span>
                </p>
                <p className="leading-relaxed">
                  Administrator activities are immutably logged in the audit vault. Your login credentials are for your exclusive use.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Administrator Account...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Administrator Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminAcceptInviteContent />
    </Suspense>
  );
}
