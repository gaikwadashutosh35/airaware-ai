// The real token check (createSupabaseStore().verify) against a local ES256
// key set, so signature, role and expiry are proven offline.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { StoreUnavailableError } from './store.ts';
import { createSupabaseStore } from './supabaseStore.ts';

const JWKS_PATH = '/auth/v1/.well-known/jwks.json';
const HOUR = 3600;
const now = () => Math.floor(Date.now() / 1000);
const enc = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

let keys: CryptoKeyPair;
let otherKeys: CryptoKeyPair;
let jwk: JsonWebKey & { kid: string };
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let errorSpy: ReturnType<typeof vi.spyOn>;

async function token(
  payload: Record<string, unknown>,
  signer: CryptoKey = keys.privateKey,
): Promise<string> {
  const data = `${enc({ alg: 'ES256', kid: 'k1', typ: 'JWT' })}.${enc(payload)}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signer,
    new TextEncoder().encode(data),
  );
  return `${data}.${Buffer.from(signature).toString('base64url')}`;
}

const claims = (extra: Record<string, unknown> = {}) => ({
  sub: 'user-1',
  role: 'authenticated',
  aud: 'authenticated',
  exp: now() + HOUR,
  iat: now(),
  ...extra,
});

// auth-js caches a project's key set across clients (by URL), so each store
// gets its own project URL.
let project = 0;
function store(timeoutMs?: number) {
  project += 1;
  return createSupabaseStore({
    url: `https://test-${project}.supabase.co`,
    publishableKey: 'sb_publishable_test',
    fetch: fetchMock,
    timeoutMs,
  });
}

function urlOf(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : input.toString();
}

beforeAll(async () => {
  const params = { name: 'ECDSA', namedCurve: 'P-256' };
  keys = await crypto.subtle.generateKey(params, true, ['sign', 'verify']);
  otherKeys = await crypto.subtle.generateKey(params, true, ['sign', 'verify']);
  jwk = {
    ...(await crypto.subtle.exportKey('jwk', keys.publicKey)),
    kid: 'k1',
  };
});
beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>((input) =>
    Promise.resolve(
      new URL(urlOf(input)).pathname === JWKS_PATH
        ? Response.json({ keys: [{ ...jwk, alg: 'ES256' }] })
        : Response.json({}, { status: 404 }),
    ),
  );
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('createSupabaseStore().verify', () => {
  it('a valid token gives its sub', async () => {
    expect(await store().verify(await token(claims()))).toBe('user-1');
  });

  it('a token without the authenticated role is invalid', async () => {
    expect(
      await store().verify(await token(claims({ role: 'anon' }))),
    ).toBeNull();
  });

  it('an expired token is invalid', async () => {
    expect(
      await store().verify(await token(claims({ exp: now() - HOUR }))),
    ).toBeNull();
  });

  it('a token signed by another key is invalid', async () => {
    expect(
      await store().verify(await token(claims(), otherKeys.privateKey)),
    ).toBeNull();
  });

  // Final review #2.
  it('a JWT-shaped token that is not JSON is invalid, not an error', async () => {
    expect(await store().verify('aaaa.bbbb.cccc')).toBeNull();
  });

  it('an unreachable key set is unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(store().verify(await token(claims()))).rejects.toBeInstanceOf(
      StoreUnavailableError,
    );
  });

  // Final review #3.
  it('a hanging key set times out as unavailable', async () => {
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason as Error),
          );
        }),
    );
    await expect(
      store(20).verify(await token(claims())),
    ).rejects.toBeInstanceOf(StoreUnavailableError);
  });
});
