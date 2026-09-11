'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LeadDetailView } from '@/components/crm/leads/LeadDetailView';
import { AdminLoginView } from '@/components/auth/AdminLoginView';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';

export default function LeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        <p className="text-xs text-slate-400">Loading Lead Intelligence...</p>
      </div>
    );
  }

  if (!user) {
    return <AdminLoginView />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/90">
          <div className="max-w-7xl mx-auto">
            <LeadDetailView leadId={id} />
          </div>
        </main>
      </div>
    </div>
  );
}
