'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Lock,
  Mail,
} from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  _count?: { users: number };
  permissions?: { permission: { code: string; name: string } }[];
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  employeeId?: string;
  department?: string;
  isActive: boolean;
}

export const CrmRolesPermissionsView: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRolesData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/crm/roles');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load roles');
      setRoles(data.roles || []);
      setUsers(data.users || []);
      setPendingInvites(data.pendingInvitations || []);
      setPermissionCatalog(data.permissionCatalog || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
        <p className="text-sm font-semibold">Loading RBAC Security & CRM Roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-12">
      {/* Header Banner - Clean White Background */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Roles & Access Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise RBAC matrix governing commercial permissions, team authorizations, and invite lifecycles.
          </p>
        </div>

        <a
          href="/access/accounts"
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0D9488] rounded-lg hover:bg-[#0F766E] shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New CRM Member</span>
        </a>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Info notice about unified 3-panel architecture */}
      <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-slate-900">Unified Growth India Access Model: </span>
          Staff access across CMS, CRM, and HRM is centrally governed. Inviting team members through the standard
          account onboarding workflow generates one enterprise identity with granular CRM permissions.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRM Permission Catalog */}
        <div className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-sm font-black text-slate-900">CRM Commercial Permissions</h2>
          </div>
          <p className="text-xs text-slate-500">
            Active capability tokens evaluated by middleware and API endpoints:
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {permissionCatalog.map((perm) => (
              <div key={perm.code} className="p-2.5 rounded-lg border border-[#E2E8F0] bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{perm.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {perm.module}
                  </span>
                </div>
                <code className="text-[10px] text-[#0D9488] font-mono mt-1 block">{perm.code}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Users Matrix */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0D9488]" />
              <h2 className="text-sm font-black text-slate-900">Active CRM Team Members ({users.length})</h2>
            </div>
            <a
              href="/access/accounts"
              className="text-xs font-bold text-[#0D9488] hover:underline flex items-center gap-1"
            >
              <span>Manage Directory</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white max-h-96 overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {u.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{u.fullName}</p>
                    <p className="text-[11px] text-slate-500">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-slate-400">{u.employeeId || 'GI-STAFF'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Pending Staff Invitations ({pendingInvites.length})
              </h3>
              <div className="space-y-1.5">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-slate-800">{inv.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-amber-800">Invited as {inv.role}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
