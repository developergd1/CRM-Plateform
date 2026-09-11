'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client360View } from '@/components/crm/clients/Client360View';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function CrmClient360Page() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.id || params?.clientId) as string;

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Client360View
              clientId={clientId}
              onBack={() => router.push('/growthIndia')}
              onNavigate={(tab, id) => {
                if (tab === 'deals' && id) router.push(`/growthIndia/crm/deals/${id}`);
                else if (tab === 'leads' && id) router.push(`/growthIndia/crm/leads`);
                else if (tab === 'workforce') router.push(`/growthIndia/workforce`);
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
