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
import { LeadConversionModal } from './LeadConversionModal';

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
  const [showConversionModal, setShowConversionModal] = useState(false);
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
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-slate-800 font-semibold">Lead not found</p>
        <Link href="/growthIndia/crm/leads" className="text-teal-600 text-sm hover:underline mt-2 block">
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
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* Top Navigation & Actions Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 panel-premium">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Back to Leads"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/growthIndia/crm/leads"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-growth-teal bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {lead.leadNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConf.bg} ${statusConf.color}`}>
                {statusConf.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityConf.bg} ${priorityConf.color}`}>
                {priorityConf.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{lead.fullName || lead.contactPerson}</h1>
            {lead.companyName && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{lead.companyName}</span>
                {lead.city && <span>• {lead.city}, {lead.state || 'India'}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Convert to Customer & Deal Button */}
          {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
            <button
              onClick={() => setShowConversionModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Convert to Customer & Deal
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
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
                  className="px-2 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 focus:outline-none"
                >
                  <option value="" disabled>
                    More transitions...
                  </option>
                  {allowedTransitions.slice(1).map((st) => (
                    <option key={st} value={st}>
                      {'->'} {st}
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-growth-teal" />
            Reassign Lead
          </button>

          {/* Schedule Follow-up */}
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-growth-orange" />
            Schedule Follow-up
          </button>

          {/* Log Activity */}
          <button
            onClick={() => setShowActivityModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>
        </div>
      </div>

      {/* State Machine / Progress Track */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm panel-premium">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
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
                    ? 'bg-teal-50 border-teal-500 text-growth-teal font-bold shadow-xs'
                    : isPast
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-growth-teal flex items-center justify-center font-bold text-sm">
              {lead.assignedTo?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Lead Representative</span>
              <p className="text-sm font-bold text-slate-900">
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-growth-orange">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Next Scheduled Follow-up</span>
              {lead.nextFollowUpAt ? (
                <>
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(lead.nextFollowUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">No follow-up pending</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="text-xs text-growth-orange hover:text-amber-700 font-bold cursor-pointer"
          >
            Schedule
          </button>
        </div>

        {/* Financial Potential & Score */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-growth-teal">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Estimated Deal Value</span>
              <p className="text-sm font-bold text-growth-teal font-mono">
                ₹{Number(lead.estimatedValue || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 font-semibold">Lead Score: {lead.leadScore || 0}/100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#0D9488]/10 text-growth-teal border border-[#0D9488]/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Overview & Intel
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-[#0D9488]/10 text-growth-teal border border-[#0D9488]/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Activities & Timeline ({lead.activities?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-[#0D9488]/10 text-growth-teal border border-[#0D9488]/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Stakeholders & Contacts ({lead.contacts?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'followups'
              ? 'bg-[#0D9488]/10 text-growth-teal border border-[#0D9488]/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Follow-ups ({lead.followUps?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-[#0D9488]/10 text-growth-teal border border-[#0D9488]/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Ownership Chain ({lead.assignments?.length || 0})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact & Location Info */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 panel-premium">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-growth-teal" />
              Contact & Communication
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Primary Phone</span>
                <span className="font-bold text-slate-900">{lead.phone}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Alternate Phone</span>
                <span className="text-slate-700">{lead.alternatePhone || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Email Address</span>
                <span className="text-slate-700">{lead.email || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">City / Location</span>
                <span className="text-slate-700">
                  {lead.city ? `${lead.city}, ${lead.state || ''}` : lead.location || 'Not specified'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Country</span>
                <span className="text-slate-700">{lead.country || 'India'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 font-medium">Lead Source</span>
                <span className="font-bold text-growth-teal bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {lead.source?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Company & Organization Details */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4 panel-premium">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-growth-teal" />
              Organization & Requirements
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Company Name</span>
                <span className="font-bold text-slate-900">{lead.companyName || 'Individual / Not registered'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Website</span>
                <span className="text-slate-700">{lead.website || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Industry Sector</span>
                <span className="text-slate-700">{lead.industry || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Linked Client Tenant</span>
                <span className="text-slate-700">
                  {lead.client ? `${lead.client.companyName} (${lead.client.clientId})` : 'Standalone Prospect'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Created On</span>
                <span className="text-slate-700">{new Date(lead.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 font-medium">Created By</span>
                <span className="text-slate-700">{lead.createdBy || 'SYSTEM'}</span>
              </div>
            </div>

            {lead.description && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-bold block mb-1">Notes & Scope:</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed whitespace-pre-wrap border border-slate-200">
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
            <h3 className="text-sm font-bold text-slate-900">Chronological Activities & Notes</h3>
            <button
              onClick={() => setShowActivityModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Activity
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm panel-premium">
            {lead.activities?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No activities logged yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {lead.activities.map((act: any) => (
                  <div key={act.id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-growth-teal -translate-x-1/2" />
                    <div className="flex-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{act.subject}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">{act.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-white text-growth-teal font-mono border border-slate-200 font-semibold">
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
            <h3 className="text-sm font-bold text-slate-900">Linked Stakeholders & Decision Makers</h3>
            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stakeholder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lead.contacts?.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white border border-slate-200/80 shadow-sm rounded-2xl text-xs text-slate-400">
                No individual stakeholders recorded for this lead yet.
              </div>
            ) : (
              lead.contacts.map((c: any) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm text-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{c.fullName}</h4>
                      <p className="text-slate-500">{c.designation || 'Key Contact'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.isDecisionMaker && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Decision Maker
                        </span>
                      )}
                      {c.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-slate-600 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {c.phone}
                    </p>
                    {c.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
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
            <h3 className="text-sm font-bold text-slate-900">Scheduled Follow-ups</h3>
            <button
              onClick={() => setShowFollowUpModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-growth-teal hover:bg-growth-tealDark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Follow-up
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Follow-up ID</th>
                  <th className="py-3 px-4">Title & Objective</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lead.followUps?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No follow-ups recorded for this lead.
                    </td>
                  </tr>
                ) : (
                  lead.followUps.map((flw: any) => (
                    <tr key={flw.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-growth-teal font-medium">
                        {flw.followUpNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{flw.title}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(flw.scheduledAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            flw.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : flw.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {flw.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{flw.assignedTo?.fullName || 'Unassigned'}</td>
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
                            className="px-2.5 py-1 rounded-lg bg-growth-teal hover:bg-growth-tealDark text-white text-[11px] font-semibold shadow-sm transition-all"
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
          <h3 className="text-sm font-bold text-slate-900">Lead Ownership & Reassignment Chain</h3>
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">From Representative</th>
                  <th className="py-3 px-4">To Representative</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lead.assignments?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Initial creation assignment only.
                    </td>
                  </tr>
                ) : (
                  lead.assignments.map((asg: any) => (
                    <tr key={asg.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(asg.assignedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {asg.fromEmployee ? asg.fromEmployee.fullName : 'None (Initial)'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-growth-teal">
                        {asg.toEmployee?.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{asg.assignedBy?.fullName || asg.assignedBy?.employeeId || 'Admin'}</td>
                      <td className="py-3 px-4 text-slate-500">{asg.assignmentReason || 'N/A'}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Transition Lead Status</h3>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Change status from <span className="font-semibold text-slate-900">{lead.status}</span> to{' '}
              <span className="font-semibold text-teal-700">{targetStatus}</span>.
            </p>

            {statusError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {statusError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Activity Note
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Detail reason for this status change..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs"
              >
                {updatingStatus ? 'Updating...' : `Confirm -> ${targetStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Lead Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Reassign Lead</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Transfer lead ownership to another active representative.
            </p>

            {assignError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {assignError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Representative <span className="text-rose-500">*</span>
              </label>
              <select
                value={reassignEmployeeId}
                onChange={(e) => setReassignEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reassignment Reason
              </label>
              <textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="e.g. Territory realignment or representative workload balance..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={reassigning}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassign}
                disabled={reassigning || !reassignEmployeeId}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50"
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Log CRM Activity</h3>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              >
                <option value="CALL">Call</option>
                <option value="MEETING">Meeting</option>
                <option value="EMAIL">Email</option>
                <option value="DEMO">Demo</option>
                <option value="NOTE">Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={activitySubject}
                onChange={(e) => setActivitySubject(e.target.value)}
                placeholder="e.g. Discovery call on workforce requirement"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
              <textarea
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                rows={3}
                placeholder="Meeting discussion notes..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                disabled={submittingActivity}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateActivity}
                disabled={submittingActivity || !activitySubject.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50"
              >
                {submittingActivity ? 'Saving...' : 'Save Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Schedule Follow-up</h3>
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Follow-up Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
                placeholder="e.g. Follow-up on pricing proposal"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Date & Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={followUpPriority}
                onChange={(e) => setFollowUpPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-600 transition-colors"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
              <textarea
                value={followUpRemarks}
                onChange={(e) => setFollowUpRemarks(e.target.value)}
                rows={2}
                placeholder="Specific objective or discussion point..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                disabled={submittingFollowUp}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFollowUp}
                disabled={submittingFollowUp || !followUpTitle.trim() || !followUpDate}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50"
              >
                {submittingFollowUp ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact to Lead Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Stakeholder to Lead</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sunita Patil"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={contactDesignation}
                onChange={(e) => setContactDesignation(e.target.value)}
                placeholder="e.g. VP Human Resources"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email ID"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-teal-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDmCheck"
                checked={isDecisionMaker}
                onChange={(e) => setIsDecisionMaker(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="isDmCheck" className="text-xs text-slate-700 cursor-pointer">
                Designate as Primary Decision Maker
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                disabled={submittingContact}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateContact}
                disabled={submittingContact || !contactName.trim() || !contactPhone.trim()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50"
              >
                {submittingContact ? 'Saving...' : 'Add Stakeholder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Conversion Modal */}
      <LeadConversionModal
        isOpen={showConversionModal}
        lead={lead}
        onClose={() => setShowConversionModal(false)}
        onSuccess={() => {
          setShowConversionModal(false);
          fetchLeadDetail();
        }}
      />
    </div>
  );
};
