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
