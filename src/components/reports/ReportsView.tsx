'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, TrendingUp, Users, Award, Download } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('crm-conversions');
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
            <span>Business Intelligence & Performance Reports</span>
          </h1>
          <p className="text-xs text-slate-500">
            Exportable analytics on CRM conversions, lead sources, and employee multi-factor delivery
          </p>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setReportType('crm-conversions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'crm-conversions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Source Conversions
          </button>
          <button
            onClick={() => setReportType('employee-performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'employee-performance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            Staff Matrix
          </button>
        </div>
      </div>

      {/* CRM Source Conversions Report */}
      {reportType === 'crm-conversions' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-sm font-extrabold text-slate-900">Lead Acquisition Channel Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Lead Source</th>
                  <th className="py-3.5 px-4">Total Leads</th>
                  <th className="py-3.5 px-4">Deals Won</th>
                  <th className="py-3.5 px-4">Conversion Rate</th>
                  <th className="py-3.5 px-4 font-black">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.sourcePerformance?.map((src: any) => (
                  <tr key={src.source} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{src.source}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{src.totalLeads}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{src.wonDeals}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md font-bold">
                        {src.conversionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      ₹{src.totalRevenueWon.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Matrix Report */}
      {reportType === 'employee-performance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-sm font-extrabold text-slate-900">Employee Comprehensive Operational Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Assigned Leads</th>
                  <th className="py-3.5 px-4">Won Deals</th>
                  <th className="py-3.5 px-4">Win Rate</th>
                  <th className="py-3.5 px-4">Won Revenue</th>
                  <th className="py-3.5 px-4">Activities</th>
                  <th className="py-3.5 px-4">Tasks Done</th>
                  <th className="py-3.5 px-4">Days Present</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.report?.map((emp: any) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.totalClientsAssigned}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{emp.dealsWon}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{emp.conversionRate}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      ₹{emp.totalRevenueGenerated.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-growth-teal">{emp.activitiesLogged}</td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600">{emp.tasksCompleted}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.attendancePresentDays}</td>
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
