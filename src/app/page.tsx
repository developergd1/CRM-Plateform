'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

const AppShell = dynamic(
  () => import('@/components/layout/AppShell').then((m) => m.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        <p className="text-xs text-slate-400 font-medium">Loading Growth India CRM Platform...</p>
      </div>
    ),
  }
);

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_HR');

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace('/growthIndia');
    }
  }, [isAdmin, loading, router]);

  if (loading || isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        <p className="text-xs text-slate-400 font-medium">Loading Growth India CRM Platform...</p>
      </div>
    );
  }

  return <AppShell />;
}


