'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminLoginView } from '@/components/auth/AdminLoginView';
import { AdminPlatformGateway, PlatformProfile } from '@/components/admin/AdminPlatformGateway';
import { CmsPlatformShell } from '@/components/cms/CmsPlatformShell';
import { CrmPlatformShell } from '@/components/layout/CrmPlatformShell';
import { HrmPlatformShell } from '@/components/hrm/HrmPlatformShell';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import Link from 'next/link';

export const AdminConsoleShell: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformProfile>('GATEWAY');

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('gi_admin_selected_platform') as any;
      if (saved === 'EMPLOYEE_MANAGEMENT' || saved === 'CMS') {
        setSelectedPlatform('CMS');
      } else if (saved === 'CRM' || saved === 'HRM' || saved === 'GATEWAY') {
        setSelectedPlatform(saved);
      }
    } catch {}
  }, []);

  const handleSelectPlatform = (platform: PlatformProfile) => {
    setSelectedPlatform(platform);
    try {
      localStorage.setItem('gi_admin_selected_platform', platform);
    } catch {}
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-growth-teal" />
        <p className="text-xs text-slate-600 font-medium">Initializing Growth India Admin Governance Console...</p>
      </div>
    );
  }

  // If not logged in, show dedicated Admin Login interface
  if (!user) {
    return <AdminLoginView />;
  }

  // If logged in as Client or Employee (non-admin), deny access to Admin Console
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN_HR') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-rose-300">Administrative Access Denied</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your account (<strong className="text-white">{user.fullName}</strong> • <span className="font-mono text-growth-teal">{user.role}</span>) does not have Platform Administrator privileges to view this console.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={user.role === 'CLIENT' ? '/client' : '/employee'}
              className="py-2.5 px-4 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to {user.role === 'CLIENT' ? 'Client Portal' : 'Employee Workspace'}</span>
            </Link>
            <button
              onClick={() => logout()}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the Selected Platform Environment
  switch (selectedPlatform) {
    case 'CMS':
      return <CmsPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'CRM':
      return <CrmPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'HRM':
      return <HrmPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'GATEWAY':
    default:
      return <AdminPlatformGateway onSelectPlatform={handleSelectPlatform} />;
  }
};
