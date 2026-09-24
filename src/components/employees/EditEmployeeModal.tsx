'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Building2, User, Phone, Mail, MapPin, Calendar, FileText, Sparkles, KeyRound, Eye, EyeOff, Clock } from 'lucide-react';
import { EmployeeCredentialsModal, EmployeeCredentialData } from './EmployeeCredentialsModal';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { TimePicker12, formatTo12Hour } from '@/components/common/TimePicker12';
import { ClientItem } from '@/types';
import { useModalScroll } from '@/hooks/useModalScroll';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onEmployeeUpdated: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}) => {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherMotherName, setFatherMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [customGender, setCustomGender] = useState('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsTemporary, setSameAsTemporary] = useState(false);
  const [departmentName, setDepartmentName] = useState('General Operations');
  const [customDepartment, setCustomDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [jobLocation, setJobLocation] = useState('Headquarters');
  const [customJobLocation, setCustomJobLocation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [customEmploymentType, setCustomEmploymentType] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('10:00');
  const [shiftEndTime, setShiftEndTime] = useState('19:00');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatedCredentials, setUpdatedCredentials] = useState<EmployeeCredentialData | null>(null);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(`Emp#${rand}${Math.floor(10 + Math.random() * 90)}`);
    setShowPassword(true);
  };

  useEffect(() => {
    if (isOpen) {
      // Fetch clients for dropdown
      fetch('/api/clients')
        .then((res) => res.json())
        .then((data) => {
          if (data.clients) setClients(data.clients);
        })
        .catch(() => {});

      if (employee) {
        setClientId(employee.clientId || '');
        setFullName(employee.fullName || '');
        setFatherMotherName(employee.fatherMotherName || '');
        setDob(employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '');

        const empGender = employee.gender || 'Male';
        if (empGender === 'Male' || empGender === 'Female') {
          setGender(empGender);
          setCustomGender('');
        } else {
          setGender('Other');
          setCustomGender(empGender === 'Other' ? '' : empGender);
        }

        setPhone(employee.phone || '');
        setPersonalEmail(employee.personalEmail || employee.user?.email || '');
        setPanNumber(employee.panNumber || '');
        setAadharNumber(employee.aadhaarMasked || employee.aadharNumber || '');

        let tempAddr = '';
        let permAddr = '';
        const rawAddr = employee.address || '';
        if (rawAddr.includes('Temporary:') || rawAddr.includes('Permanent:')) {
          const matchTemp = rawAddr.match(/Temporary:\s*([\s\S]*?)(?=\nPermanent:|$)/i);
          const matchPerm = rawAddr.match(/Permanent:\s*([\s\S]*$)/i);
          tempAddr = matchTemp ? matchTemp[1].trim() : '';
          permAddr = matchPerm ? matchPerm[1].trim() : '';
        } else {
          tempAddr = rawAddr;
          permAddr = rawAddr;
        }
        setTemporaryAddress(tempAddr);
        setPermanentAddress(permAddr);
        setSameAsTemporary(Boolean(tempAddr && tempAddr === permAddr));

        const standardDepartments = ['Engineering', 'General Operations', 'Sales & Business Development', 'Human Resources', 'Logistics & Supply Chain', 'Finance & Accounts'];
        const empDept = employee.departmentName || employee.department?.name || 'General Operations';
        if (standardDepartments.includes(empDept)) {
          setDepartmentName(empDept);
          setCustomDepartment('');
        } else {
          setDepartmentName('Other');
          setCustomDepartment(empDept);
        }
        setDesignation(employee.designation || '');
        const standardLocations = ['Headquarters', 'Regional Branch Office', 'Remote / Work From Home', 'Hybrid (Office & Remote)', 'Client On-site'];
        const empLoc = employee.jobLocation || employee.location || 'Headquarters';
        if (standardLocations.includes(empLoc)) {
          setJobLocation(empLoc);
          setCustomJobLocation('');
        } else {
          setJobLocation('Other');
          setCustomJobLocation(empLoc);
        }
        setJoiningDate(employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '');
        const standardEmploymentTypes = ['Full-Time', 'Contract', 'Part-Time', 'Freelancer', 'Intern', 'Consultant'];
        if (employee.employmentType && !standardEmploymentTypes.includes(employee.employmentType)) {
          setEmploymentType('Other');
          setCustomEmploymentType(employee.employmentType);
        } else {
          setEmploymentType(employee.employmentType || 'Full-Time');
          setCustomEmploymentType('');
        }
        setRemarks(employee.remarks || '');
        setStatus(employee.status || 'ACTIVE');
        setShiftStartTime(employee.shiftStartTime || '10:00');
        setShiftEndTime(employee.shiftEndTime || '19:00');
        setCustomPassword('');
        setShowPassword(false);
      }
    }
  }, [isOpen, employee]);

  const scrollRef = useModalScroll<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !designation) {
      setErrorMsg('Full Name, Phone Number, and Designation are required.');
      return;
    }

    if (customPassword.trim() && customPassword.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const finalAddress = temporaryAddress && permanentAddress
      ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
      : (temporaryAddress || permanentAddress || '');

    const finalGender = gender === 'Other' ? (customGender.trim() || 'Other') : gender;
    const finalEmploymentType = employmentType === 'Other' ? (customEmploymentType.trim() || 'Other') : employmentType;
    const finalDepartment = departmentName === 'Other' ? (customDepartment.trim() || 'Other') : departmentName;
    const finalJobLocation = jobLocation === 'Other' ? (customJobLocation.trim() || 'Other') : jobLocation;

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || null,
          fullName,
          fatherMotherName,
          dob: dob || null,
          gender: finalGender,
          phone,
          personalEmail,
          panNumber,
          aadharNumber,
          address: finalAddress,
          temporaryAddress,
          permanentAddress,
          departmentName: finalDepartment,
          designation,
          jobLocation: finalJobLocation,
          joiningDate: joiningDate || null,
          employmentType: finalEmploymentType,
          shiftStartTime,
          shiftEndTime,
          remarks,
          status: employee.status === 'BLOCKED' ? 'BLOCKED' : status,
          customPassword: customPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onEmployeeUpdated();
        if (customPassword.trim()) {
          const selectedClient = clients.find((c) => c.id === clientId);
          setUpdatedCredentials({
            id: employee.id,
            employeeId: employee.employeeId,
            fullName: data.employee.fullName || fullName,
            companyName: data.employee.client?.companyName || selectedClient?.companyName || 'Growth India HQ',
            email: data.employee.personalEmail || personalEmail || `${employee.employeeId.toLowerCase()}@growthindia.in`,
            phone: data.employee.phone || phone,
            password: customPassword.trim(),
          });
        } else {
          onClose();
        }
      } else {
        setErrorMsg(data.error || 'Failed to update employee.');
      }
    } catch (e: any) {
      setErrorMsg('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (updatedCredentials) {
    return (
      <EmployeeCredentialsModal
        isOpen={true}
        onClose={() => {
          setUpdatedCredentials(null);
          onClose();
        }}
        credentials={updatedCredentials}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 bg-white border-b border-slate-100 text-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shadow-xs">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {employee.employeeId}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    employee.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : employee.status === 'BLOCKED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">Edit Employee Information</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200 shrink-0">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Client Selection */}
          <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80">
            <SearchableSelect
              label="Assigned Client / Company"
              required={false}
              options={clients.map((c) => ({
                value: c.id,
                label: c.companyName,
                subLabel: `${c.contactPerson} • ${c.industry || 'General'}`,
                badge: c.clientId,
              }))}
              value={clientId}
              onChange={(val) => setClientId(val)}
              placeholder="Type to search Client Company (e.g. Google, CLI-00001)..."
              defaultEmptyLabel="-- Direct Growth India Internal Staff --"
            />
          </div>

          {/* Personal Info Grid */}
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block border-b pb-1">
              Personal Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Father&apos;s Name (e.g. Suresh Patel)</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Patel"
                  value={fatherMotherName}
                  onChange={(e) => setFatherMotherName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomGender('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {gender === 'Other' && (
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98330 22222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email ID</label>
                <input
                  type="email"
                  placeholder="Email ID"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Card Number</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Aadhar Number</label>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="e.g. 1234 5678 9012"
                  value={aadharNumber}
                  onChange={(e) => setAadharNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Employment Status</label>
                {employee.status === 'BLOCKED' ? (
                  <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center justify-between">
                    <span>BLOCKED (Locked)</span>
                    <span className="text-[10px] text-rose-500 font-normal">Use Unblock modal to restore</span>
                  </div>
                ) : (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Set New Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] font-bold text-growth-teal hover:text-teal-700 flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3 text-growth-gold" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep unchanged"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal font-mono text-xs"
                  />
                  {customPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Two Address Boxes: Temporary Address and Permanent Address */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Flat 402, Sunshine Heights, Sector 14, Gurugram"
                  value={temporaryAddress}
                  onChange={(e) => {
                    setTemporaryAddress(e.target.value);
                    if (sameAsTemporary) setPermanentAddress(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Permanent Address</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sameAsTemporary}
                      onChange={(e) => {
                        setSameAsTemporary(e.target.checked);
                        if (e.target.checked) setPermanentAddress(temporaryAddress);
                      }}
                      className="w-3.5 h-3.5 text-growth-teal rounded focus:ring-0"
                    />
                    <span>Same as Temporary Address</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  disabled={sameAsTemporary}
                  placeholder="e.g. Village & Post Rampur, District Varanasi, UP"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Job Info Grid */}
          <div className="space-y-3 pt-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block border-b pb-1">
              Job & Organization Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={departmentName}
                  onChange={(e) => {
                    setDepartmentName(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomDepartment('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="General Operations">General Operations</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales & Business Development">Sales & Business Development</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Other">Other</option>
                </select>
                {departmentName === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Department *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operations, Legal, Quality Assurance..."
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior HR Executive"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Location</label>
                <select
                  value={jobLocation}
                  onChange={(e) => {
                    setJobLocation(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomJobLocation('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="Headquarters">Headquarters</option>
                  <option value="Regional Branch Office">Regional Branch Office</option>
                  <option value="Remote / Work From Home">Remote / Work From Home</option>
                  <option value="Hybrid (Office & Remote)">Hybrid (Office & Remote)</option>
                  <option value="Client On-site">Client On-site</option>
                  <option value="Other">Other</option>
                </select>
                {jobLocation === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Work Location *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Headquarters / Mumbai Branch..."
                      value={customJobLocation}
                      onChange={(e) => setCustomJobLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => {
                    setEmploymentType(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomEmploymentType('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Intern">Intern</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Other">Other</option>
                </select>
                {employmentType === 'Other' && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Specify Employment Type *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Probationary, Retainer, Contractual..."
                      value={customEmploymentType}
                      onChange={(e) => setCustomEmploymentType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Experienced in corporate HR & talent acquisition"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>
            </div>

            {/* Shift Timing & Working Hours Timeline */}
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Work Shift Timing Duration & Timeline</span>
                </label>
                <span className="text-[11px] font-mono text-teal-800 bg-white px-2.5 py-0.5 rounded-lg border border-teal-200 font-bold shadow-xs">
                  {shiftStartTime === 'FLEXIBLE' ? 'Flexible (No Late Mark)' : `${formatTo12Hour(shiftStartTime)} to ${formatTo12Hour(shiftEndTime)}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Expected Check-In
                  </label>
                  <TimePicker12
                    value={shiftStartTime}
                    onChange={(val) => setShiftStartTime(val)}
                    disabled={shiftStartTime === 'FLEXIBLE'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Expected Check-Out
                  </label>
                  <TimePicker12
                    value={shiftEndTime}
                    onChange={(val) => setShiftEndTime(val)}
                    disabled={shiftEndTime === 'FLEXIBLE'}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                <span className="text-slate-500 font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('09:30'); setShiftEndTime('18:30'); }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <span>09:30 AM - 06:30 PM</span>
                  <span className="text-teal-600 font-bold">(9h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('10:00'); setShiftEndTime('19:00'); }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <span>10:00 AM - 07:00 PM</span>
                  <span className="text-teal-600 font-bold">(9h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('11:00'); setShiftEndTime('20:00'); }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <span>11:00 AM - 08:00 PM</span>
                  <span className="text-teal-600 font-bold">(9h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (shiftStartTime === 'FLEXIBLE') {
                      setShiftStartTime('10:00');
                      setShiftEndTime('19:00');
                    } else {
                      setShiftStartTime('FLEXIBLE');
                      setShiftEndTime('FLEXIBLE');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    shiftStartTime === 'FLEXIBLE'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  {shiftStartTime === 'FLEXIBLE' ? 'Flexible Hours' : 'Set Flexible (No Late)'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
