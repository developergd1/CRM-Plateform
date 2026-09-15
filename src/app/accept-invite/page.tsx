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
  Building2,
} from 'lucide-react';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in link.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invitations/verify?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setError(data.error || 'This invitation link is invalid or has been revoked.');
        } else {
          setInvitationData(data.invitation);
        }
      } catch (err: any) {
        setError('Network error verifying invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/invitations/accept', {
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
        throw new Error(data.error || 'Failed to activate account.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.redirectTo || '/');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong while activating your account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-center p-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        <p className="text-xs text-slate-400 font-medium">Verifying invitation credentials & security token...</p>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">Invitation Inactive or Revoked</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {error || 'This link has either been deactivated by the account owner or does not exist.'}
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all inline-block"
            >
              Return to Login Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Account Activated Successfully!</h2>
          <p className="text-xs text-slate-300">
            Welcome to Growth India CRM Platform. Redirecting you to your workspace now...
          </p>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-6 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <GrowthIndiaLogo size="lg" className="mx-auto" />
          <p className="text-xs text-slate-400">Official Shared Access & Delegated Portal</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Inviter Info Header */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-growth-teal/20 text-growth-teal flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-growth-teal">
                Authorized Invitation
              </div>
              <div className="text-xs text-slate-200 mt-0.5 leading-snug">
                You have been invited by <strong className="text-white">{invitationData.inviterName}</strong> ({invitationData.organizationName}) to access their workspace.
              </div>
            </div>
          </div>

          {/* Granted Permissions Preview */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Your Delegated Access Scope
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
              {invitationData.permissions?.map((perm: string) => (
                <span
                  key={perm}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-growth-teal/10 text-growth-teal border border-growth-teal/30"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                {submitError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Full Name</label>
              <input
                type="text"
                disabled
                value={invitationData.name}
                className="w-full bg-slate-950/60 border border-slate-800 text-xs text-slate-400 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <input
                type="email"
                disabled
                value={invitationData.email}
                className="w-full bg-slate-950/60 border border-slate-800 text-xs text-slate-400 rounded-xl px-3.5 py-2.5 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Create Your Account Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter at least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-growth-teal text-xs text-white rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-growth-teal text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-5 bg-gradient-to-r from-growth-teal to-growth-tealDark hover:opacity-95 text-white font-black text-xs rounded-xl shadow-tealGlow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate Account & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center">
            By activating your account, you agree to Growth India CRM Platform security governance & audit policies.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <GrowthIndiaLogo size="lg" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
