'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  User,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { EmployeeItem } from '@/types';

interface ClientDocumentsViewProps {
  employees: EmployeeItem[];
  onRefresh?: () => void;
}

export const ClientDocumentsView: React.FC<ClientDocumentsViewProps> = ({ employees, onRefresh }) => {
  const { user } = useAuth();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Upload Form
  const [uploadEmpId, setUploadEmpId] = useState('');
  const [docType, setDocType] = useState('PAN_CARD');
  const [docTitle, setDocTitle] = useState('');
  const [fileName, setFileName] = useState('');

  const fetchDocsForEmployee = async (empId: string) => {
    if (!empId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${empId}/documents`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents || []);
      }
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].employeeId);
    }
  }, [employees]);

  useEffect(() => {
    if (selectedEmpId) {
      fetchDocsForEmployee(selectedEmpId);
    }
  }, [selectedEmpId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadEmpId || !docTitle) return;

    setUploading(true);
    try {
      const res = await fetch(`/api/employees/${uploadEmpId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          title: docTitle,
          fileName: fileName || `${docType.toLowerCase()}_${Date.now()}.pdf`,
        }),
      });

      if (res.ok) {
        setAlertMsg('Document uploaded to secure vault successfully.');
        setShowUploadModal(false);
        setDocTitle('');
        setFileName('');
        if (selectedEmpId === uploadEmpId) {
          fetchDocsForEmployee(uploadEmpId);
        } else {
          setSelectedEmpId(uploadEmpId);
        }
        if (onRefresh) onRefresh();
        setTimeout(() => setAlertMsg(null), 3500);
      } else {
        const json = await res.json();
        setAlertMsg(`Error: ${json.error || 'Failed to upload document'}`);
      }
    } catch (e) {
      setAlertMsg('Network error while uploading document.');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      !search ||
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.documentId?.toLowerCase().includes(search.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || doc.documentType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">Workforce Document Vault & KYC</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-growth-teal border border-teal-200">
              Verified Storage
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compliant document repository for employee ID proof, contracts, certificates, and compliance records.
          </p>
        </div>

        <button
          onClick={() => {
            setUploadEmpId(selectedEmpId || (employees[0]?.employeeId || ''));
            setShowUploadModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all self-start md:self-auto cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload KYC Document</span>
        </button>
      </div>

      {alertMsg && (
        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 font-bold shadow-sm animate-in fade-in">
          {alertMsg}
        </div>
      )}

      {/* Filter & Employee Selection Hub */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-600 shrink-0">Employee:</label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.employeeId}>
                {emp.fullName} ({emp.employeeId})
              </option>
            ))}
            {employees.length === 0 && <option value="">No employees found</option>}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search document title, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
          >
            <option value="">All Document Types</option>
            <option value="PAN_CARD">PAN Card</option>
            <option value="AADHAAR_CARD">Aadhaar Card</option>
            <option value="OFFER_LETTER">Offer Letter</option>
            <option value="EXPERIENCE_LETTER">Experience Letter</option>
            <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
            <option value="PASSPORT">Passport</option>
            <option value="OTHER">Other Compliance</option>
          </select>

          <button
            onClick={() => fetchDocsForEmployee(selectedEmpId)}
            disabled={loading}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh documents"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Document Records Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-growth-teal border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-bold">Querying document vault...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-slate-700">No Documents Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No verification or KYC documents uploaded for this staff member yet. Use the upload button above to add documents.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const isVerified = doc.verificationStatus === 'VERIFIED';
              return (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 hover:border-growth-teal/50 rounded-2xl p-4 shadow-sm space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {doc.documentId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        {isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>

                    <h4 className="font-black text-sm text-slate-900 truncate" title={doc.title}>
                      {doc.title}
                    </h4>

                    <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-bold text-slate-700">{doc.documentType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage Path:</span>
                        <span className="font-mono text-[10px] text-slate-600 truncate max-w-[160px]">{doc.fileStoragePath}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uploaded:</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[10px] font-mono">{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={() => alert(`Document stored securely at ${doc.fileStoragePath}`)}
                      className="flex items-center gap-1 text-growth-teal hover:underline font-bold text-[11px] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Upload KYC Document</h3>
                <p className="text-xs text-slate-500">Store verifiable documents in client vault</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Employee *</label>
                <select
                  required
                  value={uploadEmpId}
                  onChange={(e) => setUploadEmpId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Category *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="AADHAAR_CARD">Aadhaar Card</option>
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="EXPERIENCE_LETTER">Experience Letter</option>
                  <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="OTHER">Other Compliance / Contract</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Self-Attested PAN Copy"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Name (Reference)</label>
                <input
                  type="text"
                  placeholder="e.g. pan_card_verified.pdf"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {uploading ? 'Storing Document...' : 'Confirm Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
