'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const CrmReportsView: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('leads');
  const [preset, setPreset] = useState<string>('THIS_MONTH');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);

  const reportTypes = [
    { id: 'leads', label: 'Leads Directory', icon: Users },
    { id: 'lead-sources', label: 'Lead Sources', icon: TrendingUp },
    { id: 'salesperson-performance', label: 'Sales Rep Performance', icon: Users },
    { id: 'deals', label: 'Commercial Deals', icon: Briefcase },
    { id: 'opportunities', label: 'Opportunities', icon: TrendingUp },
    { id: 'won-lost', label: 'Won / Lost Analysis', icon: FileText },
    { id: 'revenue', label: 'Realized Revenue', icon: DollarSign },
    { id: 'client-acquisition', label: 'Client Acquisition', icon: Building2 },
    { id: 'follow-ups', label: 'Follow-ups Queue', icon: Calendar },
  ];

  const fetchReport = async (type = selectedType, selectedPreset = preset, pageNum = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/crm?type=${type}&preset=${selectedPreset}&page=${pageNum}&limit=25`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.report);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedType, preset, page);
  }, [selectedType, preset, page]);

  const handleDownloadCsv = () => {
    setDownloading(true);
    const url = `/api/reports/crm?type=${selectedType}&preset=${preset}&format=csv`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `growth_india_${selectedType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1000);
  };

  const rows = reportData?.rows || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hero-banner-interactive">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-growth-gold/20 text-growth-gold border border-growth-gold/30 rounded-full text-xs font-bold mb-2 chip-premium-highlight cursor-pointer">
            <FileText className="w-3.5 h-3.5" />
            <span>Operational & Financial Auditable Records</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight hero-title-interactive">CRM Executive Reports & Export</h1>
          <p className="text-xs text-slate-400 mt-1 hero-subtitle-interactive">
            Export compliant, audit-ready CSV reports for sales pipelines, deals, revenue, and salesperson activity.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          disabled={downloading || rows.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 self-start lg:self-center interactive-btn-hover"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Preparing CSV...' : 'Download CSV Report'}</span>
        </button>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {reportTypes.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedType(item.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all chip-premium-highlight ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-growth-gold' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Filter & Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 panel-premium">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Date Filter:</span>
          {reportData?.label && (
            <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 chip-premium-highlight">
              {reportData.label}
            </span>
          )}
          <span className="text-slate-400 ml-2">• Total Records: {reportData?.total ?? 0}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_MONTH', label: 'Last Month' },
            { id: 'THIS_QUARTER', label: 'This Quarter' },
            { id: 'THIS_YEAR', label: 'This Year' },
            { id: 'ALL_TIME', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPreset(item.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all crm-filter-pill ${
                preset === item.id
                  ? 'bg-growth-teal text-white shadow-sm active-pill'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => fetchReport(selectedType, preset, page)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors ml-1"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Data Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden panel-premium">
        {loading ? (
          <div className="flex items-center justify-center h-72">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
            <div className="text-sm font-bold text-slate-700">No records found for this report</div>
            <p className="text-xs text-slate-500">Try changing the date filter range above.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/75">
                    {columns.map((col) => (
                      <th key={col} className="py-3 px-4 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rows.map((row: any, idx: number) => (
                    <tr key={idx} className="interactive-row-hover hover:bg-slate-50/70 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="py-3 px-4 whitespace-nowrap text-slate-800">
                          {typeof row[col] === 'number' && col.toLowerCase().includes('inr')
                            ? `₹${Number(row[col]).toLocaleString()}`
                            : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {reportData && reportData.total > reportData.limit && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {(page - 1) * reportData.limit + 1} to{' '}
                  {Math.min(page * reportData.limit, reportData.total)} of {reportData.total} records
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-800">Page {page}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * reportData.limit >= reportData.total}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
