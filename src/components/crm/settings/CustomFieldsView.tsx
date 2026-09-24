'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  ToggleLeft,
  ToggleRight,
  ListFilter,
} from 'lucide-react';

interface CustomField {
  id: string;
  entityType: 'LEAD' | 'ACCOUNT' | 'CONTACT' | 'DEAL';
  fieldKey: string;
  label: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  createdAt: string;
}

export const CustomFieldsView: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<'LEAD' | 'ACCOUNT' | 'CONTACT' | 'DEAL'>('LEAD');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New field state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState('TEXT');
  const [newOptionsText, setNewOptionsText] = useState('');
  const [newIsRequired, setNewIsRequired] = useState(false);

  const fetchFields = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`/api/crm/custom-fields?entityType=${selectedEntity}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch custom fields');
      setFields(data.fields || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [selectedEntity]);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    try {
      setSaving(true);
      setErrorMsg('');
      const options =
        newFieldType === 'SELECT' || newFieldType === 'MULTISELECT'
          ? newOptionsText.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      const res = await fetch('/api/crm/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedEntity,
          label: newLabel.trim(),
          fieldKey: newFieldKey.trim() || undefined,
          fieldType: newFieldType,
          options,
          isRequired: newIsRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create field');

      setSuccessMsg(`Custom field "${data.customField.label}" added to ${selectedEntity}`);
      setIsModalOpen(false);
      setNewLabel('');
      setNewFieldKey('');
      setNewFieldType('TEXT');
      setNewOptionsText('');
      setNewIsRequired(false);
      await fetchFields();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving custom field');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string, label: string) => {
    if (!confirm(`Are you sure you want to delete custom field "${label}"?`)) return;

    try {
      setSaving(true);
      setErrorMsg('');
      const res = await fetch(`/api/crm/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete field');
      setSuccessMsg('Field deleted successfully');
      await fetchFields();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting field');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <FileCode className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Custom Attributes & Data Schema
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define domain-specific data fields for Leads, Commercial Accounts, Contacts, and Deals without modifying source schemas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Attribute Field</span>
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

      {/* Entity Selector Pills */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        {(['LEAD', 'ACCOUNT', 'CONTACT', 'DEAL'] as const).map((entity) => {
          const isActive = selectedEntity === entity;
          return (
            <button
              key={entity}
              type="button"
              onClick={() => setSelectedEntity(entity)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
              }`}
            >
              {entity === 'LEAD' && 'Leads'}
              {entity === 'ACCOUNT' && 'Commercial Accounts'}
              {entity === 'CONTACT' && 'Key Contacts'}
              {entity === 'DEAL' && 'Deals & Opportunities'}
            </button>
          );
        })}
      </div>

      {/* Fields List */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
            <p className="text-xs font-semibold">Loading custom attributes for {selectedEntity}...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tag className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No custom fields defined for {selectedEntity} yet.</p>
            <p className="text-[11px] text-slate-400">
              Click "New Attribute Field" above to add tailored business fields.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            <div className="grid grid-cols-12 px-5 py-3 bg-[#F8FAFC] text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Field Label & Key</div>
              <div className="col-span-3">Type & Options</div>
              <div className="col-span-2 text-center">Required</div>
              <div className="col-span-2">Created At</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {fields.map((f) => (
              <div key={f.id} className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="col-span-4">
                  <p className="text-xs font-bold text-slate-900">{f.label}</p>
                  <p className="text-[10px] font-mono text-slate-400">{f.fieldKey}</p>
                </div>

                <div className="col-span-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {f.fieldType}
                  </span>
                  {f.options && f.options.length > 0 && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      Options: {f.options.join(', ')}
                    </p>
                  )}
                </div>

                <div className="col-span-2 text-center">
                  {f.isRequired ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Mandatory
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Optional</span>
                  )}
                </div>

                <div className="col-span-2 text-xs text-slate-500">
                  {new Date(f.createdAt).toLocaleDateString()}
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleDeleteField(f.id, f.label)}
                    disabled={saving}
                    className="p-1 rounded hover:bg-rose-50 text-rose-600 transition-colors disabled:opacity-40"
                    title="Delete Field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Field Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Add Custom Attribute for {selectedEntity}
            </h3>
            <p className="text-xs text-slate-500">
              This field will automatically render in {selectedEntity.toLowerCase()} creation forms and detail views.
            </p>

            <form onSubmit={handleCreateField} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Field Label</label>
                <input
                  type="text"
                  placeholder="e.g. GST Registration Number"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newFieldKey) {
                      setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Field System Key</label>
                <input
                  type="text"
                  placeholder="e.g. cf_gst_registration_number"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="TEXT">Short Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Calendar Date</option>
                  <option value="SELECT">Single Select Dropdown</option>
                  <option value="MULTISELECT">Multi-Select Tags</option>
                  <option value="BOOLEAN">Yes / No Switch</option>
                </select>
              </div>

              {(newFieldType === 'SELECT' || newFieldType === 'MULTISELECT') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bronze, Silver, Gold, Platinum"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsRequired}
                    onChange={(e) => setNewIsRequired(e.target.checked)}
                    className="w-4 h-4 text-[#0D9488] rounded border-[#E2E8F0] focus:ring-[#0D9488]"
                  />
                  <span className="text-xs font-semibold text-slate-700">Make this field mandatory</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newLabel.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
