'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  CheckSquare,
  Clock,
  Calendar,
  FileText,
  ShieldCheck,
  Building2,
  ChevronRight,
  Layers,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { EmployeesView } from '../employees/EmployeesView';
import { EmployeeOnboardingWizard } from '../employees/EmployeeOnboardingWizard';
import { Employee360View } from '../employees/Employee360View';
import { TaskManager } from '../tasks/TaskManager';
import { AdminAttendanceView } from '../attendance/AdminAttendanceView';
import { LeaveView } from '../leave/LeaveView';
import { DocumentsKycView } from '../documents/DocumentsKycView';
import { BlockHistoryView } from '../employees/BlockHistoryView';

export interface CmsClientEmsViewProps {
  client: any;
  onBackToClientProfile?: () => void;
  initialTab?: string;
}

export const CmsClientEmsView: React.FC<CmsClientEmsViewProps> = ({
  client,
  onBackToClientProfile,
  initialTab = 'employees',
}) => {
  const [emsTab, setEmsTab] = useState<string>(initialTab);
  const [selected360EmpId, setSelected360EmpId] = useState<string | null>(null);

  const handleNavigateTo360 = (empId: string) => {
    setSelected360EmpId(empId);
    setEmsTab('employee-360');
  };

  const navItems = [
    { id: 'employees', label: 'Employees', icon: Users, desc: 'Client workforce directory' },
    { id: 'onboarding', label: 'Employee Onboarding', icon: UserPlus, desc: 'Generate GI-EMP-XXXXXX' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, desc: 'Client-scoped task pipeline' },
    { id: 'attendance', label: 'Attendance', icon: Clock, desc: 'Daily punch logs & hours' },
    { id: 'leave', label: 'Leave', icon: Calendar, desc: 'Applications & approvals' },
    { id: 'documents', label: 'Documents', icon: FileText, desc: 'KYC & employment files' },
    { id: 'workforce', label: 'Workforce Mgmt', icon: ShieldCheck, desc: 'Lifecycle & block history' },
  ];

  return (
    <div className="space-y-6">
      {/* Client EMS Header Context Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-[#0D9488] font-bold">CMS</span>
            <span>/</span>
            <span>Clients</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{client.companyName}</span>
            <span>/</span>
            <span className="bg-[#0D9488]/10 text-[#0D9488] font-mono px-2 py-0.5 rounded text-[10px] font-bold">
              EMS Workspace
            </span>
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{client.companyName}</span>
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {client.clientId}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {client.status || 'ACTIVE'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client-specific Employee Management System. All queries, staff, and tasks are strictly isolated to this tenant.
          </p>
        </div>

        {onBackToClientProfile && (
          <button
            type="button"
            onClick={onBackToClientProfile}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Client Profile & Account</span>
          </button>
        )}
      </div>

      {/* EMS Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = emsTab === item.id || (item.id === 'employees' && emsTab === 'employee-360');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setEmsTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display (Strictly Scoped) */}
      <div className="min-h-[500px]">
        {/* 1. Employees Directory */}
        {emsTab === 'employees' && (
          <EmployeesView
            onNavigateTo360={handleNavigateTo360}
            onNavigateToOnboarding={() => setEmsTab('onboarding')}
            initialClientId={client.id}
            hideClientFilter={true}
          />
        )}

        {/* 2. Employee Onboarding Wizard */}
        {emsTab === 'onboarding' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#0D9488]/5 border border-[#0D9488]/20 rounded-xl text-xs text-[#0D9488] font-bold flex items-center justify-between">
              <span>Onboarding employee directly to: {client.companyName} ({client.clientId})</span>
              <button
                type="button"
                onClick={() => setEmsTab('employees')}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                Back to Employees List
              </button>
            </div>
            <EmployeeOnboardingWizard
              initialClientId={client.id}
              onSuccess={() => setEmsTab('employees')}
              onCancel={() => setEmsTab('employees')}
            />
          </div>
        )}

        {/* 3. Employee 360 View */}
        {emsTab === 'employee-360' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setEmsTab('employees')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to {client.companyName} Staff</span>
            </button>
            <Employee360View initialEmployeeId={selected360EmpId || undefined} />
          </div>
        )}

        {/* 4. Tasks Management */}
        {emsTab === 'tasks' && (
          <TaskManager
            initialClientId={client.id}
            hideClientFilter={true}
          />
        )}

        {/* 5. Attendance Hub */}
        {emsTab === 'attendance' && (
          <AdminAttendanceView
            initialTab="workforce"
            initialClientId={client.id}
            hideClientFilter={true}
          />
        )}

        {/* 6. Leave Applications */}
        {emsTab === 'leave' && (
          <LeaveView
            initialClientId={client.id}
            hideClientFilter={true}
          />
        )}

        {/* 7. Documents KYC Vault */}
        {emsTab === 'documents' && (
          <DocumentsKycView
            initialClientId={client.id}
            hideClientFilter={true}
          />
        )}

        {/* 8. Workforce Management (Block/Unblock & Lifecycle) */}
        {emsTab === 'workforce' && (
          <BlockHistoryView
            initialClientId={client.id}
          />
        )}
      </div>
    </div>
  );
};
