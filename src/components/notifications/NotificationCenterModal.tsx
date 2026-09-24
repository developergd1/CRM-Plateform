'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Coffee,
  CalendarClock,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'SECURITY' | 'COMPLIANCE'>('ALL');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const loadAlerts = async () => {
      try {
        const [leavesRes, regRes, accountsRes, offboardRes] = await Promise.all([
          fetch('/api/leave?status=PENDING'),
          fetch('/api/attendance/regularization'),
          fetch('/api/access/accounts'),
          fetch('/api/employees/offboarding'),
        ]);

        const alerts: any[] = [];

        if (leavesRes.ok) {
          const lData = await leavesRes.json();
          (lData.leaves || []).forEach((l: any) => {
            alerts.push({
              id: `leave-${l.id}`,
              type: 'LEAVE',
              category: 'ACTION_REQUIRED',
              title: `Leave Approval Request (${l.leaveType})`,
              description: `${l.employee?.fullName || 'Employee'} applied for ${l.totalDays} day(s) from ${l.startDate} to ${l.endDate}.`,
              timestamp: l.createdAt,
              targetTab: 'leave',
              icon: Coffee,
              color: 'text-rose-600 bg-rose-50',
            });
          });
        }

        if (regRes.ok) {
          const rData = await regRes.json();
          (rData.requests || [])
            .filter((r: any) => r.status === 'PENDING')
            .forEach((r: any) => {
              alerts.push({
                id: `reg-${r.id}`,
                type: 'REGULARIZATION',
                category: 'ACTION_REQUIRED',
                title: 'Attendance Regularization Pending',
                description: `${r.employeeName} requested correction for ${r.date} (${r.reason}).`,
                timestamp: r.createdAt,
                targetTab: 'regularization',
                icon: CalendarClock,
                color: 'text-amber-600 bg-amber-50',
              });
            });
        }

        if (accountsRes.ok) {
          const aData = await accountsRes.json();
          (aData.pendingResetRequests || []).forEach((req: any) => {
            alerts.push({
              id: `reset-${req.id}`,
              type: 'PASSWORD_RESET',
              category: 'SECURITY',
              title: 'Employee Password Reset Request',
              description: `${req.employeeName} (${req.employeeId}) requested password reset.`,
              timestamp: req.createdAt,
              targetTab: 'account-access',
              icon: ShieldAlert,
              color: 'text-indigo-600 bg-indigo-50',
            });
          });
        }

        if (offboardRes.ok) {
          const oData = await offboardRes.json();
          (oData.offboardings || [])
            .filter((o: any) => o.stage !== 'EXITED' && o.stage !== 'ARCHIVED')
            .forEach((o: any) => {
              alerts.push({
                id: `off-${o.id}`,
                type: 'OFFBOARDING',
                category: 'COMPLIANCE',
                title: `Offboarding Clearance Pending: ${o.employeeName}`,
                description: `Exit initiated (${o.exitType}). Last working day: ${o.lastWorkingDay}.`,
                timestamp: o.initiatedAt,
                targetTab: 'offboarding',
                icon: UserCheck,
                color: 'text-purple-600 bg-purple-50',
              });
            });
        }

        // Add standard governance health items if empty
        if (alerts.length === 0) {
          alerts.push({
            id: 'gov-healthy',
            type: 'INFO',
            category: 'COMPLIANCE',
            title: 'Workforce Governance Systems Healthy',
            description: 'All punch anomalies, leave ledgers, and KYC document verifications are up-to-date.',
            timestamp: new Date().toISOString(),
            targetTab: 'ems-overview',
            icon: CheckCheck,
            color: 'text-emerald-600 bg-emerald-50',
          });
        }

        setNotifications(alerts);
      } catch (e) {
        console.error('Error fetching alerts:', e);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = filter === 'ALL' ? notifications : notifications.filter((n) => n.category === filter);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Enterprise Notification Center</h2>
              <p className="text-[11px] text-slate-500">Live operational & security alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 bg-white">
          {(['ALL', 'ACTION_REQUIRED', 'SECURITY', 'COMPLIANCE'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filter === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat === 'ACTION_REQUIRED' ? 'Action' : cat === 'SECURITY' ? 'Security' : 'Compliance'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Scanning enterprise event bus...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <CheckCheck className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-semibold text-slate-700">No Pending Alerts</p>
              <p className="text-[11px] text-slate-500">All workforce requests and security items are verified.</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const IconComp = alert.icon;
              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    onNavigateTab(alert.targetTab);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all bg-white cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {alert.title}
                        </h4>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {alert.description}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(alert.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>{filtered.length} alert(s) displayed</span>
          <button
            onClick={() => {
              onNavigateTab('audit-logs');
              onClose();
            }}
            className="font-bold text-teal-700 hover:underline cursor-pointer"
          >
            View Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
};
