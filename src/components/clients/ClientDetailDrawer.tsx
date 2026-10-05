'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  X,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  User,
  Users,
  Briefcase,
  FileText,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface DrawerProps {
  clientId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ClientDetailDrawer: React.FC<DrawerProps> = ({ clientId, onClose, onRefresh }) => {
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'workforce' | 'departments' | 'documents' | 'tasks'>('overview');

  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
      }
    } catch (e) {
      console.error('Error fetching client details:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTasks = async () => {
    if (!clientId) return;
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        const clientTasks = (data.tasks || []).filter(
          (t: any) => t.clientId === clientId || t.client?.id === clientId || t.client?.clientId === clientId
        );
        setTasks(clientTasks);
      }
    } catch (e) {
      console.error('Error fetching client tasks:', e);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
      fetchClientTasks();
    }
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
              <p className="text-xs text-slate-500 font-medium">Loading client profile...</p>
            </div>
          </div>
        ) : !client ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Building className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">Client Not Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Unable to locate the client records for ID: {clientId}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Close Drawer
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black px-2.5 py-1 bg-emerald-600 text-white rounded-lg shadow-sm">
                    {client.clientId}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      client.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : client.status === 'PENDING_ONBOARDING'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {client.status?.replace('_', ' ') || 'ACTIVE'}
                  </span>
                  {client.industry && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {client.industry}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black mt-2 tracking-tight text-white">
                  {client.companyName || client.name}
                </h2>
                {client.companyName && client.name && client.companyName !== client.name && (
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Contact: {client.name}</span>
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metadata Banner */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Owner</span>
                  <span className="font-bold text-slate-800">
                    {client.accountOwner?.fullName || 'Assigned to General Operations'}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Workforce Strength</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {client._count?.employees ?? client.employees?.length ?? 0} Employees
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Modules</span>
                  <span className="font-bold text-emerald-700 text-xs">
                    {(client.assignedModules || ['CMS', 'HRM']).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Body Tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Client Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Phone</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{client.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Email</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate">{client.email || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Location</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{client.city ? `${client.city}, ${client.state || ''}` : client.address || 'India'}</span>
                  </div>
                </div>
                {client.panNumber && (
                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">PAN / Tax ID</span>
                    <p className="text-slate-700 font-mono font-medium">{client.panNumber}</p>
                  </div>
                )}
                {client.gstin && (
                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">GSTIN</span>
                    <p className="text-slate-700 font-mono font-medium">{client.gstin}</p>
                  </div>
                )}
                {client.website && (
                  <div className="space-y-1 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Website</span>
                    <a
                      href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span className="truncate">{client.website}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'overview'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('workforce')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'workforce'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Workforce ({client.employees?.length || client._count?.employees || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('departments')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'departments'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Departments ({client.departments?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'documents'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documents ({client.documents?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeTab === 'tasks'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tasks ({tasks.length})</span>
                </button>
              </div>

              {/* Tab: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Organization Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Client Legal Name</span>
                        <span className="font-semibold text-slate-800">{client.companyName || client.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Client Code</span>
                        <span className="font-mono font-bold text-slate-800">{client.clientId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Portal User Status</span>
                        <span className="font-semibold text-slate-800">
                          {client.user?.isActive ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active Account ({client.user.email})
                            </span>
                          ) : (
                            <span className="text-slate-400">Portal Access Pending</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Onboarded Since</span>
                        <span className="font-semibold text-slate-800">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Registered Address
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {client.address ? (
                        <>
                          {client.address}
                          {client.city && `, ${client.city}`}
                          {client.state && `, ${client.state}`}
                          {client.pincode && ` - ${client.pincode}`}
                        </>
                      ) : (
                        'No physical address registered.'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Workforce */}
              {activeTab === 'workforce' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Assigned Personnel ({client.employees?.length || 0})
                    </h4>
                  </div>
                  {client.employees && client.employees.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {client.employees.map((emp: any) => (
                        <div key={emp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                              {emp.fullName?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{emp.fullName}</p>
                              <p className="text-[11px] text-slate-500">
                                {emp.designation || 'Staff'} • {emp.departmentName || 'General'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[10px] font-bold text-slate-500">{emp.employeeId}</span>
                            <span
                              className={`block text-[9px] font-bold uppercase ${
                                emp.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No personnel enrolled under this client yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Departments */}
              {activeTab === 'departments' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Client Departments ({client.departments?.length || 0})
                  </h4>
                  {client.departments && client.departments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {client.departments.map((dept: any) => (
                        <div key={dept.id} className="p-3 bg-white rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-800">{dept.name}</p>
                          {dept.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{dept.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No custom departments configured.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Documents */}
              {activeTab === 'documents' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Compliance & KYC Documents ({client.documents?.length || 0})
                  </h4>
                  {client.documents && client.documents.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {client.documents.map((doc: any) => (
                        <div key={doc.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold text-slate-800">{doc.title || doc.name || 'Document'}</p>
                              <p className="text-[10px] text-slate-400">
                                {doc.category || 'Compliance'} • {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No documents uploaded for this client.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Tasks */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Scheduled Operations Tasks ({tasks.length})
                  </h4>
                  {tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  task.priority === 'HIGH' || task.priority === 'URGENT'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {task.priority}
                              </span>
                              <p className="text-xs font-bold text-slate-800">{task.title}</p>
                            </div>
                            {task.dueDate && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</span>
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">No tasks recorded for this client.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Growth India Platform • Client Profile
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
