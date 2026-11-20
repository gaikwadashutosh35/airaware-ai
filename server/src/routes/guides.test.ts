import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';
import { guideSet } from '../services/recommendations/guides.ts';

describe('GET /api/v1/recommendations/guides', () => {
  it('returns the home guides', async () => {
    const res = await request(createApp()).get(
      '/api/v1/recommendations/guides?topic=home',
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: guideSet('home') });
  });

  it('returns the habits guides', async () => {
    const res = await request(createApp()).get(
      '/api/v1/recommendations/guides?topic=habits',
    );

    expect(res.status).toBe(200);
    expect(res.body.data.topic).toBe('habits');
  });

  it.each([
    ['a missing topic', ''],
    ['an unknown topic', '?topic=outdoors'],
    ['an extra parameter', '?topic=home&q=x'],
  ])('rejects %s with 400 VALIDATION_ERROR', async (_, query) => {
    const res = await request(createApp()).get(
      `/api/v1/recommendations/guides${query}`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets the browser cache it for an hour', async () => {
    const res = await request(createApp()).get(
      '/api/v1/recommendations/guides?topic=home',
    );

    expect(res.headers['cache-control']).toBe('public, max-age=3600');
  });

  // Review Focus 4: the guides call no AI.
  it('guides are not rate-limited with plans', async () => {
    const app = createApp();
    for (let i = 0; i < 11; i++) {
      const res = await request(app).get(
        '/api/v1/recommendations/guides?topic=habits',
      );
      expect(res.status, `request ${i + 1}`).toBe(200);
    }
  });
});
