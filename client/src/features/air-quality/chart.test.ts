import { describe, expect, it } from 'vitest';
import { forecastFixture } from '../../test/fixtures.ts';
import {
  markerIndex,
  niceCeiling,
  summarize,
  tickIndexes,
  valueRuns,
} from './chart.ts';
import { formatDateTime } from './forecast.ts';

describe('chart maths', () => {
  it('rounds the axis up to 1, 2 or 5 × 10ⁿ', () => {
    expect(
      [0, 7, 48, 92, 101, Number.NaN, -3].map((max) => niceCeiling(max)),
    ).toEqual([10, 10, 50, 100, 200, 10, 10]);
  });

  it('breaks the line at a missing hour instead of joining across it', () => {
    expect(valueRuns([10, null, 20, 30], 40)).toEqual([
      [{ x: 0, y: 75 }],
      [
        { x: 200 / 3, y: 50 },
        { x: 100, y: 25 },
      ],
    ]);
    expect(valueRuns([null, undefined], 10)).toEqual([]);
    expect(valueRuns([5], 10)).toEqual([[{ x: 50, y: 50 }]]);
  });

  it('labels every 6th hour', () => {
    expect(tickIndexes(48)).toEqual([0, 6, 12, 18, 24, 30, 36, 42]);
    expect(tickIndexes(3)).toEqual([0]);
    expect(tickIndexes(0)).toEqual([]);
  });

  it('marks the load hour only when it is in the forecast', () => {
    // 17:00, 18:00 and 19:00 UTC.
    const times = forecastFixture.hours.map((hour) => hour.time);
    expect(markerIndex(times, new Date('2026-11-17T18:30:00Z'))).toBe(1);
    expect(markerIndex(times, new Date('2026-11-17T17:00:00Z'))).toBe(0);
    expect(markerIndex(times, new Date('2026-11-17T21:00:00Z'))).toBeNull();
    expect(markerIndex(times, new Date('2026-11-17T16:59:00Z'))).toBeNull();
  });

  it('summarises the range and the time of the highest value', () => {
    // PM2.5: 48, 45.6, 43.1.
    const hours = forecastFixture.hours;
    expect(summarize(hours, 'PM2_5', 'μg/m³')).toBe(
      `PM2.5 ranges from 43.1 to 48 μg/m³ over the next 3 hours, highest around ${formatDateTime(hours[0].time)}.`,
    );
  });

  it('mentions missing values', () => {
    const gappy = forecastFixture.hours.map((hour, i) =>
      i === 1 ? { ...hour, values: { ...hour.values, PM10: null } } : hour,
    );
    expect(summarize(gappy, 'PM10', 'μg/m³')).toMatch(
      / No value for 1 of 3 hours\.$/,
    );
  });

  it('says when there are no values at all', () => {
    const none = forecastFixture.hours.map((hour) => ({ ...hour, values: {} }));
    expect(summarize(none, 'PM10', 'μg/m³')).toBe(
      'No PM10 values in this forecast.',
    );
  });
});
