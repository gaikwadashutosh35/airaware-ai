// The real supabase-js browser client, with a stored session whose access
// token has expired and a network that cannot refresh it (Supabase paused or
// unreachable). Final review #1.
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';

const STORAGE_KEY = 'sb-abc-auth-token';
let fetchSpy: MockInstance<typeof fetch>;

async function loadLib() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.resetModules();
  return import('./supabase.ts');
}

beforeEach(() => {
  const past = Math.floor(Date.now() / 1000) - 3600;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      access_token: 'expired.access.token',
      refresh_token: 'refresh',
      expires_at: past,
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: 'u1' },
    }),
  );
  // auth-js retries a failed refresh with backoff for ~30 s; run it on fake
  // time so the test is fast.
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
  fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new TypeError('fetch failed'));
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('lib/supabase with an unrefreshable session', () => {
  it('currentToken fails instead of reporting no session', async () => {
    const lib = await loadLib();
    const result = lib.currentToken().then(
      (token) => ({ token }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await result).toHaveProperty('error');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('tokenForSave creates no new account', async () => {
    const lib = await loadLib();
    const result = lib.tokenForSave().then(
      (token) => ({ token }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await result).toHaveProperty('error');
    const signups = fetchSpy.mock.calls.filter(([input]) =>
      String(input instanceof Request ? input.url : input).includes(
        '/auth/v1/signup',
      ),
    );
    expect(signups).toEqual([]);
  });
});
