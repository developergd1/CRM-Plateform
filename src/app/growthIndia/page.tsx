'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

const AdminConsoleShell = dynamic(
  () => import('@/components/auth/AdminConsoleShell').then((m) => m.AdminConsoleShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-gold" />
        <p className="text-xs text-slate-400 font-medium">Initializing Growth India Admin Governance Console...</p>
      </div>
    ),
  }
);

export default function GrowthIndiaPage() {
  return <AdminConsoleShell />;
}
