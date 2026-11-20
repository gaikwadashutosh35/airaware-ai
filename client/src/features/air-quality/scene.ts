import type {
  AirAssessment,
  ForecastData,
  WeatherNow,
} from '../../../../shared/contracts.ts';
import { NEAR_YOU } from '../location/place.ts';

// The skyline's look, from the server's 24-hour check only (cityscape D1):
// no averages, ratios or thresholds of our own.
export type SceneAir = 'within' | 'above' | 'unknown';

const AIR: Record<AirAssessment['level'], SceneAir> = {
  not_elevated: 'within',
  elevated: 'above',
  unknown: 'unknown',
};

// What the readout's skyline draws. `air` comes from the air check; every
// other flag from this hour's weather. An unknown value adds nothing.
export interface Scene {
  air: SceneAir;
  clouds: 0 | 1 | 2 | 3;
  rain: boolean;
  heat: boolean;
  fog: boolean;
  // Daylight: a known day, sky and air, with no rain or overcast.
  glow: boolean;
}

// Thresholds (design calls, 2026-11-19): a hot look, not a heat-wave claim.
// Rain needs a forecast amount, never a chance alone (cityscape D4).
const RAIN_MM = 0.2;
const HOT_C = 35;
const FOG_M = 1000;

function cloudCount(cover: number | null): Scene['clouds'] {
  if (cover === null || cover < 20) return 0;
  if (cover < 50) return 1;
  return cover < 80 ? 2 : 3;
}

export function sceneFromConditions(
  check: AirAssessment,
  weather: WeatherNow | null,
): Scene {
  const air = AIR[check.level];
  const clouds = cloudCount(weather?.cloudCoverPercent ?? null);
  const rain = (weather?.precipitationMm ?? 0) >= RAIN_MM;
  return {
    air,
    clouds,
    rain,
    // Rain wins: one animated layer at most.
    heat: !rain && (weather?.temperatureC ?? -Infinity) >= HOT_C,
    fog: (weather?.visibilityM ?? Infinity) < FOG_M,
    // Daylight on a known sky: a known day (a missing isDay, from weather
    // cached before the field, counts as unknown), known cover and rain
    // amount, no overcast or rain, and known air.
    glow:
      weather?.isDay === true &&
      weather.cloudCoverPercent !== null &&
      weather.precipitationMm !== null &&
      air !== 'unknown' &&
      !rain &&
      clouds < 3,
  };
}

// The app backdrop with nothing to show: no place yet, or the forecast
// failed. Neutral, so it implies nothing about the air.
export const NEUTRAL: Scene = {
  air: 'unknown',
  clouds: 0,
  rain: false,
  heat: false,
  fog: false,
  glow: false,
};

// What the app backdrop draws (backdrop design §5.2). `shown` is the ready
// forecast, or the one a same-place reload will replace; null with
// `loading` is a place's first load, drawn as the still silhouette.
export function backdropScene(
  shown: ForecastData | null,
  loading: boolean,
): Scene | null {
  if (shown) return sceneFromConditions(shown.airCheck, shown.weather);
  return loading ? null : NEUTRAL;
}

// The footer's word on where the backdrop's look comes from (§5.5).
export function backdropNote(placeLabel: string, stale: boolean): string {
  const where =
    placeLabel === NEAR_YOU ? 'near you (approximate)' : `for ${placeLabel}`;
  return `Background: model forecast ${where}.${stale ? ' Not current.' : ''}`;
}
