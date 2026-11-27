import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import pune from '../services/location/fixtures/open-meteo-geocoding-pune.json' with { type: 'json' };

describe('GET /api/v1/locations/search', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns matching places for a trimmed query', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(Response.json(pune)));

    const res = await request(createApp()).get(
      '/api/v1/locations/search?q=%20Pune%20',
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ name: 'Pune', country: 'India' });
    const url = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get('name')).toBe('Pune');
  });

  it.each([
    ['a missing query', ''],
    ['a one-character query', '?q=P'],
    ['an 81-character query', `?q=${'a'.repeat(81)}`],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, query) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await request(createApp()).get(
      `/api/v1/locations/search${query}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// Owner (27 Nov): a city name for "Use my location", from Google Maps.
describe('GET /api/v1/locations/reverse', () => {
  it('returns the name for rounded coordinates, uncached', async () => {
    const reverseGeocode = vi.fn().mockResolvedValue('Pune');
    const res = await request(createApp({ reverseGeocode })).get(
      '/api/v1/locations/reverse?latitude=18.52&longitude=73.86',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { name: 'Pune' } });
    expect(reverseGeocode).toHaveBeenCalledWith(18.52, 73.86);
    // Google Maps content is not cached by us or any CDN.
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns a null name when no geocoder is configured', async () => {
    const res = await request(createApp()).get(
      '/api/v1/locations/reverse?latitude=18.52&longitude=73.86',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { name: null } });
  });

  it.each([
    ['missing coordinates', ''],
    ['more than 2 decimals', '?latitude=18.5196&longitude=73.86'],
    ['an out-of-range latitude', '?latitude=91&longitude=73.86'],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, query) => {
    const reverseGeocode = vi.fn();
    const res = await request(createApp({ reverseGeocode })).get(
      `/api/v1/locations/reverse${query}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(reverseGeocode).not.toHaveBeenCalled();
  });
});
