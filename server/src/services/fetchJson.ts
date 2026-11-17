import type { z } from 'zod';
import { HttpError } from '../errors.ts';

const TIMEOUT_MS = 5000;

// Every upstream failure (network, timeout, non-2xx, bad JSON, schema
// mismatch) becomes one safe 502. Only the host is logged: the query string
// carries user coordinates.
export async function fetchJson<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return schema.parse(await res.json());
  } catch (cause) {
    console.error(`Provider request to ${url.host} failed:`, cause);
    throw new HttpError(502, 'PROVIDER_ERROR', 'Data provider unavailable.');
  }
}
