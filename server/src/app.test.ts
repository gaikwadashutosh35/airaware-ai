import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { createApp } from './app.ts';
import { createFakeStore } from './test-fixtures/fakeStore.ts';

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

describe('content security policy', () => {
  it('with saving on, the CSP allows the Supabase origin', async () => {
    const res = await request(
      createApp({ saved: createFakeStore().store }),
    ).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toContain(
      "connect-src 'self' https://test.supabase.co",
    );
  });

  it('with saving off, the CSP is unchanged', async () => {
    const res = await request(createApp()).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).not.toContain('supabase');
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

const clientDir = fileURLToPath(
  new URL('./test-fixtures/client', import.meta.url),
);

describe('client pages', () => {
  it.each(['/', '/app', '/app?place=Pune&lat=18.52&lon=73.86', '/privacy'])(
    'serves the built client at %s',
    async (path) => {
      const res = await request(createApp({ clientDir })).get(path);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('airaware-test-client');
    },
  );

  it.each(['/api/v1/nope', '/nope'])(
    'keeps the JSON 404 for %s',
    async (path) => {
      const res = await request(createApp({ clientDir })).get(path);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );
});

describe('proxy trust', () => {
  async function exhaust(app: ReturnType<typeof createApp>, ip: string) {
    for (let i = 0; i < 60; i++) {
      const res = await request(app)
        .get('/api/v1/air-quality/sources')
        .set('X-Forwarded-For', ip);
      expect(res.status).toBe(200);
    }
  }

  it('limits each client separately behind one trusted proxy', async () => {
    const app = createApp({ trustProxy: true });
    await exhaust(app, '203.0.113.1');

    const res = await request(app)
      .get('/api/v1/air-quality/sources')
      .set('X-Forwarded-For', '203.0.113.2');

    expect(res.status).toBe(200);
  });

  it('ignores a spoofed X-Forwarded-For without proxy trust', async () => {
    // express-rate-limit warns once about the unexpected header.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp();
    await exhaust(app, '203.0.113.1');

    const res = await request(app)
      .get('/api/v1/air-quality/sources')
      .set('X-Forwarded-For', '203.0.113.2');

    expect(res.status).toBe(429);
    vi.restoreAllMocks();
  });
});

describe('client-IP header', () => {
  const H = 'x-nf-client-connection-ip';
  const sources = (app: ReturnType<typeof createApp>, ip?: string) => {
    const req = request(app).get('/api/v1/air-quality/sources');
    return ip ? req.set(H, ip) : req;
  };

  it('limits each client separately by the header', async () => {
    const app = createApp({ clientIpHeader: H });
    for (let i = 0; i < 60; i++) {
      expect((await sources(app, '203.0.113.1')).status).toBe(200);
    }

    expect((await sources(app, '203.0.113.2')).status).toBe(200);
    expect((await sources(app, '203.0.113.1')).status).toBe(429);
  });

  it('ignores X-Forwarded-For when the header is set', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createApp({ clientIpHeader: H });
    for (let i = 0; i < 60; i++) {
      const res = await sources(app, '203.0.113.1').set(
        'X-Forwarded-For',
        `198.51.100.${i}`,
      );
      expect(res.status).toBe(200);
    }

    const res = await sources(app, '203.0.113.1').set(
      'X-Forwarded-For',
      '198.51.100.200',
    );

    expect(res.status).toBe(429);
    expect(error).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('keys the plan limit on the header too', async () => {
    const app = createApp({ clientIpHeader: H });
    const plan = (ip: string) =>
      request(app)
        .post('/api/v1/recommendations/daily-plan')
        .set(H, ip)
        .send({});
    for (let i = 0; i < 10; i++) {
      expect((await plan('203.0.113.1')).status).toBe(400);
    }

    expect((await plan('203.0.113.1')).status).toBe(429);
    expect((await plan('203.0.113.2')).status).toBe(400);
  });

  it('falls back to the connection address without the header', async () => {
    const app = createApp({ clientIpHeader: H });
    for (let i = 0; i < 60; i++) {
      expect((await sources(app)).status).toBe(200);
    }

    expect((await sources(app)).status).toBe(429);
  });
});
