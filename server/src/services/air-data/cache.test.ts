import { describe, expect, it } from 'vitest';
import { createTtlCache } from './cache.ts';

describe('createTtlCache', () => {
  it('returns a value until just before its TTL ends', () => {
    const cache = createTtlCache<string>(1000, 10);
    cache.set('a', 'A', 0);

    expect(cache.get('a', 999)).toBe('A');
  });

  it('drops a value exactly at its TTL', () => {
    const cache = createTtlCache<string>(1000, 10);
    cache.set('a', 'A', 0);

    expect(cache.get('a', 1000)).toBeUndefined();
  });

  it('evicts the oldest entry when full', () => {
    const cache = createTtlCache<string>(1000, 2);
    cache.set('a', 'A', 0);
    cache.set('b', 'B', 0);
    cache.set('c', 'C', 0);

    expect(cache.get('a', 0)).toBeUndefined();
    expect(cache.get('b', 0)).toBe('B');
    expect(cache.get('c', 0)).toBe('C');
  });
});
