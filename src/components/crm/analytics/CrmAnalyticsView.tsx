'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Filter,
  DollarSign,
  Users,
  Briefcase,
  Sparkles,
  PieChart,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Award,
} from 'lucide-react';

export const CrmAnalyticsView: React.FC = () => {
  const [preset, setPreset] = useState<string>('THIS_MONTH');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sourceSortField, setSourceSortField] = useState<'total' | 'qualified' | 'converted' | 'conversionRate'>('total');

  const fetchAnalytics = async (selectedPreset = preset) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/crm?preset=${selectedPreset}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
      }
    } catch (err) {
      console.error('Failed to load CRM analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(preset);
  }, [preset]);

  const sortedSources = [...(data?.sourcePerformance || [])].sort((a, b) => {
    return (b[sourceSortField] || 0) - (a[sourceSortField] || 0);
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-growth-teal/20 text-growth-teal border border-growth-teal/30 rounded-full text-xs font-bold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Commercial Sales Intelligence & Telemetry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">CRM Analytics & Pipeline Insights</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time lead conversion rates, salesperson leaderboards, pipeline funnel analytics, and won/lost metrics.
          </p>
        </div>

        {/* Preset Filter */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_MONTH', label: 'Last Month' },
            { id: 'THIS_QUARTER', label: 'Quarter' },
            { id: 'THIS_YEAR', label: 'This Year' },
            { id: 'ALL_TIME', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                preset === item.id
                  ? 'bg-growth-teal text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => fetchAnalytics(preset)}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors ml-1"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-growth-teal" />
        </div>
      ) : !data ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          No analytics data available for this date range.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lead Conversion */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Lead Conversion Rate</span>
              <div className="mt-1 text-2xl font-black text-growth-teal">
                {data.leadConversion?.conversionRate ?? 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                {data.leadConversion?.convertedLeads} / {data.leadConversion?.totalLeads} Converted Leads
              </div>
            </div>

            {/* Average Deal Value */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Average Deal Value</span>
              <div className="mt-1 text-2xl font-black text-slate-900">
                ₹{(data.dealMetrics?.averageDealValue ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                Across {data.dealMetrics?.wonDealsCount ?? 0} Won Contracts
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Deal Win Rate</span>
              <div className="mt-1 text-2xl font-black text-emerald-600">
                {data.wonLost?.winRate ?? 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                Won: <strong className="text-emerald-700">{data.wonLost?.wonDealsCount}</strong> • Lost:{' '}
                <strong className="text-rose-600">{data.wonLost?.lostDealsCount}</strong>
              </div>
            </div>

            {/* Sales Cycle Duration */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Average Sales Cycle</span>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {data.salesCycle?.averageDays ?? 0} Days
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                Min: {data.salesCycle?.shortestDays ?? 0}d • Max: {data.salesCycle?.longestDays ?? 0}d
              </div>
            </div>
          </div>

          {/* Pipeline Funnel & Stage-wise Values */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-growth-teal" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Sales Pipeline Stages & Value Distribution
                </h2>
              </div>
              <div className="text-xs font-bold text-slate-600">
                Total Pipeline Value:{' '}
                <span className="text-growth-teal font-black">
                  ₹{(data.pipeline?.totalPipelineValue ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(data.pipeline?.stages || []).map((st: any) => (
                <div
                  key={st.stage}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    st.stage === 'WON'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : st.stage === 'LOST'
                      ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider">{st.stage}</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {st.count}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-black">₹{(st.value || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Contract Value</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Salesperson Performance Leaderboard */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-growth-goldDark" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Salesperson Performance Leaderboard
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {data.salespersonPerformance?.length || 0} Representatives Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-2.5 px-3">Salesperson</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3 text-center">Leads Assigned</th>
                    <th className="py-2.5 px-3 text-center">Qualified</th>
                    <th className="py-2.5 px-3 text-center">Deals Won</th>
                    <th className="py-2.5 px-3 text-right">Won Revenue (INR)</th>
                    <th className="py-2.5 px-3 text-center">Win Rate</th>
                    <th className="py-2.5 px-3 text-center">Overdue Follow-ups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(data.salespersonPerformance || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                        No salesperson activity recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    data.salespersonPerformance.map((rep: any) => (
                      <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {rep.fullName}
                          <span className="block text-[10px] text-slate-400 font-mono">{rep.employeeId}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{rep.designation || 'Representative'}</td>
                        <td className="py-3 px-3 text-center font-semibold">{rep.assignedLeads}</td>
                        <td className="py-3 px-3 text-center font-semibold text-emerald-600">{rep.qualifiedLeads}</td>
                        <td className="py-3 px-3 text-center font-bold text-growth-teal">{rep.wonDeals}</td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{(rep.wonValue || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-growth-teal border border-teal-200">
                            {rep.winRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rep.overdueFollowUps > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                              {rep.overdueFollowUps} Due
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-semibold">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Column: Lead Source Performance & Won/Lost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Source Performance */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Lead Source Performance
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400 font-semibold">Sort by:</span>
                  <button
                    onClick={() => setSourceSortField('total')}
                    className={`px-2 py-0.5 rounded-md font-bold ${
                      sourceSortField === 'total' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setSourceSortField('conversionRate')}
                    className={`px-2 py-0.5 rounded-md font-bold ${
                      sourceSortField === 'conversionRate' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    Rate
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {sortedSources.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No source telemetry available.</p>
                ) : (
                  sortedSources.map((s: any) => (
                    <div key={s.source} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{s.source}</span>
                        <span className="text-xs font-black text-growth-teal">{s.conversionRate}% Conv.</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Total: {s.total}</span>
                        <span>Qualified: {s.qualified}</span>
                        <span>Converted: {s.converted}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Won / Lost Analysis & Top Lost Reasons */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Top Lost Reasons & Win Analysis
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[10px] font-black uppercase text-emerald-800">Total Won Value</div>
                  <div className="mt-1 text-lg font-black text-emerald-700">
                    ₹{(data.wonLost?.wonDealsValue || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">{data.wonLost?.wonDealsCount} Closed Won</div>
                </div>

                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-[10px] font-black uppercase text-rose-800">Total Lost Value</div>
                  <div className="mt-1 text-lg font-black text-rose-700">
                    ₹{(data.wonLost?.lostDealsValue || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{data.wonLost?.lostDealsCount} Closed Lost</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Top Reported Lost Reasons
                </span>
                {(data.wonLost?.topLostReasons || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No lost reason records captured.</p>
                ) : (
                  (data.wonLost?.topLostReasons || []).map((r: any) => (
                    <div
                      key={r.reason}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-700">{r.reason}</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                        {r.count} Deals
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Client Acquisition Origin */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-growth-teal" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Client Acquisition Breakdown
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total New Clients</span>
                <div className="mt-1 text-xl font-black text-slate-900">{data.clientAcquisition?.totalNewClients ?? 0}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">In Selected Period</div>
              </div>

              <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200">
                <span className="text-[10px] font-bold uppercase text-teal-800 block">From Won Deals</span>
                <div className="mt-1 text-xl font-black text-growth-teal">{data.clientAcquisition?.fromWonDeals ?? 0}</div>
                <div className="text-[10px] text-teal-600 mt-0.5 font-semibold">Deal Conversion Bridge</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Direct Onboarding</span>
                <div className="mt-1 text-xl font-black text-slate-900">{data.clientAcquisition?.directOnboarded ?? 0}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">Executive Setup</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
