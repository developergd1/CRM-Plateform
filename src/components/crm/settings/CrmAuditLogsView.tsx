'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  actorUserId?: string;
  actorEmployeeId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousData?: any;
  newData?: any;
  status: string;
  ipAddress?: string;
  timestamp: string;
}

export const CrmAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
        query,
        action: actionFilter,
        entityType: entityFilter,
      });

      const res = await fetch(`/api/crm/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Enterprise Audit Trail & Compliance Log
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident chronological record of all administrative actions, data exports, pipeline modifications, and entity lifecycle changes.
          </p>
        </div>

        <a
          href="/api/crm/audit-logs?format=csv"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#0D9488] bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg hover:bg-[#CCFBF1]/40 shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log (CSV)</span>
        </a>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, employee ID, entity ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488] bg-white text-slate-700"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE_LEAD">CREATE_LEAD</option>
            <option value="UPDATE_LEAD">UPDATE_LEAD</option>
            <option value="UPDATE_CRM_SETTINGS">UPDATE_CRM_SETTINGS</option>
            <option value="CREATE_PIPELINE">CREATE_PIPELINE</option>
            <option value="CREATE_CUSTOM_FIELD">CREATE_CUSTOM_FIELD</option>
            <option value="IMPORT_CRM_DATA">IMPORT_CRM_DATA</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488] bg-white text-slate-700"
          >
            <option value="ALL">All Entities</option>
            <option value="LEAD">LEAD</option>
            <option value="DEAL">DEAL</option>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
            <p className="text-xs font-semibold">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No audit log entries matching criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            <div className="grid grid-cols-12 px-5 py-3 bg-[#F8FAFC] text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <div className="col-span-3">Timestamp & Actor</div>
              <div className="col-span-3">Action</div>
              <div className="col-span-2">Entity Target</div>
              <div className="col-span-3">Details / Changes</div>
              <div className="col-span-1 text-right">Status</div>
            </div>

            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="col-span-3">
                  <p className="text-xs font-bold text-slate-900">
                    {log.actorEmployeeId || log.actorUserId || 'System'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="col-span-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
                    {log.action}
                  </span>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-800">{log.entityType}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{log.entityId || '-'}</p>
                </div>

                <div className="col-span-3 text-[11px] text-slate-600 truncate">
                  {log.newData ? String(log.newData).slice(0, 75) + '...' : '-'}
                </div>

                <div className="col-span-1 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs text-slate-500">
          <span>
            Total: <span className="font-bold text-slate-800">{totalCount}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Previous
            </button>
            <span className="font-bold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
