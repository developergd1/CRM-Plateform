'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface TimesheetsViewProps {
  onSelectEmployee?: (empId: string) => void;
}

export const TimesheetsView: React.FC<TimesheetsViewProps> = ({ onSelectEmployee }) => {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'WEEKLY' | 'DAILY'>('MONTHLY');
  const [periodIdentifier, setPeriodIdentifier] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/workforce/timesheets?periodType=${periodType}&period=${periodIdentifier}`;
      if (selectedClientId && selectedClientId !== 'ALL') {
        url += `&clientId=${selectedClientId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTimesheets(json.timesheets || []);
      }
    } catch (e) {
      console.error('Error loading timesheets:', e);
    } finally {
      setLoading(false);
    }
  }, [periodType, periodIdentifier, selectedClientId]);

  useEffect(() => {
    fetchTimesheets();
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const json = await res.json();
          setClients(json.clients || []);
        }
      } catch (e) {}
    };
    fetchClients();
  }, [fetchTimesheets]);

  const handleApprove = async (timesheetId: string) => {
    setApprovingId(timesheetId);
    try {
      const res = await fetch('/api/workforce/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timesheetId }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionNotice(`Timesheet ${timesheetId} approved.`);
        fetchTimesheets();
        setTimeout(() => setActionNotice(null), 3500);
      }
    } catch (e) {}
    setApprovingId(null);
  };

  const filtered = timesheets.filter((t) => {
    const matchesSearch =
      !search ||
      t.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      t.employeeDisplayId?.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Workforce Timesheets & Hours Reconciliation
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade aggregation of scheduled, worked, break, and overtime hours with formal supervisor approval
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/export?type=TIMESHEETS&month=${periodIdentifier}${selectedClientId ? '&clientId=' + selectedClientId : ''}`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Timesheets CSV</span>
          </a>

          <button
            onClick={fetchTimesheets}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)}>×</button>
        </div>
      )}

      {/* Period Controls & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Period Type Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['MONTHLY', 'WEEKLY', 'DAILY'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPeriodType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === type ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'MONTHLY' ? 'Monthly' : type === 'WEEKLY' ? 'Weekly' : 'Daily'}
            </button>
          ))}
        </div>

        {/* Date / Month Picker */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {periodType === 'MONTHLY' ? (
            <input
              type="month"
              value={periodIdentifier}
              onChange={(e) => setPeriodIdentifier(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            />
          ) : (
            <input
              type="date"
              value={periodIdentifier}
              onChange={(e) => setPeriodIdentifier(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
            />
          )}
        </div>

        {/* Client Filter */}
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-teal-500 bg-white text-slate-700 font-semibold cursor-pointer"
        >
          <option value="">All Corporate Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName} ({c.clientId})
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff, ID, or department..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
          />
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Client / Dept</th>
                <th className="py-3 px-4 text-right">Scheduled</th>
                <th className="py-3 px-4 text-right">Worked</th>
                <th className="py-3 px-4 text-right">Break</th>
                <th className="py-3 px-4 text-right">Overtime</th>
                <th className="py-3 px-4 text-right">Approved</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Calculating verified hours for {periodIdentifier}...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No timesheet records found for this period.
                  </td>
                </tr>
              ) : (
                filtered.map((ts) => (
                  <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => onSelectEmployee?.(ts.employeeDisplayId)}
                        className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                      >
                        {ts.employeeName}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {ts.employeeDisplayId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{ts.clientName}</div>
                      <span className="text-[10px] text-slate-400">{ts.department}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-600">
                      {ts.scheduledHours}h
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-slate-900">
                      {ts.workedHours}h
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-slate-500">
                      {ts.breakHours}h
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-teal-700">
                      {ts.overtimeHours > 0 ? `+${ts.overtimeHours}h` : '0h'}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-right text-emerald-700">
                      {ts.approvedHours}h
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          ts.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ts.status === 'SUBMITTED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {ts.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {ts.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApprove(ts.timesheetId)}
                          disabled={approvingId === ts.timesheetId}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {approvingId === ts.timesheetId ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
