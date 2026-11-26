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

// One local day of Open-Meteo model weather. `atHour` is the same local hour
// as the request time on that day. Each number is null when the provider
// leaves it out; nothing is filled in.
export interface WeatherDay {
  day: 'yesterday' | 'today' | 'tomorrow';
  // The place's local date, YYYY-MM-DD.
  date: string;
  minC: number | null;
  maxC: number | null;
  precipitationMm: number | null;
  atHour: {
    time: string;
    temperatureC: number | null;
    cloudCoverPct: number | null;
  };
}

// Open-Meteo's weather forecast for the hour containing the request time.
// Each field is null when the provider leaves it out.
export interface WeatherNow {
  time: string;
  temperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  cloudCoverPercent: number | null;
  visibilityM: number | null;
  // Open-Meteo's is_day for this hour: true by day, false at night.
  isDay: boolean | null;
  retrievedAt: string;
  // The place's offset from UTC, to show hours in its own time.
  utcOffsetSeconds: number;
  // Yesterday, today, tomorrow, in that order.
  days: WeatherDay[];
}

// The forecast endpoint's `data`: the series, the server's 24-hour air check
// for the same series and time, and this hour's weather (null when the
// weather provider fails; the air forecast never depends on it).
export interface ForecastData extends ForecastSeries {
  airCheck: AirAssessment;
  weather: WeatherNow | null;
}

export type SourceReferenceId =
  | 'open-meteo'
  | 'cpcb-naaqs-2009'
  // The guide library's sources (docs/superpowers/specs/2026-11-20-guide-library.md).
  | 'mohfw-air-advisory-2025'
  | 'who-household-air'
  | 'epa-indoor-pm'
  | 'epa-air-cleaners'
  | 'epa-near-road-schools'
  | 'pib-grap-stage1-2026'
  | 'swm-rules-2026'
  | 'bee-star-label'
  | 'pib-ac-default-2020'
  | 'bee-domestic-tips';

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

// The guide library (Phase 8): general cards with cited sources for My Home
// and Better Habits. They never enter a daily plan.
export type GuideTopic = 'home' | 'habits';

export interface GuideCard extends RecommendationCandidate {
  // The rule that gives the same advice personally; My Home hides this card
  // when today's plan shows that rule.
  personalRuleId?: string;
}

export interface GuideGroup {
  id: string;
  heading: string;
  cards: GuideCard[];
}

export interface GuideSet {
  topic: GuideTopic;
  groups: GuideGroup[];
  sources: DailyPlan['sources'];
  safetyNote: string;
}

// Ask AirAware (Phase 7). The typed question only picks a topic on the
// server; no answer ever carries it.
export type AskTopic =
  'outdoors' | 'windows' | 'indoor' | 'family' | 'commuting' | 'habits';

export type AskRequest = {
  place: { label: string; latitude: number; longitude: number };
  householdContext?: HouseholdContext;
} & ({ question: string } | { topic: AskTopic });

// A household question AirAware may ask back (guided chat): a My Profile
// field id, and the answers ('yes'/'no' or option values) that would change
// today's cards.
export interface FollowUp {
  field: string;
  changes: string[];
}

export type AskAnswer = Pick<
  DailyPlan,
  | 'summary'
  | 'generatedBy'
  | 'air'
  | 'forecast'
  | 'notices'
  | 'sources'
  | 'safetyNote'
> & {
  topic: AskTopic | 'medical' | 'out_of_scope';
  // The household's rule cards, then guide cards (which carry personalRuleId).
  cards: Array<RecommendationCandidate | GuideCard>;
  // Empty for medical and out-of-scope answers.
  followUps: FollowUp[];
};

// Saved data (Phase 6). Stored per anonymous Supabase user; a saved plan is
// a snapshot from `savedAt`, never current air information.
// A searched place the person asked to remember (D2). Never a device location.
export interface SavedPlace {
  label: string;
  latitude: number;
  longitude: number;
}

export interface SavedPreferences {
  context: HouseholdContext;
  place: SavedPlace | null;
  updatedAt: string;
}

// PUT body: only the fields sent change; `place: null` forgets the place.
export interface PreferencesUpdate {
  context?: HouseholdContext;
  place?: SavedPlace | null;
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
