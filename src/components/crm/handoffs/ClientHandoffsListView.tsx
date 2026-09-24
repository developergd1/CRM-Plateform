'use client';

import React, { useState, useEffect } from 'react';
import { SendHorizontal, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { ClientHandoffRecord } from '@/types/crm';

export const ClientHandoffsListView: React.FC = () => {
  const [handoffs, setHandoffs] = useState<ClientHandoffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const fetchHandoffs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/handoffs');
      if (res.ok) {
        const json = await res.json();
        setHandoffs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching handoffs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffs();
  }, []);

  const handleProcessHandoff = async (handoffId: string) => {
    setProcessingId(handoffId);
    setMessage('');
    try {
      const res = await fetch(`/api/crm/handoffs/${handoffId}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || 'Client Handoff completed successfully!');
        fetchHandoffs();
      } else {
        alert(data.error || 'Failed to process handoff');
      }
    } catch (err) {
      console.error('Error processing handoff:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none text-slate-800 pb-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
            Client Handoff Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Won Deals bridging commercial sales to Client Management governance & portal provisioning
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-[#0D9488]/10 border border-[#0D9488]/30 text-[#0D9488] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F0FDFA]/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Handoff Ref</th>
                <th className="py-3 px-4">Account & Commercial Contact</th>
                <th className="py-3 px-4">Deal Title</th>
                <th className="py-3 px-4 text-right">Deal Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#0D9488] mb-1" />
                    Loading handoff queue...
                  </td>
                </tr>
              ) : handoffs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No pending handoffs. When a deal reaches Closed Won, a formal handoff event is automatically queued here.
                  </td>
                </tr>
              ) : (
                handoffs.map((h) => (
                  <tr key={h.id} className="hover:bg-[#F0FDFA]/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{h.handoffReference}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{h.account?.companyName || 'Account'}</p>
                      <p className="text-[10px] text-slate-500">{h.account?.phone} • {h.account?.email || 'No email'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{h.deal?.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{h.deal?.dealNumber}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{h.dealValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'COMPLETED'
                          ? 'bg-[#0D9488]/10 text-[#0D9488]'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {h.status === 'PENDING' ? (
                        <button
                          onClick={() => handleProcessHandoff(h.id)}
                          disabled={processingId === h.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          {processingId === h.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          <span>Provision Client</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#0D9488] flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Provisioned</span>
                        </span>
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
