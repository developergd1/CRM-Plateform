'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
  Plus,
  RefreshCw,
  Edit2,
  Lock,
  Unlock,
  UserPlus,
  FileText,
  Briefcase,
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  ChevronRight,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface Client360ViewProps {
  clientId: string;
  onBack?: () => void;
  onNavigate?: (tab: string, id?: string) => void;
  onNavigateToDeal?: (dealId: string) => void;
  onNavigateToEmployee?: (empId: string) => void;
}

export const Client360View: React.FC<Client360ViewProps> = ({
  clientId,
  onBack,
  onNavigate,
  onNavigateToDeal,
  onNavigateToEmployee,
}) => {
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contacts' | 'deals' | 'employees' | 'attendance' | 'departments' | 'documents' | 'audit'
  >('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab-specific lazy data
  const [crmData, setCrmData] = useState<any>(null);
  const [workforceData, setWorkforceData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals state
  const [showAssignEmpModal, setShowAssignEmpModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [selectedEmpToAssign, setSelectedEmpToAssign] = useState('');
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [docForm, setDocForm] = useState({ title: '', category: 'AGREEMENT', fileUrl: '' });

  // Permissions check: Client Portal User should not see internal CRM tabs or Audit tabs
  const isClientUser = user?.role === 'CLIENT';

  useEffect(() => {
    fetchClientOverview();
  }, [clientId, refreshKey]);

  useEffect(() => {
    if (activeTab === 'contacts' || activeTab === 'deals') {
      if (!isClientUser && !crmData) fetchCRMData();
    } else if (activeTab === 'employees' || activeTab === 'attendance') {
      if (!workforceData) fetchWorkforceData();
    } else if (activeTab === 'departments') {
      fetchDepartments();
    } else if (activeTab === 'documents') {
      fetchDocuments();
    } else if (activeTab === 'audit') {
      if (!isClientUser) fetchAuditLogs();
    }
  }, [activeTab, isClientUser]);

  const fetchClientOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setClient(json.client);
      }
    } catch (e) {
      console.error('Failed to load client 360:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCRMData = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/crm`);
      if (res.ok) {
        const json = await res.json();
        setCrmData(json);
      }
    } catch (e) {
      console.error('Failed to fetch CRM tab:', e);
    }
  };

  const fetchWorkforceData = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/workforce`);
      if (res.ok) {
        const json = await res.json();
        setWorkforceData(json);
      }
    } catch (e) {
      console.error('Failed to fetch workforce data:', e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/departments`);
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load departments:', e);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/audit`);
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const openAssignModal = async () => {
    setShowAssignEmpModal(true);
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const json = await res.json();
        setAvailableEmployees(json.employees || []);
      }
    } catch (e) {}
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpToAssign) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/clients/${clientId}/assign-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmpToAssign }),
      });
      if (res.ok) {
        setShowAssignEmpModal(false);
        setSelectedEmpToAssign('');
        setRefreshKey((k) => k + 1);
        fetchWorkforceData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to assign employee');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/clients/${clientId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      });
      if (res.ok) {
        setShowAddDeptModal(false);
        setDeptForm({ name: '', code: '', description: '' });
        fetchDepartments();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to add department');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim()) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });
      if (res.ok) {
        setShowAddDocModal(false);
        setDocForm({ title: '', category: 'AGREEMENT', fileUrl: '' });
        fetchDocuments();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to upload document');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!client) return;
    const isCurrentlyBlocked = client.status === 'BLOCKED';
    setSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: isCurrentlyBlocked ? 'ACTIVE' : 'BLOCKED',
        }),
      });
      if (res.ok) {
        setShowBlockModal(false);
        setRefreshKey((k) => k + 1);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change status');
      }
    } catch (e) {
      console.error('Failed to change block status:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-growth-teal mb-3" />
        <p className="text-xs font-bold">Loading Client 360 Console...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-slate-900">Client Organization Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">Unable to locate the specified client profile.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Back to Directory
          </button>
        )}
      </div>
    );
  }

  const isBlocked = client.status === 'BLOCKED';
  const totalEmployees = client._count?.employees || client.employees?.length || 0;
  const activeDeals = client._count?.deals || 0;

  return (
    <div className="space-y-6">
      {/* Top Back Navigation (if available) */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-growth-teal" />
          <span>Back to Clients Directory</span>
        </button>
      )}

      {/* Client 360 Header Banner */}
      <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {client.companyName.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-black text-growth-teal bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                  {client.clientId}
                </span>

                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isBlocked
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : client.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {client.status}
                </span>

                {client.industry && (
                  <span className="text-[11px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                    {client.industry}
                  </span>
                )}
              </div>

              <h1 className="title-interactive-hover text-2xl font-black text-slate-900 tracking-tight">
                {client.companyName}
              </h1>
              {client.legalName && client.legalName !== client.companyName && (
                <p className="subtitle-interactive-hover text-xs text-slate-500 font-medium mt-0.5">
                  Legal: {client.legalName}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="interactive-btn-hover p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh Client 360"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {!isClientUser && (
              <>
                <button
                  onClick={openAssignModal}
                  className="interactive-btn-hover flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Assign Employee</span>
                </button>

                <button
                  onClick={() => setShowBlockModal(true)}
                  className={`interactive-btn-hover flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isBlocked
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  {isBlocked ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-rose-600" />}
                  <span>{isBlocked ? 'Unblock Client' : 'Block Client'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Contact & Metadata Strip */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2 text-slate-700">
            <Users className="w-4 h-4 text-growth-teal shrink-0" />
            <span className="font-semibold truncate">{client.contactPerson}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-growth-teal shrink-0" />
            <span className="font-mono">{client.mobile}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="w-4 h-4 text-growth-teal shrink-0" />
            <span className="truncate">{client.email || 'No email registered'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-growth-teal shrink-0" />
            <span className="truncate">{client.city || client.address || 'India'}</span>
          </div>
        </div>
      </div>

      {/* Overview KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Employees</div>
          <div className="text-3xl font-black text-slate-900 mt-1 font-mono">{totalEmployees}</div>
          <div className="text-[11px] text-teal-700 font-semibold mt-0.5">Enrolled workforce</div>
        </div>

        <div className="card-premium interactive-box-hover bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active Status</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{client.status}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Organization account</div>
        </div>

        {!isClientUser && (
          <>
            <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commercial Deals</div>
              <div className="text-3xl font-black text-slate-900 mt-1 font-mono">{activeDeals}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">CRM contracts</div>
            </div>

            <div className="card-premium interactive-box-hover bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Contract Value</div>
              <div className="text-3xl font-black text-amber-700 mt-1 font-mono">
                ₹{(client.estimatedValue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">Estimated account size</div>
            </div>
          </>
        )}
      </div>

      {/* Role-Aware Client 360 Tabs */}
      <div className="panel-premium bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Overview
          </button>

          {!isClientUser && (
            <>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'contacts'
                    ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                Contacts & Stakeholders
              </button>

              <button
                onClick={() => setActiveTab('deals')}
                className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'deals'
                    ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                Commercial Deals ({activeDeals})
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('employees')}
            className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'employees'
                ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Workforce & Employees ({totalEmployees})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Live Attendance
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'departments'
                ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Departments
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            Documents
          </button>

          {!isClientUser && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3.5 px-4 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-white text-growth-teal border-b-2 border-growth-teal shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              Audit History
            </button>
          )}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Details */}
              <div className="space-y-3">
                <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
                  Account Specification
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Client Code</span>
                    <span className="font-mono text-growth-teal font-black">{client.clientId}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Company Name</span>
                    <span className="text-slate-900 font-bold">{client.companyName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Primary Contact</span>
                    <span className="text-slate-800 font-semibold">{client.contactPerson}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Official Mobile</span>
                    <span className="font-mono text-slate-800 font-semibold">{client.mobile}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Registered Email</span>
                    <span className="text-slate-800">{client.email || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Industry</span>
                    <span className="text-slate-800">{client.industry || 'General Services'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Onboarding Date</span>
                    <span className="text-slate-800 font-mono font-semibold">
                      {client.onboardingDate
                        ? new Date(client.onboardingDate).toLocaleDateString('en-IN')
                        : new Date(client.dateAdded || client.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Ownership & Governance */}
              <div className="space-y-3">
                <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ownership & Relationship Management
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-500 font-medium">Designated Account Owner</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {client.accountOwner?.fullName || 'Assigned to Central Operations'}
                    </div>
                    {client.accountOwner?.employeeId && (
                      <div className="text-[11px] text-growth-teal font-mono font-bold">
                        {client.accountOwner.employeeId}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Enrolled Workforce</div>
                      <div className="text-base font-black text-slate-900">{totalEmployees} associates</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('employees')}
                      className="text-xs text-growth-teal hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      Manage Employees <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isClientUser && (
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">CRM Commercial Deals</div>
                        <div className="text-base font-black text-slate-900">{activeDeals} contracts</div>
                      </div>
                      <button
                        onClick={() => setActiveTab('deals')}
                        className="text-xs text-growth-teal hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        View Deals <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="p-6">
            <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Organization Contacts & Stakeholders
            </h3>
            {(!crmData?.contacts || crmData.contacts.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                No additional contacts recorded. Primary contact: {client.contactPerson} ({client.mobile}).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crmData.contacts.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 card-premium interactive-box-hover">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-sm">{c.fullName}</span>
                      {c.isDecisionMaker && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          DECISION MAKER
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 font-medium">{c.designation || 'Stakeholder'}</div>
                    <div className="text-slate-700 pt-1 flex items-center gap-4 font-mono text-[11px]">
                      <span>Phone: {c.phone}</span>
                      {c.email && <span>Email: {c.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DEALS */}
        {activeTab === 'deals' && (
          <div className="p-6">
            <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Linked Commercial Deals & Contracts
            </h3>
            {(!crmData?.deals || crmData.deals.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                No deals linked to this client yet.
              </div>
            ) : (
              <div className="space-y-3">
                {crmData.deals.map((deal: any) => (
                  <div
                    key={deal.id}
                    onClick={() => onNavigateToDeal?.(deal.id)}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-growth-teal text-xs flex items-center justify-between cursor-pointer transition-all card-premium interactive-box-hover"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-growth-teal font-black bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {deal.dealNumber}
                        </span>
                        <span className="font-black text-slate-900 text-sm">{deal.title}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Stage: <strong className="text-slate-800">{deal.stage}</strong> • Probability: {deal.probability}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 font-mono">
                        ₹{(deal.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Forecast: ₹{Math.round(deal.weightedValue || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EMPLOYEES */}
        {activeTab === 'employees' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Workforce Associates ({totalEmployees})
              </h3>
              {!isClientUser && (
                <button
                  onClick={openAssignModal}
                  className="interactive-btn-hover px-3.5 py-1.5 rounded-xl text-xs font-bold bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Employee</span>
                </button>
              )}
            </div>

            {(!workforceData?.employees || workforceData.employees.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                No employees are currently assigned to this organization. Click &quot;Assign Employee&quot; to deploy staff.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-mono font-bold">
                    <tr>
                      <th className="p-3.5">Associate</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Designation</th>
                      <th className="p-3.5">Live Status</th>
                      <th className="p-3.5">Today&apos;s Check-in</th>
                      <th className="p-3.5">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {workforceData.employees.map((emp: any) => (
                      <tr
                        key={emp.id}
                        className="interactive-row-hover hover:bg-teal-50/20 cursor-pointer transition-all"
                        onClick={() => onNavigateToEmployee?.(emp.employeeId)}
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-growth-teal font-black">{emp.employeeId}</span>
                            <span>{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">{emp.departmentName}</td>
                        <td className="p-3.5 text-slate-600">{emp.designation}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              emp.liveStatus === 'WORKING_NOW'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : emp.liveStatus === 'ON_BREAK'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : emp.liveStatus === 'BLOCKED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {emp.liveStatus?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono">
                          {emp.checkInTime ? new Date(emp.checkInTime).toLocaleTimeString('en-IN') : '—'}
                        </td>
                        <td className="p-3.5 font-bold text-teal-700 font-mono">
                          {emp.totalWorkingHours ? `${emp.totalWorkingHours}h` : '0h'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="p-6 space-y-4">
            <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Workforce Attendance Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs card-premium interactive-box-hover">
                <div className="text-emerald-700 font-bold uppercase text-[10px]">Working Now</div>
                <div className="text-3xl font-black text-emerald-700 mt-1 font-mono">
                  {workforceData?.summary?.workingNow || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs card-premium interactive-box-hover">
                <div className="text-amber-700 font-bold uppercase text-[10px]">On Break</div>
                <div className="text-3xl font-black text-amber-700 mt-1 font-mono">
                  {workforceData?.summary?.onBreak || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 text-xs card-premium interactive-box-hover">
                <div className="text-teal-700 font-bold uppercase text-[10px]">Present Today</div>
                <div className="text-3xl font-black text-teal-700 mt-1 font-mono">
                  {workforceData?.summary?.presentToday || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs card-premium interactive-box-hover">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Absent Today</div>
                <div className="text-3xl font-black text-slate-700 mt-1 font-mono">
                  {workforceData?.summary?.absentToday || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
                Client Organization Departments
              </h3>
              {!isClientUser && (
                <button
                  onClick={() => setShowAddDeptModal(true)}
                  className="interactive-btn-hover px-3.5 py-1.5 rounded-xl text-xs font-bold bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Department</span>
                </button>
              )}
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                No custom departments created for this client yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 card-premium interactive-box-hover">
                    <div className="font-black text-slate-900 text-sm">{dept.name}</div>
                    {dept.code && <div className="text-growth-teal font-mono text-[10px] font-bold">Code: {dept.code}</div>}
                    {dept.description && <p className="text-slate-500 text-[11px] mt-1">{dept.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
                Client Documents & Agreements
              </h3>
              {!isClientUser && (
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="interactive-btn-hover px-3.5 py-1.5 rounded-xl text-xs font-bold bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Document</span>
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                No contracts or agreements uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs card-premium interactive-box-hover">
                    <div>
                      <div className="font-black text-slate-900 text-sm">{doc.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">Category: {doc.category} • Uploaded by {doc.uploadedBy || 'Admin'}</div>
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="interactive-btn-hover text-growth-teal hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>View File</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="p-6 space-y-4">
            <h3 className="title-interactive-hover text-xs font-bold uppercase tracking-wider text-slate-500">
              Client Audit Log Stream
            </h3>
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                No audit events recorded for this client.
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between card-premium interactive-box-hover">
                    <div>
                      <div className="font-bold text-slate-900">{log.action.replace(/_/g, ' ')}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Actor: {log.actorEmployeeId || 'SYSTEM'} {log.reason ? `• ${log.reason}` : ''}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ASSIGN EMPLOYEE MODAL */}
      {showAssignEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Assign Associate to Client</h3>
                  <p className="text-[11px] text-slate-500">{client.companyName}</p>
                </div>
              </div>
              <button onClick={() => setShowAssignEmpModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{errorMsg}</div>}

            <form onSubmit={handleAssignEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Employee *
                </label>
                <select
                  value={selectedEmpToAssign}
                  onChange={(e) => setSelectedEmpToAssign(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                  required
                >
                  <option value="">-- Select an employee --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId}) — {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignEmpModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEPARTMENT MODAL */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Add Client Department</h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{errorMsg}</div>}

            <form onSubmit={handleAddDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations / Facility Management"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  placeholder="e.g. OPS"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-black rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DOCUMENT MODAL */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Register Client Document</h3>
              <button onClick={() => setShowAddDocModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{errorMsg}</div>}

            <form onSubmit={handleAddDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Services Agreement FY26"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="AGREEMENT">Agreement / MSA</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="COMPANY_DOC">Company Document</option>
                  <option value="COMPLIANCE">Compliance / Statutory</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document File URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={docForm.fileUrl}
                  onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-black rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white shadow-tealGlow cursor-pointer"
                >
                  {submitting ? 'Registering...' : 'Register Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK / UNBLOCK MODAL */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              {isBlocked ? (
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isBlocked ? 'Unblock Client Organization' : 'Block Client Organization'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{client.companyName} ({client.clientId})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBlocked
                ? 'Unblocking will restore client portal access and normal workforce management operations.'
                : 'Blocking will suspend client portal access and prevent new associate assignments. Historical workforce records and audit logs are preserved.'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-black rounded-xl text-white shadow-sm transition-all cursor-pointer ${
                  isBlocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Updating...' : isBlocked ? 'Confirm Unblock' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
