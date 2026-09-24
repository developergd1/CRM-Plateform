'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HrmSidebar } from './HrmSidebar';
import { PlatformSwitcherDropdown } from '../admin/PlatformSwitcherDropdown';
import { PlatformProfile } from '../admin/AdminPlatformGateway';
import { HrmTenant, hrmStore } from '@/lib/hrmStore';
import { HrmDashboardView } from './dashboard/HrmDashboardView';
import { HrmPayrollView } from './payroll/HrmPayrollView';
import { HrmOrganizationView } from './organization/HrmOrganizationView';
import { HrmEmployeesView } from './employees/HrmEmployeesView';
import { HrmAttendanceView } from './attendance/HrmAttendanceView';
import { HrmLeaveView } from './leave/HrmLeaveView';
import { HrmShiftsView } from './shifts/HrmShiftsView';
import { HrmRecruitmentView } from './recruitment/HrmRecruitmentView';
import { HrmPerformanceView } from './performance/HrmPerformanceView';
import { HrmSelfServiceView } from './self-service/HrmSelfServiceView';
import { HrmHelpdeskView } from './helpdesk/HrmHelpdeskView';
import { HrmWorkflowEngineView } from './workflows/HrmWorkflowEngineView';
import { HrmReportsView } from './reports/HrmReportsView';
import { EmployeeLifecycleView } from '../lifecycle/EmployeeLifecycleView';
import { Employee360View } from '../employees/Employee360View';
import { Header } from '../layout/Header';
import { Users, UserCheck, Layers, GitPullRequest } from 'lucide-react';

interface HrmPlatformShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const HrmPlatformShell: React.FC<HrmPlatformShellProps> = ({ onSelectPlatform }) => {
  const { user } = useAuth();
  // Admin HRM operates exclusively in Growth India Technologies internal organization context
  const currentTenant = hrmStore.tenants[0];
  const [activeTab, setActiveTab] = useState<string>('hrm-dashboard');

  // Sub-navigation for Employee Lifecycle & 360 view
  const [lifecycleSubTab, setLifecycleSubTab] = useState<'board' | 'directory' | '360'>('board');
  const [selected360EmpId, setSelected360EmpId] = useState<string | null>(null);

  const handleOpen360 = (employeeId: string) => {
    setSelected360EmpId(employeeId);
    setLifecycleSubTab('360');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'hrm-dashboard':
        return <HrmDashboardView currentTenant={currentTenant} onNavigate={setActiveTab} />;
      case 'hrm-lifecycle':
      case 'hrm-employees':
        return (
          <div className="space-y-6">
            {/* Sub-Navigation Bar for Lifecycle & 360 Governance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setLifecycleSubTab('board')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    lifecycleSubTab === 'board'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
                  }`}
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>9-Stage Lifecycle Kanban</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLifecycleSubTab('directory')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    lifecycleSubTab === 'directory'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Staff Directory</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLifecycleSubTab('360')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    lifecycleSubTab === '360'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Employee 360 Governance</span>
                  {selected360EmpId && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-bold ml-1">
                      {selected360EmpId}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0D9488]/10 border border-[#0D9488]/20 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
                <span className="text-[11px] font-bold text-[#0D9488]">
                  Unified Workforce Master: <strong className="font-mono">Prisma.Employee</strong>
                </span>
              </div>
            </div>

            {/* Sub-view Content */}
            {lifecycleSubTab === 'board' && (
              <EmployeeLifecycleView onView360={handleOpen360} />
            )}

            {lifecycleSubTab === 'directory' && (
              <HrmEmployeesView currentTenant={currentTenant} onView360={handleOpen360} />
            )}

            {lifecycleSubTab === '360' && (
              <Employee360View
                initialEmployeeId={selected360EmpId}
                onBack={() => setLifecycleSubTab('board')}
              />
            )}
          </div>
        );
      case 'hrm-payroll':
        return <HrmPayrollView />;
      case 'hrm-organization':
        return <HrmOrganizationView currentTenant={currentTenant} />;
      case 'hrm-attendance':
        return <HrmAttendanceView currentTenant={currentTenant} />;
      case 'hrm-leave':
        return <HrmLeaveView />;
      case 'hrm-shifts':
        return <HrmShiftsView currentTenant={currentTenant} />;
      case 'hrm-recruitment':
        return <HrmRecruitmentView />;
      case 'hrm-performance':
        return <HrmPerformanceView currentTenant={currentTenant} />;
      case 'hrm-self-service':
        return <HrmSelfServiceView currentTenant={currentTenant} onNavigate={setActiveTab} />;
      case 'hrm-helpdesk':
        return <HrmHelpdeskView currentTenant={currentTenant} />;
      case 'hrm-workflows':
        return <HrmWorkflowEngineView currentTenant={currentTenant} />;
      case 'hrm-reports':
        return <HrmReportsView currentTenant={currentTenant} />;
      default:
        return <HrmDashboardView currentTenant={currentTenant} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans select-none">
      {/* Dedicated Multi-Tenant HRM Sidebar */}
      <HrmSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Single Unified Header Bar: Search on Left, Reset/Notifications & Switchers on Top-Right */}
        <Header
          onSearchSelect={(term) => {
            if (term.toLowerCase().includes('org')) setActiveTab('hrm-organization');
            else if (term.toLowerCase().includes('emp')) setActiveTab('hrm-employees');
            else if (term.toLowerCase().includes('leave')) setActiveTab('hrm-leave');
          }}
          rightSlot={
            <PlatformSwitcherDropdown
              currentPlatform="HRM"
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
