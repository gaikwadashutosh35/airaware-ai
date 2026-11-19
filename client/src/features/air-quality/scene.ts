import type {
  AirAssessment,
  WeatherNow,
} from '../../../../shared/contracts.ts';
import { hazeLevel, type HazeLevel } from './haze.ts';

// What the readout's skyline draws. Every flag comes from forecast data:
// haze and smog from the server's 24-hour air check, the rest from this
// hour's weather. An unknown value adds nothing.
export interface Scene {
  haze: HazeLevel;
  clouds: 0 | 1 | 2 | 3;
  rain: boolean;
  heat: boolean;
  fog: boolean;
  smog: boolean;
}

// Thresholds (design calls, 2026-11-19): a hot look, not a heat-wave claim.
const RAIN_MM = 0.2;
const RAIN_CHANCE = 60;
const HOT_C = 35;
const FOG_M = 1000;

function cloudCount(cover: number | null): Scene['clouds'] {
  if (cover === null || cover < 20) return 0;
  if (cover < 50) return 1;
  return cover < 80 ? 2 : 3;
}

export function sceneFromConditions(
  air: AirAssessment,
  weather: WeatherNow | null,
): Scene {
  const haze = hazeLevel(air);
  const rain =
    (weather?.precipitationMm ?? 0) >= RAIN_MM ||
    (weather?.precipitationProbability ?? 0) >= RAIN_CHANCE;
  return {
    haze,
    clouds: cloudCount(weather?.cloudCoverPercent ?? null),
    rain,
    // Rain wins: one animated layer at most.
    heat: !rain && (weather?.temperatureC ?? -Infinity) >= HOT_C,
    fog: (weather?.visibilityM ?? Infinity) < FOG_M,
    smog: haze === 5,
  };
}
