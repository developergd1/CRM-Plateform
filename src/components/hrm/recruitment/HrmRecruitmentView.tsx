'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { canConvertCandidate } from '@/lib/rbac';
import {
  Briefcase,
  Users,
  Plus,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Calendar,
  Sparkles,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { JobOpeningItem, CandidateItem, CandidateStage } from '@/types/hrm';

export const HrmRecruitmentView: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobOpeningItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [targetCandidate, setTargetCandidate] = useState<CandidateItem | null>(null);

  // Job form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobLocation, setJobLocation] = useState('Corporate HQ (Mumbai)');
  const [openPositions, setOpenPositions] = useState(1);
  const [departmentName, setDepartmentName] = useState('Technology & Engineering');

  // Candidate form state
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [candCompany, setCandCompany] = useState('');
  const [candCtc, setCandCtc] = useState(600000);
  const [candExp, setCandExp] = useState(3);

  // Conversion form state
  const [offeredCtc, setOfferedCtc] = useState(650000);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [converting, setConverting] = useState(false);

  const fetchRecruitment = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hrm/recruitment');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setCandidates(data.candidates || []);
        if (data.jobs?.length > 0 && !selectedJobId) {
          setSelectedJobId(data.jobs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitment();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle) return;

    try {
      const res = await fetch('/api/hrm/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          jobLocation,
          openPositions,
          departmentName,
          employmentType: 'FULL_TIME',
          experienceLevel: 'Mid-Level',
        }),
      });
      if (res.ok) {
        setShowJobModal(false);
        setJobTitle('');
        await fetchRecruitment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName || !candEmail || !candPhone || !selectedJobId) return;

    try {
      const res = await fetch('/api/hrm/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CANDIDATE',
          jobOpeningId: selectedJobId,
          fullName: candName,
          email: candEmail,
          phone: candPhone,
          currentCompany: candCompany,
          expectedCtc: candCtc,
          totalExperienceYears: candExp,
        }),
      });
      if (res.ok) {
        setShowCandidateModal(false);
        setCandName('');
        setCandEmail('');
        setCandPhone('');
        await fetchRecruitment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStageChange = async (candidateId: string, stage: CandidateStage) => {
    try {
      const res = await fetch('/api/hrm/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'STAGE_UPDATE',
          candidateId,
          stage,
        }),
      });
      if (res.ok) {
        await fetchRecruitment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertCandidate = async () => {
    if (!targetCandidate) return;
    try {
      setConverting(true);
      const res = await fetch(`/api/hrm/recruitment/candidates/${targetCandidate.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeredCtc,
          joiningDate,
          bankAccountNumber: bankAccount,
          bankIfscCode: ifscCode,
          panNumber,
        }),
      });
      if (res.ok) {
        setShowConvertModal(false);
        setTargetCandidate(null);
        await fetchRecruitment();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  const stages: { id: CandidateStage; label: string; color: string }[] = [
    { id: 'APPLIED', label: 'Applied', color: 'bg-slate-100 text-slate-700' },
    { id: 'SCREENING', label: 'Screening', color: 'bg-blue-100 text-blue-800' },
    { id: 'INTERVIEWING', label: 'Interviewing', color: 'bg-amber-100 text-amber-800' },
    { id: 'OFFERED', label: 'Offer Sent', color: 'bg-purple-100 text-purple-800' },
    { id: 'ACCEPTED', label: 'Hired / Converted', color: 'bg-emerald-100 text-emerald-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold mb-2 border border-[#0D9488]/20">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Talent Acquisition & ATS Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Recruitment & Candidate Pipeline</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage requisitions, applicant stages, interviews, and seamlessly convert accepted offers into official EMS Employee Master records.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchRecruitment()}
              className="p-2.5 border border-[#E2E8F0] rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowJobModal(true)}
              className="px-3.5 py-2.5 border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Opening</span>
            </button>
            <button
              onClick={() => setShowCandidateModal(true)}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>

        {/* Quick Openings Pill Ribbon */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#E5E7E2] overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Open Jobs:</span>
          {jobs.map((j) => (
            <div
              key={j.id}
              className="px-3 py-1.5 bg-[#F5F6F2] border border-[#E5E7E2] rounded-xl text-xs flex items-center gap-2 shrink-0"
            >
              <span className="font-bold text-[#111111]">{j.title}</span>
              <span className="text-[10px] text-slate-500">({j.openPositions} pos)</span>
            </div>
          ))}
        </div>
      </div>

      {/* ATS Pipeline Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage.id);
          return (
            <div key={stage.id} className="bg-[#F5F6F2] rounded-2xl p-4 border border-[#E5E7E2] flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2] mb-3">
                <span className="text-xs font-bold text-[#111111]">{stage.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.color}`}>
                  {stageCandidates.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {stageCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-[#E5E7E2] rounded-xl p-3.5 shadow-xs hover:border-[#0D9488] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-[#111111] text-xs">{c.fullName}</div>
                      <span className="text-[9px] font-mono text-slate-400">{c.candidateNumber}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {c.jobOpening?.title || 'Open Role'}
                    </p>

                    <div className="mt-2 text-[10px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-[#E5E7E2] flex items-center justify-between">
                      {stage.id !== 'ACCEPTED' && (
                        <div className="flex items-center gap-1">
                          {stage.id === 'APPLIED' && (
                            <button
                              onClick={() => handleStageChange(c.id, 'SCREENING')}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Screen &rarr;
                            </button>
                          )}
                          {stage.id === 'SCREENING' && (
                            <button
                              onClick={() => handleStageChange(c.id, 'INTERVIEWING')}
                              className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                            >
                              Interview &rarr;
                            </button>
                          )}
                          {stage.id === 'INTERVIEWING' && (
                            <button
                              onClick={() => handleStageChange(c.id, 'OFFERED')}
                              className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                            >
                              Offer &rarr;
                            </button>
                          )}
                          {stage.id === 'OFFERED' && (
                            <button
                              onClick={() => {
                                setTargetCandidate(c);
                                setShowConvertModal(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Convert to EMS</span>
                            </button>
                          )}
                        </div>
                      )}

                      {stage.id === 'ACCEPTED' && (
                        <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active in EMS</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONVERT CANDIDATE TO EMS EMPLOYEE MODAL */}
      {showConvertModal && targetCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E7E2] animate-fadeIn">
            <div className="flex items-center gap-2 pb-4 border-b border-[#E5E7E2]">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">Convert Candidate into EMS Employee Master</h3>
                <p className="text-xs text-slate-500">Atomic transition of talent from recruitment into workforce.</p>
              </div>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="p-3 bg-[#F5F6F2] rounded-xl border border-[#E5E7E2]">
                <p className="font-bold text-[#111111]">{targetCandidate.fullName}</p>
                <p className="text-slate-500">{targetCandidate.email} • {targetCandidate.phone}</p>
                <p className="text-[11px] font-semibold text-teal-700 mt-1">Designation: {targetCandidate.jobOpening?.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Agreed Annual CTC (₹)</label>
                  <input
                    type="number"
                    value={offeredCtc}
                    onChange={(e) => setOfferedCtc(Number(e.target.value))}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank Account Number (Optional for Payroll)</label>
                <input
                  type="text"
                  placeholder="e.g. 5010049281928"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="HDFC0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertCandidate}
                disabled={converting}
                className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{converting ? 'Provisioning...' : 'Provision EMS Employee'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE JOB OPENING MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Create Job Opening</h3>
            <p className="text-xs text-slate-500 mt-1">Publish new vacancy to internal talent acquisition pipeline.</p>

            <form onSubmit={handleCreateJob} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Open Positions</label>
                  <input
                    type="number"
                    min={1}
                    value={openPositions}
                    onChange={(e) => setOpenPositions(Number(e.target.value))}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  Publish Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CANDIDATE MODAL */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E5E7E2]">
            <h3 className="text-base font-bold text-[#111111]">Add Candidate</h3>
            <p className="text-xs text-slate-500 mt-1">Register a new applicant to an active job opening.</p>

            <form onSubmit={handleCreateCandidate} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Opening</label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title} ({j.jobLocation})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@example.com"
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Current Company</label>
                  <input
                    type="text"
                    value={candCompany}
                    onChange={(e) => setCandCompany(e.target.value)}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected CTC (₹)</label>
                  <input
                    type="number"
                    value={candCtc}
                    onChange={(e) => setCandCtc(Number(e.target.value))}
                    className="w-full p-2 border border-[#E5E7E2] rounded-xl focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[#E5E7E2]">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-3.5 py-2 border border-[#E5E7E2] rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
