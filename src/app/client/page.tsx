'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

const ClientPortalShell = dynamic(
  () => import('@/components/client-portal/ClientPortalShell').then((m) => m.ClientPortalShell),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-slate-800 gap-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Loading Client Portal...</span>
      </div>
    ),
  }
);

export default function ClientPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-teal-600" />
        <p className="text-xs text-slate-500 font-medium">Redirecting to login...</p>
      </div>
    );
  }

  return <ClientPortalShell initialTab="overview" />;
}
