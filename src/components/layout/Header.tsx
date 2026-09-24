'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Clock,
  Coffee,
  Play,
  Square,
  Search,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { PasswordResetRequestsModal } from '@/components/auth/PasswordResetRequestsModal';
import { formatClockTime } from '@/components/common/TimePicker12';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  onSearchSelect?: (term: string) => void;
  rightSlot?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ onSearchSelect, rightSlot }) => {
  const { user, todayAttendance, checkIn, checkOut, startBreak, endBreak } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [showResetRequests, setShowResetRequests] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState(0);

  const [searchResults, setSearchResults] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchDebounceRef = React.useRef<any>(null);

  const handleSearchQuery = (val: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val || val.trim().length < 2) {
      setSearchResults(null);
      setShowDropdown(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        // silent
      }
    }, 250);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResetRequestsCount = async () => {
    try {
      const res = await fetch('/api/auth/password-reset-requests');
      if (res.ok) {
        const data = await res.json();
        setPendingResetCount(data.pendingCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  React.useEffect(() => {
    fetchResetRequestsCount();
  }, []);

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
    return formatClockTime(dateStr);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Search Bar with Global Search Dropdown */}
      <div className="flex items-center gap-4 flex-1 max-w-md relative">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Client ID, Employee, Lead, Deal..."
            value={searchTerm}
            onFocus={() => {
              if (searchTerm.trim().length >= 2) setShowDropdown(true);
            }}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              onSearchSelect?.(val);
              handleSearchQuery(val);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
          />
        </div>

        {/* Global Search Popover */}
        {showDropdown && searchResults && (
          <div
            ref={dropdownRef}
            className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {searchResults.totalMatches === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                No matching clients, leads, or employees found for "{searchTerm}"
              </div>
            ) : (
              <>
                {/* Clients */}
                {searchResults.results.clients?.length > 0 && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2.5 pb-1">
                      Clients ({searchResults.results.clients.length})
                    </p>
                    {searchResults.results.clients.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onSearchSelect?.(c.clientId || c.id);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-teal-50/70 hover:text-teal-900 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-teal-700">
                            {c.companyName || c.name}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono text-[11px]">
                            {c.clientId}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {c.stage || c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Employees */}
                {searchResults.results.employees?.length > 0 && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2.5 pb-1">
                      Employees ({searchResults.results.employees.length})
                    </p>
                    {searchResults.results.employees.map((e: any) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          onSearchSelect?.(e.employeeId || e.id);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-teal-50/70 hover:text-teal-900 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-teal-700">
                            {e.fullName}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono text-[11px]">
                            {e.employeeId}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {e.designation}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Leads */}
                {searchResults.results.leads?.length > 0 && (
                  <div className="py-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2.5 pb-1">
                      Leads ({searchResults.results.leads.length})
                    </p>
                    {searchResults.results.leads.map((l: any) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          onSearchSelect?.(l.leadNumber || l.id);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-teal-50/70 hover:text-teal-900 flex items-center justify-between text-xs transition-colors cursor-pointer group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-teal-700">
                            {l.companyName}
                          </span>
                          <span className="text-slate-400 ml-2 font-mono text-[11px]">
                            {l.leadNumber}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {l.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Notification Toast */}
      {actionMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl border border-rose-500 animate-bounce flex items-center gap-1.5 z-50">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Right Controls: Icons & Compact Platform Switcher */}
      <div className="flex items-center gap-3">
        {/* Attendance Punch Widget for Employees if active */}
        {(!user || !['ADMIN', 'SUPER_ADMIN', 'ADMIN_HR'].includes(user.role)) && (
          <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-2 shadow-xs">
            {!isCheckedIn ? (
              <button
                onClick={handlePunchIn}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>Punch In</span>
              </button>
            ) : isCheckedOut ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold rounded-lg">
                <span>Day Completed ({formatTime(todayAttendance.checkOutTime)})</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 px-2 text-xs font-medium text-slate-700">
                  <span>In: {formatTime(todayAttendance.checkInTime)}</span>
                </div>
                <button
                  onClick={handleBreakToggle}
                  disabled={actionLoading}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isOnBreak
                      ? 'bg-teal-700 hover:bg-teal-800 text-white animate-pulse'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  <span>{isOnBreak ? 'Resume' : 'Break'}</span>
                </button>
                <button
                  onClick={handlePunchOut}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <span>Check Out</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Reset Requests Button (Standardized with Red Notification Badge) */}
        <button
          onClick={() => setShowResetRequests(true)}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-xs transition-all bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 cursor-pointer"
          title="Password Reset Requests"
        >
          <KeyRound className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="hidden sm:inline">Reset Requests</span>
          {pendingResetCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-xs">
              {pendingResetCount}
            </span>
          )}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Right Slot: Compact Platform Switcher Dropdown */}
        {rightSlot}
      </div>

      {/* Password Reset Requests Modal for Admin */}
      <PasswordResetRequestsModal
        isOpen={showResetRequests}
        onClose={() => {
          setShowResetRequests(false);
          fetchResetRequestsCount();
        }}
        userRole={user?.role}
        onPasswordResetSuccess={() => {
          fetchResetRequestsCount();
        }}
      />
    </header>
  );
};
