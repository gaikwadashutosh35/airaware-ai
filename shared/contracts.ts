// API contracts shared by server and client (API.md §3).
// Types only: import with `import type` so nothing ships at runtime.

export type DataKind = 'official_observation' | 'model_forecast' | 'demo';

export type Pollutant = 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'DATA_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ForecastSeries {
  provider: 'Open-Meteo';
  sourceUrl: string;
  dataKind: 'model_forecast';
  modelResolution: string;
  retrievedAt: string;
  // Open-Meteo does not report the model run time.
  freshness: 'unknown';
  units: Partial<Record<Pollutant, string>>;
  hours: Array<{
    time: string;
    values: Partial<Record<Pollutant, number | null>>;
  }>;
  limitations: string[];
}

export interface LocationResult {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface SourceInfo {
  id: string;
  name: string;
  dataKind: DataKind;
  status: 'available' | 'unavailable';
  url: string;
  licence?: string;
  attribution?: string;
  limitations: string[];
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}
