# Phase 6 — Saved Preferences and Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A person can save household answers and daily plans with one click and no email, through our server, with every row guarded twice: by our token check and by Postgres RLS.

**Architecture:**
- Supabase anonymous sign-in runs in the browser.
- Express verifies the bearer token with `supabase.auth.getClaims` and then queries Supabase as that user, so RLS applies.
- All Supabase access sits behind one `SavedStore` interface (`server/src/services/saved/`), injected into the app the way Phase 5 injects `generatePlan`. Offline tests use a fake store, and an opt-in live test uses the real project.
- The daily-plan builder is pulled out of the route, so `POST /plans` saves the plan the server itself builds.

**Tech Stack:** Node 26, Express 5, Zod 4, Vitest 5, Supertest, React 19, Postgres (Supabase). One new dependency: `@supabase/supabase-js@^2.119.1`, in both the client and the server.

**Spec:** `docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md`

## Global Constraints

- **Branch:** work on `main`; no worktree, no branch, no push.
- **Dependencies:** the only new one is `@supabase/supabase-js@^2.119.1` (server and client workspaces).
- **Keys:**
  - The secret key is never used.
  - `SUPABASE_PUBLISHABLE_KEY` must start with `sb_publishable_`; anything else fails at startup.
  - The client ignores a `VITE_SUPABASE_PUBLISHABLE_KEY` that doesn't start with `sb_publishable_`.
- **Env names:**
  - Server: `SUPABASE_URL` (https) and `SUPABASE_PUBLISHABLE_KEY`.
  - Client: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Both are optional. Without them, saving is off.
- **Errors, exactly:**
  - `401 UNAUTHENTICATED` "Sign-in expired or missing."
  - `503 SAVE_UNAVAILABLE` "Saving is not available right now."
  - `409 LIMIT_REACHED` "You can keep up to 20 saved plans. Delete one to save another."
  - `404 NOT_FOUND` "Saved plan not found."
- **Limits:**
  - 20 plans per user, enforced by the database.
  - `context` ≤ 2048 bytes as text; `plan_json` ≤ 65536 bytes; `location_label` 1–120 characters.
  - JSON bodies ≤ 4 KB.
  - `POST /api/v1/plans` shares one 10-per-minute limiter with `POST /api/v1/recommendations/daily-plan`.
- **Logging:**
  - Never log tokens, user IDs, household answers, labels, plan contents or request bodies.
  - The only failure line is `Supabase request failed: <category>`, where the category is `network` or `http <status>`.
