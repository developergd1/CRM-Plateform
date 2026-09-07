'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WorkTrackerProps {
  sessionId?: string | null;
  enabled?: boolean;
  idleThresholdMinutes?: number;
  heartbeatIntervalSec?: number;
  onIdleWarning?: (isIdle: boolean) => void;
  onHeartbeatSync?: (data: any) => void;
}

export function useWorkTracker({
  sessionId,
  enabled = true,
  idleThresholdMinutes = 5,
  heartbeatIntervalSec = 30,
  onIdleWarning,
  onHeartbeatSync,
}: WorkTrackerProps) {
  const [isIdle, setIsIdle] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  const lastActivityTimestamp = useRef<number>(Date.now());
  const activeSecondsAccumulator = useRef<number>(0);
  const idleSecondsAccumulator = useRef<number>(0);
  const idleThresholdMs = idleThresholdMinutes * 60 * 1000;

  // Reset idle state on user interaction
  const recordUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityTimestamp.current = now;
    if (isIdle) {
      setIsIdle(false);
      if (onIdleWarning) onIdleWarning(false);
    }
  }, [isIdle, onIdleWarning]);

  // Activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    const handleEvent = () => recordUserActivity();

    events.forEach((evt) => window.addEventListener(evt, handleEvent, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
    };
  }, [enabled, recordUserActivity]);

  // Second-by-second ticker to track active vs idle time
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceActivity = now - lastActivityTimestamp.current;

      if (elapsedSinceActivity >= idleThresholdMs) {
        if (!isIdle) {
          setIsIdle(true);
          if (onIdleWarning) onIdleWarning(true);
        }
        idleSecondsAccumulator.current += 1;
        setIdleSeconds((prev) => prev + 1);
      } else {
        activeSecondsAccumulator.current += 1;
        setActiveSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, idleThresholdMs, isIdle, onIdleWarning]);

  // Periodic heartbeat sync to server
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const interval = setInterval(async () => {
      const deltaActive = activeSecondsAccumulator.current;
      const deltaIdle = idleSecondsAccumulator.current;

      // Reset accumulators
      activeSecondsAccumulator.current = 0;
      idleSecondsAccumulator.current = 0;

      try {
        const res = await fetch('/api/attendance/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            isIdle,
            deltaActiveSeconds: deltaActive,
            deltaIdleSeconds: deltaIdle,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setLastHeartbeat(new Date());
          if (onHeartbeatSync) onHeartbeatSync(data);
        }
      } catch (err) {
        console.warn('Heartbeat network failure, will retry next cycle:', err);
      }
    }, heartbeatIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [enabled, sessionId, isIdle, heartbeatIntervalSec, onHeartbeatSync]);

  const dismissIdleWarning = () => {
    recordUserActivity();
  };

  return {
    isIdle,
    activeSeconds,
    idleSeconds,
    lastHeartbeat,
    dismissIdleWarning,
    recordUserActivity,
  };
}
