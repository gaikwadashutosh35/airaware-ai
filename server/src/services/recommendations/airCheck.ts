import type {
  AirAssessment,
  ForecastSeries,
  PollutantCheck,
} from '../../../../shared/contracts.ts';

// Limits: CPCB National Ambient Air Quality Standards, notification
// No. B-29016/20/90/PCI-L, 18 November 2009, 24-hour averages.
// Known limit of the method: NAAQS compliance is judged on measured station
// values over a year; this compares a 24-hour mean of a ~45 km model grid.
export const NAAQS_24H_LIMITS = { PM2_5: 60, PM10: 100 } as const;
// Open-Meteo's unit string, with Greek mu (U+03BC), not the micro sign.
export const UG_PER_M3 = 'μg/m³';

const HOUR_MS = 3_600_000;
const WINDOW_HOURS = 24;
const POLLUTANTS = ['PM2_5', 'PM10'] as const;

type Series = Pick<ForecastSeries, 'units' | 'hours'>;

// The 24 hours starting at the UTC hour that contains `now`, or [] if any
// of them is missing or off the hourly grid.
function window(series: Series, now: Date): Series['hours'] {
  const start = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const first = series.hours.findIndex(
    (hour) => Date.parse(hour.time) === start,
  );
  if (first === -1) return [];
  const hours = series.hours.slice(first, first + WINDOW_HOURS);
  const onGrid = hours.every(
    (hour, i) => Date.parse(hour.time) === start + i * HOUR_MS,
  );
  return hours.length === WINDOW_HOURS && onGrid ? hours : [];
}

function check(
  pollutant: (typeof POLLUTANTS)[number],
  series: Series | null,
  hours: Series['hours'],
): PollutantCheck {
  const limit = NAAQS_24H_LIMITS[pollutant];
  const values = hours.map((hour) => hour.values[pollutant]);
  const complete =
    series?.units[pollutant] === UG_PER_M3 &&
    values.length === WINDOW_HOURS &&
    values.every((value) => typeof value === 'number');
  if (!complete)
    return { pollutant, status: 'unknown', average24h: null, limit };

  const sum = (values as number[]).reduce((total, value) => total + value, 0);
  // Round first so the shown average and the status always agree.
  const average24h = Math.round((sum / WINDOW_HOURS) * 10) / 10;
  const status = average24h > limit ? 'above_limit' : 'within_limit';
  return { pollutant, status, average24h, limit };
}

export function assessAir(series: Series | null, now: Date): AirAssessment {
  const hours = series ? window(series, now) : [];
  const checks = POLLUTANTS.map((pollutant) => check(pollutant, series, hours));
  const statuses = checks.map((c) => c.status);
  const level = statuses.includes('above_limit')
    ? 'elevated'
    : statuses.every((status) => status === 'within_limit')
      ? 'not_elevated'
      : 'unknown';
  return { level, windowStart: hours[0]?.time ?? null, checks };
}
