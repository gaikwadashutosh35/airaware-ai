import { describe, expect, it } from 'vitest';
import { forecastFixture } from '../../test/fixtures.ts';
import { hourForNow } from './forecast.ts';

describe('hourForNow', () => {
  it('returns the hour that contains now', () => {
    expect(
      hourForNow(forecastFixture, new Date('2026-11-17T18:30:00Z'))?.time,
    ).toBe('2026-11-17T18:00:00.000Z');
  });

  it('includes the start of the hour', () => {
    expect(
      hourForNow(forecastFixture, new Date('2026-11-17T17:00:00Z'))?.time,
    ).toBe('2026-11-17T17:00:00.000Z');
  });

  it('falls back to the first hour when now is outside the series', () => {
    expect(
      hourForNow(forecastFixture, new Date('2026-11-17T16:59:00Z'))?.time,
    ).toBe('2026-11-17T17:00:00.000Z');
  });

  it('returns undefined for an empty series', () => {
    expect(
      hourForNow({ ...forecastFixture, hours: [] }, new Date()),
    ).toBeUndefined();
  });
});
