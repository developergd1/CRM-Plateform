/**
 * Fast client-side session cache for CRM Platform data.
 * Caches API responses in sessionStorage & memory to prevent redundant backend hits
 * and eliminate background auto-refresh / screen flickering.
 */

const memoryCache = new Map<string, { data: any; timestamp: number }>();

export const clientCache = {
  get<T>(key: string, maxAgeMs = 15 * 60 * 1000): T | null {
    if (typeof window === 'undefined') return null;
    try {
      // 1. Check memory cache first
      const mem = memoryCache.get(key);
      if (mem && Date.now() - mem.timestamp < maxAgeMs) {
        return mem.data as T;
      }

      // 2. Check sessionStorage
      const item = sessionStorage.getItem(`gi_cache_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        memoryCache.set(key, parsed);
        return parsed.data as T;
      } else {
        sessionStorage.removeItem(`gi_cache_${key}`);
        memoryCache.delete(key);
        return null;
      }
    } catch {
      return null;
    }
  },

  set(key: string, data: any): void {
    if (typeof window === 'undefined') return;
    try {
      const entry = { data, timestamp: Date.now() };
      memoryCache.set(key, entry);
      sessionStorage.setItem(`gi_cache_${key}`, JSON.stringify(entry));
    } catch {
      // Safe fallback if storage quota exceeded
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      memoryCache.delete(key);
      sessionStorage.removeItem(`gi_cache_${key}`);
    } catch {}
  },

  clear(prefix?: string): void {
    if (typeof window === 'undefined') return;
    try {
      if (!prefix) {
        memoryCache.clear();
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith('gi_cache_')) sessionStorage.removeItem(k);
        });
      } else {
        for (const k of memoryCache.keys()) {
          if (k.startsWith(prefix)) memoryCache.delete(k);
        }
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith(`gi_cache_${prefix}`)) sessionStorage.removeItem(k);
        });
      }
    } catch {}
  },
};
