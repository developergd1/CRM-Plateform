'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { HrmTenant, HrmTicket } from '@/lib/hrmStore';
import {
  LifeBuoy,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Sparkles,
  FileText,
  ShieldCheck,
  XCircle,
  Building2,
  Filter,
} from 'lucide-react';

interface HrmHelpdeskViewProps {
  currentTenant: HrmTenant;
}

interface HrFormalRequest {
  id: string;
  reqNumber: string;
  employeeId: string;
  employeeName: string;
  type: 'DOCUMENT_REQUEST' | 'EMPLOYMENT_VERIFICATION' | 'PROFILE_UPDATE' | 'SALARY_CERTIFICATE' | 'LEAVE_ADJUSTMENT' | 'OTHER';
  subject: string;
  description: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  rejectionReason?: string;
  resolvedAt?: string;
}

export const HrmHelpdeskView: React.FC<HrmHelpdeskViewProps> = ({ currentTenant }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'tickets'>('requests');
  const [tickets, setTickets] = useState<HrmTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<HrmTicket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);

  // Formal HR Requests state
  const [hrRequests, setHrRequests] = useState<HrFormalRequest[]>([
    {
      id: 'req-1',
      reqNumber: 'HR-REQ-000001',
      employeeId: 'GI-EMP-000002',
      employeeName: 'Aarav Sharma',
      type: 'EMPLOYMENT_VERIFICATION',
      subject: 'Bonafide Certificate for Visa Processing',
      description: 'Require official sealed employment bonafide letter for Schengen visa appointment.',
      status: 'APPROVED',
      createdAt: '2026-09-21',
      resolvedAt: '2026-09-22',
    },
    {
      id: 'req-2',
      reqNumber: 'HR-REQ-000002',
      employeeId: 'GI-EMP-000003',
      employeeName: 'Neha Gupta',
      type: 'SALARY_CERTIFICATE',
      subject: 'Salary Certificate for Home Loan Application',
      description: 'Require stamped last 3 months salary break-up letter for SBI home loan.',
      status: 'IN_REVIEW',
      createdAt: '2026-09-23',
    },
    {
      id: 'req-3',
      reqNumber: 'HR-REQ-000003',
      employeeId: 'GI-EMP-000004',
      employeeName: 'Rahul Verma',
      type: 'PROFILE_UPDATE',
      subject: 'Update Emergency Contact & Residence Address',
      description: 'Relocated to Sector 62, Noida. Updated Aadhaar proof attached.',
      status: 'PENDING',
      createdAt: '2026-09-24',
    },
  ]);

  // Request Form
  const [reqType, setReqType] = useState<HrFormalRequest['type']>('DOCUMENT_REQUEST');
  const [reqSubject, setReqSubject] = useState('');
  const [reqDescription, setReqDescription] = useState('');

  // Ticket Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'PAYROLL' | 'WORKPLACE' | 'LEAVE_ATTENDANCE' | 'IT_ASSETS' | 'GRIEVANCE'>('LEAVE_ATTENDANCE');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [description, setDescription] = useState('');

  // Comment state
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/helpdesk?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        // Ensure ticket numbers follow HR-TKT-XXXXXX format and fields are normalized
        const formattedTickets = (data.tickets || []).map((t: any) => ({
          ...t,
          ticketNumber: t.ticketNumber?.startsWith('HR-TKT-')
            ? t.ticketNumber
            : `HR-TKT-${(t.ticketNumber || '000001').replace(/\D/g, '').padStart(6, '0')}`,
          employeeName: t.employeeName || t.employee?.fullName || 'Staff Associate',
          employeeId: t.employee?.employeeId || t.employeeId,
          createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent',
          comments: (t.comments || []).map((c: any) => ({
            author: c.author || c.authorName || 'Staff',
            role: c.role || c.authorRole || 'HR',
            text: c.text || c.message || '',
            timestamp: c.timestamp || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Just now'),
          })),
        }));
        setTickets(formattedTickets);
        if (formattedTickets.length > 0 && !selectedTicket) {
          setSelectedTicket(formattedTickets[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentTenant]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSubject || !reqDescription) return;

    const nextNum = hrRequests.length + 1;
    const newReq: HrFormalRequest = {
      id: `req-${Date.now()}`,
      reqNumber: `HR-REQ-${String(nextNum).padStart(6, '0')}`,
      employeeId: user?.employeeId || 'GI-EMP-000001',
      employeeName: user?.fullName || 'Staff Associate',
      type: reqType,
      subject: reqSubject,
      description: reqDescription,
      status: 'PENDING',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setHrRequests([newReq, ...hrRequests]);
    setShowReqModal(false);
    setReqSubject('');
    setReqDescription('');
  };

  const handleUpdateRequestStatus = (reqId: string, newStatus: HrFormalRequest['status']) => {
    let rejectionReason: string | undefined = undefined;
    if (newStatus === 'REJECTED') {
      const reason = prompt('Please enter mandatory reason for rejecting this HR request:');
      if (!reason || reason.trim() === '') {
        alert('Rejection reason is required.');
        return;
      }
      rejectionReason = reason.trim();
    }

    setHrRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: newStatus,
              rejectionReason: rejectionReason || r.rejectionReason,
              resolvedAt: newStatus === 'APPROVED' || newStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : r.resolvedAt,
            }
          : r
      )
    );
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    try {
      const res = await fetch('/api/hrm/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user?.employeeId || user?.employeeProfile?.id || user?.id,
          category,
          priority,
          subject,
          description,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setSubject('');
        setDescription('');
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await fetch('/api/hrm/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'COMMENT',
          ticketId: selectedTicket.id,
          comment: replyText,
        }),
      });
      if (res.ok) {
        setReplyText('');
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">HR Requests & Helpdesk Center</h1>
            <span className="text-xs font-mono text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/30 px-2 py-0.5 rounded font-bold">
              {currentTenant.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Formal staff service requests (letters, salary verification) and confidential grievance ticketing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'requests' ? (
            <button
              onClick={() => setShowReqModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit HR Request</span>
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Domain Sub-tab Switcher */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Formal HR Requests ({hrRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tickets'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Helpdesk Tickets ({tickets.length})</span>
          </button>
        </div>
        <span className="text-[10px] font-mono text-slate-400 font-bold px-3 hidden sm:inline">
          {activeTab === 'requests' ? 'ID: HR-REQ-XXXXXX' : 'ID: HR-TKT-XXXXXX'}
        </span>
      </div>

      {/* VIEW 1: Formal HR Requests */}
      {activeTab === 'requests' ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Employee Service Requests Queue</h3>
            <span className="text-xs text-slate-400">Strictly tracked with reason audit logs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Request ID</th>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Subject & Context</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hrRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{req.reqNumber}</td>
                    <td className="px-6 py-3.5">
                      <p className="font-bold text-slate-900">{req.employeeName}</p>
                      <p className="font-mono text-[10px] text-slate-400">{req.employeeId}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {req.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 max-w-sm">
                      <p className="font-bold text-slate-900 line-clamp-1">{req.subject}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{req.description}</p>
                      {req.rejectionReason && (
                        <p className="text-[10px] text-rose-600 font-medium mt-0.5 italic">
                          Reason: {req.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {req.status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                          APPROVED
                        </span>
                      ) : req.status === 'IN_REVIEW' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                          IN REVIEW
                        </span>
                      ) : req.status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                          {req.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500 text-[11px]">{req.createdAt}</td>
                    <td className="px-6 py-3.5 text-right">
                      {req.status === 'PENDING' || req.status === 'IN_REVIEW' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, 'APPROVED')}
                            className="px-2.5 py-1 rounded bg-[#0D9488] hover:bg-[#0F766E] text-white text-[10px] font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(req.id, 'REJECTED')}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: Helpdesk & Grievance Tickets */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tickets Queue */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs flex flex-col h-[650px]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-slate-400">Tickets Queue</h3>
              <span className="text-xs font-mono text-[#0D9488] font-bold">{tickets.length} total</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 cursor-pointer transition-all space-y-2 text-xs ${
                      isSelected ? 'bg-[#0D9488]/10 border-l-4 border-[#0D9488]' : 'hover:bg-[#F0FDFA]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{t.ticketNumber}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          t.priority === 'HIGH' || t.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 line-clamp-1">{t.subject}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{t.employeeName}</span>
                      <span className="font-bold text-[#0D9488]">{t.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Ticket Conversation Thread */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs flex flex-col h-[650px]">
            {selectedTicket ? (
              <>
                {/* Ticket Top Meta */}
                <div className="p-5 border-b border-slate-100 space-y-2 bg-[#F0FDFA]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0D9488]">{selectedTicket.ticketNumber}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0D9488]/15 text-[#0D9488] text-[10px] font-black">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-xs text-slate-500">
                    Opened by <strong className="text-slate-800">{selectedTicket.employeeName}</strong> on {selectedTicket.createdAt}
                  </p>
                </div>

                {/* Messages Discussion Thread */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {(selectedTicket.comments || []).map((c, idx) => {
                    const isHr = c.role === 'HR' || c.role === 'HR Lead' || c.role === 'ADMIN_HR' || (c.role && c.role.includes('Administrator'));
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col space-y-1 ${isHr ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">{c.author}</span>
                          <span>• {c.role || 'Staff'}</span>
                          <span>• {c.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isHr
                              ? 'bg-[#0D9488] text-white rounded-tr-none'
                              : 'bg-slate-100 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          {c.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Form */}
                <form onSubmit={handleSendComment} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a response or update ticket resolution status..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                  <button
                    type="submit"
                    disabled={replying || !replyText.trim()}
                    className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
                <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">Select a ticket from the queue</p>
                <p className="text-slate-400 mt-1">Review employee grievance details and send resolution replies.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE FORMAL HR REQUEST MODAL */}
      {showReqModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Submit Formal HR Request</h3>
              <button onClick={() => setShowReqModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Request Category</label>
                <select
                  value={reqType}
                  onChange={(e: any) => setReqType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
                >
                  <option value="DOCUMENT_REQUEST">Document Request</option>
                  <option value="EMPLOYMENT_VERIFICATION">Employment Verification</option>
                  <option value="SALARY_CERTIFICATE">Salary Certificate</option>
                  <option value="PROFILE_UPDATE">Profile Update</option>
                  <option value="LEAVE_ADJUSTMENT">Leave Adjustment</option>
                  <option value="OTHER">Other HR Request</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request for No Objection Certificate (NOC)"
                  value={reqSubject}
                  onChange={(e) => setReqSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description & Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify timeline, purpose, or documents required..."
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Raise Grievance / Helpdesk Ticket</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overtime calculation missing from payslip"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
                  >
                    <option value="PAYROLL">Payroll & Salary</option>
                    <option value="LEAVE_ATTENDANCE">Leave & Time</option>
                    <option value="IT_ASSETS">Hardware / Assets</option>
                    <option value="WORKPLACE">Workplace Policy</option>
                    <option value="GRIEVANCE">Grievance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide background context for HR response..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
