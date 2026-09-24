'use client';

import React, { useState, useEffect } from 'react';
import { FileCheck2, Plus, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { QuoteRecord } from '@/types/crm';

export const QuotesListView: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/quotes');
      if (res.ok) {
        const json = await res.json();
        setQuotes(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleApprove = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/crm/quotes/${quoteId}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchQuotes();
      }
    } catch (err) {
      console.error('Error approving quote:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Quotes & Proposals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Commercial proposals, line-item pricing breakdowns, versioning, and approval workflow
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Quote Number</th>
                <th className="py-3 px-4">Account & Deal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4 text-right">Items</th>
                <th className="py-3 px-4 text-right">Total (Incl. Tax)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#0D9488] mb-1" />
                    Loading quotations...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No quotations generated yet. Create a quote from Deal 360 view.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#F0FDFA]">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {q.quoteNumber} <span className="text-[10px] text-slate-400">v{q.version}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{q.account?.companyName || 'Account'}</p>
                      <p className="text-[10px] text-slate-500">{q.deal?.title || q.deal?.dealNumber}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'APPROVED' || q.status === 'ACCEPTED'
                          ? 'bg-[#0D9488]/10 text-[#0D9488]'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(q.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {q.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{q.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {q.status === 'DRAFT' || q.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => handleApprove(q.id)}
                          className="px-2.5 py-1 rounded bg-[#0D9488] hover:bg-[#115E59] text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#0D9488]">Approved</span>
                      )}
                    </td>
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
