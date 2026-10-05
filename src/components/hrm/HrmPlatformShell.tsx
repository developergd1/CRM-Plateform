'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
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
import { HrmConfigurationView } from './config/HrmConfigurationView';
import { EmployeeLifecycleView } from '../lifecycle/EmployeeLifecycleView';
import { Employee360View } from '../employees/Employee360View';
import { Header } from '../layout/Header';
import {
  Users,
  UserCheck,
  GitPullRequest,
  Clock,
  Coffee,
  Briefcase,
  Target,
  Sliders,
  LifeBuoy,
  BarChart3,
  Calendar,
  LayoutDashboard,
  Building2,
  Banknote,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Lock,
} from 'lucide-react';
import { hasAdminPermission, canAccessHrmSection } from '@/lib/rbac';

interface HrmPlatformShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

interface HrmSubOption {
  id: string;
  label: string;
  desc?: string;
  icon: React.ElementType;
}

interface HrmTitleSection {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ElementType;
  flowClass: string;
  defaultTab: string;
  tabIds: string[];
  subOptions?: HrmSubOption[];
}

export const HrmPlatformShell: React.FC<HrmPlatformShellProps> = ({ onSelectPlatform }) => {
  const { user, logout } = useAuth();
  // Admin HRM operates exclusively in Growth India Technologies internal organization context
  const currentTenant = hrmStore.tenants[0];
  const [activeTab, setActiveTab] = useState<string>('hrm-hub');

  // Sub-navigation for Employee Lifecycle & 360 view
  const [lifecycleSubTab, setLifecycleSubTab] = useState<'board' | 'directory' | '360'>('board');
  const [selected360EmpId, setSelected360EmpId] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      const savedHrm = localStorage.getItem('gi_hrm_active_tab');
      if (savedHrm) setActiveTab(savedHrm);
      const savedSub = localStorage.getItem('gi_hrm_lifecycle_subtab') as any;
      if (savedSub) setLifecycleSubTab(savedSub);
      const saved360 = localStorage.getItem('gi_hrm_360_empid');
      if (saved360) setSelected360EmpId(saved360);
    } catch {}
  }, []);

  const handleOpen360 = (employeeId: string) => {
    setSelected360EmpId(employeeId);
    setLifecycleSubTab('360');
  };

  // Structured by Major Titles (As per user requirement: Title ke hisab se boxes, options left me)
  const allHrmSections: HrmTitleSection[] = [
    {
      id: 'dashboard',
      title: 'HRM Dashboard',
      subtitle: 'Executive KPIs & Workforce Status',
      desc: 'Live headcount metrics, presence ratios, payroll snapshots & quick operational alerts.',
      icon: LayoutDashboard,
      flowClass: 'animate-flow-left',
      defaultTab: 'hrm-dashboard',
      tabIds: ['hrm-dashboard'],
    },
    {
      id: 'workforce',
      title: 'Workforce & Organization',
      subtitle: 'Directory, Lifecycle & Entities',
      desc: 'Staff directory 360, 9-stage lifecycle kanban, branch entities & talent recruitment ATS.',
      icon: Users,
      flowClass: 'animate-flow-right',
      defaultTab: 'hrm-lifecycle',
      tabIds: ['hrm-lifecycle', 'hrm-employees', 'hrm-organization', 'hrm-recruitment'],
      subOptions: [
        { id: 'hrm-lifecycle', label: 'Employees & 360', icon: Users, desc: '9-stage lifecycle & 360 governance' },
        { id: 'hrm-organization', label: 'Organization Setup', icon: Building2, desc: 'Entities, branches & hierarchy' },
        { id: 'hrm-recruitment', label: 'Recruitment & ATS', icon: Briefcase, desc: 'Talent pipeline & applications' },
      ],
    },
    {
      id: 'attendance',
      title: 'Time & Attendance',
      subtitle: 'Punches, Rosters & Leaves',
      desc: 'Live biometric punch logs, shift scheduling, regularization and leave approvals.',
      icon: Clock,
      flowClass: 'animate-flow-left',
      defaultTab: 'hrm-attendance',
      tabIds: ['hrm-attendance', 'hrm-leave', 'hrm-shifts'],
      subOptions: [
        { id: 'hrm-attendance', label: 'Live Attendance', icon: Clock, desc: 'Punches & regularizations' },
        { id: 'hrm-leave', label: 'Leave Ledger & Approvals', icon: Coffee, desc: 'Leave requests & approvals' },
        { id: 'hrm-shifts', label: 'Shifts & Timesheets', icon: Calendar, desc: 'Work rosters & time logs' },
      ],
    },
    {
      id: 'payroll',
      title: 'Payroll & Compensation',
      subtitle: 'Salary Runs & Compliance',
      desc: 'Automated salary calculations, payslip generation, tax brackets and statutory payouts.',
      icon: Banknote,
      flowClass: 'animate-flow-right',
      defaultTab: 'hrm-payroll',
      tabIds: ['hrm-payroll'],
    },
    {
      id: 'performance',
      title: 'Performance & Helpdesk',
      subtitle: 'PMS Goals & Employee Support',
      desc: 'Performance appraisals, OKR tracking, self-service queries and employee ticketing.',
      icon: Target,
      flowClass: 'animate-flow-left',
      defaultTab: 'hrm-performance',
      tabIds: ['hrm-performance', 'hrm-helpdesk', 'hrm-self-service'],
      subOptions: [
        { id: 'hrm-performance', label: 'PMS & Performance', icon: Target, desc: 'Objectives & appraisals' },
        { id: 'hrm-helpdesk', label: 'HR Helpdesk & Requests', icon: LifeBuoy, desc: 'Internal support tickets' },
        { id: 'hrm-self-service', label: 'Self Service Desk', icon: Sparkles, desc: 'Employee service portal' },
      ],
    },
    {
      id: 'governance',
      title: 'Governance & Automation',
      subtitle: 'Workflows, Reports & Config',
      desc: 'Automated approval workflows, audit reports, CSV exports and policy parameters.',
      icon: Sliders,
      flowClass: 'animate-flow-right',
      defaultTab: 'hrm-workflows',
      tabIds: ['hrm-workflows', 'hrm-reports', 'hrm-configuration'],
      subOptions: [
        { id: 'hrm-workflows', label: 'Workflow & Automation', icon: GitPullRequest, desc: 'Approval rule engine' },
        { id: 'hrm-reports', label: 'Workforce Reports', icon: BarChart3, desc: 'Analytics & CSV exports' },
        { id: 'hrm-configuration', label: 'HRM Configuration', icon: Sliders, desc: 'Global policy configurations' },
      ],
    },
  ];

  // Filter sections and suboptions based on user's delegated permissions
  const hrmSections = allHrmSections
    .filter((s) => canAccessHrmSection(user, s.id))
    .map((s) => ({
      ...s,
      subOptions: s.subOptions ? s.subOptions.filter((opt) => hasAdminPermission(user, opt.id)) : undefined,
    }));

  // Auto-correct tab if current tab is restricted for delegated administrator
  React.useEffect(() => {
    if (user?.isDelegated && activeTab !== 'hrm-hub') {
      if (!hasAdminPermission(user, activeTab)) {
        const fallbackTab = hrmSections[0]?.defaultTab || 'hrm-hub';
        setActiveTab(fallbackTab);
      }
    }
  }, [user, activeTab, hrmSections]);

  const currentSection = hrmSections.find((s) => s.tabIds.includes(activeTab));

  const renderActiveView = () => {
    // Access guard for restricted sub-views
    if (user?.isDelegated && activeTab !== 'hrm-hub' && !hasAdminPermission(user, activeTab)) {
      return (
        <div className="p-8 text-center space-y-4 max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-3xl shadow-xl animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center font-bold">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Module Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your delegated administrator profile does not have authority to view this HRM section.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab(hrmSections[0]?.defaultTab || 'hrm-hub')}
              className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Return to Authorized Workspace
            </button>
          </div>
        </div>
      );
    }

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
      case 'hrm-configuration':
        return <HrmConfigurationView currentTenant={currentTenant} />;
      default:
        return <HrmDashboardView currentTenant={currentTenant} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans select-none">
      {/* Top Header Bar with Platform Switcher & User Actions */}
      <Header
        onSearchSelect={(term) => {
          if (term.toLowerCase().includes('org')) setActiveTab('hrm-organization');
          else if (term.toLowerCase().includes('emp')) setActiveTab('hrm-lifecycle');
          else if (term.toLowerCase().includes('leave')) setActiveTab('hrm-leave');
          else if (term.toLowerCase().includes('pay')) setActiveTab('hrm-payroll');
        }}
        rightSlot={
          <div className="flex items-center gap-2">
            {activeTab !== 'hrm-hub' && (
              <button
                type="button"
                onClick={() => setActiveTab('hrm-hub')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0D9488] bg-slate-100 hover:bg-[#0D9488]/10 border border-slate-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#0D9488]" />
                <span className="hidden sm:inline">All HRM Modules</span>
              </button>
            )}
            <PlatformSwitcherDropdown
              currentPlatform="HRM"
              onSelectPlatform={onSelectPlatform}
            />
          </div>
        }
      />

      {/* Main Workspace: Either Title Boxes Hub OR Title View with Left Sub-Options */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'hrm-hub' ? (
          /* HRM HUB: Fresh, Ultra-Clean Animated Title Boxes (Faltu text removed, Title only) */
          <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 overflow-y-auto relative">
            {/* Fresh Ambient Glow Accents */}
            <div className="absolute top-10 right-1/4 w-[450px] h-[450px] bg-[#0D9488]/6 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none" />

            <div className="max-w-4xl w-full mx-auto space-y-6 my-auto relative z-10">
              {/* Clean Header */}
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Enterprise HRM Modules
                </h1>
              </div>

              {/* 6 Fresh Animated Title Boxes (Medium Size) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                {hrmSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.id}
                      onClick={() => setActiveTab(section.defaultTab)}
                      className={`${section.flowClass} group relative bg-white/95 hover:bg-white border-2 border-slate-200/90 hover:border-[#0D9488] rounded-2xl p-5 md:p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between items-center text-center`}
                    >
                      {/* Fresh Icon Squircle */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D9488]/10 to-[#0D9488]/20 border border-[#0D9488]/25 text-[#0D9488] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#0D9488] group-hover:text-white transition-all duration-300 shadow-xs mb-3">
                        <Icon className="w-6 h-6" />
                      </div>

                      {/* Clean Bold Title Only */}
                      <div className="my-auto py-2">
                        <h3 className="text-lg md:text-xl font-black text-slate-900 group-hover:text-[#0D9488] tracking-tight transition-colors">
                          {section.title}
                        </h3>
                      </div>

                      {/* Fresh Action Button */}
                      <div className="w-full pt-4">
                        <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#0D9488] text-slate-700 group-hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-xs group-hover:shadow-md">
                          <span>Open Workspace</span>
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
          /* MODULE WORKSPACE: If Title has multiple options, they show on the LEFT */
          <div className="flex-1 flex overflow-hidden">
            {currentSection?.subOptions && currentSection.subOptions.length > 0 && (
              /* Focused Left Sub-Menu for current Title only */
              <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full overflow-hidden">
                <div className="p-4 space-y-4 overflow-y-auto">
                  {/* Back to Hub Button */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('hrm-hub')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0D9488] bg-slate-100 hover:bg-[#0D9488]/10 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0D9488]" />
                    <span>Back to Modules</span>
                  </button>

                  {/* Section Title Header */}
                  <div className="pt-1 pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Active Section
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                      {currentSection.title}
                    </h4>
                  </div>

                  {/* Multiple options for this Title shown on the Left */}
                  <nav className="space-y-1">
                    {currentSection.subOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive =
                        activeTab === opt.id ||
                        (opt.id === 'hrm-lifecycle' && activeTab === 'hrm-employees');
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setActiveTab(opt.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#0D9488] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-left flex-1 truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Bottom user profile & sign out */}
                <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {user?.fullName?.charAt(0) || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                        {user?.fullName || 'Administrator'}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate leading-tight">
                        {user?.employeeId || 'GI-EMP-000001'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </aside>
            )}

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
              {/* If Single-Module Section, provide a sleek Back button at the top */}
              {(!currentSection?.subOptions || currentSection.subOptions.length === 0) && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('hrm-hub')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0D9488] bg-white border border-slate-200 hover:border-[#0D9488]/40 shadow-2xs transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0D9488]" />
                    <span>Back to All Modules</span>
                  </button>
                </div>
              )}

              <div className="max-w-7xl mx-auto">
                {renderActiveView()}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
