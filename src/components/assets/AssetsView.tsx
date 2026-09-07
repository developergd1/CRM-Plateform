'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Laptop, Plus, User, ShieldCheck } from 'lucide-react';
import { isAdminOrHR } from '@/lib/rbac';

export const AssetsView: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('LAPTOP');
  const [serialNumber, setSerialNumber] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, [user]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serialNumber) return;

    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        assetType,
        serialNumber,
        assignedEmployeeId: assignedEmployeeId || undefined,
      }),
    });

    if (res.ok) {
      setShowAddModal(false);
      setName('');
      setSerialNumber('');
      fetchAssets();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-growth-teal" />
            <span>Company IT Asset Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track laptops, mobile devices, headsets, and serial allocation to employees
          </p>
        </div>

        {isAdminOrHR(user?.role) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-growth-teal hover:bg-growth-tealDark text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((ast) => (
          <div
            key={ast.id}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-growth-teal bg-teal-50 px-2 py-0.5 rounded">
                  {ast.assetTag}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                  {ast.assetType}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900">{ast.name}</h3>

              <div className="space-y-1 text-xs text-slate-600">
                <p>Serial Number: <span className="font-mono font-bold text-slate-800">{ast.serialNumber}</span></p>
                <p>Condition: <span className="font-semibold">{ast.condition}</span></p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400">Allocated To:</span>
              <span className="font-bold text-slate-800">
                {ast.assignedEmployee ? `${ast.assignedEmployee.fullName} (${ast.assignedEmployee.employeeId})` : 'In Stock'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Register Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <form onSubmit={handleCreateAsset} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-xs my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900">Register Company Hardware Asset</h3>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Name / Model *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dell Latitude 5440 (i7, 16GB)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Asset Type</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="LAPTOP">Laptop / Workstation</option>
                <option value="MOBILE_DEVICE">Corporate Mobile Device</option>
                <option value="HEADSET">Communication Headset</option>
                <option value="ID_CARD">Corporate Access ID Card</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Hardware Serial Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. DL-5440-987123"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Allocate to Employee</label>
              <select
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="">-- Keep in Stock (Unallocated) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-growth-teal text-white font-bold rounded-xl shadow-sm"
              >
                Register Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
