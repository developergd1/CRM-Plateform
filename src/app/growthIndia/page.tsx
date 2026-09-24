'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

const AdminConsoleShell = dynamic(
  () => import('@/components/auth/AdminConsoleShell').then((m) => m.AdminConsoleShell),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-growth-teal" />
        <p className="text-xs text-slate-600 font-medium">Initializing Growth India Admin Governance Console...</p>
      </div>
    ),
  }
);

export default function GrowthIndiaPage() {
  return <AdminConsoleShell />;
}
