import { describe, expect, it, vi } from 'vitest';

// Startup logs which services are configured; keep test output quiet.
vi.spyOn(console, 'log').mockImplementation(() => {});
const { handler } = await import('./netlify.ts');

// A Lambda-style event, as Netlify passes it to the function.
function event(path: string) {
  return {
    httpMethod: 'GET',
    path,
    headers: { 'x-nf-client-connection-ip': '203.0.113.9' },
    multiValueHeaders: {},
    queryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  };
}

describe('Netlify handler', () => {
  it('answers health through the Lambda handler', async () => {
    const res = await handler(event('/api/v1/health'), {});

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
    expect(res.headers?.['content-security-policy']).toBeTruthy();
  });

  it('answers unknown API paths with 404 JSON', async () => {
    const res = await handler(event('/api/v1/nope'), {});

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});
