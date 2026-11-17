import { z } from 'zod';
import { fetchJson } from '../fetchJson.ts';

export type Pollutant = 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';

export interface ForecastSeries {
  provider: 'Open-Meteo';
  sourceUrl: string;
  dataKind: 'model_forecast';
  modelResolution: string;
  retrievedAt: string;
  units: Partial<Record<Pollutant, string>>;
  hours: Array<{
    time: string;
    values: Partial<Record<Pollutant, number | null>>;
  }>;
  limitations: string[];
}

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const SOURCE_URL = 'https://open-meteo.com/en/docs/air-quality-api';
// Fixed by `domains=cams_global` (Open-Meteo docs, checked 2026-11-17).
const MODEL_RESOLUTION =
  'CAMS global atmospheric composition forecast, 0.4° (~45 km) grid';
export const LIMITATIONS = [
  'Model forecast, not a station observation.',
  'Not the CPCB National AQI.',
  'Grid cell is about 45 km wide; conditions near roads or local sources can differ.',
];

// Open-Meteo variable → [our pollutant, display label]. No AQI variables.
const VARIABLES = {
  pm2_5: ['PM2_5', 'PM2.5'],
  pm10: ['PM10', 'PM10'],
  nitrogen_dioxide: ['NO2', 'NO2'],
  sulphur_dioxide: ['SO2', 'SO2'],
  ozone: ['O3', 'O3'],
  carbon_monoxide: ['CO', 'CO'],
} as const satisfies Record<string, readonly [Pollutant, string]>;
type Variable = keyof typeof VARIABLES;
const VARIABLE_NAMES = Object.keys(VARIABLES) as Variable[];

const values = z.array(z.number().nonnegative().nullable()).optional();
const rawForecast = z
  .object({
    hourly_units: z.record(z.string(), z.string()),
    hourly: z.object({
      time: z.array(z.number().int()).min(1),
      pm2_5: values,
      pm10: values,
      nitrogen_dioxide: values,
      sulphur_dioxide: values,
      ozone: values,
      carbon_monoxide: values,
    }),
  })
  .refine(({ hourly }) =>
    VARIABLE_NAMES.every(
      (name) => !hourly[name] || hourly[name].length === hourly.time.length,
    ),
  )
  .refine(({ hourly, hourly_units }) =>
    VARIABLE_NAMES.every((name) => !hourly[name] || hourly_units[name]),
  );

// Callers pass coordinates already rounded for privacy.
export async function fetchForecast(
  latitude: number,
  longitude: number,
  now: Date,
): Promise<ForecastSeries> {
  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('hourly', VARIABLE_NAMES.join(','));
  url.searchParams.set('domains', 'cams_global');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('forecast_hours', '48');
  const raw = await fetchJson(url, rawForecast);

  const units: ForecastSeries['units'] = {};
  const limitations = [...LIMITATIONS];
  const columns: Array<[Pollutant, Array<number | null>]> = [];
  for (const name of VARIABLE_NAMES) {
    const [pollutant, label] = VARIABLES[name];
    const column = raw.hourly[name];
    if (!column) {
      limitations.push(
        `${label} is not provided by the model for this location.`,
      );
      continue;
    }
    units[pollutant] = raw.hourly_units[name];
    columns.push([pollutant, column]);
  }

  return {
    provider: 'Open-Meteo',
    sourceUrl: SOURCE_URL,
    dataKind: 'model_forecast',
    modelResolution: MODEL_RESOLUTION,
    retrievedAt: now.toISOString(),
    units,
    hours: raw.hourly.time.map((seconds, i) => ({
      time: new Date(seconds * 1000).toISOString(),
      values: Object.fromEntries(
        columns.map(([pollutant, column]) => [pollutant, column[i] ?? null]),
      ),
    })),
    limitations,
  };
}
