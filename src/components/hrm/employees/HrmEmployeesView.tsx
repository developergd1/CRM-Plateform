'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant, HrmEmployee } from '@/lib/hrmStore';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Calendar,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Laptop,
  FileCheck,
  X,
  ExternalLink,
  UserCheck,
} from 'lucide-react';

interface HrmEmployeesViewProps {
  currentTenant: HrmTenant;
  onView360?: (employeeId: string) => void;
}

export const HrmEmployeesView: React.FC<HrmEmployeesViewProps> = ({ currentTenant, onView360 }) => {
  const [employees, setEmployees] = useState<HrmEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<HrmEmployee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Employee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(currentTenant?.departments?.[0]?.name || 'Operations');
  const [designation, setDesignation] = useState('');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'CONTRACT' | 'PART_TIME' | 'INTERN'>('FULL_TIME');
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/employees?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentTenant]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/hrm/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          name,
          email,
          phone,
          department,
          designation: designation || 'Staff Associate',
          employmentType,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setEmail('');
        setPhone('');
        setDesignation('');
        await fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">Employee Directory & Profiles</h1>
            <span className="text-xs font-mono text-[#0D9488] bg-[#0D9488]/10 border border-[#0D9488]/30 px-2 py-0.5 rounded font-bold">
              {employees.length} Staff Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized with Growth India enterprise master database with tenant isolation and audit controls.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employee name, code, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
          />
        </div>

        <div className="sm:w-60">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {(currentTenant?.departments || []).map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading employee database...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E2E8F0] rounded-2xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No employees found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing your search query or onboard a new staff member.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-[#E2E8F0] hover:border-[#0D9488] rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-4 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0D9488] transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-500">{emp.designation}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {emp.employeeCode}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">{emp.phone}</span>
                </div>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {emp.status}
                </span>
                <div className="flex items-center gap-2">
                  {onView360 && (
                    <button
                      type="button"
                      onClick={() => onView360(emp.employeeCode)}
                      className="px-2.5 py-1 rounded-lg bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488] hover:text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                      title="Open full Employee 360 profile"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>360 Profile</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[11px] transition-all cursor-pointer"
                  >
                    Quick View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Employee Quick View Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E2E8F0] space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedEmployee.name}</h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
                      {selectedEmployee.employeeCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEmployee.designation} • {selectedEmployee.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 uppercase text-[10px]">Employment Details</p>
                <p><span className="text-slate-400">Reporting Manager:</span> <strong>{selectedEmployee.reportingManager}</strong></p>
                <p><span className="text-slate-400">Shift Schedule:</span> <strong>{selectedEmployee.shift}</strong></p>
                <p><span className="text-slate-400">Employment Type:</span> <strong>{selectedEmployee.employmentType}</strong></p>
                <p><span className="text-slate-400">Joined Date:</span> <strong>{selectedEmployee.joiningDate}</strong></p>
                <p><span className="text-slate-400">Location:</span> <strong>{selectedEmployee.location}</strong></p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 uppercase text-[10px]">Skills Matrix</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedEmployee.skills || []).map((s) => (
                    <span key={s} className="px-2.5 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-[10px] font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {onView360 && (
                <button
                  type="button"
                  onClick={() => {
                    const code = selectedEmployee.employeeCode;
                    setSelectedEmployee(null);
                    onView360(code);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Open Full Employee 360</span>
                </button>
              )}
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Onboard New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] bg-white cursor-pointer"
                  >
                    {(currentTenant?.departments || []).map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Onboarding...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
