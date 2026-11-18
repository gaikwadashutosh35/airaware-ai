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

// Optional household details for recommendations (PRD §10). No medical
// fields by design.
export interface HouseholdContext {
  routine?: {
    commuteMode?:
      | 'walk'
      | 'cycle'
      | 'two_wheeler'
      | 'car'
      | 'public_transport'
      | 'work_from_home';
    outdoorExercise?: boolean;
    schoolCommute?: boolean;
  };
  home?: {
    nearBusyRoad?: 'yes' | 'no' | 'unknown';
    cookingFuel?:
      'lpg' | 'electric' | 'biomass' | 'other' | 'prefer_not_to_say';
    kitchenExhaust?: boolean;
    airPurifier?: boolean;
  };
  householdNeeds?: {
    includesChildren?: boolean;
    includesOlderAdults?: boolean;
    mayBeMoreSensitive?: boolean;
  };
}

export type LimitStatus = 'above_limit' | 'within_limit' | 'unknown';

// A model-forecast 24-hour average compared with India's NAAQS 24-hour
// limit. Not an AQI and not a CPCB category.
export interface PollutantCheck {
  pollutant: 'PM2_5' | 'PM10';
  status: LimitStatus;
  // Rounded to 1 decimal; null when unknown.
  average24h: number | null;
  // μg/m³
  limit: number;
}

export interface AirAssessment {
  level: 'elevated' | 'not_elevated' | 'unknown';
  // Always [PM2_5, PM10].
  checks: PollutantCheck[];
}
