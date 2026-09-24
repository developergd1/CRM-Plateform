'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  Building2,
  Calendar,
  Clock,
  Phone,
  Mail,
  User,
  MapPin,
  Lock,
  FileCheck,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TimePicker12 } from '@/components/common/TimePicker12';
import { EmployeeCredentialsModal, EmployeeCredentialData } from './EmployeeCredentialsModal';

interface OnboardingWizardProps {
  onSuccess: (employee: any) => void;
  onCancel: () => void;
  initialClientId?: string;
  initialClientName?: string;
}

const STEPS = [
  { id: 1, name: 'Basic Info', desc: 'Personal details & contacts' },
  { id: 2, name: 'Employment', desc: 'Role, dept & terms' },
  { id: 3, name: 'Client Mapping', desc: 'Corporate assignment' },
  { id: 4, name: 'Shift & Policy', desc: 'Working hours & schedule' },
  { id: 5, name: 'Documents & KYC', desc: 'Identity verification' },
  { id: 6, name: 'Account & Access', desc: 'Portal login & credentials' },
  { id: 7, name: 'Review', desc: 'Verify onboarding packet' },
  { id: 8, name: 'Activate', desc: 'Generate ID & deploy' },
];

export const EmployeeOnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onSuccess,
  onCancel,
  initialClientId,
  initialClientName,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [createdCredentials, setCreatedCredentials] = useState<EmployeeCredentialData | null>(null);
  const [customGender, setCustomGender] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [customEmploymentType, setCustomEmploymentType] = useState('');
  const [customJobLocation, setCustomJobLocation] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic
    firstName: '',
    lastName: '',
    personalEmail: '',
    phone: '',
    gender: 'Male',
    dob: '',
    address: '',
    emergencyContact: '',
    emergencyName: '',

    // Step 2: Employment
    departmentName: 'Engineering',
    designation: '',
    employmentType: 'Full-Time',
    jobLocation: 'Headquarters',
    joiningDate: new Date().toISOString().split('T')[0],
    reportingManagerId: '',

    // Step 3: Client Assignment
    clientId: initialClientId || '',
    clientDesignation: '',
    assignmentStartDate: new Date().toISOString().split('T')[0],

    // Step 4: Shift & Policy
    shiftId: '',
    shiftStartTime: '10:00',
    shiftEndTime: '19:00',
    gracePeriodMinutes: 15,
    breakPolicy: 'Standard 60 minutes',

    // Step 5: Documents / KYC
    panNumber: '',
    aadharNumber: '',
    hasOfferLetter: true,
    hasNDA: true,

    // Step 6: Account & Access
    createLogin: true,
    loginEmail: '',
    role: 'EMPLOYEE',
    customPassword: '',

    // Internal draft id
    draftId: '',
  });

  useEffect(() => {
    if (initialClientId) {
      setFormData((prev) => ({ ...prev, clientId: initialClientId }));
    }
  }, [initialClientId]);

  useEffect(() => {
    // Load clients & shifts
    const loadPrerequisites = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/workforce/shifts'),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          setClients(cData.clients || []);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          setShifts(sData.shifts || []);
        }
      } catch (e) {}
    };
    loadPrerequisites();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleShiftSelect = (shiftId: string) => {
    const s = shifts.find((x) => x.id === shiftId);
    if (s) {
      setFormData((prev) => ({
        ...prev,
        shiftId,
        shiftStartTime: s.startTime,
        shiftEndTime: s.endTime,
        gracePeriodMinutes: s.gracePeriodMinutes,
      }));
    }
  };

  const effectiveGender = formData.gender === 'Other' ? (customGender.trim() || 'Other') : formData.gender;
  const effectiveDepartment = formData.departmentName === 'Other' ? (customDepartment.trim() || 'Other') : formData.departmentName;
  const effectiveEmploymentType = formData.employmentType === 'Other' ? (customEmploymentType.trim() || 'Other') : formData.employmentType;
  const effectiveJobLocation = formData.jobLocation === 'Other' ? (customJobLocation.trim() || 'Other') : formData.jobLocation;

  const handleSaveDraft = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gender: effectiveGender,
          departmentName: effectiveDepartment,
          employmentType: effectiveEmploymentType,
          jobLocation: effectiveJobLocation,
          fullName,
          isDraft: true,
          draftStep: currentStep,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setDraftSaved(true);
        if (json.draftId) {
          setFormData((prev) => ({ ...prev, draftId: json.draftId }));
        }
        setTimeout(() => setDraftSaved(false), 3000);
      } else {
        setErrorMsg(json.error || 'Failed to save draft');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!formData.firstName.trim() || !formData.phone.trim()) {
        setErrorMsg('First Name and Mobile Number are required.');
        return;
      }
      if (formData.gender === 'Other' && !customGender.trim()) {
        setErrorMsg('Please specify the custom gender / identity.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.designation.trim()) {
        setErrorMsg('Designation is required.');
        return;
      }
      if (formData.departmentName === 'Other' && !customDepartment.trim()) {
        setErrorMsg('Please specify the custom department name.');
        return;
      }
      if (formData.employmentType === 'Other' && !customEmploymentType.trim()) {
        setErrorMsg('Please specify the custom employment type.');
        return;
      }
      if (formData.jobLocation === 'Other' && !customJobLocation.trim()) {
        setErrorMsg('Please specify the custom work location.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 8));
  };

  const handleActivate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          gender: effectiveGender,
          departmentName: effectiveDepartment,
          employmentType: effectiveEmploymentType,
          jobLocation: effectiveJobLocation,
          fullName,
          email: formData.loginEmail || formData.personalEmail,
          isDraft: false,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.credentials) {
          setCreatedCredentials({
            ...json.credentials,
            isNewlyCreated: true,
          });
        } else {
          onSuccess(json);
        }
      } else {
        setErrorMsg(json.error || 'Failed to activate employee');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim() || 'New Employee';
  const selectedClient = clients.find((c) => c.id === formData.clientId || c.clientId === formData.clientId);

  if (createdCredentials) {
    return (
      <EmployeeCredentialsModal
        isOpen={true}
        credentials={createdCredentials}
        onClose={() => {
          setCreatedCredentials(null);
          onSuccess({ success: true, employee: { employeeId: createdCredentials.employeeId } });
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden select-none">
      {/* Wizard Header Bar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Onboard Employee Workflow</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
              Step {currentStep} of 8
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-step enterprise provisioning, KYC compliance & credential issuance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{draftSaved ? 'Draft Saved ✓' : 'Save Draft'}</span>
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
          >
            Exit Wizard
          </button>
        </div>
      </div>

      {/* Step Indicator Pills */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto scrollbar-thin">
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => s.id < currentStep && setCurrentStep(s.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              currentStep === s.id
                ? 'bg-teal-600 text-white shadow-xs'
                : currentStep > s.id
                ? 'bg-teal-50 text-teal-800'
                : 'bg-slate-100 text-slate-400 opacity-60'
            }`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              currentStep === s.id ? 'bg-white text-teal-700 font-black' : currentStep > s.id ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600'
            }`}>
              {currentStep > s.id ? <Check className="w-2.5 h-2.5" /> : s.id}
            </span>
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Wizard Body Content */}
      <div className="p-6 min-h-[380px]">
        {/* STEP 1: BASIC INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 1: Personal & Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Rahul"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Verma"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Personal Email</label>
                <input
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => handleChange('personalEmail', e.target.value)}
                  placeholder="rahul.verma@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => {
                    handleChange('gender', e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomGender('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other (Custom Gender / Identity)</option>
                </select>
                {formData.gender === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Gender / Identity *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Non-binary, Self-described..."
                      value={customGender}
                      onChange={(e) => setCustomGender(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white font-medium"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleChange('dob', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: EMPLOYMENT INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 2: Department, Designation & Position
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={formData.departmentName}
                  onChange={(e) => {
                    handleChange('departmentName', e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomDepartment('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="General Operations">General Operations</option>
                  <option value="Sales & Business Development">Sales & Business Development</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Other">Other (Custom Department)</option>
                </select>
                {formData.departmentName === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marketing, Quality Assurance, Legal..."
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white font-medium"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => {
                    handleChange('employmentType', e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomEmploymentType('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Intern">Intern</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Other">Other (Custom Employment Type)</option>
                </select>
                {formData.employmentType === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Employment Type *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Probationary, Freelance, Retainer..."
                      value={customEmploymentType}
                      onChange={(e) => setCustomEmploymentType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white font-medium"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Joining Date</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleChange('joiningDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Work Location</label>
                <select
                  value={formData.jobLocation}
                  onChange={(e) => {
                    handleChange('jobLocation', e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomJobLocation('');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                >
                  <option value="Headquarters">Headquarters</option>
                  <option value="Regional Branch Office">Regional Branch Office</option>
                  <option value="Remote / Work From Home">Remote / Work From Home</option>
                  <option value="Hybrid (Office & Remote)">Hybrid (Office & Remote)</option>
                  <option value="Client On-site">Client On-site</option>
                  <option value="Other">Other (Custom Location)</option>
                </select>
                {formData.jobLocation === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Work Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gurugram Tech Hub, Mumbai Office..."
                      value={customJobLocation}
                      onChange={(e) => setCustomJobLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CLIENT ASSIGNMENT */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 3: Corporate Client Mapping
            </h3>
            <p className="text-xs text-slate-500">
              Assign employee to a corporate client organization or designate as internal Growth India personnel.
            </p>
            <div className="space-y-4 pt-1">
              {initialClientId ? (
                <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-teal-800 tracking-wider">Associated Employer Organization</span>
                    <span className="text-[10px] font-mono font-bold bg-teal-600 text-white px-2 py-0.5 rounded">LOCKED TO CLIENT</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {initialClientName || selectedClient?.companyName || 'Corporate Client'}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        {selectedClient?.clientId || initialClientId}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-900 mt-2 font-medium">
                    This employee will be officially enrolled under your corporate entity. Sequential employee ID will be generated upon activation.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Corporate Client</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => handleChange('clientId', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                  >
                    <option value="">Internal Growth India Staff (No External Client)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.clientId})
                      </option>
                    ))}
                  </select>

                  {formData.clientId && (
                    <div className="mt-4 p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-teal-800">Assigned Client Scope</span>
                      <p className="text-xs text-teal-900 font-semibold">
                        Employee will be mapped to <strong>{selectedClient?.companyName}</strong>. Employee ID will adopt the corporate client code prefix (e.g. emp-{selectedClient?.companyName.substring(0,4).toLowerCase()}-XXXXX).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: SHIFT & POLICY */}
        {currentStep === 4 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 4: Shift Schedule & Punctuality Policy
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Shift Policy</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {shifts.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleShiftSelect(s.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        formData.shiftId === s.id
                          ? 'border-teal-500 bg-teal-50/70 ring-1 ring-teal-500 font-bold'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <h4 className="font-bold text-slate-900">{s.name}</h4>
                      <p className="font-mono text-teal-700 text-[11px] mt-1">{s.startTime} – {s.endTime}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Grace: {s.gracePeriodMinutes}m</span>
                    </div>
                  ))}
                  <div
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        shiftId: 'other_custom',
                      }));
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      formData.shiftId === 'other_custom' || (!shifts.some((s) => s.id === formData.shiftId) && formData.shiftId)
                        ? 'border-teal-500 bg-teal-50/70 ring-1 ring-teal-500 font-bold'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <h4 className="font-bold text-slate-900">Other (Custom Shift)</h4>
                    <p className="font-mono text-teal-700 text-[11px] mt-1">Manual Schedule</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Set hours below</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                  <TimePicker12
                    value={formData.shiftStartTime}
                    onChange={(val) => handleChange('shiftStartTime', val)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift End Time</label>
                  <TimePicker12
                    value={formData.shiftEndTime}
                    onChange={(val) => handleChange('shiftEndTime', val)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: DOCUMENTS & KYC */}
        {currentStep === 5 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 5: Identity KYC & Compliance Documentation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Will be masked automatically.</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
                <input
                  type="text"
                  value={formData.aadharNumber}
                  onChange={(e) => handleChange('aadharNumber', e.target.value)}
                  placeholder="1234 5678 9012"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Only last 4 digits stored unmasked.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 mt-2">
              <span className="text-xs font-bold text-slate-800">Compliance Document Checkpoints</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasOfferLetter}
                    onChange={(e) => handleChange('hasOfferLetter', e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Employment Offer Letter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasNDA}
                    onChange={(e) => handleChange('hasNDA', e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Non-Disclosure Agreement (NDA)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: ACCOUNT & ACCESS */}
        {currentStep === 6 && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 6: User Login & Security Credentials
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={formData.createLogin}
                  onChange={(e) => handleChange('createLogin', e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="createLogin" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Create dedicated user portal account for this employee
                </label>
              </div>

              {formData.createLogin && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Portal Login Email</label>
                    <input
                      type="email"
                      value={formData.loginEmail}
                      onChange={(e) => handleChange('loginEmail', e.target.value)}
                      placeholder={formData.personalEmail || 'auto-generated if empty'}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">Account Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                          let rand = '';
                          for (let i = 0; i < 4; i++) {
                            rand += chars.charAt(Math.floor(Math.random() * chars.length));
                          }
                          handleChange('customPassword', `Emp#${rand}${Math.floor(100 + Math.random() * 900)}`);
                        }}
                        className="text-[10px] font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.customPassword}
                        onChange={(e) => handleChange('customPassword', e.target.value)}
                        placeholder="Click Auto-Generate or enter custom"
                        className="w-full pl-3 pr-8 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title={showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW */}
        {currentStep === 7 && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Step 7: Onboarding Packet Review
            </h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Employee Name</span>
                <p className="font-bold text-slate-900">{fullName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{formData.phone} • {effectiveGender}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Designation & Dept</span>
                <p className="font-bold text-slate-900">{formData.designation}</p>
                <p className="text-slate-500 text-[11px]">{effectiveDepartment} • {effectiveEmploymentType} ({effectiveJobLocation})</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Client Organization</span>
                <p className="font-bold text-slate-900">{selectedClient?.companyName || 'Internal Staff'}</p>
                <p className="text-slate-500 text-[11px]">{selectedClient?.clientId || 'N/A'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Working Shift</span>
                <p className="font-bold text-teal-800 font-mono">{formData.shiftStartTime} – {formData.shiftEndTime}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Joining Date</span>
                <p className="font-bold text-slate-900">{formData.joiningDate}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">KYC Status</span>
                <p className="font-bold text-emerald-700">PAN & Aadhaar Checked</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: ACTIVATE */}
        {currentStep === 8 && (
          <div className="text-center py-8 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Ready to Deploy & Activate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Activating will generate an official sequential Employee ID, persist the record, initialize work session telemetry, and configure role-based access.
            </p>
            <div className="pt-2">
              <button
                onClick={handleActivate}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Generate Official ID & Activate Employee</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
          disabled={currentStep === 1 || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous Step</span>
        </button>

        {currentStep < 8 ? (
          <button
            onClick={handleNextStep}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>Proceed to Step {currentStep + 1}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
