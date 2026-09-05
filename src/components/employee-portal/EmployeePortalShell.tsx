'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { GrowthIndiaLogo } from '@/components/brand/GrowthIndiaLogo';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Employee Portal Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <GrowthIndiaLogo size="sm" />
          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">Employee Workspace</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-growth-teal/20 text-growth-teal border border-growth-teal/30">
              {user?.employeeId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{user?.fullName}</div>
            <div className="text-[10px] text-slate-400">{user?.designation}</div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-growth-navy via-slate-900 to-growth-navyLight rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
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

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-1 shrink-0">
            <div className="text-slate-400">Assigned Client / Company:</div>
            <div className="font-bold text-growth-gold flex items-center gap-1.5 text-sm">
              <Building2 className="w-4 h-4" />
              <span>{emp?.client?.companyName || user?.companyName || 'Apex Industrial Logistics Ltd'}</span>
            </div>
          </div>
        </div>

        {/* Profile Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-growth-teal/20 text-growth-teal">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white">Personal Profile</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Full Name</span>
                <span className="font-bold text-white">{emp?.fullName || user?.fullName}</span>
              </div>

              {emp?.fatherMotherName && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Father&apos;s / Mother&apos;s Name</span>
                  <span className="font-bold text-slate-200">{emp.fatherMotherName}</span>
                </div>
              )}

              {emp?.dob && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Date of Birth</span>
                  <span className="font-bold text-slate-200">{new Date(emp.dob).toLocaleDateString()}</span>
                </div>
              )}

              {emp?.gender && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Gender</span>
                  <span className="font-bold text-slate-200">{emp.gender}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Mobile Phone</span>
                <span className="font-bold text-slate-200">{emp?.phone || '—'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Registered Email</span>
                <span className="font-bold text-teal-400">{user?.email}</span>
              </div>

              {emp?.panMasked && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">PAN Number (Masked)</span>
                  <span className="font-mono font-bold text-growth-gold">{emp.panMasked}</span>
                </div>
              )}

              {emp?.address && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">Residential Address</span>
                  <span className="font-medium text-slate-300">{emp.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Employment & Job Details */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-growth-gold/20 text-growth-gold">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white">Employment Information</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Employee ID</span>
                <span className="font-mono font-bold text-growth-teal">{user?.employeeId}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Client / Employer</span>
                <span className="font-bold text-growth-gold">{emp?.client?.companyName || user?.companyName || 'Internal'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Department</span>
                <span className="font-bold text-slate-200">{emp?.departmentName || user?.departmentName || 'General Operations'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Designation</span>
                <span className="font-bold text-slate-200">{emp?.designation || user?.designation}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Job Location</span>
                <span className="font-bold text-slate-200">{emp?.jobLocation || emp?.location || 'Headquarters'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Date of Joining</span>
                <span className="font-bold text-slate-200">
                  {emp?.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Employment Type</span>
                <span className="font-bold text-slate-200">{emp?.employmentType || 'Full-Time'}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Account Status</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  {emp?.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Governance Notice */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-growth-gold shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">Platform Security & Governance Notice:</span>
            <p className="mt-0.5 leading-relaxed">
              Your profile is verified and active. Employees are strictly prohibited from onboarding other personnel. Disciplinary actions or policy breaches can lead to immediate account access revocation by Client or Platform Administrators.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
