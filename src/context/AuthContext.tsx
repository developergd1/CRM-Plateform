'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  todayAttendance: any | null;
  refreshAuth: () => Promise<boolean>;
  switchDemoRole: (roleOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  checkIn: () => Promise<{ success: boolean; message?: string }>;
  checkOut: () => Promise<{ success: boolean; message?: string }>;
  startBreak: (type?: string) => Promise<{ success: boolean; message?: string }>;
  endBreak: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const refreshAuth = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setTodayAttendance(data.todayAttendance);
          try {
            localStorage.setItem('gi_auth_user', JSON.stringify(data.user));
            if (data.todayAttendance) {
              localStorage.setItem('gi_today_attendance', JSON.stringify(data.todayAttendance));
            } else {
              localStorage.removeItem('gi_today_attendance');
            }
          } catch {}
          return true;
        }
      }
      setUser(null);
      setTodayAttendance(null);
      try {
        localStorage.removeItem('gi_auth_user');
        localStorage.removeItem('gi_today_attendance');
      } catch {}
      return false;
    } catch (e) {
      console.error('Auth refresh error:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Restore cached session immediately on client mount (safe from SSR hydration mismatches)
    try {
      const cached = localStorage.getItem('gi_auth_user');
      const cachedAtt = localStorage.getItem('gi_today_attendance');
      if (cached) {
        setUser(JSON.parse(cached));
        if (cachedAtt) setTodayAttendance(JSON.parse(cachedAtt));
        setLoading(false);
      }
    } catch {}

    refreshAuth();
  }, []);

  // Active interaction heartbeat every 30 seconds (only for regular employees)
  useEffect(() => {
    if (!user || user.role !== 'EMPLOYEE' || user.employeeId === 'GI-EMP-000001') return;
    const interval = setInterval(() => {
      fetch('/api/work-sessions', { method: 'POST' }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const switchDemoRole = async (roleOrEmail: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/switch-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleOrEmail, email: roleOrEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          return { success: true };
        } else {
          return { success: false, error: 'Session could not be established. Account may be restricted.' };
        }
      } else {
        return { success: false, error: data.error || 'Failed to switch to target account.' };
      }
    } catch (e: any) {
      console.error('Demo switch error:', e);
      return { success: false, error: e.message || 'Network error during role switch.' };
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    const res = await fetch('/api/attendance/check-in', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setTodayAttendance(data.attendance);
      return { success: true, message: data.message };
    }
    return { success: false, message: data.error || 'Check-in failed' };
  };

  const checkOut = async () => {
    const res = await fetch('/api/attendance/check-out', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setTodayAttendance(data.attendance);
      return { success: true, message: data.message };
    }
    return { success: false, message: data.error || 'Check-out failed' };
  };

  const startBreak = async (type = 'TEA_LUNCH') => {
    const res = await fetch('/api/attendance/break/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakType: type }),
    });
    const data = await res.json();
    if (res.ok) {
      await refreshAuth();
      return { success: true };
    }
    return { success: false, message: data.error };
  };

  const endBreak = async () => {
    const res = await fetch('/api/attendance/break/end', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      await refreshAuth();
      return { success: true };
    }
    return { success: false, message: data.error };
  };

  const logout = async () => {
    try {
      localStorage.removeItem('gi_auth_user');
      localStorage.removeItem('gi_today_attendance');
    } catch {}
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setTodayAttendance(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeTab,
        setActiveTab,
        todayAttendance,
        refreshAuth,
        switchDemoRole,
        checkIn,
        checkOut,
        startBreak,
        endBreak,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
