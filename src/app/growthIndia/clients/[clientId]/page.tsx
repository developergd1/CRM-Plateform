'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CmsSelectedClientShell } from '@/components/cms/CmsSelectedClientShell';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.clientId || params?.id) as string;

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <CmsSelectedClientShell
              clientId={clientId}
              onBack={() => router.back()}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
