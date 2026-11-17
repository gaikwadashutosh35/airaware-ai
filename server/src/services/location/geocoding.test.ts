import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../errors.ts';
import pune from './fixtures/open-meteo-geocoding-pune.json' with { type: 'json' };
import { searchLocations } from './geocoding.ts';

// Recorded 2026-11-17: name=Pune&count=5&language=en&format=json&countryCode=IN.

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })));
}

describe('searchLocations', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps results and drops fields we do not use', async () => {
    respondWith(pune);

    const results = await searchLocations('Pune');

    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({
      id: 1259229,
      name: 'Pune',
      admin1: 'Maharashtra',
      country: 'India',
      latitude: 18.51957,
      longitude: 73.85535,
      timezone: 'Asia/Kolkata',
    });
  });

  it('returns an empty list when nothing matches', async () => {
    respondWith({ generationtime_ms: 0.09 });

    expect(await searchLocations('zzqxw')).toEqual([]);
  });

  it('searches India only on the fixed host', async () => {
    const fetchSpy = respondWith(pune);

    await searchLocations('Pune');

    const url = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(url.host).toBe('geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('Pune');
    expect(url.searchParams.get('countryCode')).toBe('IN');
    expect(url.searchParams.get('count')).toBe('5');
  });

  it('turns a provider failure into a 502 PROVIDER_ERROR', async () => {
    respondWith({ error: true }, 500);

    const error = await searchLocations('Pune').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 502, code: 'PROVIDER_ERROR' });
  });
});
