import type { WeatherNow } from '../../../../shared/contracts.ts';
import { createTtlCache } from './cache.ts';
import { fetchWeather } from './openMeteoWeather.ts';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export type CachedWeather = (
  latitude: number,
  longitude: number,
  now: Date,
) => Promise<WeatherNow | null>;

// Like the air forecast cache: 10 minutes per rounded place. A missing
// answer is not cached, so the next request tries again.
export function createCachedWeather(): CachedWeather {
  const cache = createTtlCache<WeatherNow>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);
  return async (latitude, longitude, now) => {
    const key = `${latitude},${longitude}`;
    const cached = cache.get(key, now.getTime());
    // A cached hour that no longer contains `now` is not "this hour".
    if (cached && now.getTime() < Date.parse(cached.time) + 3_600_000) {
      return cached;
    }
    const weather = await fetchWeather(latitude, longitude, now);
    if (weather) cache.set(key, weather, now.getTime());
    return weather;
  };
}