- **Accounts:** the client creates an anonymous account only inside a save action (or the plan-save functions Phase 7 will call), never on load.
- **UI note text, exactly:** "Saved on this browser only. Clearing your browser data or switching devices loses it."
- **Secrets:** never read or print `.env` values. Presence checks only, e.g. `grep -q "^SUPABASE_URL=..*" server/.env`.
- **Migration:** the owner runs it in the Supabase SQL Editor after reading it; it is a data migration.
- **Gate before each commit:** `npx prettier --write <changed files>; npm run typecheck; npm run lint; npm run format:check; npm test`.
- **Commit trailer:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Saving while Supabase is down or paused. The form says saving isn't available, keeps the answers on screen, and never says "Saved". Test: Task 5 `a failed save keeps the answers and never says saved`.
2. Opening the dashboard. With no session, no account is created. With an existing session, saved answers load and no new account is created. Tests: Task 5 `loading with no session creates no account` and `an existing session loads saved answers`.
3. Another user's plan id and a random id both get the identical 404 body. Test: Task 4 `another user's plan and a missing plan get the same 404`.
4. A `user_id` added to the preferences body is rejected with 400 and nothing is written. Test: Task 4 `a user_id in the body is rejected`.
5. The secret key pasted as `SUPABASE_PUBLISHABLE_KEY` makes startup fail with a clear error. Test: Task 1 `a secret key is refused as the publishable key`.

---

### Task 1: Contracts, config and the dependency

**Files:**
- Modify: `shared/contracts.ts`
- Modify: `server/src/config/env.ts`, `server/src/config/env.test.ts`
- Modify: `server/package.json`, `client/package.json`, `package-lock.json` (via npm)

**Interfaces:**
- Produces:
  ```ts
  // shared/contracts.ts — ErrorCode gains:
  | 'UNAUTHENTICATED' | 'SAVE_UNAVAILABLE' | 'LIMIT_REACHED'
  export interface SavedPreferences { context: HouseholdContext; updatedAt: string }
  export interface SavedPlanSummary { id: string; savedAt: string; placeLabel: string }
  export interface SavedPlan { id: string; savedAt: string; plan: DailyPlan }
  // env.ts — Env gains:
  SUPABASE_URL: string | undefined;            // https URL; empty → undefined
  SUPABASE_PUBLISHABLE_KEY: string | undefined; // must start with sb_publishable_; empty → undefined
  ```

- [ ] **Step 1: Commit the approved docs**

```bash
git add docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md docs/superpowers/plans/2026-11-18-phase6-saved-data.md
git commit -m "docs: phase 6 saved data spec and plan"
```

- [ ] **Step 2: Write the failing env tests** in `env.test.ts`
  - The existing defaults test also expects `SUPABASE_URL: undefined` and `SUPABASE_PUBLISHABLE_KEY: undefined`.
  - `empty Supabase values count as unset`: `loadEnv({ SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: ' ' })` gives both `undefined`.
  - `Supabase values are kept`: `loadEnv({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })` returns both unchanged.
  - `a non-https Supabase URL is refused`: `loadEnv({ SUPABASE_URL: 'http://abc.supabase.co' })` throws.
  - `a secret key is refused as the publishable key`: `loadEnv({ SUPABASE_PUBLISHABLE_KEY: 'sb_secret_x' })` throws, and the message contains `SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test -w server -- src/config/env.test.ts`
Expected: FAIL. The new keys are missing and nothing is thrown.

- [ ] **Step 4: Implement the two env fields and the contract types**
  - In the env schema, trim each value; empty → `undefined`.
  - The URL is checked with `z.url({ protocol: /^https$/ })`. The key is checked with `.startsWith('sb_publishable_')`.

- [ ] **Step 5: Install the dependency**

Run: `npm install @supabase/supabase-js@^2.119.1 -w server -w client`
Expected: both `package.json` files list it, and `package-lock.json` changes. No other new top-level dependency.

- [ ] **Step 6: Run the gate**

Expected: typecheck, lint and format pass. Server tests are 153 + 4 new = 157 passed + 1 skipped (the defaults test is changed, not new), and the client stays at 66/66.

- [ ] **Step 7: Commit**

```bash
git add shared/contracts.ts server/src/config/env.ts server/src/config/env.test.ts server/package.json client/package.json package-lock.json
git commit -m "feat: Supabase config, saved-data contracts and supabase-js"
```

---

### Task 2: One daily-plan builder for both routes

**Files:**
- Create: `server/src/services/recommendations/dailyPlan.ts`, `server/src/services/recommendations/dailyPlan.test.ts`
- Modify: `server/src/routes/recommendations.ts`, `server/src/app.ts`

**Interfaces:**
- Consumes: `CachedForecast`, `GeneratePlan`, `personalize`, `toWriterInput`, `PROMPT_VERSION`, `assessAir`, `buildCandidates`, `buildPlan`, `createTtlCache`, `householdContextSchema` (Phases 4–5).
- Produces:
  ```ts
  // dailyPlan.ts
  export interface PlanRequest {
    place: { label: string; latitude: number; longitude: number };
    householdContext?: HouseholdContext;
  }
  export const planRequestSchema: z.ZodType<PlanRequest>; // moved unchanged from routes/recommendations.ts
  export type DailyPlanner = (request: PlanRequest, now: Date) => Promise<DailyPlan>;
  export function createDailyPlanner(deps: {
    forecast: CachedForecast; generate: GeneratePlan | null; model: string | null;
  }): DailyPlanner; // owns the 10-minute, 500-entry plan cache and its key and storing rules, unchanged
  // routes/recommendations.ts
  export function recommendationsRouter(deps: { planner: DailyPlanner; planLimit: RequestHandler }): Router;
  // app.ts creates ONE planLimit = rateLimit({ windowMs: 60_000, limit: 10, ...same options and message as today })
  // and ONE planner, and passes both to recommendationsRouter (Task 4 passes the same two to plansRouter)
  ```

- [ ] **Step 1: Write the failing planner tests** in `dailyPlan.test.ts`. Use an injected fake `CachedForecast` that counts calls, plus the existing Phase 5 `fixtures.ts` style.
  - `the same request within 10 minutes returns the same plan`: two calls 5 minutes apart give `toBe`-identical objects, and the forecast is called once.
  - `a fallback plan is not cached`: with a `generate` that rejects, two calls give two different objects.
  - `a plan without a forecast is not cached`: with a forecast that rejects, two calls give two different objects, and `air.level` is `'unknown'`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -w server -- src/services/recommendations/dailyPlan.test.ts`
