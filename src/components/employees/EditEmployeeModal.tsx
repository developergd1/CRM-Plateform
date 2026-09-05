'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Building2, User, Phone, Mail, MapPin, Calendar, FileText, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';
import { EmployeeCredentialsModal, EmployeeCredentialData } from './EmployeeCredentialsModal';
import { ClientItem } from '@/types';

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
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [departmentName, setDepartmentName] = useState('Sales & Operations');
  const [designation, setDesignation] = useState('');
  const [jobLocation, setJobLocation] = useState('Headquarters');
  const [joiningDate, setJoiningDate] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-Time');
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
        setGender(employee.gender || 'Male');
        setPhone(employee.phone || '');
        setPersonalEmail(employee.personalEmail || employee.user?.email || '');
        setPanNumber(employee.panNumber || '');
        setAddress(employee.address || '');
        setDepartmentName(employee.departmentName || employee.department?.name || 'Sales & Operations');
        setDesignation(employee.designation || '');
        setJobLocation(employee.jobLocation || employee.location || 'Headquarters');
        setJoiningDate(employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '');
        setEmploymentType(employee.employmentType || 'Full-Time');
        setRemarks(employee.remarks || '');
        setStatus(employee.status || 'ACTIVE');
        setCustomPassword('');
        setShowPassword(false);
      }
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !designation) {
      setErrorMsg('Full Name, Mobile Number, and Designation are required.');
      return;
    }

    if (customPassword.trim() && customPassword.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId || null,
          fullName,
          fatherMotherName,
          dob: dob || null,
          gender,
          phone,
          personalEmail,
          panNumber,
          address,
          departmentName,
          designation,
          jobLocation,
          joiningDate: joiningDate || null,
          employmentType,
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-growth-teal text-white flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-growth-gold bg-amber-950/80 px-2 py-0.5 rounded border border-growth-gold/30">
                  {employee.employeeId}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    employee.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : employee.status === 'BLOCKED'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">Edit Employee Information</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Client Selection */}
          <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80">
            <label className="block font-bold text-teal-900 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-growth-teal" />
              <span>Assigned Client / Company</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-growth-teal"
            >
              <option value="">-- Direct Growth India Internal Staff --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.clientId}) - {c.industry || 'General'}
                </option>
              ))}
            </select>
          </div>

          {/* Personal Info Grid */}
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block border-b pb-1">
              Personal Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Father&apos;s / Mother&apos;s Name</label>
                <input
                  type="text"
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
                <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
              />
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
                <input
                  type="text"
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
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Location</label>
                <input
                  type="text"
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
                  <option value="Intern">Intern</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-growth-teal"
                />
              </div>
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
