'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const EmployeePortalShell = dynamic(
  () => import('@/components/employee-portal/EmployeePortalShell').then((m) => m.EmployeePortalShell),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-8 h-8 border-2 border-growth-teal border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-slate-400">Loading Employee Workspace...</span>
      </div>
    ),
  }
);

export default function EmployeeAttendancePage() {
  return <EmployeePortalShell />;
}
