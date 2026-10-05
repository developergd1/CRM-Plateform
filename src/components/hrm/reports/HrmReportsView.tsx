'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant } from '@/lib/hrmStore';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Coffee,
  Banknote,
  ShieldCheck,
  Target,
  Download,
  Filter,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';

interface HrmReportsViewProps {
  currentTenant: HrmTenant;
}

type ReportCategory = 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'COMPLIANCE' | 'PMS';

export const HrmReportsView: React.FC<HrmReportsViewProps> = ({ currentTenant }) => {
  const [category, setCategory] = useState<ReportCategory>('EMPLOYEES');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<{ summary: any; rows: any[] }>({
    summary: {},
    rows: [],
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category,
        format: 'json',
      });
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (departmentFilter && departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/hrm/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData({
          summary: data.summary || {},
          rows: data.rows || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch HR report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [category, statusFilter, departmentFilter, startDate, endDate, currentTenant]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      category,
      format: 'csv',
    });
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (departmentFilter && departmentFilter !== 'ALL') params.append('department', departmentFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    // Trigger direct download
    window.location.href = `/api/hrm/reports?${params.toString()}`;
  };

  // Filter rows by search query
  const filteredRows = reportData.rows.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some(
      (val) => val && String(val).toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Centralized Workforce & HR Reports</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20">
              Auditable & Exportable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise analytics and ledger exports across Employees, Attendance, Leave, Payroll, Statutory Compliance, and PMS.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#0D9488]" />
          <span>Export {category} Report (CSV)</span>
        </button>
      </div>

      {/* Category Tabs matching Section 34 */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-[#E2E8F0] shadow-xs overflow-x-auto">
        {[
          { id: 'EMPLOYEES', label: 'Employee Reports', icon: Users },
          { id: 'ATTENDANCE', label: 'Attendance Reports', icon: Clock },
          { id: 'LEAVE', label: 'Leave Reports', icon: Coffee },
          { id: 'PAYROLL', label: 'Payroll Reports', icon: Banknote },
          { id: 'COMPLIANCE', label: 'Compliance Reports (PF/ESI/TDS/PT)', icon: ShieldCheck },
          { id: 'PMS', label: 'PMS & Performance Reports', icon: Target },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setCategory(tab.id as ReportCategory);
                setStatusFilter('ALL');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0D9488] hover:bg-[#F0FDFA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {category === 'EMPLOYEES' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Workforce</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.total || 0}</p>
              <p className="text-[11px] text-[#0D9488] font-bold">Unified Master Entity</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Active Staff</span>
              <p className="text-2xl font-black text-emerald-600">{reportData.summary.active || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Eligible for Payroll</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Blocked / Inactive</span>
              <p className="text-2xl font-black text-slate-400">{reportData.summary.blocked || 0}</p>
              <p className="text-[11px] text-slate-400 font-medium">Access Suspended</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Statutory Enrolled</span>
              <p className="text-2xl font-black text-[#0D9488]">100%</p>
              <p className="text-[11px] text-[#0D9488] font-bold">PAN / PF / ESI / PT</p>
            </div>
          </>
        )}

        {category === 'ATTENDANCE' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Logged Punches</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.totalPunches || 0}</p>
              <p className="text-[11px] text-[#0D9488] font-bold">Timesheet records</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Present Count</span>
              <p className="text-2xl font-black text-emerald-600">{reportData.summary.present || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Recorded at office/remote</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Late Punches</span>
              <p className="text-2xl font-black text-amber-600">{reportData.summary.late || 0}</p>
              <p className="text-[11px] text-amber-600 font-bold">Punctuality exception</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Work Hours</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.totalWorkHours || 0}h</p>
              <p className="text-[11px] text-slate-500 font-medium">Logged productivity</p>
            </div>
          </>
        )}

        {category === 'LEAVE' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Requests</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.total || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">All leave applications</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Approved Leaves</span>
              <p className="text-2xl font-black text-emerald-600">{reportData.summary.approved || 0}</p>
              <p className="text-[11px] text-emerald-600 font-bold">Paid balance deducted</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Pending Approvals</span>
              <p className="text-2xl font-black text-amber-600">{reportData.summary.pending || 0}</p>
              <p className="text-[11px] text-amber-600 font-bold">Manager action required</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Unpaid Leaves (LOP)</span>
              <p className="text-2xl font-black text-rose-600">{reportData.summary.unpaid || 0}</p>
              <p className="text-[11px] text-rose-600 font-bold">Flows directly to Payroll</p>
            </div>
          </>
        )}

        {category === 'PAYROLL' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Records Calculated</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.recordsCount || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Processed payslips</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Gross Payroll</span>
              <p className="text-2xl font-black text-slate-900">₹{(reportData.summary.totalGross || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 font-medium">Base + Allowances + Bonus</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Deductions</span>
              <p className="text-2xl font-black text-rose-600">₹{(reportData.summary.totalDeductions || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-rose-600 font-bold">PF, ESI, TDS, PT & LOP</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Net Pay Disbursement</span>
              <p className="text-2xl font-black text-emerald-600">₹{(reportData.summary.totalNetPay || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-emerald-600 font-bold">Direct bank deposit</p>
            </div>
          </>
        )}

        {category === 'COMPLIANCE' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total EPF Collected</span>
              <p className="text-2xl font-black text-slate-900">₹{(reportData.summary.totalPf || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 font-medium">Employee + Employer share</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total ESIC Premium</span>
              <p className="text-2xl font-black text-slate-900">₹{(reportData.summary.totalEsi || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 font-medium">ESI wage threshold rules</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total TDS Withheld</span>
              <p className="text-2xl font-black text-blue-600">₹{(reportData.summary.totalTds || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-blue-600 font-bold">Income Tax 24Q filing</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Professional Tax</span>
              <p className="text-2xl font-black text-purple-600">₹{(reportData.summary.totalPt || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-purple-600 font-bold">State government remit</p>
            </div>
          </>
        )}

        {category === 'PMS' && (
          <>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Goals</span>
              <p className="text-2xl font-black text-slate-900">{reportData.summary.totalGoals || 0}</p>
              <p className="text-[11px] text-slate-500 font-medium">Assigned OKRs</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Achieved Goals</span>
              <p className="text-2xl font-black text-emerald-600">{reportData.summary.completedGoals || 0}</p>
              <p className="text-[11px] text-emerald-600 font-bold">100% target met</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Appraisals Approved</span>
              <p className="text-2xl font-black text-[#0D9488]">{reportData.summary.totalAppraisals || 0}</p>
              <p className="text-[11px] text-[#0D9488] font-bold">Bridged into Payroll</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Bonus Value</span>
              <p className="text-2xl font-black text-slate-900">₹{(reportData.summary.totalBonusValue || 0).toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 font-medium">Merit disbursements</p>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in report..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-48 sm:w-60 focus:outline-hidden focus:border-[#0D9488]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 cursor-pointer focus:outline-hidden focus:border-[#0D9488]"
          >
            <option value="ALL">All Statuses</option>
            {category === 'EMPLOYEES' && (
              <>
                <option value="ACTIVE">Active</option>
                <option value="BLOCKED">Blocked</option>
              </>
            )}
            {category === 'ATTENDANCE' && (
              <>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
              </>
            )}
            {category === 'LEAVE' && (
              <>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </>
            )}
            {category === 'PAYROLL' && (
              <>
                <option value="FINALIZED">Finalized</option>
                <option value="DRAFT">Draft</option>
              </>
            )}
          </select>

          {(category === 'ATTENDANCE' || category === 'LEAVE') && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filteredRows.length}</strong> records
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] sticky top-0 z-10 border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                {filteredRows.length > 0 ? (
                  Object.keys(filteredRows[0]).map((colKey) => (
                    <th key={colKey} className="px-5 py-3 capitalize">
                      {colKey.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))
                ) : (
                  <th className="px-5 py-3">Report Ledger</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-xs text-slate-400">
                    Generating report ledger...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-xs text-slate-400">
                    No records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {Object.entries(row).map(([key, val]: any, cellIdx) => (
                      <td key={cellIdx} className="px-5 py-3 whitespace-nowrap">
                        {typeof val === 'number' && key.toLowerCase().includes('salary') ||
                        key.toLowerCase().includes('gross') ||
                        key.toLowerCase().includes('deduction') ||
                        key.toLowerCase().includes('net') ||
                        key.toLowerCase().includes('bonus') ||
                        key.toLowerCase().includes('pf') ||
                        key.toLowerCase().includes('esi') ||
                        key.toLowerCase().includes('tds') ||
                        key.toLowerCase().includes('pt') ? (
                          <span className="font-mono font-bold text-slate-800">
                            ₹{val.toLocaleString('en-IN')}
                          </span>
                        ) : key.toLowerCase().includes('status') ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              val === 'ACTIVE' || val === 'APPROVED' || val === 'FINALIZED' || val === 'PRESENT' || val === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : val === 'BLOCKED' || val === 'REJECTED' || val === 'ABSENT'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {String(val)}
                          </span>
                        ) : (
                          <span className="text-slate-800 font-medium">{String(val ?? 'N/A')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
