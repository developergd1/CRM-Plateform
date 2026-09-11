'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { clientCache } from '@/lib/client-cache';

export interface UseCachedDataOptions<T> {
  maxAgeMs?: number;
  initialData?: T;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: any) => void;
}

/**
 * Custom React hook for instant local cache rendering with background Stale-While-Revalidate (SWR).
 *
 * @param key Unique cache key (e.g. 'crm_leads', 'crm_deals')
 * @param fetcher Async function that fetches data from backend
 * @param options Configuration options including TTL and callbacks
 */
export function useCachedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions<T> = {}
) {
  const {
    maxAgeMs = 30 * 60 * 1000,
    initialData,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  // Read immediately from cache synchronously during initial state creation (0ms)
  const cached = key ? clientCache.get<T>(key, maxAgeMs) : null;
  const [data, setData] = useState<T>(() => (cached !== null ? cached : (initialData as T)));
  const [loading, setLoading] = useState<boolean>(() => cached === null && enabled && !!key);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const revalidate = useCallback(
    async (forceRefresh = false) => {
      if (!key || !enabled) return;

      const currentCached = !forceRefresh ? clientCache.get<T>(key, maxAgeMs) : null;
      if (currentCached === null) {
        setLoading(true);
      } else {
        setIsSyncing(true);
      }

      try {
        const freshData = await clientCache.swrFetch<T>(
          key,
          () => fetcherRef.current(),
          {
            maxAgeMs,
            forceRefresh,
            onUpdate: (updated) => {
              setData(updated);
              if (onSuccessRef.current) onSuccessRef.current(updated);
            },
          }
        );

        setData(freshData);
        setError(null);
        if (onSuccessRef.current) onSuccessRef.current(freshData);
      } catch (err) {
        setError(err);
        if (onErrorRef.current) onErrorRef.current(err);
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [key, enabled, maxAgeMs]
  );

  // Subscribe to changes in cache made by mutations in other components
  useEffect(() => {
    if (!key) return;

    const unsubscribe = clientCache.subscribe(key, (updatedData) => {
      setData(updatedData);
    });

    return () => {
      unsubscribe();
    };
  }, [key]);

  // Initial trigger & revalidate
  useEffect(() => {
    if (enabled && key) {
      // If we already have cached data, we still trigger revalidate in background silently
      revalidate(false);
    }
  }, [key, enabled, revalidate]);

  const mutate = useCallback(
    (newData: T | ((prev: T) => T), revalidateAfter = false) => {
      if (!key) return;

      const resolvedData = typeof newData === 'function' ? (newData as (prev: T) => T)(data) : newData;
      setData(resolvedData);
      clientCache.set(key, resolvedData);

      if (revalidateAfter) {
        revalidate(true);
      }
    },
    [key, data, revalidate]
  );

  return {
    data,
    loading,
    isSyncing,
    error,
    refresh: () => revalidate(true),
    mutate,
  };
}
