import { afterEach, describe, expect, it, vi } from 'vitest';
import { getForecast, getSources, searchLocations } from './api.ts';

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

  it('returns the source list', async () => {
    respondWith({ data: [{ id: 'cpcb', status: 'unavailable' }] });

    expect(await getSources()).toEqual([{ id: 'cpcb', status: 'unavailable' }]);
  });
});
