'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  ShieldAlert,
  ShieldCheck,
  Filter,
  RefreshCw,
  Building2,
  User,
  ArrowRight,
  Download,
} from 'lucide-react';

export const BlockHistoryView: React.FC = () => {
  const [histories, setHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (actionFilter) query.set('actionType', actionFilter);

      const res = await fetch(`/api/employees/block-history?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistories(data.histories || []);
      }
    } catch (e) {
      console.error('Error fetching block history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, actionFilter]);

  const blockCount = histories.filter((h) => h.actionType === 'BLOCK').length;
  const unblockCount = histories.filter((h) => h.actionType === 'UNBLOCK').length;

  const exportHistoryCSV = () => {
    const headers = [
      'Log ID',
      'Employee ID',
      'Employee Name',
      'Client Company',
      'Action Type',
      'Reason',
      'Remarks',
      'Action By Admin',
      'Action Date & Time',
      'Previous Status',
      'New Status',
    ];
    const rows = histories.map((h) => [
      h.id,
      h.employee?.employeeId || '',
      `"${h.employee?.fullName || ''}"`,
      `"${h.employee?.client?.companyName || 'Internal'}"`,
      h.actionType,
      `"${h.reason || ''}"`,
      `"${h.remarks || ''}"`,
      `"${h.actionBy || ''}"`,
      new Date(h.actionDate).toLocaleString(),
      h.previousStatus,
      h.newStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GrowthIndia_BlockHistory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-rose-600" />
            <span>Employee Block & Unblock Audit Log</span>
          </h1>
          <p className="text-xs text-slate-500">
            Immutable company-wide trail of all Employee Block and Unblock operations with reasons and authorized administrators
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportHistoryCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-xs"
            title="Export History to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric summary badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Recorded Actions</span>
            <span className="text-2xl font-black text-slate-900">{histories.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between bg-rose-50/30">
          <div>
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Total Block Actions</span>
            <span className="text-2xl font-black text-rose-700">{blockCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between bg-emerald-50/30">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Total Unblock Actions</span>
            <span className="text-2xl font-black text-emerald-700">{unblockCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Reason, Remarks, Admin Name, Employee Name, Employee ID, Client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
        >
          <option value="">All Action Types</option>
          <option value="BLOCK">🔴 BLOCK Actions</option>
          <option value="UNBLOCK">🟢 UNBLOCK Actions</option>
        </select>
      </div>

      {/* Main History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Employee ID & Name</th>
                <th className="py-3.5 px-4">Client / Company</th>
                <th className="py-3.5 px-4">Reason & Remarks</th>
                <th className="py-3.5 px-4">Status Transition</th>
                <th className="py-3.5 px-4">Authorized Admin</th>
                <th className="py-3.5 px-4 text-right">Date & Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-rose-600 mb-2" />
                    <p className="text-xs">Loading audit history...</p>
                  </td>
                </tr>
              ) : histories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No block/unblock history records found matching the criteria.
                  </td>
                </tr>
              ) : (
                histories.map((h) => {
                  const isBlock = h.actionType === 'BLOCK';
                  return (
                    <tr
                      key={h.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isBlock ? 'bg-rose-50/10' : 'bg-emerald-50/10'
                      }`}
                    >
                      {/* Action Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isBlock
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isBlock ? (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{h.actionType}</span>
                        </span>
                      </td>

                      {/* Employee ID & Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{h.employee?.fullName}</div>
                        <span className="font-mono text-[11px] font-semibold text-growth-teal">
                          {h.employee?.employeeId}
                        </span>
                      </td>

                      {/* Client / Company */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{h.employee?.client?.companyName || 'Internal Staff'}</span>
                        </div>
                      </td>

                      {/* Reason & Remarks */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-800">{h.reason}</div>
                        {h.remarks && (
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {h.remarks}
                          </div>
                        )}
                      </td>

                      {/* Status Transition */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg text-[11px] font-mono">
                          <span
                            className={
                              h.previousStatus === 'BLOCKED'
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-700 font-bold'
                            }
                          >
                            {h.previousStatus}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span
                            className={
                              h.newStatus === 'BLOCKED'
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-700 font-bold'
                            }
                          >
                            {h.newStatus}
                          </span>
                        </div>
                      </td>

                      {/* Authorized Admin */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap">
                        {h.actionBy}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(h.actionDate).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
