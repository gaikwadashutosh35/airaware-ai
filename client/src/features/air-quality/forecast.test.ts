import { describe, expect, it } from 'vitest';
import { forecastFixture } from '../../test/fixtures.ts';
import { formatDateTime, hourForNow } from './forecast.ts';

describe('formatDateTime', () => {
  it('formats a date with day, month and time zone', () => {
    const iso = '2026-11-20T02:30:00Z';
    const date = new Date(iso);
    const text = formatDateTime(iso);
    expect(text).toContain(
      new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
    );
    expect(text).toContain(
      new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date),
    );
    expect(text).toMatch(/[A-Z]{2,}|GMT/);
  });
});

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
