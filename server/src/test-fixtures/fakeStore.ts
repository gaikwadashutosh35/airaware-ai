import { randomUUID } from 'node:crypto';
import type {
  DailyPlan,
  HouseholdContext,
  SavedPlace,
  SavedPlan,
} from '../../../shared/contracts.ts';
import {
  PlanLimitError,
  StoreUnavailableError,
  type SavedStore,
  type UserStore,
} from '../services/saved/store.ts';

const USERS: Record<string, string> = {
  'token-a': 'user-a',
  'token-b': 'user-b',
};

// In-memory SavedStore for route tests. Behaves like the RLS-guarded
// database: each UserStore only ever sees its own user's rows.
export function createFakeStore() {
  const preferences = new Map<
    string,
    { context: unknown; updatedAt: string }
  >();
  const plans = new Map<
    string,
    SavedPlan & { userId: string; label: string }
  >();
  const writes: string[] = [];
  let failing = false;
  let clock = Date.parse('2026-11-18T10:00:00.000Z');
  const stamp = () => new Date((clock += 1000)).toISOString();

  function guard() {
    if (failing) {
      failing = false;
      throw new StoreUnavailableError();
    }
  }

  function forUser(userId: string): UserStore {
    const own = () =>
      [...plans.values()].filter((plan) => plan.userId === userId);
    return {
      async getPreferences() {
        guard();
        return preferences.get(userId) ?? null;
      },
      async putPreferences(doc: HouseholdContext & { place?: SavedPlace }) {
        guard();
        writes.push(`preferences:${userId}`);
        const saved = { context: doc as unknown, updatedAt: stamp() };
        preferences.set(userId, saved);
        return { updatedAt: saved.updatedAt };
      },
      async listPlans() {
        guard();
        return own()
          .reverse()
          .map(({ id, savedAt, label }) => ({
            id,
            savedAt,
            placeLabel: label,
          }));
      },
      async getPlan(id: string) {
        guard();
        const plan = plans.get(id);
        return plan && plan.userId === userId
          ? { id: plan.id, savedAt: plan.savedAt, plan: plan.plan }
          : null;
      },
      async insertPlan(label: string, plan: DailyPlan) {
        guard();
        if (own().length >= 20) throw new PlanLimitError();
        writes.push(`plan:${userId}`);
        const saved = { id: randomUUID(), savedAt: stamp(), plan };
        plans.set(saved.id, { ...saved, userId, label });
        return saved;
      },
      async deletePlan(id: string) {
        guard();
        const plan = plans.get(id);
        if (!plan || plan.userId !== userId) return false;
        return plans.delete(id);
      },
      async deleteAccount() {
        guard();
        preferences.delete(userId);
        for (const plan of own()) plans.delete(plan.id);
      },
    };
  }

  const store: SavedStore = {
    origin: 'https://test.supabase.co',
    async verify(token: string) {
      if (token === 'token-down') throw new StoreUnavailableError();
      return USERS[token] ?? null;
    },
    forUser: (_token: string, userId: string) => forUser(userId),
  };

  return {
    store,
    writes,
    failNext() {
      failing = true;
    },
    seedPlans(userId: string, n: number) {
      for (let i = 0; i < n; i++) {
        const id = randomUUID();
        plans.set(id, {
          id,
          savedAt: stamp(),
          plan: {} as DailyPlan,
          userId,
          label: `Seed ${i}`,
        });
      }
    },
    seedPreferences(userId: string, context: unknown) {
      preferences.set(userId, { context, updatedAt: stamp() });
    },
  };
}
