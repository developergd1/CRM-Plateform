'use client';

import React, { useState, useEffect } from 'react';
import { HrmTenant, HrmShift } from '@/lib/hrmStore';
import {
  Calendar,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Check,
} from 'lucide-react';

interface HrmShiftsViewProps {
  currentTenant: HrmTenant;
}

export const HrmShiftsView: React.FC<HrmShiftsViewProps> = ({ currentTenant }) => {
  const [shifts, setShifts] = useState<HrmShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:30 AM');
  const [endTime, setEndTime] = useState('06:30 PM');
  const [graceMinutes, setGraceMinutes] = useState(15);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hrm/shifts?tenantId=${currentTenant.id}`);
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [currentTenant]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch('/api/hrm/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          name,
          startTime,
          endTime,
          gracePeriodMinutes: graceMinutes,
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setName('');
        await fetchShifts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Shift Rosters & Timesheet Schedules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rotational shifts, grace periods, employee roster assignments, and project timesheets.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Shift Roster</span>
        </button>
      </div>

      {/* Shifts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map((shift, idx) => (
          <div
            key={shift.id}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs hover:border-[#0D9488] transition-all space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                {idx === 0 ? <Sun className="w-5 h-5" /> : idx === 1 ? <Coffee className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE ROSTER
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{shift.name}</h3>
              <p className="text-xs text-[#0D9488] font-mono font-bold mt-1">
                {shift.startTime} – {shift.endTime}
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Grace Period:</span>
                <strong className="text-slate-800">{shift.gracePeriodMinutes} mins</strong>
              </div>
              <div className="flex justify-between">
                <span>Assigned Staff:</span>
                <strong className="text-slate-800">{shift.assignedEmployees} employees</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {(shift.days || []).map((d) => (
                <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Timesheet Summary Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs space-y-0">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0D9488]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Weekly Timesheets</h3>
              <p className="text-[11px] text-slate-400">Timesheets track project/task hours; attendance tracks biometric presence.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#0D9488] font-bold bg-[#0D9488]/10 px-2.5 py-1 rounded-lg border border-[#0D9488]/20">
            Week 38 (2026)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#F0FDFA] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Mon</th>
                <th className="px-6 py-3">Tue</th>
                <th className="px-6 py-3">Wed</th>
                <th className="px-6 py-3">Thu</th>
                <th className="px-6 py-3">Fri</th>
                <th className="px-6 py-3 text-right">Total Duration</th>
                <th className="px-6 py-3 text-center">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="hover:bg-[#F0FDFA]/60">
                <td className="px-6 py-3.5 font-sans font-bold text-slate-900">Aarav Sharma</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.5h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.2h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.4h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.0h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.5h</td>
                <td className="px-6 py-3.5 text-right font-bold text-[#0D9488]">46.6 hrs</td>
                <td className="px-6 py-3.5 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APPROVED
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F0FDFA]/60">
                <td className="px-6 py-3.5 font-sans font-bold text-slate-900">Neha Gupta</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.0h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.1h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">8.9h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.0h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.0h</td>
                <td className="px-6 py-3.5 text-right font-bold text-[#0D9488]">45.0 hrs</td>
                <td className="px-6 py-3.5 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APPROVED
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F0FDFA]/60">
                <td className="px-6 py-3.5 font-sans font-bold text-slate-900">Rahul Verma</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.2h</td>
                <td className="px-6 py-3.5 text-amber-600 font-bold">7.2h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.3h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">9.1h</td>
                <td className="px-6 py-3.5 text-emerald-600 font-bold">8.8h</td>
                <td className="px-6 py-3.5 text-right font-bold text-[#0D9488]">43.6 hrs</td>
                <td className="px-6 py-3.5 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    APPROVED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* New Shift Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create Shift Schedule</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Night Support Roster"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-xl shadow-xs cursor-pointer"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
