/**
 * High-Performance Persistent Local Cache & SWR Sync Engine for Growth India CRM Platform.
 * 
 * Features:
 * 1. Multi-tier caching: In-Memory (0ms) -> LocalStorage (persistent across browser restarts) -> Network
 * 2. In-flight promise deduplication to prevent duplicate concurrent network requests
 * 3. Event-based subscriber updates when data changes
 * 4. Stale-While-Revalidate (SWR) background sync
 * 5. Automatic invalidation by key prefix/tag
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  hash?: string;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const listeners = new Map<string, Set<(data: any) => void>>();

// Helper to calculate simple fast string hash for delta change detection
function computeHash(data: any): string {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return String(hash);
  } catch {
    return String(Date.now());
  }
}

export const clientCache = {
  /**
   * Retrieves data instantly from memory or persistent localStorage.
   */
  get<T>(key: string, maxAgeMs = 30 * 60 * 1000): T | null {
    if (typeof window === 'undefined') return null;

    try {
      // 1. In-Memory fast tier
      const mem = memoryCache.get(key);
      if (mem && Date.now() - mem.timestamp < maxAgeMs) {
        return mem.data as T;
      }

      // 2. Persistent localStorage tier
      const item = localStorage.getItem(`gi_cache_${key}`) || sessionStorage.getItem(`gi_cache_${key}`);
      if (!item) return null;

      const parsed: CacheEntry<T> = JSON.parse(item);
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        memoryCache.set(key, parsed);
        return parsed.data;
      } else {
        // Expired from storage
        localStorage.removeItem(`gi_cache_${key}`);
        sessionStorage.removeItem(`gi_cache_${key}`);
        memoryCache.delete(key);
        return null;
      }
    } catch {
      return null;
    }
  },

  /**
   * Stores data in both memory and persistent localStorage.
   */
  set<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;

    try {
      const hash = computeHash(data);
      const existing = memoryCache.get(key);
      const hasChanged = !existing || existing.hash !== hash;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash,
      };

      memoryCache.set(key, entry);

      const serialized = JSON.stringify(entry);
      try {
        localStorage.setItem(`gi_cache_${key}`, serialized);
      } catch {
        // Fallback to sessionStorage if localStorage quota exceeded
        try {
          sessionStorage.setItem(`gi_cache_${key}`, serialized);
        } catch {
          // In-memory will still work
        }
      }

      // Notify subscribers if data changed
      if (hasChanged) {
        const keyListeners = listeners.get(key);
        if (keyListeners) {
          keyListeners.forEach((cb) => cb(data));
        }
      }
    } catch {
      // safe fallback
    }
  },

  /**
   * Removes an item from cache across all tiers.
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      memoryCache.delete(key);
      localStorage.removeItem(`gi_cache_${key}`);
      sessionStorage.removeItem(`gi_cache_${key}`);
    } catch {}
  },

  /**
   * Clears all cached items or all items starting with a specific prefix.
   */
  clear(prefix?: string): void {
    if (typeof window === 'undefined') return;

    try {
      if (!prefix) {
        memoryCache.clear();
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('gi_cache_')) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        const sessionKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('gi_cache_')) sessionKeys.push(k);
        }
        sessionKeys.forEach((k) => sessionStorage.removeItem(k));
      } else {
        for (const k of Array.from(memoryCache.keys())) {
          if (k.startsWith(prefix)) memoryCache.delete(k);
        }

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`gi_cache_${prefix}`)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        const sessionKeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(`gi_cache_${prefix}`)) sessionKeys.push(k);
        }
        sessionKeys.forEach((k) => sessionStorage.removeItem(k));
      }
    } catch {}
  },

  /**
   * Stale-While-Revalidate (SWR) fetching utility with deduplication.
   * Returns cached data immediately if available, while fetching fresh data in the background.
   */
  async swrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      maxAgeMs?: number;
      forceRefresh?: boolean;
      onUpdate?: (freshData: T) => void;
    }
  ): Promise<T> {
    const maxAgeMs = options?.maxAgeMs ?? 30 * 60 * 1000;
    const force = Boolean(options?.forceRefresh);

    const cached = !force ? this.get<T>(key, maxAgeMs) : null;

    // Check if there is already a fetch in flight for this key
    let inFlight = inFlightRequests.get(key);

    if (!inFlight) {
      inFlight = (async () => {
        try {
          const freshData = await fetcher();
          if (freshData !== undefined && freshData !== null) {
            const oldHash = memoryCache.get(key)?.hash;
            const newHash = computeHash(freshData);

            this.set(key, freshData);

            if (options?.onUpdate && oldHash !== newHash) {
              options.onUpdate(freshData);
            }
          }
          return freshData;
        } finally {
          inFlightRequests.delete(key);
        }
      })();

      inFlightRequests.set(key, inFlight);
    }

    // If we have cached data and not forced, return cached immediately
    // The background in-flight promise will update the cache and invoke onUpdate
    if (cached !== null) {
      return cached;
    }

    // Otherwise await the in-flight network request
    return await inFlight;
  },

  /**
   * Subscribe to cache changes for a specific key.
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)!.add(callback);

    return () => {
      const keyListeners = listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
          listeners.delete(key);
        }
      }
    };
  },
};
