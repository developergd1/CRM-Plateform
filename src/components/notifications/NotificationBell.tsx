'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Clock, ExternalLink, X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  variant?: 'light' | 'dark';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ variant = 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, actionUrl?: string | null) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (actionUrl) {
        setIsOpen(false);
        router.push(actionUrl);
      }
    } catch (e) {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // silent
    }
  };

  const isLight = variant === 'light';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`interactive-btn-hover relative p-2 rounded-xl transition-all flex items-center justify-center ${
          isLight
            ? 'text-slate-600 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200/90 border border-slate-200 shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Notifications"
        aria-label="View Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-md border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 ? (
                <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">
                  All caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-growth-teal hover:text-teal-300 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-semibold">No notifications yet</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Real-time alerts for tasks, leaves, and approvals appear here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.actionUrl)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start ${
                    n.isRead ? 'bg-slate-900/40 hover:bg-slate-800/40 text-slate-400' : 'bg-slate-800/70 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div
                    className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                      n.isRead ? 'bg-transparent' : 'bg-teal-400 ring-4 ring-teal-400/20'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold truncate ${n.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {n.title}
                      </span>
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono" suppressHydrationWarning>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    {n.actionUrl && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-growth-teal font-semibold mt-1 hover:underline">
                        View details <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
