import { describe, expect, it } from 'vitest';
import type { ForecastSeries } from '../../../../shared/contracts.ts';
import pune from '../air-data/fixtures/open-meteo-pune.json' with { type: 'json' };
import { UG_PER_M3, assessAir } from './airCheck.ts';

const HOUR = 3_600_000;
const now = new Date('2026-11-18T10:20:00Z');
const fill = (n: number, v: number | null) => Array<number | null>(n).fill(v);

function series(
  startIso: string,
  pm25: Array<number | null>,
  pm10: Array<number | null>,
  units: ForecastSeries['units'] = { PM2_5: UG_PER_M3, PM10: UG_PER_M3 },
): Pick<ForecastSeries, 'units' | 'hours'> {
  const start = Date.parse(startIso);
  return {
    units,
    hours: pm25.map((value, i) => ({
      time: new Date(start + i * HOUR).toISOString(),
      values: { PM2_5: value, PM10: pm10[i] ?? null },
    })),
  };
}

describe('assessAir', () => {
  it('uses the unit string Open-Meteo actually sends', () => {
    expect(UG_PER_M3).toBe(pune.hourly_units.pm2_5);
  });

  it('PM2.5 average of 60.1 is above', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', fill(24, 60.1), fill(24, 50)),
      now,
    );

    expect(result.level).toBe('elevated');
    expect(result.checks[0]).toEqual({
      pollutant: 'PM2_5',
      status: 'above_limit',
      average24h: 60.1,
      limit: 60,
    });
    expect(result.checks[1]).toEqual({
      pollutant: 'PM10',
      status: 'within_limit',
      average24h: 50,
      limit: 100,
    });
  });

  it('exactly 60.0 and 100.0 are within', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', fill(24, 60), fill(24, 100)),
      now,
    );

    expect(result.level).toBe('not_elevated');
    expect(result.checks.map((check) => check.status)).toEqual([
      'within_limit',
      'within_limit',
    ]);
  });

  it('PM10 average of 100.1 is above', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', fill(24, 10), fill(24, 100.1)),
      now,
    );

    expect(result.level).toBe('elevated');
    expect(result.checks[1]?.status).toBe('above_limit');
  });

  it('rounds before comparing', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', [...fill(23, 60), 61], fill(24, 10)),
      now,
    );

    expect(result.checks[0]).toMatchObject({
      status: 'within_limit',
      average24h: 60,
    });
  });

  it('starts at the hour containing now', () => {
    const result = assessAir(
      series(
        '2026-11-18T09:00:00Z',
        [1000, ...fill(24, 10)],
        [1000, ...fill(24, 10)],
      ),
      now,
    );

    expect(result.level).toBe('not_elevated');
    expect(result.checks[0]?.average24h).toBe(10);
  });

  it('now on the hour starts the window at that hour', () => {
    const result = assessAir(
      series(
        '2026-11-18T09:00:00Z',
        [1000, ...fill(24, 10)],
        [1000, ...fill(24, 10)],
      ),
      new Date('2026-11-18T10:00:00.000Z'),
    );

    expect(result.checks[0]?.average24h).toBe(10);
  });

  it('a null in the window is unknown', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', [...fill(23, 10), null], fill(24, 10)),
      now,
    );

    expect(result.checks[0]).toMatchObject({
      status: 'unknown',
      average24h: null,
    });
    expect(result.level).toBe('unknown');
  });

  it('one pollutant above and one unknown is elevated', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', [...fill(23, 10), null], fill(24, 150)),
      now,
    );

    expect(result.level).toBe('elevated');
  });

  it('fewer than 24 hours is unknown', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', fill(23, 10), fill(23, 10)),
      now,
    );

    expect(result.level).toBe('unknown');
    expect(result.checks.map((check) => check.status)).toEqual([
      'unknown',
      'unknown',
    ]);
  });

  it('a gap between hours is unknown', () => {
    const start = Date.parse('2026-11-18T10:00:00Z');
    const gapped: Pick<ForecastSeries, 'units' | 'hours'> = {
      units: { PM2_5: UG_PER_M3, PM10: UG_PER_M3 },
      hours: fill(24, 10).map((_, i) => ({
        time: new Date(start + (i < 12 ? i : i + 1) * HOUR).toISOString(),
        values: { PM2_5: 10, PM10: 10 },
      })),
    };

    expect(assessAir(gapped, now).level).toBe('unknown');
  });

  it('half-hour timestamps are unknown', () => {
    const result = assessAir(
      series('2026-11-18T10:30:00Z', fill(24, 10), fill(24, 10)),
      now,
    );

    expect(result.level).toBe('unknown');
  });

  it('a past series is unknown', () => {
    const result = assessAir(
      series('2026-11-17T00:00:00Z', fill(24, 10), fill(24, 10)),
      now,
    );

    expect(result.level).toBe('unknown');
  });

  it('a different unit is unknown', () => {
    const result = assessAir(
      series('2026-11-18T10:00:00Z', fill(24, 10), fill(24, 10), {
        PM2_5: 'µg/m³', // micro sign, not Greek mu
        PM10: UG_PER_M3,
      }),
      now,
    );

    expect(result.checks[0]?.status).toBe('unknown');
    expect(result.level).toBe('unknown');
  });

  it('no series is unknown', () => {
    expect(assessAir(null, now)).toEqual({
      level: 'unknown',
      checks: [
        { pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 },
        { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 },
      ],
    });
  });
});
