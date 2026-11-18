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
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'SAVE_UNAVAILABLE'
  | 'LIMIT_REACHED'
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
  // UTC ISO time of the first of the 24 forecast hours averaged; null when
  // no complete window exists.
  windowStart: string | null;
  // Always [PM2_5, PM10].
  checks: PollutantCheck[];
}

export type SourceReferenceId = 'open-meteo' | 'cpcb-naaqs-2009';

// One piece of advice the rules engine allows. Phase 5's AI may reword or
// order these; it may not add any.
export interface RecommendationCandidate {
  id: string;
  section: 'notice' | 'action' | 'indoor' | 'swap';
  priority: 'high' | 'medium' | 'low';
  title: string;
  text: string;
  reason: string;
  evidenceType: 'data_driven_rule' | 'general_suggestion';
  sourceIds: SourceReferenceId[];
  // Field paths such as 'routine.outdoorExercise' or 'air.level'.
  inputsUsed: string[];
  caveat?: string;
}

export type PlanPeriod = 'morning' | 'commute' | 'daytime' | 'evening' | 'home';

export interface DailyPlan {
  generatedBy: 'ai' | 'rules';
  model: string | null;
  promptVersion: string | null;
  summary: string | null;
  place: { label: string };
  air: AirAssessment;
  forecast: Pick<
    ForecastSeries,
    | 'provider'
    | 'sourceUrl'
    | 'dataKind'
    | 'modelResolution'
    | 'retrievedAt'
    | 'limitations'
  > | null;
  notices: RecommendationCandidate[];
  featured: Array<{
    candidate: RecommendationCandidate;
    period: PlanPeriod | null;
    forYou: string | null;
  }>;
  more: RecommendationCandidate[];
  sources: Array<{ id: SourceReferenceId; name: string; url: string }>;
  safetyNote: string;
}

// Saved data (Phase 6). Stored per anonymous Supabase user; a saved plan is
// a snapshot from `savedAt`, never current air information.
export interface SavedPreferences {
  context: HouseholdContext;
  updatedAt: string;
}

export interface SavedPlanSummary {
  id: string;
  savedAt: string;
  placeLabel: string;
}

export interface SavedPlan {
  id: string;
  savedAt: string;
  plan: DailyPlan;
}
