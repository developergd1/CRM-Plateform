'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  User,
  ExternalLink,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminOrHR } from '@/lib/rbac';

interface KycDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName?: string;
  category: string;
  title: string;
  fileUrl?: string;
  fileSize?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  expiryDate?: string;
}

const DOCUMENT_CATEGORIES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport / Voter ID',
  'Educational Degree / Certificates',
  'Relieving Letter / Experience',
  'Previous Payslips',
  'Bank Passbook / Cancelled Cheque',
  'Signed Offer Letter',
  'NDA / Employment Agreement',
  'Police Verification / Background Check',
];

export interface DocumentsKycViewProps {
  initialClientId?: string;
  hideClientFilter?: boolean;
}

export const DocumentsKycView: React.FC<DocumentsKycViewProps> = ({
  initialClientId,
  hideClientFilter = false,
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState(initialClientId || '');

  // Modals
  const [selectedDoc, setSelectedDoc] = useState<KycDocument | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (categoryFilter) query.set('category', categoryFilter);
      if (statusFilter) query.set('status', statusFilter);
      if (clientFilter) query.set('clientId', clientFilter);

      const res = await fetch(`/api/documents/kyc?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load KYC documents', err);
      showToast('Failed to load documents vault', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchClients();
  }, [categoryFilter, statusFilter, clientFilter]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/documents/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          status: verifyAction,
          rejectionReason: verifyAction === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (res.ok) {
        showToast(
          verifyAction === 'VERIFIED'
            ? 'Document successfully approved & verified'
            : 'Document rejected with compliance notes'
        );
        setIsVerifyModalOpen(false);
        setSelectedDoc(null);
        setRejectionReason('');
        fetchDocuments();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update document status', 'error');
      }
    } catch (err) {
      showToast('Network error during verification', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    return (
      doc.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      doc.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      doc.title.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getStatusBadge = (status: KycDocument['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertTriangle className="w-3 h-3 text-slate-500" />
            Expired
          </span>
        );
    }
  };

  // Quick stats
  const totalVerified = documents.filter((d) => d.status === 'VERIFIED').length;
  const totalPending = documents.filter((d) => d.status === 'PENDING').length;
  const totalRejected = documents.filter((d) => d.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 bg-rose-50 text-rose-800 border-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-growth-teal border border-teal-200 flex items-center justify-center font-bold shadow-sm shrink-0">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Document Repository & KYC Vault
              </h1>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-growth-teal border border-teal-200 font-bold">
                10 Statutory Categories
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Audit government IDs, academic credentials, compliance declarations, and verification lineage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-growth-teal' : ''}`} />
            <span>Refresh Vault</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Vault Files
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">{documents.length}</div>
          <span className="text-[11px] text-slate-500 font-medium">Uploaded documents</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Verified & Compliant
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-700 font-mono">{totalVerified}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Passed review</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Pending Audit
          </span>
          <div className="mt-2 text-2xl font-black text-amber-700 font-mono">{totalPending}</div>
          <span className="text-[11px] text-amber-600 font-medium">Requires verification</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
            Rejected / Incomplete
          </span>
          <div className="mt-2 text-2xl font-black text-rose-700 font-mono">{totalRejected}</div>
          <span className="text-[11px] text-rose-600 font-medium">Resubmission requested</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, ID or doc title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-growth-teal focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Categories (10 Types)</option>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Audit</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {!hideClientFilter && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-growth-teal cursor-pointer"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-xs animate-pulse">
            Loading document vault records...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Documents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No files match your selected filters. Documents uploaded during onboarding or by employees will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category & Document</th>
                  <th className="py-3 px-4">Client Company</th>
                  <th className="py-3 px-4">Uploaded Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification Audit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-growth-teal font-bold flex items-center justify-center text-xs">
                          {doc.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{doc.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{doc.employeeId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Title */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-extrabold text-slate-800 block">{doc.category}</span>
                        <span className="text-[11px] text-slate-500">{doc.title}</span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {doc.clientName || 'Growth India Core'}
                    </td>

                    {/* Upload Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>

                    {/* Verification Details */}
                    <td className="py-3.5 px-4">
                      {doc.status === 'VERIFIED' && doc.verifiedBy ? (
                        <div className="text-[10px] text-slate-500">
                          <span className="font-bold text-slate-700">Verified by:</span> {doc.verifiedBy}
                        </div>
                      ) : doc.status === 'REJECTED' && doc.rejectionReason ? (
                        <div className="text-[10px] text-rose-600 font-semibold line-clamp-1" title={doc.rejectionReason}>
                          Reason: {doc.rejectionReason}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Awaiting audit</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-growth-teal rounded-lg transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            onClick={() => showToast('Document file preview available in secure storage', 'success')}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-growth-teal rounded-lg transition-colors cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {isAdminOrHR(user?.role) && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setVerifyAction(doc.status === 'REJECTED' ? 'VERIFIED' : 'VERIFIED');
                              setIsVerifyModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-growth-teal border border-teal-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Review & Audit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Audit Modal */}
      {isVerifyModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Document Verification Review</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedDoc.category} &bull; {selectedDoc.employeeName}
                </p>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div>
                  <span className="text-slate-400 font-medium">Document Title:</span>{' '}
                  <span className="font-bold text-slate-800">{selectedDoc.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Uploaded Date:</span>{' '}
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date(selectedDoc.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Audit Decision *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                      verifyAction === 'VERIFIED'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="VERIFIED"
                      checked={verifyAction === 'VERIFIED'}
                      onChange={() => setVerifyAction('VERIFIED')}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve & Verify</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                      verifyAction === 'REJECTED'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={verifyAction === 'REJECTED'}
                      onChange={() => setVerifyAction('REJECTED')}
                      className="sr-only"
                    />
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject / Resubmit</span>
                  </label>
                </div>
              </div>

              {verifyAction === 'REJECTED' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Blurred document image, name discrepancy, expired document..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-growth-teal resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                    verifyAction === 'VERIFIED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoading ? 'Updating Audit...' : 'Commit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
