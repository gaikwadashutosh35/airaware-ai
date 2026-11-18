import { createTtlCache } from './cache.ts';
import { fetchForecast, type ModelForecast } from './openMeteo.ts';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export type CachedForecast = (
  latitude: number,
  longitude: number,
  now: Date,
) => Promise<ModelForecast>;

// One 10-minute cache shared by the forecast and daily-plan routes, so a
// plan right after a forecast view costs no second Open-Meteo call.
export function createCachedForecast(): CachedForecast {
  const cache = createTtlCache<ModelForecast>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
  return async (latitude, longitude, now) => {
    const key = `${latitude},${longitude}`;
    let series = cache.get(key, now.getTime());
    if (!series) {
      series = await fetchForecast(latitude, longitude, now);
      cache.set(key, series, now.getTime());
    }
    return series;
  };
}
