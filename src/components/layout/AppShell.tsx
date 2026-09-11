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
