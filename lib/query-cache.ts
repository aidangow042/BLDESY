/**
 * Simple in-memory query cache with TTL.
 * Avoids redundant Supabase fetches when navigating back to a screen.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/** Get cached result, or null if expired/missing */
export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Store result in cache */
export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/** Invalidate a specific key or all keys matching a prefix */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix + ':')) {
      cache.delete(key);
    }
  }
}