Expected: FAIL; the module does not exist.

- [ ] **Step 3: Move the handler body into `createDailyPlanner`.** The route becomes a parse plus a call. Move `planRequestSchema` and the `coordinate` helper with it. Move the limiter to `app.ts` as described above. Behaviour does not change.

- [ ] **Step 4: Run the planner tests and the existing route tests**

Run: `npm test -w server -- src/services/recommendations/dailyPlan.test.ts src/routes/recommendations.test.ts`
Expected: PASS. All 13 existing route tests are unchanged and green, and so is the shared-cache test.

- [ ] **Step 5: Run the gate, then commit**

```bash
git add server/src/services/recommendations/dailyPlan.ts server/src/services/recommendations/dailyPlan.test.ts server/src/routes/recommendations.ts server/src/app.ts
git commit -m "refactor(server): one daily-plan builder shared by routes"
```

---

### Task 3: The migration and the Supabase store

**Files:**
- Create: `supabase/migrations/20261118120000_saved_data.sql`
- Create: `server/src/services/saved/store.ts` (types and errors only)
- Create: `server/src/services/saved/supabaseStore.ts`, `server/src/services/saved/supabaseStore.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // store.ts
  export class StoreUnavailableError extends Error {} // cannot reach / Supabase failed
  export class PlanLimitError extends Error {}        // the 21st plan
  export interface UserStore {
    getPreferences(): Promise<{ context: unknown; updatedAt: string } | null>;
    putPreferences(context: HouseholdContext): Promise<SavedPreferences>;
    listPlans(): Promise<SavedPlanSummary[]>;          // newest first
    getPlan(id: string): Promise<SavedPlan | null>;
    insertPlan(label: string, plan: DailyPlan): Promise<SavedPlan>; // may throw PlanLimitError
    deletePlan(id: string): Promise<boolean>;          // false when nothing matched
    deleteAccount(): Promise<void>;
  }
  export interface SavedStore {
    origin: string;                                    // e.g. 'https://abc.supabase.co', for the CSP
    verify(token: string): Promise<string | null>;     // user id (claims.sub) or null when invalid; throws StoreUnavailableError when it cannot check
    forUser(token: string, userId: string): UserStore; // every query runs as this user and also filters user_id = userId
  }
  // supabaseStore.ts
  export function createSupabaseStore(options: {
    url: string; publishableKey: string; fetch?: typeof fetch; // fetch injectable for tests
  }): SavedStore;
  ```

- [ ] **Step 1: Write the migration exactly as below.** It is security-critical copy fixed by the spec.

```sql
-- Phase 6: saved household answers and daily plans.
-- Design: docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md

create table public.household_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_label text not null
    check (char_length(location_label) between 1 and 120),
  plan_json jsonb not null
    check (jsonb_typeof(plan_json) = 'object' and octet_length(plan_json::text) <= 65536),
  created_at timestamptz not null default now()
);

create index daily_plans_user_created_idx
  on public.daily_plans (user_id, created_at desc);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger household_preferences_updated_at
  before update on public.household_preferences
  for each row execute function public.set_updated_at();

-- At most 20 plans per user, also for writes made outside the app. The
-- per-user lock stops two saves at once from both passing the count.
create function public.enforce_plan_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.daily_plans where user_id = new.user_id) >= 20 then
    raise exception 'plan_limit_reached';
  end if;
  return new;
end;
$$;

create trigger daily_plans_limit
  before insert on public.daily_plans
  for each row execute function public.enforce_plan_limit();

alter table public.household_preferences enable row level security;
alter table public.daily_plans enable row level security;

create policy "own preferences: select" on public.household_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own preferences: insert" on public.household_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own preferences: update" on public.household_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own preferences: delete" on public.household_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);

-- A saved plan never changes, so there is no update policy.
create policy "own plans: select" on public.daily_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own plans: insert" on public.daily_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own plans: delete" on public.daily_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Deletes only the calling user; their rows go with them (on delete cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
```

