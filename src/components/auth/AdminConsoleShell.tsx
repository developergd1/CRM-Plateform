'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminLoginView } from '@/components/auth/AdminLoginView';
import { AdminPlatformGateway, PlatformProfile } from '@/components/admin/AdminPlatformGateway';
import { CmsPlatformShell } from '@/components/cms/CmsPlatformShell';
import { HrmPlatformShell } from '@/components/hrm/HrmPlatformShell';
import { CrmPlatformShell } from '@/components/layout/CrmPlatformShell';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import Link from 'next/link';
import { canAdminAccessPlatform } from '@/lib/rbac';

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
      } else if (saved === 'HRM' || saved === 'GATEWAY' || saved === 'CRM') {
        setSelectedPlatform(saved);
      }
    } catch {}
  }, []);

  // When user is loaded and delegated, ensure they are directed to an authorized platform
  useEffect(() => {
    if (user?.isDelegated) {
      const canCurrent = canAdminAccessPlatform(user, selectedPlatform);
      if (!canCurrent) {
        if (canAdminAccessPlatform(user, 'CMS')) {
          setSelectedPlatform('CMS');
        } else if (canAdminAccessPlatform(user, 'HRM')) {
          setSelectedPlatform('HRM');
        } else {
          setSelectedPlatform('GATEWAY');
        }
      }
    }
  }, [user, selectedPlatform]);

  const handleSelectPlatform = (platform: PlatformProfile) => {
    if (user?.isDelegated && !canAdminAccessPlatform(user, platform)) {
      return;
    }
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
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Access Restricted view helper
  const renderRestrictedPlatform = (platformName: string) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900">{platformName} Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your delegated administrator profile does not have authority to access the <strong className="text-slate-800">{platformName}</strong> platform.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleSelectPlatform('GATEWAY')}
            className="w-full py-2.5 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Return to Operating Gateway
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  // Render the Selected Platform Environment with RBAC guard
  switch (selectedPlatform) {
    case 'CMS':
      if (!canAdminAccessPlatform(user, 'CMS')) return renderRestrictedPlatform('Client Management (CMS)');
      return <CmsPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'HRM':
      if (!canAdminAccessPlatform(user, 'HRM')) return renderRestrictedPlatform('Enterprise HRM Suite');
      return <HrmPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'CRM':
      if (!canAdminAccessPlatform(user, 'CRM')) return renderRestrictedPlatform('CRM Sales Platform');
      return <CrmPlatformShell onSelectPlatform={handleSelectPlatform} />;
    case 'GATEWAY':
    default:
      return <AdminPlatformGateway onSelectPlatform={handleSelectPlatform} />;
  }
};
