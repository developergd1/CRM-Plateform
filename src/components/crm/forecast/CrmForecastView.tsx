'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, DollarSign, Target, Clock, RefreshCw } from 'lucide-react';

export const CrmForecastView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/forecast');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const metrics = data?.metrics || {
    totalPipeline: 0,
    weightedForecast: 0,
    bestCase: 0,
    commit: 0,
    closed: 0,
    avgDealSize: 0,
    avgSalesCycleDays: 18,
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Sales Forecasting & Pipeline Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Predictive revenue modeling, weighted projections, commit coverage, and sales cycle telemetry
          </p>
        </div>
        <button
          onClick={fetchForecast}
          className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F0FDFA] text-slate-600 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0D9488]' : ''}`} />
        </button>
      </div>

      {/* 4 Forecast Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Open Pipeline</span>
          <p className="text-2xl font-black text-[#111111] mt-2">
            ₹{metrics.totalPipeline.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Sum of all open commercial deals</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weighted Forecast</span>
          <p className="text-2xl font-black text-[#0D9488] mt-2">
            ₹{metrics.weightedForecast.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Probability-adjusted revenue</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commit Revenue (≥75%)</span>
          <p className="text-2xl font-black text-slate-800 mt-2">
            ₹{metrics.commit.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">High confidence closing target</p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Best Case Scenario</span>
          <p className="text-2xl font-black text-slate-800 mt-2">
            ₹{(metrics.commit + metrics.bestCase).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Commit + upside potential</p>
        </div>
      </div>

      {/* Cycle Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Deal Size</span>
            <p className="text-xl font-black text-slate-900 mt-1">₹{metrics.avgDealSize.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Computed across all portfolio deals</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Sales Cycle</span>
            <p className="text-xl font-black text-slate-900 mt-1">{metrics.avgSalesCycleDays} Days</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Lead qualification to closed won transition</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
