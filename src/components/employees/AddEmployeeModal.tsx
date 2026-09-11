'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, UserPlus, Building2, User, Phone, Mail, MapPin, Calendar, FileText, Sparkles, KeyRound, Eye, EyeOff, Clock } from 'lucide-react';
import { EmployeeCredentialsModal } from './EmployeeCredentialsModal';
import { useModalScroll } from '@/hooks/useModalScroll';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { TimePicker12, formatTo12Hour } from '@/components/common/TimePicker12';
import { ClientItem } from '@/types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: () => void;
  preselectedClientId?: string;
  defaultClientId?: string;
}

export const AddEmployeeModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onEmployeeCreated,
  preselectedClientId,
  defaultClientId,
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherMotherName, setFatherMotherName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [customGender, setCustomGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [temporaryAddress, setTemporaryAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsTemporary, setSameAsTemporary] = useState(false);
  const [departmentName, setDepartmentName] = useState('General Operations');
  const [designation, setDesignation] = useState('');
  const [jobLocation, setJobLocation] = useState('Headquarters');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [shiftStartTime, setShiftStartTime] = useState('10:00');
  const [shiftEndTime, setShiftEndTime] = useState('19:00');
  const [remarks, setRemarks] = useState('');
  const [passwordMode, setPasswordMode] = useState<'auto' | 'custom'>('auto');
  const [generatedPassword, setGeneratedPassword] = useState('Emp#4821');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    employeeId: string;
    fullName?: string;
    companyName?: string;
    email: string;
    phone?: string;
    password?: string;
    isNewlyCreated?: boolean;
  } | null>(null);

  const regenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(`Emp#${rand}${Math.floor(10 + Math.random() * 90)}`);
  };

  useEffect(() => {
    regenerateRandomPassword();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Fetch clients list if Admin
      if (user?.role !== 'CLIENT') {
        fetch('/api/clients')
          .then((res) => res.json())
          .then((data) => {
            if (data.clients) {
              setClients(data.clients);
              if (preselectedClientId) {
                setClientId(preselectedClientId);
              } else if (defaultClientId) {
                setClientId(defaultClientId);
              } else if (data.clients.length > 0 && !clientId) {
                setClientId(data.clients[0].id);
              }
            }
          })
          .catch(() => {});
      } else {
        setClientId(user.clientId || '');
      }
    }
  }, [isOpen, preselectedClientId, defaultClientId, user]);

  const scrollRef = useModalScroll<HTMLDivElement>({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !designation) {
      setErrorMsg('Full Name, Phone Number, and Job Designation are required.');
      return;
    }

    const selectedPassword =
      passwordMode === 'auto'
        ? generatedPassword
        : (customPassword.trim() || generatedPassword);

    if (passwordMode === 'custom' && customPassword.trim().length < 4) {
      setErrorMsg('Custom password must be at least 4 characters long.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const finalAddress = temporaryAddress && permanentAddress
      ? (temporaryAddress === permanentAddress ? temporaryAddress : `Temporary: ${temporaryAddress}\nPermanent: ${permanentAddress}`)
      : (temporaryAddress || permanentAddress || '');

    const finalGender = gender === 'Other' ? (customGender.trim() || 'Other') : gender;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?.role === 'CLIENT' ? undefined : (clientId || null),
          fullName,
          fatherMotherName,
          dob: dob || null,
          gender: finalGender,
          phone,
          email,
          panNumber,
          aadharNumber,
          address: finalAddress,
          temporaryAddress,
          permanentAddress,
          departmentName,
          designation,
          jobLocation,
          joiningDate,
          employmentType,
          shiftStartTime,
          shiftEndTime,
          remarks,
          customPassword: selectedPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onEmployeeCreated();
        setCreatedCredentials({
          employeeId: data.employee.employeeId,
          fullName: data.employee.fullName,
          companyName: data.credentials?.companyName || data.employee.client?.companyName || user?.companyName,
          email: data.credentials?.email || data.employee.personalEmail || data.employee.user?.email,
          phone: data.employee.phone,
          password: data.credentials?.password || selectedPassword,
          isNewlyCreated: true,
        });
      } else {
        setErrorMsg(data.error || 'Failed to onboard employee.');
      }
    } catch (e: any) {
      setErrorMsg('Network connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdCredentials) {
    return (
      <EmployeeCredentialsModal
        isOpen={true}
        onClose={() => {
          setCreatedCredentials(null);
          onClose();
        }}
        credentials={createdCredentials}
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
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Onboard New Employee</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
                <span>Auto-generates sequential <strong className="text-growth-gold font-mono">GI-EMP-XXXXXX</strong></span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200 shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Employee Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            tabIndex={0}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs focus:outline-none focus:ring-1 focus:ring-inset focus:ring-slate-100"
          >
          {/* Section 1: Client Association */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-growth-teal" />
              <span>Client / Employer Association</span>
            </div>

            {user?.role === 'CLIENT' ? (
              <div className="text-xs font-bold text-growth-gold bg-slate-900 p-2.5 rounded-xl flex items-center justify-between">
                <span>{user.companyName}</span>
                <span className="font-mono text-growth-teal">{user.clientId}</span>
              </div>
            ) : (
              <SearchableSelect
                label="Select Client Company"
                required={true}
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.companyName,
                  subLabel: `${c.contactPerson} • ${c.industry || 'General'}`,
                  badge: c.clientId,
                }))}
                value={clientId}
                onChange={(val) => setClientId(val)}
                placeholder="Type to search Client Company (e.g. Google, CLI-00001)..."
                defaultEmptyLabel="Direct Internal Staff / HQ"
              />
            )}
          </div>

          {/* Section 2: Personal Information */}
          <div className="space-y-3">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User className="w-4 h-4 text-growth-teal" />
              <span>Personal Information</span>
            </div>

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

          {/* Section 3: Login Credentials & Access Setup */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs flex items-center gap-1.5 text-growth-gold">
                <KeyRound className="w-4 h-4 text-growth-teal" />
                <span>Login Credentials & Account Password Setup</span>
              </div>
              <div className="flex bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPasswordMode('auto')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    passwordMode === 'auto'
                      ? 'bg-growth-teal text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordMode('custom')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    passwordMode === 'custom'
                      ? 'bg-growth-teal text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Set Custom
                </button>
              </div>
            </div>

            {passwordMode === 'auto' ? (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Generated Initial Password:</span>
                  <span className="font-mono font-bold text-growth-gold text-sm tracking-wider">
                    {generatedPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={regenerateRandomPassword}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-growth-gold" />
                  <span>Regenerate</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold text-xs">Enter Custom Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3.5 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-growth-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-growth-teal font-black text-xs">ℹ️</span>
              <span>
                Employee will be able to log in to the employee workspace using either their <strong className="text-slate-200">Employee ID</strong>, <strong className="text-slate-200">Mobile Number</strong>, or <strong className="text-slate-200">Email</strong> with this password.
              </span>
            </div>
          </div>

          {/* Section 3: Employment Information */}
          <div className="space-y-3 pt-2">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Calendar className="w-4 h-4 text-growth-teal" />
              <span>Employment & Role Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Sales & Business Development"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Business Development Executive"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Location</label>
                <input
                  type="text"
                  placeholder="e.g. Headquarters / Gurugram Hub"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
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
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Internship">Internship</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded-xl text-xs flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ACTIVE (Default Phase 1 Status)</span>
                </div>
              </div>
            </div>

            {/* Shift Timing & Working Hours Timeline */}
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-growth-teal" />
                  <span>Work Shift Timing Duration & Timeline</span>
                </label>
                <span className="text-[11px] font-mono text-teal-300 font-bold">
                  {shiftStartTime === 'FLEXIBLE' ? 'Flexible (No Late Mark)' : `${formatTo12Hour(shiftStartTime)} to ${formatTo12Hour(shiftEndTime)}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Expected Check-In
                  </label>
                  <TimePicker12
                    value={shiftStartTime}
                    onChange={(val) => setShiftStartTime(val)}
                    disabled={shiftStartTime === 'FLEXIBLE'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Expected Check-Out
                  </label>
                  <TimePicker12
                    value={shiftEndTime}
                    onChange={(val) => setShiftEndTime(val)}
                    disabled={shiftEndTime === 'FLEXIBLE'}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="text-slate-400 font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('09:30'); setShiftEndTime('18:30'); }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                >
                  <span>09:30 AM - 06:30 PM</span>
                  <span className="text-teal-400 text-[9px]">(9h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('10:00'); setShiftEndTime('19:00'); }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                >
                  <span>10:00 AM - 07:00 PM</span>
                  <span className="text-teal-400 text-[9px]">(9h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShiftStartTime('11:00'); setShiftEndTime('20:00'); }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono transition flex items-center gap-1"
                >
                  <span>11:00 AM - 08:00 PM</span>
                  <span className="text-teal-400 text-[9px]">(9h)</span>
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
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    shiftStartTime === 'FLEXIBLE'
                      ? 'bg-growth-teal text-slate-950 shadow-sm'
                      : 'bg-teal-950/60 text-teal-300 border border-teal-800/60 hover:bg-teal-900/60'
                  }`}
                >
                  {shiftStartTime === 'FLEXIBLE' ? '✓ Flexible Hours' : 'Set Flexible (No Late)'}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Onboarding Remarks / Notes</label>
              <textarea
                rows={2}
                placeholder="Additional notes, certifications, special assignment..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
            </div>
          </div>

          </div>

          <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-growth-teal hover:bg-growth-tealDark text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Generating ID & Onboarding...' : 'Onboard Employee & Generate ID'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
