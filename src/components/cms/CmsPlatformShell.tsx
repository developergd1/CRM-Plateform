'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import { PlatformSwitcherDropdown } from '../admin/PlatformSwitcherDropdown';
import { PlatformProfile } from '../admin/AdminPlatformGateway';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PasswordResetRequestsModal } from '@/components/auth/PasswordResetRequestsModal';
import {
  LayoutDashboard,
  UserPlus,
  Building2,
  LogOut,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Grid,
  Lock,
} from 'lucide-react';
import { canAdminAccessPlatform, hasAdminPermission } from '@/lib/rbac';
import { CmsDashboardView } from './CmsDashboardView';
import { CmsClientOnboardingView } from './CmsClientOnboardingView';
import { CmsClientsListView } from './CmsClientsListView';
import { CmsSelectedClientShell } from './CmsSelectedClientShell';

interface CmsPlatformShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const CmsPlatformShell: React.FC<CmsPlatformShellProps> = ({ onSelectPlatform }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'cms-hub' | 'cms-dashboard' | 'cms-onboarding' | 'cms-clients' | 'cms-selected-client'>('cms-hub');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSubTab, setClientSubTab] = useState<string>('profile');

  // Password reset requests state
  const [showResetRequests, setShowResetRequests] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);

  const hasCmsAccess = canAdminAccessPlatform(user, 'CMS');
  const canViewResetRequests = hasAdminPermission(user, 'password-requests');

  const fetchResetRequestsCount = async () => {
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const data = await res.json();
        setPendingResetCount(data.pendingCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    if (canViewResetRequests) {
      fetchResetRequestsCount();
    }
    try {
      const savedTab = localStorage.getItem('gi_cms_active_tab') as any;
      if (savedTab) {
        setActiveTab(savedTab);
      }
      const storedClientId = localStorage.getItem('gi_cms_selected_client_id');
      const storedSubTab = localStorage.getItem('gi_cms_client_subtab');
      if (storedClientId) {
        setSelectedClientId(storedClientId);
        setClientSubTab(storedSubTab === 'workforce' ? 'ems' : (storedSubTab || 'profile'));
        setActiveTab('cms-selected-client');
        localStorage.removeItem('gi_cms_selected_client_id');
        localStorage.removeItem('gi_cms_client_subtab');
      }
    } catch {}
  }, [canViewResetRequests]);

  const cmsBoxes = [
    {
      id: 'cms-dashboard' as const,
      title: 'CMS Dashboard',
      subtitle: 'Analytics & Growth Metrics',
      desc: 'System health, revenue distribution, active clients and utilization.',
      icon: LayoutDashboard,
      flowClass: 'animate-flow-left',
    },
    {
      id: 'cms-onboarding' as const,
      title: 'Client Onboarding',
      subtitle: 'New Organization Setup',
      desc: 'Register enterprise clients, configure billing and generate credentials.',
      icon: UserPlus,
      flowClass: 'animate-flow-left',
    },
    {
      id: 'cms-clients' as const,
      title: 'Clients / Organizations',
      subtitle: 'Enterprise Directory Master',
      desc: 'Access client profiles, subscription modules, and client-specific workforce.',
      icon: Building2,
      flowClass: 'animate-flow-right',
    },
  ];

  if (!hasCmsAccess) {
    return (
      <div className="h-screen max-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900">CMS Access Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your delegated administrator profile does not have authority to access the Client Management System (CMS).
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSelectPlatform('GATEWAY')}
              className="w-full py-2.5 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Return to Platform Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Fixed Top Header Bar (Title bar badge removed for clean, minimal view) */}
      <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Brand + Quick Back to Modules Button */}
        <div className="flex items-center gap-3 md:gap-4">
          <GrowthIndiaLogo size="sm" />
          <span className="text-slate-300 hidden sm:inline">|</span>

          {activeTab !== 'cms-hub' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(null);
                setActiveTab('cms-hub');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0D9488] bg-slate-100 hover:bg-[#0D9488]/10 transition-all cursor-pointer border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4 text-[#0D9488]" />
              <span>Back to CMS Modules</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Client Management Hub</span>
            </div>
          )}
        </div>

        {/* Right: Reset Requests + Notification Bell + Top-Level Platform Switcher + User Profile */}
        <div className="flex items-center gap-3">
          {/* Password Reset Requests Button */}
          {canViewResetRequests && (
            <button
              type="button"
              onClick={() => setShowResetRequests(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-xs transition-all bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 cursor-pointer"
              title="Password Reset Requests"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="hidden sm:inline">Reset Requests</span>
              {pendingResetCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-xs">
                  {pendingResetCount}
                </span>
              )}
            </button>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* Top-Right Platform Switcher Dropdown */}
          <PlatformSwitcherDropdown
            currentPlatform="CMS"
            onSelectPlatform={onSelectPlatform}
          />

          {/* User Profile & Logout (Replaces sidebar bottom controls) */}
          <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName || 'System Administrator'}</p>
              <p className="text-[10px] font-mono text-slate-400 leading-tight">{user?.employeeId || 'GI-EMP-000001'}</p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area (Full screen, no cramped left sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'cms-hub' ? (
          /* CMS Hub: Beautiful Animated Boxes (Medium Size) */
          <main className="flex-1 flex flex-col justify-center items-center p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto space-y-6 my-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
                {cmsBoxes.map((box) => {
                  const Icon = box.icon;
                  return (
                    <div
                      key={box.id}
                      onClick={() => setActiveTab(box.id)}
                      className={`${box.flowClass} group relative bg-white hover:bg-slate-50/70 border-2 border-slate-200 hover:border-[#0D9488] rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between items-center text-center`}
                    >
                      {/* Top Icon */}
                      <div className="w-12 h-12 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 flex items-center justify-center text-[#0D9488] group-hover:scale-110 group-hover:bg-[#0D9488] group-hover:text-white transition-all duration-300 shadow-xs mb-3">
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Fresh Clean Bold Title Only */}
                      <div className="my-auto py-2">
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 group-hover:text-[#0D9488] tracking-tight transition-colors">
                          {box.title}
                        </h2>
                      </div>

                      {/* Action Button */}
                      <div className="w-full pt-4">
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#0D9488] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-xs group-hover:shadow-md">
                          <span>Open Module</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        ) : (
          /* Sub-Views (100% full screen width, maximum readability) */
          <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
            {activeTab === 'cms-dashboard' && (
              <CmsDashboardView
                onNavigateTab={(tab, clientId) => {
                  if (tab === 'cms-selected-client' && clientId) {
                    setSelectedClientId(clientId);
                    setClientSubTab('profile');
                    setActiveTab('cms-selected-client');
                  } else if (tab === 'cms-onboarding') {
                    setActiveTab('cms-onboarding');
                  } else {
                    setActiveTab('cms-clients');
                  }
                }}
              />
            )}

            {activeTab === 'cms-onboarding' && (
              <CmsClientOnboardingView
                onSuccess={(id) => {
                  setSelectedClientId(id);
                  setClientSubTab('profile');
                  setActiveTab('cms-selected-client');
                }}
                onCancel={() => setActiveTab('cms-hub')}
              />
            )}

            {activeTab === 'cms-clients' && (
              <CmsClientsListView
                onSelectClient={(id, tab) => {
                  setSelectedClientId(id);
                  setClientSubTab(tab || 'profile');
                  setActiveTab('cms-selected-client');
                }}
                onNavigateToOnboarding={() => setActiveTab('cms-onboarding')}
              />
            )}

            {activeTab === 'cms-selected-client' && selectedClientId && (
              <CmsSelectedClientShell
                clientId={selectedClientId}
                initialTab={clientSubTab}
                onBack={() => {
                  setSelectedClientId(null);
                  setActiveTab('cms-clients');
                }}
              />
            )}
          </main>
        )}
      </div>

      {/* Password Reset Requests Modal */}
      <PasswordResetRequestsModal
        isOpen={showResetRequests}
        onClose={() => {
          setShowResetRequests(false);
          fetchResetRequestsCount();
        }}
        userRole={user?.role}
        onPasswordResetSuccess={() => {
          fetchResetRequestsCount();
        }}
      />
    </div>
  );
};
