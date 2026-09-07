'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Search, Eye, X, Filter, Clock, AlertTriangle } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (entityType) query.set('entityType', entityType);

      const res = await fetch(`/api/audit-logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, entityType, user]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-growth-navy" />
          <span>Immutable Platform Audit Log Center</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically recorded historical trail of sensitive document views, employee status modifications, client reassignments, and logins
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Actor Employee ID, Action, Entity ID, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
          />
        </div>

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">All Entities</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="CLIENT">Client</option>
          <option value="DOCUMENT">Document</option>
          <option value="ATTENDANCE">Attendance</option>
          <option value="AUTH">Authentication</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action Type</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-growth-teal bg-teal-50/30">
                    {log.actorEmployeeId || 'SYSTEM'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-slate-700">{log.entityId || '—'}</span>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">{log.entityType}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 text-xs my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Audit Event Details: {selectedLog.action}
              </h3>
              <button onClick={() => setSelectedLog(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Actor Reference</span>
                  <span className="font-bold font-mono">{selectedLog.actorEmployeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Timestamp</span>
                  <span>{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Target Entity</span>
                  <span className="font-mono">{selectedLog.entityId} ({selectedLog.entityType})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">IP Address</span>
                  <span className="font-mono">{selectedLog.ipAddress}</span>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="p-3 bg-amber-50 rounded-xl text-amber-900">
                  <span className="font-bold block">Stated Reason:</span>
                  <p>{selectedLog.reason}</p>
                </div>
              )}

              {selectedLog.previousData && (
                <div>
                  <span className="font-bold text-slate-600 block mb-1">Previous State Data:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto">
                    {selectedLog.previousData}
                  </pre>
                </div>
              )}

              {selectedLog.newData && (
                <div>
                  <span className="font-bold text-slate-600 block mb-1">New State Data:</span>
                  <pre className="p-3 bg-slate-900 text-growth-gold rounded-xl text-[11px] font-mono overflow-x-auto">
                    {selectedLog.newData}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
