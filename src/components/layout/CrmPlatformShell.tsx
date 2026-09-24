'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CrmSidebar } from './CrmSidebar';
import { Header } from './Header';
import { CrmDashboardView } from '../crm/dashboard/CrmDashboardView';
import { LeadsListView } from '../crm/leads/LeadsListView';
import { LeadSourcesView } from '../crm/leads/LeadSourcesView';
import { LeadDetailView } from '../crm/leads/LeadDetailView';
import { ContactsListView } from '../crm/contacts/ContactsListView';
import { OpportunitiesListView } from '../crm/opportunities/OpportunitiesListView';
import { DealsListView } from '../crm/deals/DealsListView';
import { DealDetailView } from '../crm/deals/DealDetailView';
import { ActivitiesListView } from '../crm/activities/ActivitiesListView';
import { TaskManager } from '../tasks/TaskManager';
import { PipelineKanbanView } from '../crm/pipeline/PipelineKanbanView';
import { CrmReportsView } from '../crm/reports/CrmReportsView';
import { CrmAnalyticsView } from '../crm/analytics/CrmAnalyticsView';
import { ClientsListView } from '../crm/ClientsListView';
import { Client360View } from '../crm/clients/Client360View';
import { AccountsListView } from '../crm/accounts/AccountsListView';
import { Account360View } from '../crm/accounts/Account360View';
import { ProductsListView } from '../crm/products/ProductsListView';
import { QuotesListView } from '../crm/quotes/QuotesListView';
import { ContractsListView } from '../crm/contracts/ContractsListView';
import { RenewalsManagementView } from '../crm/contracts/RenewalsManagementView';
import { LeadScoringAssignmentView } from '../crm/leads/LeadScoringAssignmentView';
import { ClientHandoffsListView } from '../crm/handoffs/ClientHandoffsListView';
import { CrmCalendarView } from '../crm/calendar/CrmCalendarView';
import { CrmForecastView } from '../crm/forecast/CrmForecastView';
import { CrmImportExportView } from '../crm/import/CrmImportExportView';
import { CrmSettingsView } from '../crm/settings/CrmSettingsView';
import { PipelineSettingsView } from '../crm/settings/PipelineSettingsView';
import { CustomFieldsView } from '../crm/settings/CustomFieldsView';
import { CrmRolesPermissionsView } from '../crm/settings/CrmRolesPermissionsView';
import { CrmAuditLogsView } from '../crm/settings/CrmAuditLogsView';
import { CrmIntegrationsView } from '../crm/settings/CrmIntegrationsView';
import { PlatformSwitcherDropdown } from '../admin/PlatformSwitcherDropdown';
import { PlatformProfile } from '../admin/AdminPlatformGateway';
import { PresenceTracker } from '../presence/PresenceTracker';

interface CrmPlatformShellProps {
  onSelectPlatform: (platform: PlatformProfile) => void;
}

