import request from 'supertest';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { createApp } from './app.ts';

describe('GET /api/v1/health', () => {
  it('returns exactly status and version', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: pkg.version });
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('unknown routes', () => {
  it('return the JSON error envelope', async () => {
    const res = await request(createApp()).get('/api/v1/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
});
