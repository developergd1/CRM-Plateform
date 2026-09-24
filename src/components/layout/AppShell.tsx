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
import { CrmModuleView } from '../crm/CrmModuleView';
import { LeadsListView } from '../crm/leads/LeadsListView';
import { ContactsListView } from '../crm/contacts/ContactsListView';
import { FollowUpDashboardView } from '../crm/followups/FollowUpDashboardView';
import { PipelineKanbanView } from '../crm/pipeline/PipelineKanbanView';
import { OpportunitiesListView } from '../crm/opportunities/OpportunitiesListView';
import { DealsListView } from '../crm/deals/DealsListView';
import { DealDetailView } from '../crm/deals/DealDetailView';
import { Client360View } from '../crm/clients/Client360View';
import { ExecutiveDashboardView } from '../dashboard/ExecutiveDashboardView';
import { CrmAnalyticsView } from '../crm/analytics/CrmAnalyticsView';
import { CrmReportsView } from '../crm/reports/CrmReportsView';
import { CrmDashboardView } from '../crm/dashboard/CrmDashboardView';
import { LeadDetailView } from '../crm/leads/LeadDetailView';
import { ActivitiesListView } from '../crm/activities/ActivitiesListView';
import { RegularizationView } from '../attendance/RegularizationView';
import { PasswordRequestsView } from '../auth/PasswordRequestsView';
import { LeaveView } from '../leave/LeaveView';
import { TaskManager } from '../tasks/TaskManager';
import { SharedAccessManager } from '../sharing/SharedAccessManager';
import { PresenceTracker } from '../presence/PresenceTracker';
import { ShieldAlert } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user, loading, activeTab, setActiveTab } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [selectedDealId, setSelectedDealId] = React.useState<string>('');
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = React.useState<string>('');
  const [createDealContext, setCreateDealContext] = React.useState<{ leadId?: string; opportunityId?: string } | null>(null);

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
    if (user?.isDelegated && user.delegatedPermissions && user.delegatedPermissions.length > 0) {
      const allowed =
        user.delegatedPermissions.includes(activeTab) ||
        (activeTab === 'dashboard' && user.delegatedPermissions.includes('crm-dashboard')) ||
        (activeTab === 'crm-dashboard' && user.delegatedPermissions.includes('dashboard')) ||
        (activeTab === 'crm-lead-detail' && user.delegatedPermissions.includes('crm-leads')) ||
        (activeTab === 'crm-deal-detail' && user.delegatedPermissions.includes('crm-deals')) ||
        (activeTab === 'crm-pipeline' && (user.delegatedPermissions.includes('crm-pipeline') || user.delegatedPermissions.includes('crm-deals'))) ||
        (activeTab === 'client-360' && user.delegatedPermissions.includes('clients'));

      if (!allowed) {
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
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <ExecutiveDashboardView
            onNavigate={(tab, id) => {
              if (tab === 'crm-deal-detail' && id) {
                setSelectedDealId(id);
                setActiveTab('crm-deal-detail');
              } else if (tab === 'client-360' && id) {
                setSelectedClientId(id);
                setActiveTab('client-360');
              } else if (tab === 'crm-lead-detail' && id) {
                setSelectedLeadId(id);
                setActiveTab('crm-lead-detail');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        );

      case 'crm-dashboard':
        return (
          <CrmDashboardView
            onNavigate={(tab, id) => {
              if (tab === 'crm-deal-detail' && id) {
                setSelectedDealId(id);
                setActiveTab('crm-deal-detail');
              } else if (tab === 'client-360' && id) {
                setSelectedClientId(id);
                setActiveTab('client-360');
              } else if (tab === 'crm-lead-detail' && id) {
                setSelectedLeadId(id);
                setActiveTab('crm-lead-detail');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        );

      // CRM Module Flow
      case 'crm-leads':
        return (
          <LeadsListView
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setActiveTab('crm-lead-detail');
            }}
          />
        );
      case 'crm-lead-detail':
        return (
          <LeadDetailView
            leadId={selectedLeadId}
            onBack={() => setActiveTab('crm-leads')}
            onCreateDeal={(lead) => {
              setCreateDealContext({ leadId: lead?.id || selectedLeadId });
              setActiveTab('crm-deals');
            }}
          />
        );
      case 'crm-contacts':
        return <ContactsListView />;
      case 'crm-opportunities':
        return (
          <OpportunitiesListView
            onCreateDealFromOpp={(opp) => {
              setCreateDealContext({ opportunityId: opp.id, leadId: opp.leadId || undefined });
              setActiveTab('crm-deals');
            }}
          />
        );
      case 'crm-deals':
        return (
          <DealsListView
            initialLeadId={createDealContext?.leadId}
            initialOpportunityId={createDealContext?.opportunityId}
            initialOpenCreateModal={!!createDealContext}
            onSelectDeal={(id) => {
              setSelectedDealId(id);
              setActiveTab('crm-deal-detail');
            }}
            onOpenPipeline={() => setActiveTab('crm-pipeline')}
          />
        );
      case 'crm-activities':
        return <ActivitiesListView />;
      case 'crm-followups':
      case 'crm-tasks':
        return <TaskManager />;
      case 'crm-pipeline':
        return (
          <PipelineKanbanView
            onSelectDeal={(id) => {
              setSelectedDealId(id);
              setActiveTab('crm-deal-detail');
            }}
            onOpenCreateDeal={() => setActiveTab('crm-deals')}
          />
        );
      case 'crm-reports':
        return <CrmReportsView />;
      case 'crm-analytics':
        return <CrmAnalyticsView />;

      // CLIENTS Flow
      case 'clients':
        return (
          <ClientsListView
            onView360={(clientId) => {
              setSelectedClientId(clientId);
              setActiveTab('client-360');
            }}
          />
        );
      case 'clients-onboarding':
        return (
          <ClientsListView
            initialOpenAddModal={true}
            onView360={(clientId) => {
              setSelectedClientId(clientId);
              setActiveTab('client-360');
            }}
          />
        );
      case 'clients-accounts':
        return (
          <ClientsListView
            onView360={(clientId) => {
              setSelectedClientId(clientId);
              setActiveTab('client-360');
            }}
          />
        );

      // WORKFORCE Flow
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
        return <AdminAttendanceView initialTab="workforce" />;
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

      // SECURITY Flow
      case 'block-history':
        return <BlockHistoryView />;
      case 'password-requests':
        return <PasswordRequestsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'shared-access':
        return <SharedAccessManager role="ADMIN" />;

      // Detail Views
      case 'crm-deal-detail':
        return (
          <DealDetailView
            dealId={selectedDealId}
            onBack={() => setActiveTab('crm-deals')}
            onClientClick={(clientId) => {
              if (clientId) {
                setSelectedClientId(clientId);
                setActiveTab('client-360');
              } else {
                setActiveTab('clients');
              }
            }}
            onLeadClick={(leadId) => {
              if (leadId) {
                setSelectedLeadId(leadId);
                setActiveTab('crm-lead-detail');
              } else {
                setActiveTab('crm-leads');
              }
            }}
          />
        );
      case 'client-360':
        return (
          <Client360View
            clientId={selectedClientId}
            onBack={() => setActiveTab('clients')}
            onNavigate={(tab, id) => {
              if (tab === 'deals' && id) {
                setSelectedDealId(id);
                setActiveTab('crm-deal-detail');
              } else if (tab === 'leads' && id) {
                setSelectedLeadId(id);
                setActiveTab('crm-lead-detail');
              } else if (tab === 'leads') {
                setActiveTab('crm-leads');
              } else if (tab === 'workforce') {
                setActiveTab('employees');
              }
            }}
          />
        );

      default:
        return (
          <ExecutiveDashboardView
            onNavigate={(tab, id) => {
              if (tab === 'crm-deal-detail' && id) {
                setSelectedDealId(id);
                setActiveTab('crm-deal-detail');
              } else if (tab === 'client-360' && id) {
                setSelectedClientId(id);
                setActiveTab('client-360');
              } else if (tab === 'crm-lead-detail' && id) {
                setSelectedLeadId(id);
                setActiveTab('crm-lead-detail');
              } else {
                setActiveTab(tab);
              }
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
