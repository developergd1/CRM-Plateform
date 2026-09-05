'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, UserPlus, Building2, User, Phone, Mail, MapPin, Calendar, FileText, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';
import { EmployeeCredentialsModal } from './EmployeeCredentialsModal';
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
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [departmentName, setDepartmentName] = useState('General Operations');
  const [designation, setDesignation] = useState('');
  const [jobLocation, setJobLocation] = useState('Headquarters');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [employmentType, setEmploymentType] = useState('Full-Time');
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !designation) {
      setErrorMsg('Full Name, Mobile Number, and Job Designation are required.');
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

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?.role === 'CLIENT' ? undefined : (clientId || null),
          fullName,
          fatherMotherName,
          dob: dob || null,
          gender,
          phone,
          email,
          panNumber,
          address,
          departmentName,
          designation,
          jobLocation,
          joiningDate,
          employmentType,
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
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
          <div className="bg-rose-50 p-3 text-rose-700 text-xs font-semibold px-6 border-b border-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Employee Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
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
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Select Client Company *</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="">Direct Internal Staff / HQ</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientId})
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="block font-bold text-slate-700 mb-1">Father&apos;s / Mother&apos;s Name</label>
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
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98330 22222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Personal / Work Email</label>
                <input
                  type="email"
                  placeholder="priya.patel@growthindia.in"
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

            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
              <textarea
                rows={2}
                placeholder="Full residential address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
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
                    placeholder="e.g. Priya@2026 or SecretPass123"
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
