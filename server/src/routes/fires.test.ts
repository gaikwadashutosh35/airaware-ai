import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';

// Owner (27 Nov): NASA FIRMS fire hotspots near a place.
describe('GET /api/v1/fires/nearby', () => {
  it('returns the summary for 2-decimal coordinates', async () => {
    const summary = { status: 'available', count: 2 };
    const fires = vi.fn().mockResolvedValue(summary);
    const res = await request(createApp({ fires })).get(
      '/api/v1/fires/nearby?latitude=18.52&longitude=73.86',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: summary });
    expect(fires).toHaveBeenCalledWith(18.52, 73.86, expect.any(Date));
  });

  it('says not_configured when no FIRMS key is set', async () => {
    const res = await request(createApp()).get(
      '/api/v1/fires/nearby?latitude=18.52&longitude=73.86',
    );
    expect(res.body).toEqual({ data: { status: 'not_configured' } });
  });

  it.each([
    ['missing coordinates', ''],
    ['more than 2 decimals', '?latitude=18.5196&longitude=73.86'],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, query) => {
    const fires = vi.fn();
    const res = await request(createApp({ fires })).get(
      `/api/v1/fires/nearby${query}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(fires).not.toHaveBeenCalled();
  });

  it('lists NASA FIRMS among the sources, connected only with a key', async () => {
    const without = await request(createApp()).get(
      '/api/v1/air-quality/sources',
    );
    const firms = (body: { data: Array<{ id: string; status: string }> }) =>
      body.data.find((s) => s.id === 'nasa-firms');
    expect(firms(without.body)).toMatchObject({
      status: 'unavailable',
      dataKind: 'satellite_detection',
    });
    const withKey = await request(createApp({ fires: vi.fn() })).get(
      '/api/v1/air-quality/sources',
    );
    expect(firms(withKey.body)?.status).toBe('available');
  });
});
