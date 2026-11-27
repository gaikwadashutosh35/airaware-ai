import { z } from 'zod';
import { fetchJson } from '../fetchJson.ts';

// Google Maps Geocoding (owner, 27 Nov): the town or city name for "Use my
// location". Fixed host, so no configuration can redirect it.
const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const MAX_NAME_LENGTH = 80;

// z.object strips every raw field not listed here.
const rawReverse = z.object({
  status: z.string(),
  results: z
    .array(
      z.object({
        address_components: z.array(
          z.object({ long_name: z.string(), types: z.array(z.string()) }),
        ),
      }),
    )
    .default([]),
});

export type ReverseGeocode = (
  latitude: number,
  longitude: number,
) => Promise<string | null>;

// The locality at coordinates already rounded to 2 decimals (~1 km), or null.
// Never throws: a device place works without a name. Nothing is cached or
// stored (Google Maps terms); the key travels only in this request.
export function createGoogleReverseGeocoder(apiKey: string): ReverseGeocode {
  return async (latitude, longitude) => {
    const url = new URL(BASE_URL);
    url.searchParams.set('latlng', `${latitude},${longitude}`);
    url.searchParams.set('result_type', 'locality');
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', apiKey);
    try {
      // fetchJson logs only the host on failure: the query holds the key.
      const body = await fetchJson(url, rawReverse);
      if (body.status !== 'OK') {
        // ZERO_RESULTS is normal (sea, desert); others mean a key or quota problem.
        if (body.status !== 'ZERO_RESULTS')
          console.error(`Google geocoding status: ${body.status}`);
        return null;
      }
      const name = body.results[0]?.address_components.find((c) =>
        c.types.includes('locality'),
      )?.long_name;
      return name && name.length <= MAX_NAME_LENGTH ? name : null;
    } catch {
      return null;
    }
  };
}