- [ ] **Step 2: Write the failing store tests** in `supabaseStore.test.ts`
  - Each test gets a store built with an injected `fetch` (a `vi.fn`) and a fake URL `https://test.supabase.co` with key `sb_publishable_test`. No network is used.
  - `a malformed token is invalid`: `verify('not-a-jwt')` resolves `null`.
  - `the 21st plan maps to PlanLimitError`: the fetch answers the insert with status 400 and the body `{"code":"P0001","message":"plan_limit_reached"}`. `insertPlan` rejects with `PlanLimitError`.
  - `any other database error maps to StoreUnavailableError`: the fetch answers with 500 `{"code":"XX000","message":"boom"}`. `listPlans` rejects with `StoreUnavailableError`.
  - `a network failure maps to StoreUnavailableError`: the fetch rejects with `TypeError('fetch failed')`. `getPreferences` rejects with `StoreUnavailableError`, and `console.error` was called once with `'Supabase request failed: network'`.
  - `queries carry the user's token and filter by user`: after `forUser('tok', 'u1').listPlans()`, the fetched request has the header `Authorization: Bearer tok`, and its URL contains `user_id=eq.u1` and `order=created_at.desc`.
  - `deletePlan reports whether a row matched`: a 200 with `[]` gives `false`, and a 200 with `[{"id":"p1"}]` gives `true`.

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test -w server -- src/services/saved/supabaseStore.test.ts`
Expected: FAIL; the module does not exist.

- [ ] **Step 4: Implement `createSupabaseStore`.** Approach:
  - **Token check.** One long-lived client for `verify`, created with `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`. Its `getClaims(token)`:
    - an error where `isAuthRetryableFetchError` → throw `StoreUnavailableError`;
    - any other error → `null`;
    - claims whose `role` isn't `'authenticated'` → `null`;
    - otherwise → `claims.sub`.
  - **Queries.** `forUser` builds a client with `accessToken: async () => token`; supabase-js disables `auth` on it.
  - **Table calls.** Use `household_preferences` and `daily_plans` with the column names from the migration, map snake_case to the contract types, and call `rpc('delete_my_account')` for deletion.
  - **Error mapping.**
    - `message === 'plan_limit_reached'` → `PlanLimitError`.
    - Any other `error` → log `Supabase request failed: http <status>` (or `network` when status is 0) and throw `StoreUnavailableError`.
    - Pass the injected `fetch` as `global.fetch`.

- [ ] **Step 5: Run the store tests**

Run: `npm test -w server -- src/services/saved/supabaseStore.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Run the gate, then commit**

```bash
git add supabase/migrations/20261118120000_saved_data.sql server/src/services/saved/
git commit -m "feat(server): saved-data migration and Supabase store"
```

---

### Task 4: Token check, routes and app wiring

**Files:**
- Create: `server/src/services/saved/userFrom.ts`, `server/src/services/saved/userFrom.test.ts`
- Create: `server/src/routes/preferences.ts`, `server/src/routes/plans.ts`, `server/src/routes/account.ts`, `server/src/routes/saved.test.ts`
- Create: `server/src/test-fixtures/fakeStore.ts` (in-memory `SavedStore` for tests: tokens `'token-a'` → `'user-a'`, `'token-b'` → `'user-b'`; `'token-down'` makes `verify` throw `StoreUnavailableError`; `failNext()` makes the next `UserStore` call throw `StoreUnavailableError`; `seedPlans(userId, n)` adds `n` stored plans; `seedPreferences(userId, context)` stores a raw context; `insertPlan` throws `PlanLimitError` once a user has 20)
- Modify: `server/src/app.ts`, `server/src/app.test.ts`, `server/src/server.ts`

