import {
  createClient,
  isAuthRetryableFetchError,
  type PostgrestError,
} from '@supabase/supabase-js';
import type { DailyPlan } from '../../../../shared/contracts.ts';
import {
  PlanLimitError,
  StoreUnavailableError,
  type SavedStore,
  type UserStore,
} from './store.ts';

// Raised by the enforce_plan_limit trigger (supabase/migrations).
const PLAN_LIMIT_MESSAGE = 'plan_limit_reached';

interface Result<T> {
  data: T | null;
  error: PostgrestError | null;
  status: number;
}

function fail(category: string): never {
  // The category only: never tokens, user ids, bodies or saved content.
  console.error(`Supabase request failed: ${category}`);
  throw new StoreUnavailableError();
}

function unwrap<T>({ data, error, status }: Result<T>): T {
  if (error) {
    if (error.message === PLAN_LIMIT_MESSAGE) throw new PlanLimitError();
    fail(status ? `http ${status}` : 'network');
  }
  return data as T;
}

export function createSupabaseStore(options: {
  url: string;
  publishableKey: string;
  // Injectable for tests.
  fetch?: typeof fetch;
}): SavedStore {
  const global = options.fetch ? { fetch: options.fetch } : undefined;
  // Only checks tokens; holds no session of its own.
  const checker = createClient(options.url, options.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global,
  });

  return {
    origin: new URL(options.url).origin,

    async verify(token) {
      // Verifies the signature (JWKS, or the Auth server for legacy keys)
      // and the expiry.
      const { data, error } = await checker.auth.getClaims(token);
      if (error) {
        if (isAuthRetryableFetchError(error)) fail('auth');
        return null;
      }
      const claims = data?.claims;
      return claims?.role === 'authenticated' && typeof claims.sub === 'string'
        ? claims.sub
        : null;
    },

    forUser(token, userId): UserStore {
      // Queries run as this user, so RLS applies. No retries: a failure
      // becomes SAVE_UNAVAILABLE at once instead of after ~7 s of backoff.
      const db = createClient(options.url, options.publishableKey, {
        accessToken: () => Promise.resolve(token),
        db: { retry: false },
        global,
      });
      const preferences = () => db.from('household_preferences');
      const plans = () => db.from('daily_plans');

      return {
        async getPreferences() {
          const row = unwrap(
            await preferences()
              .select('context, updated_at')
              .eq('user_id', userId)
              .maybeSingle<{ context: unknown; updated_at: string }>(),
          );
          return row
            ? { context: row.context, updatedAt: row.updated_at }
            : null;
        },

        async putPreferences(context) {
          const row = unwrap(
            await preferences()
              .upsert({ user_id: userId, context })
              .select('updated_at')
              .single<{ updated_at: string }>(),
          );
          return { context, updatedAt: row.updated_at };
        },

        async listPlans() {
          const rows = unwrap(
            await plans()
              .select('id, created_at, location_label')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .returns<
                Array<{
                  id: string;
                  created_at: string;
                  location_label: string;
                }>
              >(),
          );
          return rows.map((row) => ({
            id: row.id,
            savedAt: row.created_at,
            placeLabel: row.location_label,
          }));
        },

        async getPlan(id) {
          const row = unwrap(
            await plans()
              .select('id, created_at, plan_json')
              .eq('id', id)
              .eq('user_id', userId)
              .maybeSingle<{
                id: string;
                created_at: string;
                plan_json: DailyPlan;
              }>(),
          );
          return row
            ? { id: row.id, savedAt: row.created_at, plan: row.plan_json }
            : null;
        },

        async insertPlan(label, plan) {
          const row = unwrap(
            await plans()
              .insert({
                user_id: userId,
                location_label: label,
                plan_json: plan,
              })
              .select('id, created_at')
              .single<{ id: string; created_at: string }>(),
          );
          return { id: row.id, savedAt: row.created_at, plan };
        },

        async deletePlan(id) {
          const rows = unwrap(
            await plans()
              .delete()
              .eq('id', id)
              .eq('user_id', userId)
              .select('id')
              .returns<Array<{ id: string }>>(),
          );
          return rows.length > 0;
        },

        async deleteAccount() {
          unwrap(await db.rpc('delete_my_account'));
        },
      };
    },
  };
}
