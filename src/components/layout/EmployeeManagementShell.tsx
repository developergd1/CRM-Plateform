'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { EmployeeSidebar } from './EmployeeSidebar';
import { Header } from './Header';
import { PlatformSwitcherDropdown } from '../admin/PlatformSwitcherDropdown';
import { PlatformProfile } from '../admin/AdminPlatformGateway';
import { PresenceTracker } from '../presence/PresenceTracker';

// Module 0: Overview
import { EmsOverviewDashboard } from '../dashboard/EmsOverviewDashboard';

// Module 1: Staff & Directory
import { EmployeesView } from '../employees/EmployeesView';
import { Employee360View } from '../employees/Employee360View';
import { EmployeeOnboardingWizard } from '../employees/EmployeeOnboardingWizard';
import { OrganizationStructureView } from '../employees/OrganizationStructureView';

// Module 2: Attendance & Workforce
import { AttendanceView } from '../attendance/AttendanceView';
import { LiveWorkforceView } from '../attendance/LiveWorkforceView';
import { TimesheetsView } from '../attendance/TimesheetsView';
import { ShiftsPolicyView } from '../attendance/ShiftsPolicyView';
import { HolidayCalendarView } from '../attendance/HolidayCalendarView';

// Module 3: Leave & Requests
import { LeaveView } from '../leave/LeaveView';
import { RegularizationView } from '../attendance/RegularizationView';

// Module 4: Documents & Lifecycle
import { DocumentsKycView } from '../documents/DocumentsKycView';
import { EmployeeLifecycleView } from '../lifecycle/EmployeeLifecycleView';
import { OffboardingView } from '../lifecycle/OffboardingView';

// Module 5: Access & Governance
import { AccountAccessView } from '../access/AccountAccessView';
import { EmployeeStatusView } from '../access/EmployeeStatusView';
import { SharedAccessManager } from '../sharing/SharedAccessManager';
import { AuditLogsView } from '../audit/AuditLogsView';

// Module 6: Reports & Exports
import { WorkforceReportsView } from '../reports/WorkforceReportsView';
import { ExportCenterView } from '../reports/ExportCenterView';

interface EmployeeManagementShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const EmployeeManagementShell: React.FC<EmployeeManagementShellProps> = ({ onSelectPlatform }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('ems-overview');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const handleNavigateTo360 = (empId: string) => {
    setSelectedEmpId(empId);
    setActiveTab('employee-360');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      // 0. Overview
      case 'ems-overview':
        return (
          <EmsOverviewDashboard
            onNavigateTab={(tab: string, context?: any) => {
              if (context) setSelectedEmpId(context);
              setActiveTab(tab);
            }}
          />
        );

      // 1. Staff & Directory
      case 'employees':
        return (
          <EmployeesView
            onNavigateTo360={handleNavigateTo360}
            onNavigateToOnboarding={() => setActiveTab('onboarding')}
          />
        );
      case 'employee-360':
        return <Employee360View initialEmployeeId={selectedEmpId || undefined} />;
      case 'onboarding':
        return (
          <EmployeeOnboardingWizard
            onSuccess={() => setActiveTab('employees')}
            onCancel={() => setActiveTab('employees')}
          />
        );
      case 'org-structure':
        return <OrganizationStructureView />;

      // 2. Attendance & Workforce
      case 'attendance':
        return <AttendanceView />;
      case 'live-workforce':
      case 'workforce-live':
        return <LiveWorkforceView />;
      case 'timesheets':
      case 'workforce-timesheets':
        return <TimesheetsView />;
      case 'shifts-policy':
      case 'workforce-policy':
        return <ShiftsPolicyView />;
      case 'holiday-calendar':
        return <HolidayCalendarView />;

      // 3. Leave & Requests
      case 'leave':
        return <LeaveView />;
      case 'regularization':
        return <RegularizationView />;

      // 4. Documents & Lifecycle
      case 'documents-kyc':
        return <DocumentsKycView />;
      case 'employee-lifecycle':
        return <EmployeeLifecycleView />;
      case 'offboarding':
        return <OffboardingView />;

      // 5. Access & Governance
      case 'account-access':
      case 'password-requests':
        return <AccountAccessView />;
      case 'employee-status':
      case 'block-history':
        return <EmployeeStatusView />;
      case 'delegated-access':
      case 'shared-access':
        return <SharedAccessManager role="ADMIN" />;
      case 'audit-logs':
        return <AuditLogsView />;

      // 6. Reports & Exports
      case 'workforce-reports':
        return <WorkforceReportsView initialTab="workforce" />;
      case 'attendance-reports':
        return <WorkforceReportsView initialTab="attendance" />;
      case 'leave-reports':
        return <WorkforceReportsView initialTab="leave" />;
      case 'export-center':
        return <ExportCenterView />;

      default:
        return (
          <EmployeesView
            onNavigateTo360={handleNavigateTo360}
            onNavigateToOnboarding={() => setActiveTab('onboarding')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans select-none">
      <PresenceTracker activeTab={activeTab} />

      {/* Dedicated Employee Sidebar with 6 Modules + Overview */}
      <EmployeeSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Single Unified Header Bar: Search on Left, Icons & Switcher on Top-Right */}
        <Header
          onSearchSelect={(term) => {
            if (term.startsWith('GI-EMP-') || term.startsWith('EMP-')) {
              handleNavigateTo360(term);
            } else {
              setActiveTab('employees');
            }
          }}
          rightSlot={
            <PlatformSwitcherDropdown
              currentPlatform="CMS"
              onSelectPlatform={onSelectPlatform}
            />
          }
        />

        {/* Page Main View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};
