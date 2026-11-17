import { describe, expect, it } from 'vitest';
import { freshness } from './freshness.ts';

const NOW = new Date('2026-11-17T12:00:00.000Z');
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

describe('freshness', () => {
  it('is fresh at exactly the maximum age', () => {
    expect(freshness('2026-11-17T00:00:00.000Z', NOW, TWELVE_HOURS_MS)).toBe(
      'fresh',
    );
  });

  it('is stale one millisecond past the maximum age', () => {
    expect(freshness('2026-11-16T23:59:59.999Z', NOW, TWELVE_HOURS_MS)).toBe(
      'stale',
    );
  });

  it('is unknown when the timestamp cannot be parsed', () => {
    expect(freshness('not-a-date', NOW, TWELVE_HOURS_MS)).toBe('unknown');
  });
});
