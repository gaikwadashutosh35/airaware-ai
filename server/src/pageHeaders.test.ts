import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { createFakeStore } from './test-fixtures/fakeStore.ts';

// Netlify serves the pages from its CDN with client/public/_headers; the API
// gets the same headers from helmet. This keeps the two copies equal.
const HELMET_HEADERS = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'origin-agent-cluster',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-dns-prefetch-control',
  'x-download-options',
  'x-frame-options',
  'x-permitted-cross-domain-policies',
  'x-xss-protection',
];

// The `/*` block of a Netlify _headers file: indented `Name: value` lines.
function pageHeaders(text: string): Map<string, string> {
  const headers = new Map<string, string>();
  let inBlock = false;
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === '/*';
      continue;
    }
    const [, name, value] = /^\s+([^:]+):\s*(.*)$/.exec(line) ?? [];
    if (inBlock && name && value !== undefined) {
      headers.set(name.toLowerCase(), value);
    }
  }
  return headers;
}

describe('page headers', () => {
  it('the page headers match the API headers', async () => {
    const file = new URL('../../client/public/_headers', import.meta.url);
    const headers = pageHeaders(readFileSync(file, 'utf8'));
    const origin = /connect-src 'self' ([^;\s]+)/.exec(
      headers.get('content-security-policy') ?? '',
    )?.[1];
    expect(origin).toMatch(/^https:\/\//);
    const { store } = createFakeStore();

    const res = await request(
      createApp({ saved: { ...store, origin: origin! } }),
    ).get('/api/v1/health');

    for (const name of HELMET_HEADERS) {
      expect(headers.get(name), name).toBe(res.headers[name]);
    }
    expect([...headers.keys()].sort()).toEqual(HELMET_HEADERS);
  });
});
