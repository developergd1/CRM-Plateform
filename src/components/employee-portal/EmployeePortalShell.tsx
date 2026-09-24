'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
import { EmployeeAttendanceView } from './EmployeeAttendanceView';
import { formatTo12Hour } from '@/components/common/TimePicker12';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  LogOut,
  Briefcase,
  Sparkles,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  FolderLock,
  CreditCard,
  LifeBuoy,
  LayoutDashboard,
  CheckSquare,
  FileCheck,
  ArrowUpRight,
  Plus,
  Play,
  Square,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { clientCache } from '@/lib/client-cache';
import { EmployeeTasksView } from '@/components/tasks/EmployeeTasksView';
import { LeaveView } from '@/components/leave/LeaveView';
import { EmployeeRegularizationView } from './EmployeeRegularizationView';
import { EmployeeDocumentsView } from './EmployeeDocumentsView';
import { EmployeePayrollView } from './EmployeePayrollView';
import { EmployeeHelpdeskView } from './EmployeeHelpdeskView';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const EmployeePortalShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isWorkOpen, setIsWorkOpen] = useState(true);
  const cacheKey = user?.employeeId ? `emp_profile_${user.employeeId}` : null;
  const initialProfile = cacheKey ? clientCache.get<any>(cacheKey, 30 * 60 * 1000) : null;
  const [employeeProfile, setEmployeeProfile] = useState<any>(() => initialProfile);
  const [loading, setLoading] = useState(() => !initialProfile);

  // Sync tab with URL search parameters on mount & history navigation (prevents hydration mismatch)
  useEffect(() => {
    const syncTabFromUrl = () => {
      if (typeof window === 'undefined') return;
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'dashboard' || p === 'overview') setActiveTab('dashboard');
      else if (p === 'tasks' || p === 'work-tasks') setActiveTab('work-tasks');
      else if (p === 'leave' || p === 'work-leave') setActiveTab('work-leave');
      else if (p === 'regularization' || p === 'work-regularization') setActiveTab('work-regularization');
      else if (p === 'profile') setActiveTab('profile');
      else if (p === 'documents' || p === 'vault') setActiveTab('documents');
      else if (p === 'payroll' || p === 'payslips') setActiveTab('payroll');
      else if (p === 'helpdesk' || p === 'requests') setActiveTab('helpdesk');
      else if (p === 'attendance' || p === 'work-today') setActiveTab('work-today');
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  useEffect(() => {
    const fetchProfile = async (force = false) => {
      if (!user?.employeeId) return;
      if (!force && initialProfile) return;
      try {
        const res = await fetch(`/api/employees/${user.employeeId}`);
        if (res.ok) {
          const data = await res.json();
          setEmployeeProfile(data.employee);
          if (cacheKey) clientCache.set(cacheKey, data.employee);
        }
      } catch (e) {
        console.error('Error fetching employee profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.employeeId, cacheKey, initialProfile]);

  const emp = employeeProfile || user;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'work-today', label: 'Attendance & Clock', icon: Calendar },
    { id: 'work-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'work-leave', label: 'Leave Applications', icon: Coffee },
    { id: 'work-regularization', label: 'Regularization', icon: Clock },
    { id: 'documents', label: 'Personal Documents', icon: FolderLock },
    { id: 'payroll', label: 'Payroll & Payslips', icon: CreditCard },
    { id: 'helpdesk', label: 'HR Requests & Tickets', icon: LifeBuoy },
  ];

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      {/* LEFT SIDEBAR (Clean Modern White Theme) */}
      <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 border-r border-slate-200 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 bg-white">
          <GrowthIndiaLogo size="sm" />
        </div>

        {/* Employee Status Badge */}
        <div className="mx-3 mt-3.5 p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wider">EMPLOYEE</span>
          </div>
          <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-teal-600 text-white shadow-xs">
            {user?.employeeId || 'STAFF'}
          </span>
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-teal-700 hover:bg-teal-50/70 hover:font-bold'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ItemIcon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* DOWN-LEFT PROFILE CARD + QUICK SIGN OUT */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.fullName?.charAt(0) || 'E'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight" title={user?.fullName}>
                  {user?.fullName || 'Staff Member'}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5" title={emp?.designation || user?.designation}>
                  {emp?.designation || user?.designation || 'Staff'} • <span className="font-semibold text-teal-700">{emp?.client?.companyName || 'Assigned'}</span>
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="font-mono text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    {user?.employeeId}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 text-slate-800">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="title-interactive-hover text-base font-black text-slate-800">
              {activeTab === 'dashboard' && 'Employee Workspace Dashboard'}
              {activeTab === 'profile' && 'Personal & Employment Profile'}
              {activeTab === 'work-today' && 'Attendance, Timesheet & Punch Telemetry'}
              {activeTab === 'work-tasks' && 'My Assigned Tasks & Deliverables'}
              {activeTab === 'work-leave' && 'Leave Applications & Entitlements'}
              {activeTab === 'work-regularization' && 'Attendance Regularization Workflow'}
              {activeTab === 'documents' && 'Personal Document Vault & KYC'}
              {activeTab === 'payroll' && 'Salary Structures, Slips & Disbursements'}
              {activeTab === 'helpdesk' && 'Employee Helpdesk & Formal HR Requests'}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {emp?.client?.companyName || user?.companyName || 'Assigned Workplace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell variant="light" />
          </div>
        </header>

        {/* Main Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 text-slate-800 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Welcome Card */}
            <div className="card-premium interactive-box-hover bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center font-black text-2xl text-teal-700 shadow-xs shrink-0">
                  {user?.fullName?.charAt(0) || 'E'}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-black text-emerald-700 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ACTIVE WORKSPACE</span>
                  </div>
                  <h1 className="title-interactive-hover text-2xl font-black text-slate-900">{user?.fullName}</h1>
                  <p className="subtitle-interactive-hover text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{user?.employeeId}</span>
                    <span>• {emp?.designation || user?.designation} • {emp?.departmentName || user?.departmentName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="card-premium interactive-box-hover bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1 shrink-0 cursor-pointer">
                  <div className="text-slate-500">Assigned Client / Company:</div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    <span>{emp?.client?.companyName || user?.companyName || 'Growth India'}</span>
                  </div>
                </div>

                <div className="card-premium interactive-box-hover bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1 shrink-0 cursor-pointer">
                  <div className="text-slate-500">Assigned Shift Window:</div>
                  <div className="font-bold text-teal-700 flex items-center gap-1.5 text-sm font-mono">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>
                      {emp?.shiftStartTime === 'FLEXIBLE'
                        ? 'Flexible Hours'
                        : `${formatTo12Hour(emp?.shiftStartTime || '10:00')} – ${formatTo12Hour(emp?.shiftEndTime || '19:00')}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab View Switcher */}
            {activeTab === 'dashboard' ? (
              <div className="space-y-6">
                {/* Dashboard Metrics / Quick Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Today Attendance Stat */}
                  <div
                    onClick={() => setActiveTab('work-today')}
                    className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-growth-teal/50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-growth-teal group-hover:scale-105 transition">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-growth-teal flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        Open <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 font-medium">Daily Attendance</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">Punch & Clock</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Shift Live Tracking
                      </div>
                    </div>
                  </div>

                  {/* Tasks Stat */}
                  <div
                    onClick={() => setActiveTab('work-tasks')}
                    className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400/50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        View <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 font-medium">Assigned Tasks</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">My Deliverables</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        TODO & In Progress Kanban
                      </div>
                    </div>
                  </div>

                  {/* Leave & Entitlements */}
                  <div
                    onClick={() => setActiveTab('work-leave')}
                    className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400/50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition">
                        <Coffee className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        Apply <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 font-medium">Leave & Offs</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">Leave Applications</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        Check status & balance
                      </div>
                    </div>
                  </div>

                  {/* Documents & KYC */}
                  <div
                    onClick={() => setActiveTab('documents')}
                    className="card-premium interactive-box-hover bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-400/50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
                        <FolderLock className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        Vault <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 font-medium">Document Vault</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">KYC & Records</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-1">
                        Letters, IDs & Contracts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard Today Punch View & Quick Jump */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="title-interactive-hover text-base font-black text-slate-900">Today&apos;s Time & Attendance Snapshot</h2>
                      <p className="subtitle-interactive-hover text-xs text-slate-500">Log punch telemetry and track working duration in real time</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('work-today')}
                      className="text-xs font-bold text-growth-teal hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Full Timesheet Calendar <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <EmployeeAttendanceView />
                </div>
              </div>
            ) : activeTab === 'work-today' ? (
              <EmployeeAttendanceView />
            ) : activeTab === 'work-tasks' ? (
              <div className="h-[800px] flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200">
                <EmployeeTasksView />
              </div>
            ) : activeTab === 'work-leave' ? (
              <LeaveView />
            ) : activeTab === 'work-regularization' ? (
              <EmployeeRegularizationView />
            ) : activeTab === 'documents' ? (
              <EmployeeDocumentsView />
            ) : activeTab === 'payroll' ? (
              <EmployeePayrollView />
            ) : activeTab === 'helpdesk' ? (
              <EmployeeHelpdeskView />
            ) : activeTab === 'profile' ? (
              <div className="space-y-6">
                {/* Profile Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 cursor-pointer">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <div className="p-2 rounded-xl bg-teal-50 text-growth-teal border border-teal-100">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="title-interactive-hover text-sm font-black text-slate-900">Personal Profile</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Full Name</span>
                        <span className="font-bold text-slate-900">{emp?.fullName || user?.fullName}</span>
                      </div>

                      {emp?.fatherMotherName && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Father&apos;s / Mother&apos;s Name</span>
                          <span className="font-bold text-slate-800">{emp.fatherMotherName}</span>
                        </div>
                      )}

                      {emp?.dob && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Date of Birth</span>
                          <span className="font-bold text-slate-800">{new Date(emp.dob).toLocaleDateString()}</span>
                        </div>
                      )}

                      {emp?.gender && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Gender</span>
                          <span className="font-bold text-slate-800">{emp.gender}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Mobile Phone</span>
                        <span className="font-bold text-slate-800">{emp?.phone || '—'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Registered Email</span>
                        <span className="font-bold text-growth-teal">{user?.email}</span>
                      </div>

                      {emp?.panMasked && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">PAN Number</span>
                          <span className="font-mono font-bold text-growth-gold">{emp.panMasked}</span>
                        </div>
                      )}

                      {(emp?.aadhaarMasked || emp?.aadharNumber) && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Aadhar Number</span>
                          <span className="font-mono font-bold text-slate-800">{emp.aadhaarMasked || emp.aadharNumber}</span>
                        </div>
                      )}

                      {emp?.address && (
                        <div className="py-1">
                          {emp.address.includes('Temporary:') || emp.address.includes('Permanent:') ? (
                            <div className="space-y-1.5">
                              {emp.address.split('\n').map((line: string, idx: number) => {
                                const isTemp = line.startsWith('Temporary:');
                                const isPerm = line.startsWith('Permanent:');
                                const label = isTemp ? 'Temporary Address' : isPerm ? 'Permanent Address' : 'Address';
                                const val = line.replace(/^(Temporary|Permanent):\s*/, '');
                                return (
                                  <div key={idx}>
                                    <span className="text-slate-400 block mb-0.5 text-[11px] uppercase tracking-wider">{label}</span>
                                    <span className="font-medium text-slate-700">{val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-500 block mb-0.5">Address</span>
                              <span className="font-medium text-slate-700">{emp.address}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employment & Job Details */}
                  <div className="card-premium interactive-box-hover bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 cursor-pointer">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <h3 className="title-interactive-hover text-sm font-black text-slate-900">Employment Information</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Employee ID</span>
                        <span className="font-mono font-bold text-growth-teal">{user?.employeeId}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Client / Employer</span>
                        <span className="font-bold text-slate-900">{emp?.client?.companyName || user?.companyName || 'Internal'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Department</span>
                        <span className="font-bold text-slate-800">{emp?.departmentName || user?.departmentName || 'General Operations'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Designation</span>
                        <span className="font-bold text-slate-800">{emp?.designation || user?.designation}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Job Location</span>
                        <span className="font-bold text-slate-800">{emp?.jobLocation || emp?.location || 'Headquarters'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Date of Joining</span>
                        <span className="font-bold text-slate-800">
                          {emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Employment Type</span>
                        <span className="font-bold text-slate-800">{emp?.employmentType || 'Full-Time'}</span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-500">Account Status</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {emp?.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security & Governance Notice */}
                <div className="panel-premium p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Platform Security & Governance Notice:</span>
                    <p className="mt-0.5 leading-relaxed text-slate-600">
                      Your profile is verified and active. Employees are strictly prohibited from onboarding other personnel. Disciplinary actions or policy breaches can lead to immediate account access revocation by Client or Platform Administrators.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmployeeAttendanceView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
