'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const EmployeePortalShell = dynamic(
  () => import('@/components/employee-portal/EmployeePortalShell').then((m) => m.EmployeePortalShell),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-slate-50 flex flex-col items-center justify-center text-slate-700 gap-3">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Loading Employee Workspace...</span>
      </div>
    ),
  }
);

export default function EmployeeAttendancePage() {
  return <EmployeePortalShell />;
}