export const CrmPlatformShell: React.FC<CrmPlatformShellProps> = ({ onSelectPlatform }) => {
  const [activeTab, setActiveTab] = useState<string>('crm-dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [createDealContext, setCreateDealContext] = useState<{ leadId?: string; opportunityId?: string } | null>(null);

  const [selectedLeadSource, setSelectedLeadSource] = useState<string>('');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'crm-dashboard':
      case 'dashboard':
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
              } else if (tab === 'crm-account-detail' && id) {
                setSelectedAccountId(id);
                setActiveTab('crm-account-detail');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        );

      case 'crm-leads':
        return (
          <LeadsListView
            initialSourceFilter={selectedLeadSource}
            onSelectLead={(id) => {
              setSelectedLeadId(id);
              setActiveTab('crm-lead-detail');
            }}
          />
        );

      case 'crm-lead-scoring':
        return (
          <LeadScoringAssignmentView
            onNavigateToLead={(id) => {
              setSelectedLeadId(id);
              setActiveTab('crm-lead-detail');
            }}
          />
        );

      case 'crm-lead-sources':
        return (
          <LeadSourcesView
            onNavigateToLeadsWithSource={(source) => {
              setSelectedLeadSource(source);
              setActiveTab('crm-leads');
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

      case 'crm-accounts':
        return (
          <AccountsListView
            onSelectAccount={(accId) => {
              setSelectedAccountId(accId);
              setActiveTab('crm-account-detail');
            }}
          />
        );

      case 'crm-account-detail':
        return (
          <Account360View
            accountId={selectedAccountId}
            onBack={() => setActiveTab('crm-accounts')}
            onNavigateToDeal={(dealId) => {
              setSelectedDealId(dealId);
              setActiveTab('crm-deal-detail');
            }}
          />
        );

      case 'crm-contacts':
      case 'crm-contact-detail':
        return <ContactsListView />;

      case 'crm-opportunities':
      case 'crm-deals':
      case 'crm-pipeline':
        return (
          <PipelineKanbanView
            initialLeadId={createDealContext?.leadId}
            initialOpportunityId={createDealContext?.opportunityId}
            initialOpenCreateModal={!!createDealContext}
            onSelectDeal={(id) => {
              setSelectedDealId(id);
              setActiveTab('crm-deal-detail');
            }}
            onNavigateToCMSClient={() => {
              onSelectPlatform('CMS');
            }}
          />
        );

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

      case 'crm-quotes':
      case 'crm-quote-detail':
        return <QuotesListView />;

      case 'crm-products':
        return <ProductsListView />;

      case 'crm-activities':
      case 'crm-followups':
      case 'crm-tasks':
        return <ActivitiesListView />;

      case 'crm-calendar':
        return <CrmCalendarView />;

      case 'crm-contracts':
        return <ContractsListView />;

      case 'crm-renewals':
        return <RenewalsManagementView />;

      case 'crm-handoff':
        return <ClientHandoffsListView />;

      case 'crm-forecast':
        return <CrmForecastView />;

      case 'crm-reports':
        return <CrmReportsView />;

      case 'crm-analytics':
        return <CrmAnalyticsView />;

      case 'crm-import-export':
        return <CrmImportExportView />;

      case 'crm-settings':
        return <CrmSettingsView />;

      case 'crm-pipeline-settings':
        return <PipelineSettingsView />;

      case 'crm-custom-fields':
        return <CustomFieldsView />;

      case 'crm-roles':
        return <CrmRolesPermissionsView />;

      case 'crm-audit-logs':
        return <CrmAuditLogsView />;

      case 'crm-integrations':
        return <CrmIntegrationsView />;

      case 'clients':
      case 'clients-onboarding':
      case 'clients-accounts':
        return (
          <ClientsListView
            onView360={(clientId) => {
              setSelectedClientId(clientId);
              setActiveTab('client-360');
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
                onSelectPlatform('CMS');
              }
            }}
          />
        );

      default:
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
              } else if (tab === 'crm-account-detail' && id) {
                setSelectedAccountId(id);
                setActiveTab('crm-account-detail');
              } else {
                setActiveTab(tab);
              }
            }}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans select-none">
      <PresenceTracker activeTab={activeTab} />

      {/* Dedicated CRM Sidebar */}
      <CrmSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Single Unified Header Bar: Search on Left, Icons & Compact Switcher on Top-Right */}
        <Header
          onSearchSelect={(term) => {
            if (term.startsWith('CLI-') || term.toLowerCase().includes('client')) setActiveTab('clients');
            else if (term.startsWith('LEAD-') || term.toLowerCase().includes('lead')) setActiveTab('crm-leads');
            else if (term.startsWith('DEAL-') || term.toLowerCase().includes('deal')) setActiveTab('crm-deals');
          }}
          rightSlot={
            <PlatformSwitcherDropdown
              currentPlatform="CRM"
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
