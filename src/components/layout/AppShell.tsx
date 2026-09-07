'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginView } from '../auth/LoginView';
import { DashboardView } from '../dashboard/DashboardView';
import { ClientsListView } from '../crm/ClientsListView';
import { EmployeesView } from '../employees/EmployeesView';
import { BlockHistoryView } from '../employees/BlockHistoryView';
import { AuditLogsView } from '../audit/AuditLogsView';
import { AdminAttendanceView } from '../attendance/AdminAttendanceView';
import { GrowthIndiaLogo } from '../brand/GrowthIndiaLogo';

import { ClientPortalShell } from '../client-portal/ClientPortalShell';
import { EmployeePortalShell } from '../employee-portal/EmployeePortalShell';

export const AppShell: React.FC = () => {
  const { user, loading, activeTab, setActiveTab } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        <p className="text-xs text-slate-400 font-medium">Initializing Growth India Secure Workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // If Client is logged in, show dedicated Client Portal Shell
  if (user.role === 'CLIENT') {
    return <ClientPortalShell />;
  }

  // If Employee is logged in, show dedicated Employee Workspace Shell
  if (user.role === 'EMPLOYEE') {
    return <EmployeePortalShell />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'clients':
        return <ClientsListView />;
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
        return <AdminAttendanceView />;
      case 'block-history':
        return <BlockHistoryView />;
      case 'audit-logs':
        return <AuditLogsView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onSearchSelect={(term) => {
          if (term.startsWith('CLI-') || term.toLowerCase().includes('client')) setActiveTab('clients');
          else if (term.startsWith('GI-EMP-') || term.startsWith('EMP-')) setActiveTab('employees');
        }} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};
