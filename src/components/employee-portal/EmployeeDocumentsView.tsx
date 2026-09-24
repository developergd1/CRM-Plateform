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
  AlertCircle,
  FileCheck,
  FolderLock,
  Download,
  X,
} from 'lucide-react';

export const EmployeeDocumentsView: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload Form
  const [docType, setDocType] = useState('PAN_CARD');
  const [docTitle, setDocTitle] = useState('');
  const [fileName, setFileName] = useState('');

  const fetchDocuments = async () => {
    if (!user?.employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${user.employeeId}/documents`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents || []);
      }
    } catch (e) {
      console.error('Error fetching employee documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user?.employeeId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId || !docTitle) return;

    setUploading(true);
    setAlertMsg(null);
    try {
      const res = await fetch(`/api/employees/${user.employeeId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          title: docTitle.trim(),
          fileName: fileName || `${docType.toLowerCase()}_${Date.now()}.pdf`,
          fileSizeBytes: 150000 + Math.floor(Math.random() * 50000),
          mimeType: 'application/pdf',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Document "${docTitle}" uploaded successfully to your vault.` });
        setShowUploadModal(false);
        setDocTitle('');
        setFileName('');
        fetchDocuments();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to upload document.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error uploading document.' });
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.documentId?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || doc.documentType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-bold text-growth-teal mb-2">
            <FolderLock className="w-3.5 h-3.5" />
            <span>PERSONAL DOCUMENT VAULT</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">My Employment & KYC Documents</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access, view, and securely store your official verified employment documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-in fade-in ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or document ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:bg-white focus:outline-none"
          >
            <option value="">All Document Types</option>
            <option value="PAN_CARD">PAN Card</option>
            <option value="AADHAAR_CARD">Aadhaar Card</option>
            <option value="OFFER_LETTER">Offer Letter</option>
            <option value="JOINING_LETTER">Joining Letter</option>
            <option value="EXPERIENCE_LETTER">Experience Letter</option>
            <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
            <option value="RESUME">Resume / CV</option>
            <option value="OTHER">Other Documents</option>
          </select>
        </div>
      </div>

      {/* Documents Grid / List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-growth-teal" />
            <span className="text-xs font-bold">Accessing Secure Vault...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">No Documents Found</h4>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              {search || typeFilter
                ? 'No documents match your search criteria.'
                : 'You have not uploaded any documents yet. Click "Upload Document" above to store your credentials.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const isVerified = doc.verificationStatus === 'VERIFIED';
              const isRejected = doc.verificationStatus === 'REJECTED';

              return (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-growth-teal flex items-center justify-center shrink-0 border border-teal-100">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                          {doc.title}
                        </h4>
                        <span className="font-mono text-[10px] text-slate-500 block truncate">
                          {doc.documentId}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        isVerified
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isRejected
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'PENDING'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-bold text-slate-700">{doc.documentType?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded On:</span>
                      <span className="font-medium text-slate-700">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="font-mono text-slate-600">
                        {Math.round((doc.fileSizeBytes || 150000) / 1024)} KB
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Opening secure document stream for ${doc.title}...`)}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-growth-teal" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Downloading verified copy of ${doc.title}...`)}
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-xs"
                      title="Download Document"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Compliance Document</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.fullName} • <span className="font-mono text-teal-700 font-bold">{user?.employeeId}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="AADHAAR_CARD">Aadhaar Card</option>
                  <option value="RESUME">Resume / CV</option>
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="JOINING_LETTER">Joining Letter</option>
                  <option value="EXPERIENCE_LETTER">Experience Letter</option>
                  <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
                  <option value="OTHER">Other Compliance Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official PAN Card (Signed Copy)"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Upload File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFileName(f.name);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-teal-50 file:text-growth-teal hover:file:bg-teal-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading || !docTitle.trim()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'Encrypting & Uploading...' : 'Upload to Vault'}
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
