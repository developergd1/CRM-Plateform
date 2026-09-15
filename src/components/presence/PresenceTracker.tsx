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

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname, activeTab]);

  return null;
};
