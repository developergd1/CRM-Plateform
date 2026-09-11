'use client';

import React from 'react';
import { CrmAnalyticsView } from '@/components/crm/analytics/CrmAnalyticsView';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function CrmAnalyticsPage() {
  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <CrmAnalyticsView />
          </div>
        </main>
      </div>
    </div>
  );
}