**Interfaces:**
- Consumes: `SavedStore`, `UserStore`, `StoreUnavailableError`, `PlanLimitError` (Task 3); `DailyPlanner`, `planRequestSchema`, the `planLimit` handler (Task 2); `householdContextSchema`; `HttpError`, `parseQuery`.
- Produces:
  ```ts
  // userFrom.ts — the single auth gate every saved-data handler calls first
  export async function userFrom(req: Request, store: SavedStore | null): Promise<UserStore>;
  //   store null → HttpError 503 SAVE_UNAVAILABLE
  //   no / non-"Bearer <token>" Authorization header, or verify → null → HttpError 401 UNAUTHENTICATED
  //   verify throws StoreUnavailableError → HttpError 503 SAVE_UNAVAILABLE
  //   returns store.forUser(token, userId); never reads a user id from body, query or params
  // routes
  export function preferencesRouter(store: SavedStore | null): Router;  // mounted at /api/v1/profile/preferences
  export function plansRouter(deps: { store: SavedStore | null; planner: DailyPlanner; planLimit: RequestHandler }): Router; // /api/v1/plans
  export function accountRouter(store: SavedStore | null): Router;      // /api/v1/account
  // app.ts — AppOptions gains:
  saved?: SavedStore; // absent → saving off; when present, CSP connect-src is ["'self'", saved.origin]
  ```
- Behaviour pinned by the spec:
  - Routes: `GET /` → `{data: SavedPreferences | null}`; `PUT /` → `{data: SavedPreferences}`; `GET /plans` → `{data: SavedPlanSummary[]}`; `GET /plans/:id` → `{data: SavedPlan}`; `POST /plans` → `201 {data: SavedPlan}`; `DELETE /plans/:id` → `204`; `DELETE /account` → `204`.
  - A stored preferences context that fails `householdContextSchema` reads back as `null`.
  - `:id` that isn't a uuid (`z.uuid()`) → 400; no match → 404 "Saved plan not found.".
  - `PlanLimitError` → 409 `LIMIT_REACHED`; `StoreUnavailableError` from any call → 503 `SAVE_UNAVAILABLE`.
  - Bodies use `express.json({ limit: '4kb' })`. `POST /plans` validates with `planRequestSchema`, runs the shared `planLimit` and the shared `planner`, then inserts `(place.label, plan)`.

- [ ] **Step 1: Write the failing tests.** `userFrom.test.ts` covers each branch above, one test each:
  - `saving off is 503`
  - `no header is 401`
  - `a non-Bearer header is 401`
  - `an invalid token is 401`
  - `a check that cannot reach Supabase is 503`
  - `a valid token gives that user's store`

  `saved.test.ts` uses `createApp({ saved: fakeStore })` with a fetch spy serving the Open-Meteo body, as in `recommendations.test.ts`:
  - `preferences round-trip`: PUT `{ routine: { outdoorExercise: true } }` as token-a, then GET as token-a returns it with an ISO `updatedAt`, and GET as token-b gives `data: null`.
  - `a user_id in the body is rejected`: PUT `{ user_id: 'user-b' }` → 400, and the fake store saw no write.
  - `a stored context that fails the schema reads back as null` (seed the fake with `{ diagnosis: 'x' }`).
  - `saving a plan saves the server-built plan`: POST the daily-plan body as token-a → 201. `data.plan` deep-equals what `POST /recommendations/daily-plan` returns for the same body at the same fake time. `GET /plans` lists one `{ id, savedAt, placeLabel: 'Pune, Maharashtra' }`.
  - `another user's plan and a missing plan get the same 404`: as token-b, GET and DELETE on token-a's id, and on a random uuid, all give 404 with identical JSON bodies. Then token-a still gets 200.
  - `a non-uuid id is 400`.
  - `the 21st plan is 409`: `seedPlans('user-a', 20)`, then one POST → 409 `LIMIT_REACHED`. Seed rather than POST 20 times, because the shared limit allows 10 a minute.
  - `deleting the account removes everything`: DELETE `/api/v1/account` as token-a → 204, then GET `/plans` as token-a → `[]`.
  - `saving off is 503 everywhere`: `createApp({})` gives 503 on each of the 7 routes.
  - `a store failure is 503 and logs no body`: after `failNext()` → 503. No `console.error` argument contains the label or the token.
  - `no token is 401 before any store call`.

  `app.test.ts` adds:
  - `with saving on, the CSP allows the Supabase origin`: the `content-security-policy` header contains `connect-src 'self' https://test.supabase.co`.
  - `with saving off, the CSP is unchanged`: it contains no `supabase`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -w server -- src/services/saved/userFrom.test.ts src/routes/saved.test.ts src/app.test.ts`
Expected: FAIL; the modules and options are missing.

- [ ] **Step 3: Implement `userFrom`, the three routers and the `app.ts` wiring.**
  - Mount the routes inside the existing `/api/v1` 60-per-minute limit.
  - CSP uses `helmet({ contentSecurityPolicy: { directives: { connectSrc: ["'self'", origin] } } })` only when `saved` is present; otherwise keep plain `helmet()`.

- [ ] **Step 4: Wire `server.ts`.**
  - When both env vars are set, `createSupabaseStore({ url, publishableKey })` is passed as `saved`.
  - Log `Supabase: configured` or `Supabase not configured; saving is off.`

- [ ] **Step 5: Run the new tests, then the full gate**

Run: `npm test -w server -- src/services/saved src/routes/saved.test.ts src/app.test.ts`
Expected: PASS. Then the gate, with every server test green.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/saved/userFrom.ts server/src/services/saved/userFrom.test.ts server/src/routes/preferences.ts server/src/routes/plans.ts server/src/routes/account.ts server/src/routes/saved.test.ts server/src/test-fixtures/fakeStore.ts server/src/app.ts server/src/app.test.ts server/src/server.ts
git commit -m "feat(server): token check and saved preferences, plans and account routes"
```

