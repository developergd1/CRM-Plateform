'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

const AppShell = dynamic(
  () => import('@/components/layout/AppShell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-growth-teal" />
        <p className="text-xs text-slate-600 font-medium">Loading Growth India Platform...</p>
      </div>
    ),
  }
);

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR') {
        router.replace('/growthIndia');
      }
    }
  }, [user, loading, router]);

  if (!loading && user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR')) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-growth-teal" />
        <p className="text-xs text-slate-400 font-medium">
          Redirecting to Admin Governance Console...
        </p>
      </div>
    );
  }

  return <AppShell />;
}


