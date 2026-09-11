'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  Send,
  Plus,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  FileText,
  MessageSquare,
  Shield,
  Layers,
  ChevronRight,
  Activity as ActivityIcon,
  X,
  History,
} from 'lucide-react';
import {
  LEAD_STATUS_CONFIG,
  LEAD_PRIORITY_CONFIG,
  LEAD_STATUS_TRANSITIONS,
  LeadStatus,
  LeadPriority,
} from '@/lib/constants/crm';

interface LeadDetailViewProps {
  leadId: string;
  onBack?: () => void;
  onCreateDeal?: (lead: any) => void;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({ leadId, onBack, onCreateDeal }) => {
  const router = useRouter();
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'contacts' | 'followups' | 'assignments'>('overview');

  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Reassignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [reassignEmployeeId, setReassignEmployeeId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Quick Activity Logging State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityType, setActivityType] = useState('CALL');
  const [activitySubject, setActivitySubject] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // Quick Follow-up Scheduling State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState('MEDIUM');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Quick Add Contact State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isDecisionMaker, setIsDecisionMaker] = useState(false);
  const [submittingContact, setSubmittingContact] = useState(false);

  const fetchLeadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`);
      if (res.ok) {
        const json = await res.json();
        setLead(json.data || null);
      } else if (res.status === 404) {
        router.push('/growthIndia/crm/leads');
      }
    } catch (err) {
      console.error('Failed to fetch lead details:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?limit=100');
      if (res.ok) {
        const json = await res.json();
        setEmployees(json.data || json.employees || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: statusReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status');
      }
      setShowStatusModal(false);
      fetchLeadDetail();
    } catch (err: any) {
      setStatusError(err.message || 'Status transition error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignEmployeeId) return;

    setReassigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmployeeId: reassignEmployeeId, reason: reassignReason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to reassign lead');
      }
      setShowAssignModal(false);
      fetchLeadDetail();
    } catch (err: any) {
      setAssignError(err.message || 'Reassignment error');
    } finally {
      setReassigning(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activitySubject.trim()) return;
    setSubmittingActivity(true);
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activityType,
          subject: activitySubject.trim(),
          description: activityDesc.trim(),
          status: 'COMPLETED',
          leadId: lead.id,
          clientId: lead.clientId,
        }),
      });
      if (res.ok) {
        setShowActivityModal(false);
        setActivitySubject('');
        setActivityDesc('');
        fetchLeadDetail();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingActivity(false);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle.trim() || !followUpDate) return;
    setSubmittingFollowUp(true);
    try {
      const res = await fetch('/api/crm/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: followUpTitle.trim(),
          scheduledAt: new Date(followUpDate).toISOString(),
          remarks: followUpRemarks.trim(),
          priority: followUpPriority,
          leadId: lead.id,
          assignedToId: lead.assignedToId,
        }),
      });
      if (res.ok) {
        setShowFollowUpModal(false);
        setFollowUpTitle('');
        setFollowUpDate('');
        setFollowUpRemarks('');
        fetchLeadDetail();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setSubmittingContact(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contactName.trim(),
          designation: contactDesignation.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
          isDecisionMaker,
          leadId: lead.id,
          clientId: lead.clientId,
        }),
      });
      if (res.ok) {
        setShowContactModal(false);
        setContactName('');
        setContactDesignation('');
        setContactPhone('');
        setContactEmail('');
        setIsDecisionMaker(false);
        fetchLeadDetail();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex items-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-teal-400" />
          Loading 360° Lead Intelligence...
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-white font-semibold">Lead not found</p>
        <Link href="/growthIndia/crm/leads" className="text-teal-400 text-sm hover:underline mt-2 block">
          Return to Leads Directory
        </Link>
      </div>
    );
  }

  const statusConf = LEAD_STATUS_CONFIG[lead.status as LeadStatus] || {
    label: lead.status,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
  };
  const priorityConf = LEAD_PRIORITY_CONFIG[lead.priority as LeadPriority] || {
    label: lead.priority,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
  };
  const allowedTransitions = LEAD_STATUS_TRANSITIONS[lead.status as LeadStatus] || [];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Back to Leads"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/growthIndia/crm/leads"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                {lead.leadNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConf.bg} ${statusConf.color}`}>
                {statusConf.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityConf.bg} ${priorityConf.color}`}>
                {priorityConf.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">{lead.fullName || lead.contactPerson}</h1>
            {lead.companyName && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {lead.companyName}
                {lead.city && <span>• {lead.city}, {lead.state || 'India'}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Convert to Deal / Opportunity Button */}
          {['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONTACTED'].includes(lead.status) && (
            <button
              onClick={() => {
                if (onCreateDeal) {
                  onCreateDeal(lead);
                } else {
                  router.push(`/growthIndia/crm/deals?leadId=${lead.id}`);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
            >
              <DollarSign className="w-4 h-4" />
              Convert to Deal
            </button>
          )}

          {/* Advance Status Dropdown */}
          {allowedTransitions.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setTargetStatus(allowedTransitions[0]);
                  setShowStatusModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
              >
                Advance: {allowedTransitions[0]}
              </button>
              {allowedTransitions.length > 1 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setTargetStatus(e.target.value);
                      setShowStatusModal(true);
                    }
                  }}
                  className="px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="" disabled>
                    More transitions...
                  </option>
                  {allowedTransitions.slice(1).map((st) => (
                    <option key={st} value={st}>
                      ➔ {st}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Reassign Button */}
          <button
            onClick={() => {
              fetchEmployees();
              setShowAssignModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4 text-teal-400" />
            Reassign Lead
          </button>

          {/* Schedule Follow-up */}
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            Schedule Follow-up
          </button>

          {/* Log Activity */}
          <button
            onClick={() => setShowActivityModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>
        </div>
      </div>

      {/* State Machine / Progress Track */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <span>Lifecycle Progression</span>
          <span>Lead Flow State Machine</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED'].map((st, idx) => {
            const isCurrent = lead.status === st;
            const isPast =
              (lead.status === 'CONTACTED' && idx === 0) ||
              (lead.status === 'QUALIFIED' && idx <= 1) ||
              (lead.status === 'CONVERTED' && idx <= 3);

            return (
              <div
                key={st}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 font-bold'
                    : isPast
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-600'
                }`}
              >
                <p className="text-[10px] tracking-wider uppercase font-mono">Stage 0{idx + 1}</p>
                <p className="text-xs font-semibold">{st.replace(/_/g, ' ')}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Owner & Follow-up Alert Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assignee Card */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-sm">
              {lead.assignedTo?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Lead Representative</span>
              <p className="text-sm font-semibold text-white">
                {lead.assignedTo ? lead.assignedTo.fullName : 'Unassigned'}
              </p>
              {lead.assignedTo && (
                <p className="text-[11px] text-slate-400 font-mono">{lead.assignedTo.employeeId}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              fetchEmployees();
              setShowAssignModal(true);
            }}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium"
          >
            Change
          </button>
        </div>

        {/* Next Follow-Up */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Next Scheduled Follow-up</span>
              {lead.nextFollowUpAt ? (
                <>
                  <p className="text-sm font-semibold text-white">
                    {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(lead.nextFollowUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 italic">No follow-up pending</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
          >
            Schedule
          </button>
        </div>

        {/* Financial Potential & Score */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Estimated Deal Value</span>
              <p className="text-sm font-semibold text-emerald-400">
                ₹{Number(lead.estimatedValue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Lead Score: {lead.leadScore || 0}/100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview & Intel
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'timeline'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Activities & Timeline ({lead.activities?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'contacts'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Stakeholders & Contacts ({lead.contacts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'followups'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Follow-ups ({lead.followUps?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'assignments'
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Ownership Chain ({lead.assignments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact & Location Info */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-400" />
              Contact & Communication
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Primary Phone</span>
                <span className="font-semibold text-white">{lead.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Alternate Phone</span>
                <span className="text-slate-300">{lead.alternatePhone || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Email Address</span>
                <span className="text-slate-300">{lead.email || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">City / Location</span>
                <span className="text-slate-300">
                  {lead.city ? `${lead.city}, ${lead.state || ''}` : lead.location || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Country</span>
                <span className="text-slate-300">{lead.country || 'India'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Lead Source</span>
                <span className="font-semibold text-teal-400">{lead.source?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Company & Organization Details */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              Organization & Requirements
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Company Name</span>
                <span className="font-semibold text-white">{lead.companyName || 'Individual / Not registered'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Website</span>
                <span className="text-slate-300">{lead.website || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Industry Sector</span>
                <span className="text-slate-300">{lead.industry || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Linked Client Tenant</span>
                <span className="text-slate-300">
                  {lead.client ? `${lead.client.companyName} (${lead.client.clientId})` : 'Standalone Prospect'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Created On</span>
                <span className="text-slate-300">{new Date(lead.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Created By</span>
                <span className="text-slate-300">{lead.createdBy || 'SYSTEM'}</span>
              </div>
            </div>

            {lead.description && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Notes & Scope:</span>
                <p className="text-slate-300 bg-slate-800/60 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {lead.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Activities & Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Chronological Activities & Notes</h3>
            <button
              onClick={() => setShowActivityModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Activity
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            {lead.activities?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No activities logged yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                {lead.activities.map((act: any) => (
                  <div key={act.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-teal-500 -translate-x-1/2" />
                    <div className="flex-1 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{act.subject}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-slate-400 mt-1 whitespace-pre-wrap">{act.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/40 text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-teal-400 font-mono">
                          {act.type}
                        </span>
                        {act.performedBy && <span>By {act.performedBy.fullName}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Stakeholders & Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Linked Stakeholders & Decision Makers</h3>
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stakeholder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lead.contacts?.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-500">
                No individual stakeholders recorded for this lead yet.
              </div>
            ) : (
              lead.contacts.map((c: any) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{c.fullName}</h4>
                      <p className="text-slate-400">{c.designation || 'Key Contact'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.isDecisionMaker && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Decision Maker
                        </span>
                      )}
                      {c.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-slate-300 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {c.phone}
                    </p>
                    {c.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {c.email}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Scheduled Follow-ups</h3>
            <button
              onClick={() => setShowFollowUpModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Follow-up
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Follow-up ID</th>
                  <th className="py-3 px-4">Title & Objective</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lead.followUps?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No follow-ups recorded for this lead.
                    </td>
                  </tr>
                ) : (
                  lead.followUps.map((flw: any) => (
                    <tr key={flw.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-teal-400 font-medium">
                        {flw.followUpNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{flw.title}</td>
                      <td className="py-3 px-4">
                        {new Date(flw.scheduledAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            flw.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : flw.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {flw.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{flw.assignedTo?.fullName || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-right">
                        {flw.status === 'PENDING' && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/crm/followups/${flw.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'COMPLETED' }),
                              });
                              fetchLeadDetail();
                            }}
                            className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-medium"
                          >
                            Mark Complete
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
      )}

      {/* Tab 5: Ownership Chain */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">Lead Ownership & Reassignment Chain</h3>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">From Representative</th>
                  <th className="py-3 px-4">To Representative</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lead.assignments?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Initial creation assignment only.
                    </td>
                  </tr>
                ) : (
                  lead.assignments.map((asg: any) => (
                    <tr key={asg.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(asg.assignedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {asg.fromEmployee ? asg.fromEmployee.fullName : 'None (Initial)'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-teal-400">
                        {asg.toEmployee?.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{asg.assignedBy?.fullName || asg.assignedBy?.employeeId || 'Admin'}</td>
                      <td className="py-3 px-4 text-slate-400">{asg.assignmentReason || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Transition Lead Status</h3>
            <p className="text-xs text-slate-400">
              Change status from <span className="font-semibold text-white">{lead.status}</span> to{' '}
              <span className="font-semibold text-teal-400">{targetStatus}</span>.
            </p>

            {statusError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {statusError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason / Activity Note
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Detail reason for this status change..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20"
              >
                {updatingStatus ? 'Updating...' : `Confirm -> ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Lead Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reassign Lead</h3>
            <p className="text-xs text-slate-400">
              Transfer lead ownership to another active representative.
            </p>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {assignError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Representative <span className="text-rose-400">*</span>
              </label>
              <select
                value={reassignEmployeeId}
                onChange={(e) => setReassignEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reassignment Reason
              </label>
              <textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="e.g. Territory realignment or representative workload balance..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={reassigning}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassign}
                disabled={reassigning || !reassignEmployeeId}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Log CRM Activity</h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="CALL">Call</option>
                <option value="MEETING">Meeting</option>
                <option value="EMAIL">Email</option>
                <option value="DEMO">Demo</option>
                <option value="NOTE">Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Subject / Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={activitySubject}
                onChange={(e) => setActivitySubject(e.target.value)}
                placeholder="e.g. Discovery call on workforce requirement"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
              <textarea
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                rows={3}
                placeholder="Meeting discussion notes..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                disabled={submittingActivity}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateActivity}
                disabled={submittingActivity || !activitySubject.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submittingActivity ? 'Saving...' : 'Save Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Schedule Follow-up</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Follow-up Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                placeholder="e.g. Follow-up on pricing proposal"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Scheduled Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={followUpPriority}
                onChange={(e) => setFollowUpPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Remarks</label>
              <textarea
                value={followUpRemarks}
                onChange={(e) => setFollowUpRemarks(e.target.value)}
                rows={2}
                placeholder="Specific objective or discussion point..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                disabled={submittingFollowUp}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFollowUp}
                disabled={submittingFollowUp || !followUpTitle.trim() || !followUpDate}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submittingFollowUp ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact to Lead Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Stakeholder to Lead</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sunita Patil"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={contactDesignation}
                onChange={(e) => setContactDesignation(e.target.value)}
                placeholder="e.g. VP Human Resources"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email ID</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email ID"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDmCheck"
                checked={isDecisionMaker}
                onChange={(e) => setIsDecisionMaker(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-0"
              />
              <label htmlFor="isDmCheck" className="text-xs text-slate-300 cursor-pointer">
                Designate as Primary Decision Maker
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                disabled={submittingContact}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateContact}
                disabled={submittingContact || !contactName.trim() || !contactPhone.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submittingContact ? 'Saving...' : 'Add Stakeholder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
