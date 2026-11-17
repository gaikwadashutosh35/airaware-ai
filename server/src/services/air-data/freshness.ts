export type Freshness = 'fresh' | 'stale' | 'unknown';

export function freshness(
  timestamp: string,
  now: Date,
  maxAgeMs: number,
): Freshness {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return 'unknown';
  return now.getTime() - time > maxAgeMs ? 'stale' : 'fresh';
}
