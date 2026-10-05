'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import {
  Building2,
  Users,
  ArrowRight,
  LogOut,
  UserPlus,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { AdminAccessManager } from './AdminAccessManager';
import { canAdminAccessPlatform, canAccessAdminTeam } from '@/lib/rbac';

export type PlatformProfile = 'GATEWAY' | 'CMS' | 'HRM' | 'CRM' | 'EMS';

interface AdminPlatformGatewayProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const AdminPlatformGateway: React.FC<AdminPlatformGatewayProps> = ({ onSelectPlatform }) => {
  const { user, logout } = useAuth();
  const [showAdminTeamModal, setShowAdminTeamModal] = React.useState(false);

  const hasCmsAccess = canAdminAccessPlatform(user, 'CMS');
  const hasHrmAccess = canAdminAccessPlatform(user, 'HRM');
  const hasAdminTeamAccess = canAccessAdminTeam(user);

  // Auto-redirect single-permission delegated users directly into their granted workspace
  React.useEffect(() => {
    if (user?.isDelegated) {
      if (hasCmsAccess && !hasHrmAccess) {
        onSelectPlatform('CMS');
      } else if (hasHrmAccess && !hasCmsAccess) {
        onSelectPlatform('HRM');
      }
    }
  }, [user, hasCmsAccess, hasHrmAccess, onSelectPlatform]);

  return (
    <div className="h-screen max-h-screen bg-slate-50/60 text-slate-900 flex flex-col justify-between p-4 md:px-8 md:py-4 overflow-hidden font-sans select-none">
      {/* Subtle brand ambient accents */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#0D9488]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#0D9488]/4 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between border-b border-slate-200 bg-white shrink-0 px-2 rounded-xl">
        <div className="flex items-center gap-3">
          <GrowthIndiaLogo size="sm" />
          <span className="text-slate-300 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-0.5 rounded-full border border-[#0D9488]/20">
              Admin Governance Center
            </span>
            {user?.isDelegated && (
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Delegated Scopes
              </span>
            )}
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName || 'System Administrator'}</p>
            <p className="text-[10px] font-mono text-slate-500 leading-tight">{user?.email || 'admin@growthindia.in'}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          {hasAdminTeamAccess && (
            <button
              type="button"
              onClick={() => setShowAdminTeamModal(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Manage Platform Administrators & Invitations"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Admin Team</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4 md:py-6 my-auto overflow-hidden">
        {/* Title */}
        <div className="text-center max-w-xl mx-auto mb-6 md:mb-8 shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Select Operating Platform
          </h1>
          {user?.isDelegated && (
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Your administrative credentials have been provisioned with delegated scopes.
            </p>
          )}
        </div>

        {/* 2 Simple & Bold Platform Boxes (CMS & HRM) - Medium Size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6 max-w-2xl mx-auto w-full px-4">
          
          {/* 1. CMS PLATFORM BOX */}
          <div
            onClick={() => {
              if (hasCmsAccess) onSelectPlatform('CMS');
            }}
            className={`animate-flow-left group relative bg-white border-2 rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-sm flex flex-col justify-between items-center text-center ${
              hasCmsAccess
                ? 'hover:bg-slate-50/80 border-slate-200 hover:border-[#0D9488] hover:shadow-xl hover:-translate-y-1.5 cursor-pointer'
                : 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/50'
            }`}
          >
            {/* Top Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs mb-3 ${
              hasCmsAccess
                ? 'bg-[#0D9488]/10 border border-[#0D9488]/20 text-[#0D9488] group-hover:scale-110 group-hover:bg-[#0D9488] group-hover:text-white'
                : 'bg-slate-200 text-slate-400 border border-slate-300'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>

            {/* Prominent Bold Letters */}
            <div className="my-auto py-2">
              <h2 className={`text-3xl md:text-4xl font-black tracking-tight transition-colors ${
                hasCmsAccess ? 'text-slate-900 group-hover:text-[#0D9488]' : 'text-slate-400'
              }`}>
                CMS
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Client Management System
              </p>
            </div>

            {/* Launch Button */}
            <div className="w-full pt-3">
              {hasCmsAccess ? (
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#0D9488] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-xs group-hover:shadow-md">
                  <span>Enter CMS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Access Restricted</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. HRM PLATFORM BOX */}
          <div
            onClick={() => {
              if (hasHrmAccess) onSelectPlatform('HRM');
            }}
            className={`animate-flow-right group relative bg-white border-2 rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-sm flex flex-col justify-between items-center text-center ${
              hasHrmAccess
                ? 'hover:bg-slate-50/80 border-slate-200 hover:border-[#0D9488] hover:shadow-xl hover:-translate-y-1.5 cursor-pointer'
                : 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/50'
            }`}
          >
            {/* Top Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs mb-3 ${
              hasHrmAccess
                ? 'bg-[#0D9488]/10 border border-[#0D9488]/20 text-[#0D9488] group-hover:scale-110 group-hover:bg-[#0D9488] group-hover:text-white'
                : 'bg-slate-200 text-slate-400 border border-slate-300'
            }`}>
              <Users className="w-6 h-6" />
            </div>

            {/* Prominent Bold Letters */}
            <div className="my-auto py-2">
              <h2 className={`text-3xl md:text-4xl font-black tracking-tight transition-colors ${
                hasHrmAccess ? 'text-slate-900 group-hover:text-[#0D9488]' : 'text-slate-400'
              }`}>
                HRM
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Human Resource Management
              </p>
            </div>

            {/* Launch Button */}
            <div className="w-full pt-3">
              {hasHrmAccess ? (
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#0D9488] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-xs group-hover:shadow-md">
                  <span>Enter HRM</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Access Restricted</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Clean Bottom Bar */}
      <footer className="h-10 flex items-center justify-between border-t border-slate-200 text-[11px] text-slate-500 bg-white shrink-0 px-2">
        <span className="font-semibold text-slate-700">Growth India Platform Suite</span>
        <span className="text-slate-500 font-medium">Enterprise Security & Governance Engine</span>
      </footer>

      {/* Admin Team & Invitations Modal */}
      {showAdminTeamModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdminTeamModal(false);
          }}
        >
          <AdminAccessManager
            isModal={true}
            onClose={() => setShowAdminTeamModal(false)}
          />
        </div>
      )}
    </div>
  );
};
