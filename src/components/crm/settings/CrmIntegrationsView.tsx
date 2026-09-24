'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Mail,
  Calendar,
  MessageSquare,
  Webhook,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Power,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'CONNECTED' | 'NOT_CONNECTED';
  config: any;
  updatedAt: string;
}

export const CrmIntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Configure modal state
  const [activeModalItem, setActiveModalItem] = useState<IntegrationItem | null>(null);
  const [modalConfig, setModalConfig] = useState<any>({});

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/crm/integrations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch integrations');
      setIntegrations(data.integrations || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTestConnection = async (integrationId: string) => {
    try {
      setActionLoadingId(integrationId);
      setErrorMsg('');
      const res = await fetch('/api/crm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, action: 'TEST' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setSuccessMsg(data.message || 'Connection test succeeded');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection test failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleConnect = async (integration: IntegrationItem) => {
    const isCurrentlyConnected = integration.status === 'CONNECTED';
    const action = isCurrentlyConnected ? 'DISCONNECT' : 'CONNECT';

    if (isCurrentlyConnected && !confirm(`Disconnect ${integration.name}?`)) return;

    try {
      setActionLoadingId(integration.id);
      setErrorMsg('');
      const res = await fetch('/api/crm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: integration.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update integration');
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchIntegrations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update integration status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveModalConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalItem) return;

    try {
      setActionLoadingId(activeModalItem.id);
      setErrorMsg('');
      const res = await fetch('/api/crm/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationId: activeModalItem.id,
          action: 'CONNECT',
          config: modalConfig,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
      setSuccessMsg(`Configuration saved for ${activeModalItem.name}`);
      setActiveModalItem(null);
      await fetchIntegrations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save configuration');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'email_service':
        return Mail;
      case 'calendar_sync':
        return Calendar;
      case 'whatsapp_sms':
        return MessageSquare;
      case 'webhooks':
        return Webhook;
      case 'api_keys':
        return Key;
      default:
        return Network;
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <Network className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Connected Channels & External Integrations
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage external email protocols, WhatsApp Business APIs, calendars, developer webhooks, and REST access keys.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchIntegrations}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Integrations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
          <p className="text-sm font-semibold">Loading external integrations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((item) => {
            const Icon = getIcon(item.id);
            const isConnected = item.status === 'CONNECTED';
            const isBusy = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
                        <Icon className="w-6 h-6" />
                      </span>
                      <div>
                        <h2 className="text-sm font-black text-slate-900 leading-snug">{item.name}</h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(item.id)}
                    disabled={isBusy}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    {isBusy ? 'Testing...' : 'Test Ping'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModalItem(item);
                        setModalConfig(item.config || {});
                      }}
                      className="text-xs font-bold text-[#0D9488] hover:text-[#0F766E] px-3 py-1.5 rounded-lg hover:bg-[#F0FDFA] transition-colors"
                    >
                      Configure
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleConnect(item)}
                      disabled={isBusy}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${
                        isConnected
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                          : 'bg-[#0D9488] text-white hover:bg-[#0F766E]'
                      }`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xl max-w-lg w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Configure {activeModalItem.name}
            </h3>
            <p className="text-xs text-slate-500">
              Set parameters and API endpoints for communication with external services.
            </p>

            <form onSubmit={handleSaveModalConfig} className="space-y-3">
              {activeModalItem.id === 'email_service' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      placeholder="smtp.office365.com or smtp.gmail.com"
                      value={modalConfig.smtpHost || ''}
                      onChange={(e) => setModalConfig({ ...modalConfig, smtpHost: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Port</label>
                      <input
                        type="text"
                        value={modalConfig.smtpPort || '587'}
                        onChange={(e) => setModalConfig({ ...modalConfig, smtpPort: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Username / Email</label>
                      <input
                        type="text"
                        placeholder="sales@growthindia.com"
                        value={modalConfig.smtpUser || ''}
                        onChange={(e) => setModalConfig({ ...modalConfig, smtpUser: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeModalItem.id === 'whatsapp_sms' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Meta Phone Number ID</label>
                    <input
                      type="text"
                      placeholder="104928104829104"
                      value={modalConfig.phoneNumberId || ''}
                      onChange={(e) => setModalConfig({ ...modalConfig, phoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Business Account ID</label>
                    <input
                      type="text"
                      placeholder="994827103849182"
                      value={modalConfig.businessAccountId || ''}
                      onChange={(e) => setModalConfig({ ...modalConfig, businessAccountId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </>
              )}

              {activeModalItem.id === 'webhooks' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Webhook Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://your-domain.com/crm-webhook"
                      value={modalConfig.webhookUrl || ''}
                      onChange={(e) => setModalConfig({ ...modalConfig, webhookUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Webhook Signing Secret</label>
                    <input
                      type="text"
                      value={modalConfig.secretToken || ''}
                      onChange={(e) => setModalConfig({ ...modalConfig, secretToken: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488] font-mono text-[11px]"
                    />
                  </div>
                </>
              )}

              {activeModalItem.id !== 'email_service' &&
                activeModalItem.id !== 'whatsapp_sms' &&
                activeModalItem.id !== 'webhooks' && (
                  <p className="text-xs text-slate-600 p-3 bg-slate-50 rounded-lg">
                    This integration uses standard OAuth2 authentication tokens maintained automatically by the server.
                  </p>
                )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === activeModalItem.id}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] disabled:opacity-50"
                >
                  {actionLoadingId === activeModalItem.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Save Configuration'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
