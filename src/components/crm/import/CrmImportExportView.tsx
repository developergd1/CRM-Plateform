'use client';

import React, { useState } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Eye,
} from 'lucide-react';

export const CrmImportExportView: React.FC = () => {
  const [entity, setEntity] = useState<'leads' | 'accounts'>('leads');
  const [csvText, setCsvText] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const sampleLeadCsv = `Name,Company,Phone,Email,Source,Status,Priority
Anand Mehta,Mehta Tech Solutions,+91 9829012345,anand@mehtatech.com,WEBSITE,NEW,HIGH
Priya Verma,Verma Logistics,+91 9829098765,priya@vermalogistics.in,REFERRAL,QUALIFIED,MEDIUM
Rajesh Khanna,Khanna Textiles,+91 9811002244,rajesh@khannagroup.com,LINKEDIN,CONTACTED,HIGH`;

  const sampleAccountCsv = `Company Name,Industry,Phone,Email,City
Sunbeam Infotech,IT Services,+91 9811002233,contact@sunbeam.com,Jaipur
Rajasthan Marbles,Manufacturing,+91 9822003344,info@rajmarbles.in,Udaipur
Apex Healthcare,Pharmaceuticals,+91 9833004455,operations@apexhealth.in,Ahmedabad`;

  const handleDownloadTemplate = () => {
    const content = entity === 'leads' ? sampleLeadCsv : sampleAccountCsv;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${entity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvText(text);
        parsePreview(text);
      }
    };
    reader.readAsText(file);
  };

  const parsePreview = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setPreviewRows([]);
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const parsed = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || '';
        });
        return obj;
      });
      setPreviewRows(parsed);
    } catch (e) {
      setPreviewRows([]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setImporting(true);
    setError('');
    setSummary(null);

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV must contain a header line and at least one data row.');

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || '';
        });
        return obj;
      });

      const res = await fetch('/api/crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, rows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Error processing import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Import & Export Data Exchange Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bulk ingestion with pre-import validation, error checking, audit trail logging, and full commercial data extraction.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Center */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-sm font-black text-slate-900">Export Commercial Records (CSV)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Export standard UTF-8 CSV extracts containing live database snapshots for external reporting or offline audits.
          </p>

          <div className="space-y-2.5 pt-2">
            <a
              href="/api/crm/export?entity=leads"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] transition-colors text-xs font-bold text-slate-800 group"
            >
              <div>
                <p className="group-hover:text-[#0D9488]">Export Leads Master Directory</p>
                <p className="text-[10px] text-slate-400 font-normal">All active leads, stages, phones and emails</p>
              </div>
              <Download className="w-4 h-4 text-[#0D9488]" />
            </a>

            <a
              href="/api/crm/export?entity=accounts"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] transition-colors text-xs font-bold text-slate-800 group"
            >
              <div>
                <p className="group-hover:text-[#0D9488]">Export Commercial Accounts</p>
                <p className="text-[10px] text-slate-400 font-normal">Company profiles, industries, cities and contact details</p>
              </div>
              <Download className="w-4 h-4 text-[#0D9488]" />
            </a>

            <a
              href="/api/crm/export?entity=deals"
              className="flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] transition-colors text-xs font-bold text-slate-800 group"
            >
              <div>
                <p className="group-hover:text-[#0D9488]">Export Deals & Pipeline Ledger</p>
                <p className="text-[10px] text-slate-400 font-normal">Opportunity values, stages, win/loss statuses</p>
              </div>
              <Download className="w-4 h-4 text-[#0D9488]" />
            </a>
          </div>
        </div>

        {/* Import Center */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#0D9488]" />
              <h2 className="text-sm font-black text-slate-900">Bulk Ingestion Engine</h2>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-xs font-bold text-[#0D9488] hover:underline"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          <form onSubmit={handleImport} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Ingestion Entity</label>
              <select
                value={entity}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setEntity(val);
                  const sample = val === 'leads' ? sampleLeadCsv : sampleAccountCsv;
                  setCsvText(sample);
                  parsePreview(sample);
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488] font-medium"
              >
                <option value="leads">Leads (Name, Company, Phone, Email, Source)</option>
                <option value="accounts">Commercial Accounts (Company Name, Industry, Phone, Email, City)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Upload CSV File or Paste Raw Content</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = entity === 'leads' ? sampleLeadCsv : sampleAccountCsv;
                    setCsvText(sample);
                    parsePreview(sample);
                  }}
                  className="text-[11px] text-[#0D9488] font-bold hover:underline"
                >
                  Load Sample Data
                </button>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F0FDFA] file:text-[#0D9488] hover:file:bg-[#CCFBF1]/50 cursor-pointer mb-2"
              />

              <textarea
                rows={4}
                required
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parsePreview(e.target.value);
                }}
                placeholder="Paste CSV text here..."
                className="w-full font-mono text-[11px] p-2.5 rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
              />
            </div>

            {/* Validation Preview snippet */}
            {previewRows.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Eye className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Parsed Header Preview (Top {previewRows.length} rows detected)</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono overflow-x-auto whitespace-nowrap">
                  {Object.keys(previewRows[0]).join(' | ')}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {summary && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Import Executed Successfully</span>
                </div>
                <p className="text-[11px]">
                  Created: <span className="font-bold">{summary.created}</span> | Skipped:{' '}
                  <span className="font-bold">{summary.skipped}</span> | Errors:{' '}
                  <span className="font-bold">{summary.errors?.length || 0}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={importing || !csvText.trim()}
              className="w-full py-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Validate & Process CSV Import</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
