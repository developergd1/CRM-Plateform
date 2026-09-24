'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LifeBuoy,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  X,
} from 'lucide-react';

export const EmployeeHelpdeskView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'tickets'>('requests');
  const [tickets, setTickets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReqModal, setShowReqModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [reqType, setReqType] = useState('PROFILE_UPDATE');
  const [reqSubject, setReqSubject] = useState('');
  const [reqDescription, setReqDescription] = useState('');

  const [ticketCategory, setTicketCategory] = useState('LEAVE_ATTENDANCE');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, tktRes] = await Promise.all([
        fetch('/api/hrm/requests'),
        fetch('/api/hrm/helpdesk'),
      ]);
      if (reqRes.ok) {
        const reqJson = await reqRes.json();
        setRequests(reqJson.requests || []);
      }
      if (tktRes.ok) {
        const tktJson = await tktRes.json();
        setTickets(tktJson.tickets || []);
      }
    } catch (e) {
      console.error('Error fetching helpdesk records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSubject || !reqDescription) return;

    try {
      const res = await fetch('/api/hrm/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CREATE',
          requestType: reqType,
          subject: reqSubject.trim(),
          description: reqDescription.trim(),
          employeeId: user?.employeeId,
          employeeName: user?.fullName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'HR formal request submitted successfully.' });
        setShowReqModal(false);
        setReqSubject('');
        setReqDescription('');
        fetchData();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to submit request.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error submitting request.' });
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDescription) return;

    try {
      const res = await fetch('/api/hrm/helpdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          description: ticketDescription.trim(),
          employeeId: user?.employeeId,
          employeeName: user?.fullName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Helpdesk support ticket created successfully.' });
        setShowTicketModal(false);
        setTicketSubject('');
        setTicketDescription('');
        fetchData();
      } else {
        setAlertMsg({ type: 'error', text: data.error || 'Failed to create ticket.' });
      }
    } catch (e) {
      setAlertMsg({ type: 'error', text: 'Network error creating ticket.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-bold text-growth-teal mb-2">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>EMPLOYEE SUPPORT & GRIEVANCE</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">HR Requests & Helpdesk Tickets</h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit official HR requests, address inquiries, and track tickets with HR and Management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-growth-teal' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          {activeTab === 'requests' ? (
            <button
              onClick={() => setShowReqModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New HR Request</span>
            </button>
          ) : (
            <button
              onClick={() => setShowTicketModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Ticket</span>
            </button>
          )}
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

      {/* Sub-Tabs: Formal Requests vs Helpdesk Tickets */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'requests'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Formal HR Requests ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tickets'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Support Tickets ({tickets.length})
        </button>
      </div>

      {/* List Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-growth-teal" />
            <span className="text-xs font-bold">Loading records...</span>
          </div>
        ) : activeTab === 'requests' ? (
          requests.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Formal HR Requests</h4>
              <p className="text-xs text-slate-500">
                You haven&apos;t submitted any formal HR requests yet. Click &quot;New HR Request&quot; to apply for documents, verifications, or updates.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        {req.reqNumber || req.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{req.subject}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{req.description}</p>
                    <span className="text-[10px] text-slate-400 block">
                      Type: <strong className="text-slate-600">{req.type?.replace(/_/g, ' ')}</strong> • Date: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-center shrink-0 ${
                      req.status === 'APPROVED' || req.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {req.status || 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">No Helpdesk Tickets</h4>
            <p className="text-xs text-slate-500">
              No active tickets found. Click &quot;Raise Ticket&quot; to report an issue or ask a question.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((tkt) => (
              <div
                key={tkt.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      {tkt.ticketId || tkt.id}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{tkt.subject}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{tkt.description}</p>
                  <span className="text-[10px] text-slate-400 block">
                    Category: <strong className="text-slate-600">{tkt.category}</strong> • Priority: <strong className="text-slate-600">{tkt.priority}</strong>
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-center shrink-0 ${
                    tkt.status === 'RESOLVED' || tkt.status === 'CLOSED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {tkt.status || 'OPEN'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Formal HR Request</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.fullName} • <span className="font-mono text-teal-700 font-bold">{user?.employeeId}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReqModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Request Type *</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:outline-none"
                >
                  <option value="PROFILE_UPDATE">Profile / Personal Detail Correction</option>
                  <option value="DOCUMENT_REQUEST">Document Request (Bonafide / Experience)</option>
                  <option value="EMPLOYMENT_VERIFICATION">Employment Verification</option>
                  <option value="SALARY_CERTIFICATE">Salary Certificate / Loan Proof</option>
                  <option value="LEAVE_ADJUSTMENT">Leave / Attendance Adjustment Inquiry</option>
                  <option value="OTHER">Other Official Request</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Request for Bonafide Certificate"
                  value={reqSubject}
                  onChange={(e) => setReqSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Explanation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide complete context and details for HR..."
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!reqSubject.trim() || !reqDescription.trim()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Raise Helpdesk Ticket</h3>
                  <p className="text-xs text-slate-500">Submit a support request to IT / HR operations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:outline-none"
                  >
                    <option value="LEAVE_ATTENDANCE">Leave / Attendance</option>
                    <option value="PAYROLL">Payroll / Salary</option>
                    <option value="WORKPLACE">Workplace / Facilities</option>
                    <option value="IT_ASSETS">IT / Hardware</option>
                    <option value="GRIEVANCE">General Grievance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority *</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:bg-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Issue with timesheet calculation"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the issue clearly..."
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!ticketSubject.trim() || !ticketDescription.trim()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Submit Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
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
