import { describe, expect, it } from 'vitest';
import type {
  AirAssessment,
  LimitStatus,
} from '../../../../shared/contracts.ts';
import { hazeLevel } from './haze.ts';

// An air check with the given 24-hour averages (null = unknown).
function check(pm25: number | null, pm10: number | null): AirAssessment {
  const status = (average: number | null, limit: number): LimitStatus =>
    average === null
      ? 'unknown'
      : average > limit
        ? 'above_limit'
        : 'within_limit';
  const checks = [
    {
      pollutant: 'PM2_5' as const,
      status: status(pm25, 60),
      average24h: pm25,
      limit: 60,
    },
    {
      pollutant: 'PM10' as const,
      status: status(pm10, 100),
      average24h: pm10,
      limit: 100,
    },
  ];
  const statuses = checks.map((c) => c.status);
  const level = statuses.includes('above_limit')
    ? 'elevated'
    : statuses.every((s) => s === 'within_limit')
      ? 'not_elevated'
      : 'unknown';
  return { level, windowStart: '2026-11-18T10:00:00.000Z', checks };
}

describe('hazeLevel', () => {
  it('unknown air is level 0', () => {
    expect(hazeLevel(check(null, null))).toBe(0);
    // Within for PM2.5 but PM10 unknown: the server calls the level unknown.
    expect(hazeLevel(check(20, null))).toBe(0);
  });

  it('bands by the larger ratio', () => {
    expect(hazeLevel(check(20, 30))).toBe(1);
    expect(hazeLevel(check(45, 30))).toBe(2);
    expect(hazeLevel(check(72, 30))).toBe(3);
    expect(hazeLevel(check(100, 30))).toBe(4);
    expect(hazeLevel(check(130, 30))).toBe(5);
    expect(hazeLevel(check(20, 160))).toBe(4);
  });

  it('an average equal to the limit stays at level 2', () => {
    expect(hazeLevel(check(60, 30))).toBe(2);
    expect(hazeLevel(check(30, 30))).toBe(1);
    expect(hazeLevel(check(90, 30))).toBe(3);
    expect(hazeLevel(check(120, 30))).toBe(4);
  });

  it('uses the known ratio when one check is unknown', () => {
    expect(hazeLevel(check(72, null))).toBe(3);
  });

  it('the sky is never clear', () => {
    expect(hazeLevel(check(0, 0))).toBe(1);
  });

  it('level 3 or more exactly when a check is above the limit', () => {
    for (const [pm25, pm10] of [
      [59.9, 99.9],
      [60, 100],
      [60.1, 20],
      [10, 100.1],
      [200, 250],
    ] as const) {
      const air = check(pm25, pm10);
      const above = air.checks.some((c) => c.status === 'above_limit');
      expect(hazeLevel(air) >= 3).toBe(above);
    }
  });
});
