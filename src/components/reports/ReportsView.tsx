'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, Users, Building2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('employee-performance');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error loading reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, user]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-growth-teal" />
            <span>Workforce Intelligence & Performance Reports</span>
          </h1>
          <p className="text-xs text-slate-500">
            Exportable analytics on workforce distribution, staff productivity, and organizational delivery
          </p>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setReportType('employee-performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'employee-performance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Staff Performance
          </button>
          <button
            onClick={() => setReportType('workforce-summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'workforce-summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Client Workforce Summary
          </button>
        </div>
      </div>

      {/* Employee Matrix Report */}
      {reportType === 'employee-performance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Employee Comprehensive Operational Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Client Org</th>
                  <th className="py-3.5 px-4">Tasks Assigned</th>
                  <th className="py-3.5 px-4">Tasks Done</th>
                  <th className="py-3.5 px-4">Present Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.report?.map((emp: any) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.designation}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.department}</td>
                    <td className="py-3.5 px-4 font-bold text-teal-800">{emp.client}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.totalTasksAssigned}</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600">{emp.tasksCompleted}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.attendancePresentDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client Workforce Summary Report */}
      {reportType === 'workforce-summary' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-sm font-extrabold text-slate-900">Client Organization Workforce Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Client ID</th>
                  <th className="py-3.5 px-4">Company Name</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Employees</th>
                  <th className="py-3.5 px-4">Active Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.clients?.map((c: any) => (
                  <tr key={c.clientId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.clientId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{c.companyName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.status === 'ACTIVE' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{c._count?.employees || 0}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{c._count?.tasks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
