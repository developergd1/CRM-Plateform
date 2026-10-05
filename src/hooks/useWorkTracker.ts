'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WorkTrackerProps {
  sessionId?: string | null;
  enabled?: boolean;
  idleThresholdMinutes?: number;
  heartbeatIntervalSec?: number;
  initialActiveSeconds?: number;
  initialIdleSeconds?: number;
  onIdleWarning?: (isIdle: boolean) => void;
  onHeartbeatSync?: (data: any) => void;
}

export function useWorkTracker({
  sessionId,
  enabled = true,
  idleThresholdMinutes = 5,
  heartbeatIntervalSec = 12,
  initialActiveSeconds = 0,
  initialIdleSeconds = 0,
  onIdleWarning,
  onHeartbeatSync,
}: WorkTrackerProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(initialActiveSeconds);
  const [idleSeconds, setIdleSeconds] = useState(initialIdleSeconds);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  const lastTickTimestamp = useRef<number>(Date.now());
  const activeSecondsAccumulator = useRef<number>(0);
  const idleSecondsAccumulator = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  // Sync initialActiveSeconds if it loads asynchronously from server
  useEffect(() => {
    if (initialActiveSeconds > 0 && !hasInitializedRef.current) {
      setActiveSeconds(initialActiveSeconds);
      hasInitializedRef.current = true;
    } else if (initialActiveSeconds > 0) {
      setActiveSeconds((prev) => Math.max(prev, initialActiveSeconds));
    }
  }, [initialActiveSeconds]);

  // Flush function to sync pending deltas with the server
  const flushHeartbeat = useCallback(
    async (isDisconnect = false) => {
      if (!sessionId) return;

      const deltaActive = activeSecondsAccumulator.current;
      const deltaIdle = idleSecondsAccumulator.current;

      // Reset accumulators immediately
      activeSecondsAccumulator.current = 0;
      idleSecondsAccumulator.current = 0;

      const payload = {
        sessionId,
        isIdle,
        deltaActiveSeconds: deltaActive,
        deltaIdleSeconds: deltaIdle,
        isDisconnect,
      };

      if (isDisconnect) {
        const jsonStr = JSON.stringify(payload);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([jsonStr], { type: 'application/json' });
          navigator.sendBeacon('/api/attendance/heartbeat', blob);
        } else {
          fetch('/api/attendance/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStr,
            keepalive: true,
          }).catch(() => {});
        }
        return;
      }

      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const res = await fetch('/api/attendance/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setLastHeartbeat(new Date());
          if (data.activeSeconds !== undefined) {
            setActiveSeconds(data.activeSeconds + activeSecondsAccumulator.current);
          }
          if (onHeartbeatSync) onHeartbeatSync(data);
        }
      } catch (err) {
        // Re-add unsent deltas back to accumulators on failure
        activeSecondsAccumulator.current += deltaActive;
        idleSecondsAccumulator.current += deltaIdle;
        console.warn('Heartbeat network failure, will retry next cycle:', err);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [sessionId, isIdle, onHeartbeatSync]
  );

  // High-precision Wall-Clock Ticker with Web Worker + Fallback
  // NEVER freezes or pauses when switching tabs!
  useEffect(() => {
    if (!enabled) return;

    lastTickTimestamp.current = Date.now();

    const processTick = () => {
      const now = Date.now();
      const elapsedMs = now - lastTickTimestamp.current;
      if (elapsedMs < 1000) return;

      const elapsedSec = Math.floor(elapsedMs / 1000);
      lastTickTimestamp.current += elapsedSec * 1000;

      activeSecondsAccumulator.current += elapsedSec;
      setActiveSeconds((prev) => prev + elapsedSec);
    };

    let worker: Worker | null = null;
    let fallbackInterval: any = null;

    try {
      const blobCode = `
        var timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timer) {
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 1000);
            }
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = () => {
        processTick();
      };
      worker.postMessage('start');
      URL.revokeObjectURL(workerUrl);
    } catch {
      fallbackInterval = setInterval(processTick, 1000);
    }

    // Immediate catch-up and sync when switching back to tab or focusing window
    const handleCatchup = () => {
      processTick();
      flushHeartbeat(false);
    };

    document.addEventListener('visibilitychange', handleCatchup);
    window.addEventListener('focus', handleCatchup);

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      document.removeEventListener('visibilitychange', handleCatchup);
      window.removeEventListener('focus', handleCatchup);
    };
  }, [enabled, flushHeartbeat]);

  // Periodic heartbeat sync every heartbeatIntervalSec (default 12s)
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const interval = setInterval(() => {
      flushHeartbeat(false);
    }, heartbeatIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [enabled, sessionId, heartbeatIntervalSec, flushHeartbeat]);

  // Unload & Tab-close beacon: ONLY triggers when tab is completely closed, window exit, or computer shutdown
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const handleUnload = () => {
      // Catch up any remaining fractional time
      const now = Date.now();
      const elapsedMs = now - lastTickTimestamp.current;
      if (elapsedMs >= 1000) {
        const elapsedSec = Math.floor(elapsedMs / 1000);
        lastTickTimestamp.current += elapsedSec * 1000;
        activeSecondsAccumulator.current += elapsedSec;
      }
      flushHeartbeat(true);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [enabled, sessionId, flushHeartbeat]);

  const dismissIdleWarning = () => {
    setIsIdle(false);
  };

  return {
    isIdle,
    activeSeconds,
    idleSeconds,
    lastHeartbeat,
    dismissIdleWarning,
    recordUserActivity: () => {},
    flushHeartbeat,
  };
}
