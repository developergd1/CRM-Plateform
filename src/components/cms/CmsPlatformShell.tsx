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
  Users,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { CmsDashboardView } from './CmsDashboardView';
import { CmsClientOnboardingView } from './CmsClientOnboardingView';
import { CmsClientsListView } from './CmsClientsListView';
import { CmsSelectedClientShell } from './CmsSelectedClientShell';

interface CmsPlatformShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const CmsPlatformShell: React.FC<CmsPlatformShellProps> = ({ onSelectPlatform }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'cms-dashboard' | 'cms-onboarding' | 'cms-clients' | 'cms-selected-client'>('cms-dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSubTab, setClientSubTab] = useState<string>('profile');

  // Password reset requests state
  const [showResetRequests, setShowResetRequests] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);

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
    fetchResetRequestsCount();
    try {
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
  }, []);

  const navigationItems = [
    {
      id: 'cms-dashboard',
      label: 'CMS Dashboard',
      icon: LayoutDashboard,
      desc: 'Platform metrics & distribution',
    },
    {
      id: 'cms-onboarding',
      label: 'Client Onboarding',
      icon: UserPlus,
      desc: 'Direct organization registration',
    },
    {
      id: 'cms-clients',
      label: 'Clients / Organizations',
      icon: Building2,
      desc: 'All enterprise client tenants',
    },
  ];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* 64px Fixed Top Header Bar */}
      <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Brand + Module Title Badge */}
        <div className="flex items-center gap-3 md:gap-4">
          <GrowthIndiaLogo size="sm" />
          <span className="text-slate-300 hidden sm:inline">|</span>

          {/* Module Title Badge */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-1 rounded-full border border-[#0D9488]/20">
              CMS — CLIENT MANAGEMENT SYSTEM
            </span>
          </div>
        </div>

        {/* Right: Reset Requests + Notification Bell + Top-Level Platform Switcher Dropdown */}
        <div className="flex items-center gap-3">
          {/* Password Reset Requests Button */}
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

          {/* Notification Bell */}
          <NotificationBell />

          {/* Top-Right Platform Switcher Dropdown */}
          <PlatformSwitcherDropdown
            currentPlatform="CMS"
            onSelectPlatform={onSelectPlatform}
          />
        </div>
      </header>

      {/* Main Body Layout (Sidebar + Content Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full overflow-hidden">
          {/* Top Navigation Links */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
                Client Management
              </span>
              <nav className="space-y-1 pt-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'cms-clients' && activeTab === 'cms-selected-client');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'cms-clients' && selectedClientId) {
                          setSelectedClientId(null);
                        }
                        setActiveTab(item.id as any);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0D9488] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-left flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Context Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Multi-Tenant Model</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Each client organization is a tenant. Admin accesses EMS by selecting a specific client from the directory.
              </p>
            </div>
          </div>

          {/* Bottom Left: User Identity & Sign Out (Matching HRM & CRM) */}
          <div className="p-3 border-t border-[#E2E8F0] bg-[#F0FDFA] space-y-2 shrink-0">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                <span className="text-[11px] font-bold text-slate-800">Client Governance CMS</span>
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0D9488] text-white">
                Admin
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] space-y-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {user?.fullName?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {user?.fullName || 'System Administrator'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate leading-tight">
                    {user?.employeeId || 'GI-EMP-000001'} • <span className="font-bold text-[#0D9488]">{user?.role}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-[#E2E8F0] hover:border-rose-200 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Viewport Area */}
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
              onCancel={() => setActiveTab('cms-clients')}
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
