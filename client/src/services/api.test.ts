import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  buildDailyPlan,
  deletePlan,
  getForecast,
  getGuides,
  getSources,
  savePreferences,
  searchLocations,
} from './api.ts';

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })));
}

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests the forecast with coordinates fixed to 2 decimals', async () => {
    const fetchSpy = respondWith({ data: { dataKind: 'model_forecast' } });

    const data = await getForecast(18.519571, 73.855347);

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86',
    );
    expect(data).toEqual({ dataKind: 'model_forecast' });
  });

  it('throws the server error envelope as an ApiError', async () => {
    respondWith(
      {
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Data provider unavailable.',
        },
      },
      502,
    );

    await expect(getForecast(18.52, 73.86)).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'PROVIDER_ERROR',
      message: 'Data provider unavailable.',
    });
  });

  it('reports an error body without the envelope as UNEXPECTED_RESPONSE', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Bad gateway</html>', { status: 502 }),
    );

    await expect(getForecast(18.52, 73.86)).rejects.toMatchObject({
      status: 502,
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('reports a failed connection as NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    await expect(getForecast(18.52, 73.86)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('passes an abort through unchanged', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(
      getForecast(18.52, 73.86, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('encodes the search query', async () => {
    const fetchSpy = respondWith({ data: [] });

    await searchLocations('Pune & Co');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/v1/locations/search?q=Pune+%26+Co',
    );
  });

  it('getGuides asks for the topic', async () => {
    const fetchSpy = respondWith({ data: { topic: 'habits', groups: [] } });

    const set = await getGuides('habits');

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      '/api/v1/recommendations/guides?topic=habits',
    );
    expect(set.topic).toBe('habits');
  });

  it('returns the source list', async () => {
    respondWith({ data: [{ id: 'cpcb', status: 'unavailable' }] });

    expect(await getSources()).toEqual([{ id: 'cpcb', status: 'unavailable' }]);
  });

  it('saved-data calls send the bearer token', async () => {
    const fetchSpy = respondWith({
      data: { context: {}, updatedAt: '2026-11-18T10:00:00.000Z' },
    });

    await savePreferences('tok', {});

    const [path, init] = fetchSpy.mock.calls[0]!;
    expect(path).toBe('/api/v1/profile/preferences');
    expect(init?.method).toBe('PUT');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
    expect(new Headers(init?.headers).get('Content-Type')).toBe(
      'application/json',
    );
    expect(init?.body).toBe('{}');
  });

  it('posts the plan request and returns the plan', async () => {
    const fetchSpy = respondWith({ data: { generatedBy: 'rules' } });
    const body = {
      place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 },
      householdContext: { home: { airPurifier: true } },
    };

    const plan = await buildDailyPlan(body);

    const [path, init] = fetchSpy.mock.calls[0]!;
    expect(path).toBe('/api/v1/recommendations/daily-plan');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBeNull();
    expect(JSON.parse(init?.body as string)).toEqual(body);
    expect(plan).toEqual({ generatedBy: 'rules' });
  });

  it('a 204 reply resolves undefined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(deletePlan('tok', 'p1')).resolves.toBeUndefined();
  });

  it('a 503 becomes ApiError SAVE_UNAVAILABLE', async () => {
    respondWith(
      {
        error: {
          code: 'SAVE_UNAVAILABLE',
          message: 'Saving is not available right now.',
        },
      },
      503,
    );

    const error = await savePreferences('tok', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('SAVE_UNAVAILABLE');
  });
});
