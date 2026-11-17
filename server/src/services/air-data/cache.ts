// In-memory TTL cache, bounded so distinct keys cannot grow it without limit.
// ponytail: per-instance memory; a shared store only if Cloud Run scales out
// enough for duplicate upstream calls to matter.
export function createTtlCache<T>(ttlMs: number, maxEntries: number) {
  const entries = new Map<string, { value: T; expiresAt: number }>();
  return {
    get(key: string, nowMs: number): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (nowMs >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T, nowMs: number): void {
      entries.delete(key);
      if (entries.size >= maxEntries) {
        // Map keeps insertion order: the first key is the oldest.
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(key, { value, expiresAt: nowMs + ttlMs });
    },
  };
}
