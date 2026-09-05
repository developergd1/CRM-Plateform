'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserCheck, ShieldCheck, Laptop, Clock, Activity, AlertCircle } from 'lucide-react';

export const WorkSessionsView: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/work-sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Error fetching work sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const formatDuration = (secs?: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m ${secs % 60}s`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-growth-teal" />
          <span>Work Session & Platform Activity Tracking</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Measures web session duration independently from active interaction to ensure objective productivity evaluation
        </p>
      </div>

      {/* Core Principle Notice Card */}
      <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-3xl border border-teal-200/80 flex items-start gap-4 text-xs">
        <Activity className="w-5 h-5 text-growth-teal shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold text-slate-900 block text-sm">
            Operational Rule: Session Duration ≠ Productivity
          </span>
          <p className="text-slate-700">
            Growth India measures performance via multi-factor outcomes (leads qualified, deals converted, calls logged, tasks completed) rather than mere browser session open time.
          </p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Session ID</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Login Time</th>
                <th className="py-3.5 px-4">Session Duration</th>
                <th className="py-3.5 px-4">Active Interaction</th>
                <th className="py-3.5 px-4">Device & IP</th>
                <th className="py-3.5 px-4">Session Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-growth-teal bg-teal-50/40">
                    {sess.sessionId}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{sess.employee?.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sess.employee?.employeeId}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {new Date(sess.loginTimestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {formatDuration(sess.sessionDurationSec)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {formatDuration(sess.activeSeconds)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div>{sess.deviceInfo || 'Web PC'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sess.ipAddress || '127.0.0.1'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        sess.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sess.status === 'TERMINATED_SUSPENDED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sess.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
