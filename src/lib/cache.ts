// Simple localStorage cache with TTL for low-bandwidth/offline reuse
const PREFIX = "boighor_cache_v1:";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { v, e } = JSON.parse(raw);
    if (e && Date.now() > e) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return v as T;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, e: Date.now() + ttlMs }));
  } catch {
    // quota exceeded — best effort: clear old entries
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .slice(0, 20)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, e: Date.now() + ttlMs }));
    } catch {}
  }
}
