import { z } from 'zod';
import type { WeatherNow } from '../../../../shared/contracts.ts';
import { fetchJson } from '../fetchJson.ts';

// Open-Meteo's weather forecast (free, no key). Fixed host, like the air
// call, so no configuration can redirect it.
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const WEATHER_SOURCE_URL = 'https://open-meteo.com/en/docs';
const HOUR_MS = 3_600_000;

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
  .refine(({ hourly }) =>
    VARIABLES.every(
      (name) => !hourly[name] || hourly[name].length === hourly.time.length,
    ),
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
  url.searchParams.set('forecast_hours', '3');
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
  };
}
