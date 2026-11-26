import { z } from 'zod';
import type { WeatherDay, WeatherNow } from '../../../../shared/contracts.ts';
import { fetchJson } from '../fetchJson.ts';

// Open-Meteo's weather forecast (free, no key). Fixed host, like the air
// call, so no configuration can redirect it.
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const WEATHER_SOURCE_URL = 'https://open-meteo.com/en/docs';
const HOUR_MS = 3_600_000;
const DAY_S = 86_400;
const DAY_NAMES = ['yesterday', 'today', 'tomorrow'] as const;
const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
] as const;

const VARIABLES = [
  'temperature_2m',
  'precipitation',
  'precipitation_probability',
  'cloud_cover',
  'visibility',
  'is_day',
] as const;

const column = z.array(z.number().nullable()).optional();
const rawWeather = z
  .object({
    // Seconds east of UTC for the place (timezone=auto): local dates need it.
    // Real zones lie within -18 h to +18 h.
    utc_offset_seconds: z.number().int().min(-64800).max(64800),
    daily: z
      .object({
        time: z.array(z.number().int()),
        temperature_2m_max: column,
        temperature_2m_min: column,
        precipitation_sum: column,
      })
      .optional(),
    hourly: z.object({
      time: z.array(z.number().int()).min(1),
      temperature_2m: column,
      precipitation: column,
      precipitation_probability: column,
      cloud_cover: column,
      visibility: column,
      is_day: column,
    }),
  })
  .refine(
    ({ hourly, daily }) =>
      VARIABLES.every(
        (name) => !hourly[name] || hourly[name].length === hourly.time.length,
      ) &&
      (!daily ||
        DAILY.every(
          (name) => !daily[name] || daily[name].length === daily.time.length,
        )),
  );

// This hour's weather for coordinates already rounded for privacy, or null
// when the provider fails or has no hour containing `now`. Never throws:
// the air forecast must not fail because of the weather.
export async function fetchWeather(
  latitude: number,
  longitude: number,
  now: Date,
): Promise<WeatherNow | null> {
  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('hourly', VARIABLES.join(','));
  url.searchParams.set('timeformat', 'unixtime');
  // Yesterday, today and tomorrow in the place's own time.
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('daily', DAILY.join(','));
  let raw: z.infer<typeof rawWeather>;
  try {
    raw = await fetchJson(url, rawWeather);
  } catch {
    return null;
  }

  const t = now.getTime();
  const i = raw.hourly.time.findIndex(
    (seconds) => seconds * 1000 <= t && t < seconds * 1000 + HOUR_MS,
  );
  if (i === -1) return null;
  const at = (name: (typeof VARIABLES)[number], row = i) =>
    raw.hourly[name]?.[row] ?? null;
  const offset = raw.utc_offset_seconds;
  // null for a time no date can hold, so one bad value never throws.
  const localDate = (seconds: number) => {
    const d = new Date((seconds + offset) * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };
  // ponytail: same hour = exactly 24 h apart; on a daylight-saving change day
  // the local hour is off by one. Add zone-aware lookup if such a place matters.
  const days: WeatherDay[] = DAY_NAMES.map((day, d) => {
    const seconds = raw.hourly.time[i]! + (d - 1) * DAY_S;
    const row = raw.hourly.time.indexOf(seconds);
    const date = localDate(seconds)!;
    const k = raw.daily?.time.findIndex((s) => localDate(s) === date) ?? -1;
    const daily = (name: (typeof DAILY)[number]) =>
      raw.daily?.[name]?.[k] ?? null;
    const hourly = (name: (typeof VARIABLES)[number]) =>
      raw.hourly[name]?.[row] ?? null;
    return {
      day,
      date,
      minC: daily('temperature_2m_min'),
      maxC: daily('temperature_2m_max'),
      precipitationMm: daily('precipitation_sum'),
      atHour: {
        time: new Date(seconds * 1000).toISOString(),
        temperatureC: hourly('temperature_2m'),
        cloudCoverPct: hourly('cloud_cover'),
      },
    };
  });
  return {
    time: new Date(raw.hourly.time[i]! * 1000).toISOString(),
    temperatureC: at('temperature_2m'),
    // Sums over the hour before each row: this hour's are on the next row.
    precipitationMm: at('precipitation', i + 1),
    precipitationProbability: at('precipitation_probability', i + 1),
    cloudCoverPercent: at('cloud_cover'),
    visibilityM: at('visibility'),
    // A point value for this hour (1 day, 0 night), unlike the sums above.
    isDay: at('is_day') === null ? null : at('is_day') === 1,
    retrievedAt: now.toISOString(),
    utcOffsetSeconds: offset,
    days,
  };
}
