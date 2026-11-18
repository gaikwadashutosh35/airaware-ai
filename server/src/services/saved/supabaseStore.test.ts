import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanLimitError, StoreUnavailableError } from './store.ts';
import { createSupabaseStore } from './supabaseStore.ts';

const PLAN = { place: { label: 'Pune' } } as never;

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function store() {
  return createSupabaseStore({
    url: 'https://test.supabase.co',
    publishableKey: 'sb_publishable_test',
    fetch: fetchMock,
  });
}

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValue(Response.json(body, { status }));
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
});

describe('createSupabaseStore', () => {
  it('a malformed token is invalid', async () => {
    expect(await store().verify('not-a-jwt')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the 21st plan maps to PlanLimitError', async () => {
    reply(400, { code: 'P0001', message: 'plan_limit_reached' });
    await expect(
      store().forUser('tok', 'u1').insertPlan('Pune', PLAN),
    ).rejects.toBeInstanceOf(PlanLimitError);
  });

  it('any other database error maps to StoreUnavailableError', async () => {
    reply(500, { code: 'XX000', message: 'boom' });
    await expect(
      store().forUser('tok', 'u1').listPlans(),
    ).rejects.toBeInstanceOf(StoreUnavailableError);
  });

  it('a network failure maps to StoreUnavailableError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      store().forUser('tok', 'u1').getPreferences(),
    ).rejects.toBeInstanceOf(StoreUnavailableError);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Supabase request failed: network');
  });

  it("queries carry the user's token and filter by user", async () => {
    reply(200, []);
    await store().forUser('tok', 'u1').listPlans();
    const [input, init] = fetchMock.mock.calls[0]!;
    const url = decodeURIComponent(
      input instanceof Request ? input.url : input.toString(),
    );
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
    expect(url).toContain('user_id=eq.u1');
    expect(url).toContain('order=created_at.desc');
  });

  it('deletePlan reports whether a row matched', async () => {
    reply(200, []);
    expect(await store().forUser('tok', 'u1').deletePlan('p1')).toBe(false);
    reply(200, [{ id: 'p1' }]);
    expect(await store().forUser('tok', 'u1').deletePlan('p1')).toBe(true);
  });
});

// Final review #3.
describe('timeouts', () => {
  it('a hanging database request times out as unavailable', async () => {
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(init.signal?.reason as Error),
          );
        }),
    );
    const slow = createSupabaseStore({
      url: 'https://test.supabase.co',
      publishableKey: 'sb_publishable_test',
      fetch: fetchMock,
      timeoutMs: 20,
    });
    await expect(slow.forUser('tok', 'u1').listPlans()).rejects.toBeInstanceOf(
      StoreUnavailableError,
    );
  });
});
