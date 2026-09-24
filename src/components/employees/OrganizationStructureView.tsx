'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  User,
  Search,
  Filter,
  RefreshCw,
  FolderTree,
  ShieldCheck,
} from 'lucide-react';

interface OrgStructureViewProps {
  onSelectEmployee?: (empId: string) => void;
}

export const OrganizationStructureView: React.FC<OrgStructureViewProps> = ({ onSelectEmployee }) => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    INTERNAL: true,
  });

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/structure');
      if (res.ok) {
        const json = await res.json();
        setTreeData(json.tree || []);
        // Auto-expand first 2 organizations
        const initialExpanded: Record<string, boolean> = { INTERNAL: true };
        (json.tree || []).slice(0, 2).forEach((org: any) => {
          initialExpanded[org.id] = true;
          (org.departments || []).forEach((dept: any) => {
            initialExpanded[`${org.id}-${dept.name}`] = true;
          });
        });
        setExpandedNodes(initialExpanded);
      }
    } catch (e) {
      console.error('Error fetching org structure:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Organization Structure & Reporting Hierarchy
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical mapping across Corporate Clients, Departments, Teams, Managers, and Staff
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles or personnel..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-hidden w-64 shadow-xs"
            />
          </div>

          <button
            onClick={fetchTree}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh tree"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Compiling multi-tenant organization tree...</p>
        </div>
      ) : treeData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FolderTree className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No Organizational Entities Found</p>
          <p className="text-xs text-slate-400">Enrolled corporate clients and employees will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {treeData.map((org) => {
            const isOrgExpanded = expandedNodes[org.id] !== false;
            return (
              <div key={org.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Org Root Card */}
                <div
                  onClick={() => toggleNode(org.id)}
                  className="p-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">{org.name}</h3>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          {org.clientId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {org.industry} • Contact: <strong>{org.contactPerson}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      {org.totalHeadcount} Staff Members
                    </span>
                    {isOrgExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Departments Tree */}
                {isOrgExpanded && (
                  <div className="p-4 space-y-4">
                    {(org.departments || []).length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">No active departments mapped to this client organization.</p>
                    ) : (
                      org.departments.map((dept: any) => {
                        const deptKey = `${org.id}-${dept.name}`;
                        const isDeptExpanded = expandedNodes[deptKey] !== false;
                        const filteredEmployees = (dept.employees || []).filter((e: any) =>
                          !search ||
                          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
                          e.designation.toLowerCase().includes(search.toLowerCase()) ||
                          e.employeeId.toLowerCase().includes(search.toLowerCase())
                        );

                        if (search && filteredEmployees.length === 0) return null;

                        return (
                          <div key={dept.name} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                            {/* Department Header */}
                            <div
                              onClick={() => toggleNode(deptKey)}
                              className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Network className="w-4 h-4 text-teal-600 shrink-0" />
                                <h4 className="text-xs font-bold text-slate-800">{dept.name}</h4>
                                <span className="text-[10px] text-slate-400">
                                  ({filteredEmployees.length} personnel • {dept.designations.join(', ')})
                                </span>
                              </div>
                              {isDeptExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            </div>

                            {/* Employees Grid */}
                            {isDeptExpanded && (
                              <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredEmployees.map((emp: any) => (
                                  <div
                                    key={emp.id}
                                    onClick={() => onSelectEmployee?.(emp.employeeId)}
                                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                                          {emp.fullName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <h5 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 truncate transition-colors">
                                            {emp.fullName}
                                          </h5>
                                          <p className="text-[10px] text-slate-500 truncate">{emp.designation}</p>
                                        </div>
                                      </div>
                                      <span className="font-mono text-[10px] text-slate-400 font-bold ml-2 shrink-0">
                                        {emp.employeeId}
                                      </span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                      <span>{emp.employmentType}</span>
                                      <span className="font-mono">{emp.phone}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
