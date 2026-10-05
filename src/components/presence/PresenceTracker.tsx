'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PresenceTrackerProps {
  activeTab?: string;
}

/**
 * Headless presence tracker component.
 * Periodically sends a heartbeat to /api/presence/heartbeat to maintain
 * online/offline status, active tab, and current page URL.
 */
export const PresenceTracker: React.FC<PresenceTrackerProps> = ({ activeTab }) => {
  const pathname = usePathname();
  const lastPingRef = useRef<number>(0);

  const sendHeartbeat = async () => {
    try {
      // Throttle rapid pings to minimum 4 seconds apart
      const now = Date.now();
      if (now - lastPingRef.current < 4000) return;
      lastPingRef.current = now;

      await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPath: pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
          currentTab: activeTab || '',
          pageTitle: typeof document !== 'undefined' ? document.title : '',
        }),
      });
    } catch (e) {
      // Background presence heartbeat should fail silently
    }
  };

  useEffect(() => {
    // 1. Send immediately when mounted or tab/pathname changes
    sendHeartbeat();

    // 2. Set interval to heartbeat every 20 seconds
    const interval = setInterval(sendHeartbeat, 20000);

    // 3. Send heartbeat when user refocuses window
    const handleFocus = () => sendHeartbeat();
    window.addEventListener('focus', handleFocus);

    // 4. Send disconnect beacon when closing tab, window, or shutting down
    const handleUnload = () => {
      const payload = JSON.stringify({ isDisconnect: true });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/presence/heartbeat', blob);
      } else {
        fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [pathname, activeTab]);

  return null;
};
