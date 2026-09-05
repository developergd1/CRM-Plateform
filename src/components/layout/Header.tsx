'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Clock,
  Coffee,
  LogOut,
  Play,
  Square,
  UserCheck,
  Search,
  ShieldCheck,
  Users,
  Briefcase,
  User,
} from 'lucide-react';

export const Header: React.FC<{ onSearchSelect?: (term: string) => void }> = ({ onSearchSelect }) => {
  const { user, todayAttendance, checkIn, checkOut, startBreak, endBreak, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handlePunchIn = async () => {
    setActionLoading(true);
    const res = await checkIn();
    setActionLoading(false);
    if (res.message) {
      setActionMsg(res.message);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handlePunchOut = async () => {
    if (!confirm('Are you sure you want to Check Out for the day?')) return;
    setActionLoading(true);
    const res = await checkOut();
    setActionLoading(false);
    if (res.message) {
      setActionMsg(res.message);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const handleBreakToggle = async () => {
    setActionLoading(true);
    const hasOpenBreak = todayAttendance?.breaks?.some((b: any) => !b.breakEndTime);
    if (hasOpenBreak) {
      await endBreak();
    } else {
      await startBreak('TEA_LUNCH');
    }
    setActionLoading(false);
  };

  const isCheckedIn = !!todayAttendance?.checkInTime;
  const isCheckedOut = !!todayAttendance?.checkOutTime;
  const isOnBreak = isCheckedIn && !isCheckedOut && todayAttendance?.breaks?.some((b: any) => !b.breakEndTime);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Client ID, Employee ID, Phone, Company..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearchSelect?.(e.target.value);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-growth-teal/30 focus:border-growth-teal transition-all"
          />
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-growth-navy text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-bounce">
          {actionMsg}
        </div>
      )}

      {/* Right Controls: Quick Punch & Role Switcher */}
      <div className="flex items-center gap-4">
        {/* Attendance Punch Widget */}
        <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1.5 gap-2 shadow-sm">
          {!isCheckedIn ? (
            <button
              onClick={handlePunchIn}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Punch In (Check-In)</span>
            </button>
          ) : isCheckedOut ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Day Completed ({formatTime(todayAttendance.checkOutTime)})</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-slate-600">
                <Clock className="w-3.5 h-3.5 text-growth-teal" />
                <span>In: {formatTime(todayAttendance.checkInTime)}</span>
                {todayAttendance.isLate && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                    Late
                  </span>
                )}
              </div>

              {/* Break Toggle Button */}
              <button
                onClick={handleBreakToggle}
                disabled={actionLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isOnBreak
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>{isOnBreak ? 'Resume Work' : 'Break'}</span>
              </button>

              {/* Check Out Button */}
              <button
                onClick={handlePunchOut}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-crimson-500 hover:bg-crimson-600 bg-rose-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Check Out</span>
              </button>
            </>
          )}
        </div>

        {/* Role & Profile Switcher Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-xs transition-all bg-slate-50 text-slate-700 border-slate-200">
            {user?.role === 'SUPER_ADMIN' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            ) : user?.role === 'ADMIN_HR' ? (
              <Users className="w-3.5 h-3.5 text-teal-600" />
            ) : user?.role === 'MANAGER_TL' ? (
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <User className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="font-bold text-slate-800">
              {user?.roleDisplayName || user?.role}
            </span>
          </div>
        </div>

        {/* User Details & Logout */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-growth-teal to-growth-gold flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user?.fullName} ({user?.employeeId})
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              {user?.designation}
            </span>
          </div>

          <button
            onClick={() => logout()}
            title="Sign Out to Role Selection Screen"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out / Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
};
