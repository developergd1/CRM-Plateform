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
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const EmployeePortalShell: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'profile'>('attendance');
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.employeeId) return;
      try {
        const res = await fetch(`/api/employees/${user.employeeId}`);
        if (res.ok) {
          const data = await res.json();
          setEmployeeProfile(data.employee);
        }
      } catch (e) {
        console.error('Error fetching employee profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const emp = employeeProfile || user;

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      {/* LEFT SIDEBAR (Matching Admin Panel) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/50">
          <GrowthIndiaLogo size="sm" />
        </div>

        {/* Employee Status Badge */}
        <div className="mx-4 mt-4 p-3 bg-slate-950/70 rounded-2xl border border-growth-teal/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-growth-teal animate-pulse" />
            <span className="text-xs font-black text-white truncate">Employee Portal</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-growth-teal/20 text-growth-teal border border-growth-teal/40">
              {user?.employeeId}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">• Active Staff</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 mb-2">
              STAFF WORKSPACE
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Clock className={`w-4 h-4 shrink-0 ${activeTab === 'attendance' ? 'text-growth-gold' : 'text-slate-400'}`} />
                <span>Attendance & Work</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-growth-teal to-growth-tealDark text-white shadow-tealGlow font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${activeTab === 'profile' ? 'text-growth-gold' : 'text-slate-400'}`} />
                <span>My Profile & Details</span>
              </button>
            </div>
          </div>
        </div>

        {/* DOWN-LEFT PROFILE CARD + QUICK SIGN OUT */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70">
          <div className="p-2.5 bg-slate-900 rounded-2xl border border-slate-800/90 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center font-black text-white text-sm shrink-0 shadow">
                {user?.fullName?.charAt(0) || 'E'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate" title={user?.fullName}>
                  {user?.fullName || 'Staff Member'}
                </div>
                <div className="text-[10px] text-slate-400 truncate" title={emp?.designation || user?.designation}>
                  {emp?.designation || user?.designation || 'Staff'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[9px] text-growth-teal font-bold">{user?.employeeId}</span>
                  <span className="text-[9px] text-slate-500 truncate">• {emp?.client?.companyName || 'Assigned'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 text-slate-800">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-800">
              {activeTab === 'attendance' ? 'Work Telemetry & Attendance' : 'Personal & Employment Profile'}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-growth-teal border border-teal-200">
              {emp?.client?.companyName || user?.companyName || 'Assigned Workplace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
              <div className="text-[10px] text-slate-500">{emp?.designation || user?.designation}</div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 text-slate-800 space-y-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-growth-navy via-slate-900 to-growth-navyLight rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-growth-teal to-teal-700 flex items-center justify-center font-black text-2xl text-white shadow-lg">
                  {user?.fullName?.charAt(0) || 'E'}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-800/60 rounded-full text-[10px] font-black text-emerald-400 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ACTIVE WORKSPACE</span>
                  </div>
                  <h1 className="text-2xl font-black">{user?.fullName}</h1>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <span className="font-mono text-growth-gold font-bold">{user?.employeeId}</span> • {emp?.designation || user?.designation} • {emp?.departmentName || user?.departmentName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-1 shrink-0">
                  <div className="text-slate-400">Assigned Client / Company:</div>
                  <div className="font-bold text-growth-gold flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4" />
                    <span>{emp?.client?.companyName || user?.companyName || 'Growth India'}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-1 shrink-0">
                  <div className="text-slate-400">Assigned Shift Window:</div>
                  <div className="font-bold text-teal-300 flex items-center gap-1.5 text-sm font-mono">
                    <Clock className="w-4 h-4 text-growth-teal" />
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
            {activeTab === 'attendance' ? (
              <EmployeeAttendanceView />
            ) : (
              <div className="space-y-6">
                {/* Profile Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <div className="p-2 rounded-xl bg-teal-50 text-growth-teal border border-teal-100">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">Personal Profile</h3>
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
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">Employment Information</h3>
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
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Platform Security & Governance Notice:</span>
                    <p className="mt-0.5 leading-relaxed text-slate-600">
                      Your profile is verified and active. Employees are strictly prohibited from onboarding other personnel. Disciplinary actions or policy breaches can lead to immediate account access revocation by Client or Platform Administrators.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
