'use client';

import React, { useState } from 'react';
import { HrmTenant } from '@/lib/hrmStore';
import {
  Building2,
  MapPin,
  Calendar,
  Layers,
  Plus,
  ShieldCheck,
  Globe,
  Clock,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';

interface HrmOrganizationViewProps {
  currentTenant: HrmTenant;
}

export const HrmOrganizationView: React.FC<HrmOrganizationViewProps> = ({ currentTenant }) => {
  const [departments, setDepartments] = useState(currentTenant.departments);
  const [designations, setDesignations] = useState(currentTenant.designations);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptManager, setNewDeptManager] = useState('');

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    const added = {
      id: `dept-${Date.now()}`,
      name: newDeptName,
      code: newDeptCode.toUpperCase(),
      manager: newDeptManager || 'Unassigned',
      employees: 0,
    };
    setDepartments([...departments, added]);
    setShowDeptModal(false);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptManager('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">Organization Architecture</h1>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              {currentTenant.slug}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company profile, departments, designations, locations, and working calendars.
          </p>
        </div>

        <button
          onClick={() => setShowDeptModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Organization Meta Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center font-black text-xl shadow-xs">
              {currentTenant.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{currentTenant.name}</h2>
              <p className="text-xs text-slate-500">{currentTenant.industry}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400">
                <span>Plan: <strong className="text-orange-600">{currentTenant.plan}</strong></span>
                <span>•</span>
                <span>Contact: {currentTenant.contactEmail}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTenant.timezone}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTenant.currency}</span>
            </div>
          </div>
        </div>

        {/* Operating Locations & Work Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Operating Locations & Hubs</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentTenant.locations.map((loc) => (
                <span
                  key={loc}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Working Days & Schedule</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {currentTenant.workDays.map((day) => (
                <span
                  key={day}
                  className="px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 text-[11px] font-bold"
                >
                  {day.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0D9488]" />
            <h3 className="text-sm font-bold text-slate-900">Departments Directory</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{departments.length} departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-3">Department Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Reporting Manager</th>
                <th className="px-6 py-3">Staff Count</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-[#F0FDFA]/70 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{dept.name}</td>
                  <td className="px-6 py-3.5 font-mono text-[#0D9488] font-bold">{dept.code}</td>
                  <td className="px-6 py-3.5 text-slate-700">{dept.manager}</td>
                  <td className="px-6 py-3.5 font-semibold text-slate-900">{dept.employees} active</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded border border-[#0D9488]/20">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Designations Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#0D9488]" />
            <h3 className="text-sm font-bold text-slate-900">Designations & Hierarchy</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{designations.length} designations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Hierarchy Level</th>
                <th className="px-6 py-3 text-right">RBAC Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {designations.map((des) => (
                <tr key={des.id} className="hover:bg-[#F0FDFA]/70 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{des.title}</td>
                  <td className="px-6 py-3.5 text-slate-700">{des.department}</td>
                  <td className="px-6 py-3.5 font-semibold text-[#0D9488]">{des.level}</td>
                  <td className="px-6 py-3.5 text-right font-mono text-[11px] text-slate-400">Assigned</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create New Department</h3>
              <button
                onClick={() => setShowDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDept} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QA"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Verma"
                    value={newDeptManager}
                    onChange={(e) => setNewDeptManager(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
