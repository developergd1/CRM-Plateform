'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, ChevronLeft, ChevronRight, User, Briefcase } from 'lucide-react';

export const CrmCalendarView: React.FC = () => {
  const [items, setItems] = useState<{ activities: any[]; tasks: any[] }>({ activities: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'month' | 'agenda'>('agenda');

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/calendar');
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || { activities: [], tasks: [] });
      }
    } catch (err) {
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const allScheduled = [
    ...items.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.subject,
      date: new Date(a.scheduledAt),
      time: new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      performer: a.performedBy?.fullName || 'Sales Rep',
      client: a.lead?.companyName || a.deal?.title || 'Account',
      isTask: false,
    })),
    ...items.tasks.map((t) => ({
      id: t.id,
      type: 'TASK',
      title: t.title,
      date: new Date(t.dueDate),
      time: 'Due 18:00',
      performer: t.assignedTo?.fullName || 'Assignee',
      client: t.deal?.title || 'Commercial Task',
      isTask: true,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Calendar & Sales Agenda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Client demos, commercial meetings, follow-ups, and milestone due dates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewType('agenda')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewType === 'agenda' ? 'bg-[#0D9488] text-white' : 'bg-white border border-[#E2E8F0] text-slate-700'
            }`}
          >
            Agenda View
          </button>
          <button
            onClick={fetchCalendar}
            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Upcoming Schedule ({allScheduled.length} Scheduled Events)
        </h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0D9488] mb-1" />
            Loading sales agenda...
          </div>
        ) : allScheduled.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No activities or tasks scheduled for this period.
          </div>
        ) : (
          <div className="space-y-3">
            {allScheduled.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F0FDFA]/30 hover:bg-[#F0FDFA] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {item.date.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xs font-black text-slate-900 leading-none">
                      {item.date.getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0D9488]/10 text-[#0D9488]">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Client: <span className="font-semibold text-slate-700">{item.client}</span> • Owner: {item.performer}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
