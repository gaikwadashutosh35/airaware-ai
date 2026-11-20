import type {
  DailyPlan,
  HouseholdContext,
  SavedPlan,
  SavedPlace,
  SavedPlanSummary,
} from '../../../../shared/contracts.ts';

// Supabase could not be reached or failed: never treated as success or as
// "nothing saved".
export class StoreUnavailableError extends Error {}

// The database refused a 21st plan for this user.
export class PlanLimitError extends Error {}

// Every call runs as one user (their token, so RLS applies) and also filters
// on that user's id.
export interface UserStore {
  // `context` is returned raw; the route checks it before use.
  getPreferences(): Promise<{ context: unknown; updatedAt: string } | null>;
  // Replaces the row: the answers, plus a remembered place if any.
  putPreferences(
    doc: HouseholdContext & { place?: SavedPlace },
  ): Promise<{ updatedAt: string }>;
  // Newest first.
  listPlans(): Promise<SavedPlanSummary[]>;
  getPlan(id: string): Promise<SavedPlan | null>;
  insertPlan(label: string, plan: DailyPlan): Promise<SavedPlan>;
  // False when nothing matched (missing, or another user's).
  deletePlan(id: string): Promise<boolean>;
  deleteAccount(): Promise<void>;
}

export interface SavedStore {
  // The project origin, which the browser must be allowed to reach (CSP).
  origin: string;
  // The user id for a valid token, null for an invalid one. Throws
  // StoreUnavailableError when the token cannot be checked.
  verify(token: string): Promise<string | null>;
  forUser(token: string, userId: string): UserStore;
}
