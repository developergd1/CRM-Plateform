'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasAdminPermission } from '@/lib/rbac';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginView } from '../auth/LoginView';
import { ClientsListView } from '../clients/ClientsListView';
import { EmployeesView } from '../employees/EmployeesView';
import { BlockHistoryView } from '../employees/BlockHistoryView';
import { AuditLogsView } from '../audit/AuditLogsView';
import { AdminAttendanceView } from '../attendance/AdminAttendanceView';
import { GrowthIndiaLogo } from '../brand/GrowthIndiaLogo';
import { ClientPortalShell } from '../client-portal/ClientPortalShell';
import { EmployeePortalShell } from '../employee-portal/EmployeePortalShell';
import { ExecutiveDashboardView } from '../dashboard/ExecutiveDashboardView';
import { RegularizationView } from '../attendance/RegularizationView';
import { PasswordRequestsView } from '../auth/PasswordRequestsView';
import { LeaveView } from '../leave/LeaveView';
import { TaskManager } from '../tasks/TaskManager';
import { ReportsView } from '../reports/ReportsView';
import { SharedAccessManager } from '../sharing/SharedAccessManager';
import { AdminAccessManager } from '../admin/AdminAccessManager';
import { PresenceTracker } from '../presence/PresenceTracker';
import { ShieldAlert } from 'lucide-react';
import { HrmDashboardView } from '../hrm/dashboard/HrmDashboardView';
import { HrmPayrollView } from '../hrm/payroll/HrmPayrollView';
import { HrmOrganizationView } from '../hrm/organization/HrmOrganizationView';
import { HrmAttendanceView } from '../hrm/attendance/HrmAttendanceView';
import { HrmLeaveView } from '../hrm/leave/HrmLeaveView';
import { HrmShiftsView } from '../hrm/shifts/HrmShiftsView';
import { HrmRecruitmentView } from '../hrm/recruitment/HrmRecruitmentView';
import { HrmPerformanceView } from '../hrm/performance/HrmPerformanceView';
import { HrmHelpdeskView } from '../hrm/helpdesk/HrmHelpdeskView';
import { HrmWorkflowEngineView } from '../hrm/workflows/HrmWorkflowEngineView';
import { HrmReportsView } from '../hrm/reports/HrmReportsView';
import { EmployeeLifecycleView } from '../lifecycle/EmployeeLifecycleView';
import { hrmStore } from '@/lib/hrmStore';

export const AppShell: React.FC = () => {
  const { user, loading, activeTab, setActiveTab } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <GrowthIndiaLogo size="lg" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-growth-teal" />
        <p className="text-xs text-slate-600 font-medium">Initializing Growth India Secure Workspace...</p>
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
    // If delegated user tries to access a restricted tab
    if (user?.isDelegated && !hasAdminPermission(user, activeTab)) {
      return (
        <div className="p-8 text-center space-y-4 max-w-md mx-auto my-16 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your delegated account does not have permission to view the <strong className="text-white">{activeTab}</strong> module. Please contact the platform administrator to request access.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <ExecutiveDashboardView
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
          />
        );

      // CLIENTS Flow
      case 'clients':
      case 'clients-onboarding':
      case 'clients-accounts':
        return <ClientsListView />;

      // WORKFORCE Flow
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
      case 'workforce-live':
        return <AdminAttendanceView initialTab="workforce" />;
      case 'workforce-policy':
        return <AdminAttendanceView initialTab="policy" />;
      case 'workforce-timesheets':
        return <AdminAttendanceView initialTab="logs" />;
      case 'leave':
        return <LeaveView />;
      case 'regularization':
        return <RegularizationView />;
      case 'tasks':
        return <TaskManager />;
      case 'reports':
        return <ReportsView />;

      // HRM Flow
      case 'hrm-dashboard':
        return <HrmDashboardView currentTenant={hrmStore.tenants[0]} onNavigate={setActiveTab} />;
      case 'hrm-lifecycle':
        return <EmployeeLifecycleView />;
      case 'hrm-recruitment':
        return <HrmRecruitmentView />;
      case 'hrm-payroll':
        return <HrmPayrollView />;
      case 'hrm-performance':
        return <HrmPerformanceView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-helpdesk':
        return <HrmHelpdeskView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-organization':
        return <HrmOrganizationView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-workflows':
        return <HrmWorkflowEngineView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-reports':
        return <HrmReportsView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-shifts':
        return <HrmShiftsView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-attendance':
        return <HrmAttendanceView currentTenant={hrmStore.tenants[0]} />;
      case 'hrm-leave':
        return <HrmLeaveView />;

      // SECURITY Flow
      case 'block-history':
        return <BlockHistoryView />;
      case 'password-requests':
        return <PasswordRequestsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'admin-invites':
      case 'shared-access':
        return <AdminAccessManager />;

      default:
        return (
          <ExecutiveDashboardView
            onNavigate={(tab) => {
              setActiveTab(tab);
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <PresenceTracker activeTab={activeTab} />

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