---

### Task 5: Client — session, API calls and the household form

**Files:**
- Create: `client/src/lib/supabase.ts`, `client/src/env.d.ts`
- Modify: `client/src/services/api.ts`, `client/src/services/api.test.ts`
- Create: `client/src/features/daily-plan/HouseholdPreferencesForm.tsx`, `client/src/features/daily-plan/HouseholdPreferencesForm.test.tsx`
- Modify: `client/src/pages/Dashboard.tsx` (render the form below the place section, always visible)
- Modify: `client/vite.config.ts` (add `env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' }` to `test`, so the tests never pick up the owner's `client/.env`)
- Modify: `Dockerfile` (build stage: `ARG VITE_SUPABASE_URL` and `ARG VITE_SUPABASE_PUBLISHABLE_KEY` before `RUN npm run build -w client`)
- Create: `client/.env.example`

**Interfaces:**
- Consumes: `SavedPreferences`, `SavedPlanSummary`, `SavedPlan`, `HouseholdContext`, `ErrorCode` (Task 1); the routes (Task 4).
- Produces:
  ```ts
  // lib/supabase.ts
  export const savingAvailable: boolean; // both VITE_ values set and the key starts with sb_publishable_
  export async function currentToken(): Promise<string | null>;  // existing session's access token, or null; never creates an account
  export async function tokenForSave(): Promise<string>;         // currentToken() ?? signInAnonymously(); throws if !savingAvailable
  export async function forgetSession(): Promise<void>;          // auth.signOut({ scope: 'local' })
  // services/api.ts — request() gains an optional third argument { method?, body?, token? };
  // a 204 reply resolves undefined
  export function getPreferences(token: string, signal?: AbortSignal): Promise<SavedPreferences | null>;
  export function savePreferences(token: string, context: HouseholdContext): Promise<SavedPreferences>;
  export function listPlans(token: string): Promise<SavedPlanSummary[]>;
  export function getPlan(token: string, id: string): Promise<SavedPlan>;
  export function savePlan(token: string, body: { place: { label: string; latitude: number; longitude: number }; householdContext?: HouseholdContext }): Promise<SavedPlan>;
  export function deletePlan(token: string, id: string): Promise<void>;
  export function deleteAccount(token: string): Promise<void>;
  ```
- Form behaviour pinned by the spec:
  - Every `HouseholdContext` field. Each boolean is a select with "Not answered", "Yes" and "No", because the rules treat `false` differently from unset. The enums are selects with "Not answered" first.
  - No medical wording; follow `DESIGN.md`.
  - A "Save my answers" button. The exact note text from Global Constraints.
  - A "Delete my saved data" button that opens one confirming step with "Delete everything" and "Cancel".
  - A `role="status"` message: "Saved on this browser." / "Saving isn't available right now. Your answers are still on screen." / "Deleted. Nothing is saved now."
  - When `!savingAvailable`: both buttons are disabled, and the status says "Saving isn't set up on this site."

- [ ] **Step 1: Write the failing tests.**

  `api.test.ts` adds:
  - `saved-data calls send the bearer token`: `savePreferences('tok', {})` sends PUT `/api/v1/profile/preferences` with the header `Authorization: Bearer tok` and the JSON body `{}`.
  - `a 204 reply resolves undefined`: `deletePlan` with `new Response(null, { status: 204 })`.
  - `a 503 becomes ApiError SAVE_UNAVAILABLE`.

  `HouseholdPreferencesForm.test.tsx` uses `vi.mock('../../lib/supabase.ts')` and a fetch spy:
  - `loading with no session creates no account`: `currentToken` → `null`. `tokenForSave` is not called and no fetch is made.
  - `an existing session loads saved answers`: `currentToken` → `'tok'`, and GET returns `{ routine: { commuteMode: 'car' } }`. The commute select shows "Car", and `tokenForSave` is not called.
  - `saving sends the answers and says saved`: choose Yes for outdoor exercise and click Save. `tokenForSave` is called once, the PUT body is `{ routine: { outdoorExercise: true } }`, and the status reads "Saved on this browser.".
  - `a failed save keeps the answers and never says saved`: the PUT returns 503. The status reads the unavailable text, the select still shows Yes, and "Saved on this browser." never appears.
  - `deleting needs a confirming step`: clicking "Delete my saved data" makes no fetch. Then "Delete everything" sends DELETE `/api/v1/account`, calls `forgetSession`, resets the form and shows "Deleted. Nothing is saved now.".
  - `saving not set up disables the buttons`: `savingAvailable` is `false`.
  - `the form has no axe violations`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -w client -- src/services/api.test.ts src/features/daily-plan/HouseholdPreferencesForm.test.tsx`
Expected: FAIL; the functions and component are missing.

- [ ] **Step 3: Implement `lib/supabase.ts`, the api functions and the form; render it in `Dashboard.tsx`.** `env.d.ts` declares the two optional `VITE_` strings on `ImportMetaEnv`.

- [ ] **Step 4: Update the `Dockerfile` and add `client/.env.example`** with:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 5: Run the client tests and the full gate**

Run: `npm test -w client`
Expected: all pass, including the existing 66 (the Dashboard tests run with saving not set up).

- [ ] **Step 6: Check that the build bakes the values in.** No secrets are involved; the values are dummies.

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dummy npm run build -w client && grep -rl "dummy.supabase.co" client/dist/assets | head -1`
Expected: one file is printed. Then run `npm run build -w client` again without the values, so `dist` does not keep the dummy.

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/supabase.ts client/src/env.d.ts client/src/services/api.ts client/src/services/api.test.ts client/src/features/daily-plan/ client/src/pages/Dashboard.tsx client/vite.config.ts client/.env.example Dockerfile
git commit -m "feat(client): one-click saving of household answers"
```

---

### Task 6: Docs

**Files:**
- Modify: `API.md` (§3 routes as built; §5 adds `SAVE_UNAVAILABLE` 503 and `LIMIT_REACHED` 409)
- Modify: `DATABASE.md` (an "As built" note listing the 4 changes from the spec's Database section)
- Modify: `AUTHENTICATION_SECURITY.md` §2 (anonymous sign-in, no email, why)
- Modify: `PRIVACY.md` (stored: household answers and saved plans with their place label, in Supabase, Mumbai region; kept until the person deletes them; a 30-day cleanup of unused accounts is a Phase 9 follow-up)
- Modify: `INTEGRATIONS.md` §5 ("As built": keys, anonymous sign-in, limits found, pausing)
- Modify: `SETUP.md` (the env vars, "Allow anonymous sign-ins", running the migration in the SQL Editor)
- Modify: `THREAT_MODEL.md` (anonymous-account abuse; direct writes to one's own rows; both accepted, with their limits)
- Modify: `CHANGELOG.md`, `server/.env.example` (`SUPABASE_URL=`, `SUPABASE_PUBLISHABLE_KEY=`)
- Modify: `docs/IMPLEMENTATION_PLAN.md` Phase 6 ("As built": what was built, with live checks pending until Task 7)

- [ ] **Step 1: Write the doc changes.** Each claim must match the code; nothing says the live checks passed.
- [ ] **Step 2: Run** `npx prettier --write` on the changed files, then `npm run format:check`.
Expected: pass.
- [ ] **Step 3: Commit**

```bash
git add API.md DATABASE.md AUTHENTICATION_SECURITY.md PRIVACY.md INTEGRATIONS.md SETUP.md THREAT_MODEL.md CHANGELOG.md server/.env.example docs/IMPLEMENTATION_PLAN.md
git commit -m "docs: phase 6 saved data as built"
```

---

### Task 7: Owner setup and live checks (blocked until the owner is ready)

**Files:**
- Create: `server/src/services/saved/supabase.live.test.ts`
- Modify: `docs/IMPLEMENTATION_PLAN.md` (record the live results)

**Interfaces:**
- Consumes: `createSupabaseStore`, `createApp` with `saved`, and the migration (Tasks 3–4).

- [ ] **Step 1: Write the live test.** It is skipped unless `SUPABASE_LIVE` is set and both server env vars are present. It loads `server/.env` the way `gemini.live.test.ts` does, and prints no token, key or user ID. Timeout 60 s. Users A and B come from `signInAnonymously()` on two separate clients with `persistSession: false`.
  - `direct database access is isolated`:
    - A inserts preferences and one plan directly (`location_label: 'Test'`, `plan_json: {}`).
    - B's select of each table returns 0 rows.
    - B's update and delete of A's rows change 0 rows.
    - B's insert with `user_id = A` errors.
    - A's upsert of an oversized `context` (a 3000-character string value) errors.
  - `our API keeps users apart`:
    - Through `createApp({ saved })`, A's `POST /api/v1/plans` (Delhi 28.65, 77.23) → 201.
    - B gets 404 on GET and on DELETE for that plan id.
    - A's `GET /plans` still lists it.
  - `the 21st plan is refused`: A now has 2 plans. A inserts 18 more directly, and the 21st direct insert errors with `plan_limit_reached`.
  - `deleting the account removes the rows`:
    - A calls `DELETE /api/v1/account` → 204.
    - A direct select with A's old token returns 0 rows from both tables.
    - In `afterAll`, B also deletes itself.

- [ ] **Step 2: Ask the owner to:**
  1. Create the project and turn on "Allow anonymous sign-ins".
  2. Paste the 4 values into `server/.env` and `client/.env`.
  3. Read `supabase/migrations/20261118120000_saved_data.sql`, then run it in the SQL Editor.

  Then check presence only: `grep -q "^SUPABASE_URL=..*" server/.env && grep -q "^SUPABASE_PUBLISHABLE_KEY=sb_publishable_" server/.env && echo present`.

- [ ] **Step 3: Run the live test**

Run: `SUPABASE_LIVE=1 npm test -w server -- src/services/saved/supabase.live.test.ts`
Expected: 4 passed. If `delete_my_account` is refused by the hosted project, stop and ask the owner about the spec's secret-key fallback; never switch on your own.

- [ ] **Step 4: Check it in the browser.**
  1. Start the API and client (`.claude/launch.json` "api", plus `npm run dev -w client`) and open `/app`.
  2. Confirm no account exists before the first click.
  3. Save answers, then reload: the answers come back.
  4. Delete everything: the answers are gone after a reload.
  5. Note whether the project's JWKS has keys, i.e. asymmetric or legacy signing. Fetch `https://<project>.supabase.co/auth/v1/.well-known/jwks.json` (it's public) and record only whether `keys` is empty.

- [ ] **Step 5: Record the real results in the Phase 6 "As built" section, run the gate, and commit**

```bash
git add server/src/services/saved/supabase.live.test.ts docs/IMPLEMENTATION_PLAN.md
git commit -m "test(server): opt-in live Supabase isolation and deletion checks"
```
