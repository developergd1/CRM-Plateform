'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HrmDirectRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem('gi_admin_selected_platform', 'HRM');
    } catch {}
    router.replace('/growthIndia');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-teal-400" />
      <p className="text-xs text-slate-400 font-medium">Navigating to Growth India HRM Platform...</p>
    </div>
  );
}
