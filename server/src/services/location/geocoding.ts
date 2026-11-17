import { z } from 'zod';
import type { LocationResult } from '../../../../shared/contracts.ts';
import { fetchJson } from '../fetchJson.ts';

const BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// z.object strips every raw field not listed here.
const locationResult: z.ZodType<LocationResult> = z.object({
  id: z.number().int(),
  name: z.string(),
  admin1: z.string().optional(),
  country: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string(),
});

// Open-Meteo omits `results` entirely when nothing matches.
const rawSearch = z.object({ results: z.array(locationResult).optional() });

export async function searchLocations(
  query: string,
): Promise<LocationResult[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set('name', query);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  // PRD: the initial audience is households in India.
  url.searchParams.set('countryCode', 'IN');
  const raw = await fetchJson(url, rawSearch);
  return raw.results ?? [];
}
