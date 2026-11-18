// Opt-in live check against the real Supabase project: two anonymous users,
// RLS isolation, the 20-plan limit and account deletion. Skipped unless
// SUPABASE_LIVE=1 and both server settings are present. Asserts on counts
// and statuses only, so no token, key or user id reaches the test output.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.ts';
import { loadEnv } from '../../config/env.ts';
import { createSupabaseStore } from './supabaseStore.ts';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = loadEnv(process.env);
const url = env.SUPABASE_URL ?? '';
const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
const live = Boolean(process.env.SUPABASE_LIVE && url && key);

interface TestUser {
  id: string;
  auth: string;
  db: SupabaseClient;
}

async function anonymousUser(): Promise<TestUser> {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session || !data.user) {
    throw new Error('Anonymous sign-in failed. Is it turned on?');
  }
  const token = data.session.access_token;
  return {
    id: data.user.id,
    auth: `Bearer ${token}`,
    db: createClient(url, key, {
      accessToken: () => Promise.resolve(token),
      db: { retry: false },
    }),
  };
}

// Counts rows and fails on any error, so "0 rows" can never hide a rejected
// token or a missing grant (final review #5).
function rows(result: { data: unknown[] | null; error: unknown }): number {
  expect(result.error).toBeNull();
  return result.data?.length ?? 0;
}

const plan = (userId: string, label = 'Test') => ({
  user_id: userId,
  location_label: label,
  plan_json: {},
});

describe.skipIf(!live)('Supabase (live)', { timeout: 60_000 }, () => {
  let a: TestUser;
  let b: TestUser;
  let app: ReturnType<typeof createApp>;
  let planId: string;

  beforeAll(async () => {
    a = await anonymousUser();
    b = await anonymousUser();
    app = createApp({
      saved: createSupabaseStore({ url, publishableKey: key }),
    });
  }, 60_000);

  afterAll(async () => {
    // Deleting an already deleted user is a no-op.
    for (const user of [a, b]) {
      if (user)
        await request(app)
          .delete('/api/v1/account')
          .set('Authorization', user.auth);
    }
  }, 60_000);

  it('direct database access is isolated', async () => {
    const context = { home: { airPurifier: true } };
    expect(
      (
        await a.db
          .from('household_preferences')
          .insert({ user_id: a.id, context })
      ).error,
    ).toBeNull();
    expect(
      (await a.db.from('daily_plans').insert(plan(a.id))).error,
    ).toBeNull();

    expect(
      rows(await b.db.from('household_preferences').select('user_id')),
    ).toBe(0);
    expect(rows(await b.db.from('daily_plans').select('id'))).toBe(0);
    expect(
      rows(
        await b.db
          .from('household_preferences')
          .update({ context: {} })
          .eq('user_id', a.id)
          .select('user_id'),
      ),
    ).toBe(0);
    expect(
      rows(
        await b.db
          .from('daily_plans')
          .delete()
          .eq('user_id', a.id)
          .select('id'),
      ),
    ).toBe(0);
    expect(
      (await b.db.from('daily_plans').insert(plan(a.id, 'Forged'))).error,
    ).not.toBeNull();
    expect(
      rows(
        await b.db
          .from('household_preferences')
          .delete()
          .eq('user_id', a.id)
          .select('user_id'),
      ),
    ).toBe(0);
    // B is a working user: it can write and read its own row.
    expect(
      (
        await b.db
          .from('household_preferences')
          .insert({ user_id: b.id, context: {} })
      ).error,
    ).toBeNull();
    expect(
      rows(await b.db.from('household_preferences').select('user_id')),
    ).toBe(1);

    // A saved plan never changes, not even for its owner: there is no
    // update grant on daily_plans.
    expect(
      (
        await a.db
          .from('daily_plans')
          .update({ location_label: 'Edited' })
          .eq('user_id', a.id)
          .select('id')
      ).error,
    ).not.toBeNull();
    // Oversized answers are refused by the database itself.
    expect(
      (
        await a.db
          .from('household_preferences')
          .upsert({ user_id: a.id, context: { note: 'x'.repeat(3000) } })
      ).error,
    ).not.toBeNull();
    expect(
      rows(await a.db.from('household_preferences').select('user_id')),
    ).toBe(1);
  });

  it('our API keeps users apart', async () => {
    const saved = await request(app)
      .post('/api/v1/plans')
      .set('Authorization', a.auth)
      .send({ place: { label: 'Delhi', latitude: 28.65, longitude: 77.23 } });
    expect(saved.status).toBe(201);
    planId = saved.body.data.id as string;

    for (const method of ['get', 'delete'] as const) {
      const res = await request(app)
        [method](`/api/v1/plans/${planId}`)
        .set('Authorization', b.auth);
      expect(res.status).toBe(404);
    }
    const list = await request(app)
      .get('/api/v1/plans')
      .set('Authorization', a.auth);
    expect(
      (list.body.data as Array<{ id: string }>).some((p) => p.id === planId),
    ).toBe(true);

    const mine = await request(app)
      .get('/api/v1/profile/preferences')
      .set('Authorization', a.auth);
    expect(mine.body.data.context).toEqual({ home: { airPurifier: true } });
    const theirs = await request(app)
      .get('/api/v1/profile/preferences')
      .set('Authorization', b.auth);
    // B gets its own (empty) answers from the first test, never A's.
    expect(theirs.body.data.context).toEqual({});
  });

  it('the 21st plan is refused', async () => {
    // A has 2 plans: one direct, one through the API.
    const fill = Array.from({ length: 18 }, () => plan(a.id, 'Fill'));
    expect((await a.db.from('daily_plans').insert(fill)).error).toBeNull();
    const extra = await a.db.from('daily_plans').insert(plan(a.id, 'Extra'));
    expect(extra.error?.message).toBe('plan_limit_reached');

    const res = await request(app)
      .post('/api/v1/plans')
      .set('Authorization', a.auth)
      .send({ place: { label: 'Delhi', latitude: 28.65, longitude: 77.23 } });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LIMIT_REACHED');
  });

  it('deleting the account removes the rows', async () => {
    const res = await request(app)
      .delete('/api/v1/account')
      .set('Authorization', a.auth);
    expect(res.status).toBe(204);
    // A's token is still unexpired, but nothing is left to reach.
    expect(
      rows(await a.db.from('household_preferences').select('user_id')),
    ).toBe(0);
    expect(rows(await a.db.from('daily_plans').select('id'))).toBe(0);
  });
});
