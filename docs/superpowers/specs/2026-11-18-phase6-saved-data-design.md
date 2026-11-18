# Phase 6 — Saved preferences and plans (design)

Status: draft for owner approval, 2026-11-18. Owner choices: a free Supabase cloud project; "one-click, this device" sign-in; saving goes through our server.

Sources this design builds on:
- `docs/IMPLEMENTATION_PLAN.md` §7 Phase 6.
- `DATABASE.md`, `AUTHENTICATION_SECURITY.md`, `API.md` §1 and §3, `PRIVACY.md`, `THREAT_MODEL.md`, `INTEGRATIONS.md` §5 and §11, `TESTING_QA.md` §7 steps 11–12.
- `PRD.md` §7 (P0 "Save and revisit a plan (authenticated or clearly isolated demo mode)") and US-09.
- Phase 5 code: `server/src/routes/recommendations.ts`, `shared/contracts.ts` (`HouseholdContext`, `DailyPlan`).
- Supabase docs, checked 2026-11-18: rate limits, anonymous sign-ins, API keys, JWT signing keys, the April 2025 auth-schema restrictions.

## Intent

Let a person keep their household answers and save a daily plan to read again later, without giving an email, a name or a password. This meets the PRD's P0 "save and revisit a plan" and US-09 ("save/delete my plan; users cannot access another user's data").

## Goals

- The first time a person saves something, one click creates a private account tied to this browser. There is no email, password or name.
- Save and load household answers. Save, list, open and delete daily plans. Delete everything at once.
- Each request for user data is checked twice: our server verifies the sign-in token, and the database's row rules (RLS) only return rows owned by that token's user.
- A saved plan is always shown as a snapshot from the time it was saved, never as current air information.

## Non-goals

- Email or Google sign-in, use across devices, account recovery. All need an email service or more accounts; revisit after Phase 8.
- The `profiles`, `saved_locations` and `plan_feedback` tables in `DATABASE.md`. They are P1 in the PRD.
- The plan screen, the "Save plan" button and the saved-plans list. They belong with the plan screen in Phase 7. Phase 6 builds their API and the client functions that call it.
- CAPTCHA, which needs another account. See accepted risks.
- Keeping the free project from pausing. That is Phase 9 (deployment).

## Anti-goals (a failure even if it works)

- Any user can read, change or delete another user's rows, through our API or directly through Supabase's API with their own token.
- A saved plan is presented as current air information.
- Supabase's secret key reaches the browser, or is used for ordinary reads and writes.
- Coordinates, emails, names, sign-in tokens, user IDs, household answers or plan contents appear in logs.
- An account is created without the person clicking something that saves.

## Constraints found

- **Email sign-in is unusable on the free plan.** The built-in email sender only delivers to members of the project's own Supabase organization, and only 2 emails per hour. That is why sign-in is anonymous.
- **Anonymous sign-ins:** Supabase limits them to 30 per hour per IP address by default. The person can't get back into the account after signing out, clearing browser data, or using another device. The JWT carries `is_anonymous: true` and the role `authenticated`, so RLS policies written for `authenticated` apply. Supabase does not clean up anonymous users automatically.
- **Keys:** the publishable key (`sb_publishable_…`) is safe in the browser; RLS protects the data. This design never uses the secret key (`sb_secret_…`). The only exception is the fallback in "Deleting everything".
- **Token checking:** `supabase.auth.getClaims(token)` verifies a token. With asymmetric signing keys (ES256) it verifies locally against the project's public JWKS, caching the keys in memory. With the legacy shared secret it calls the Auth server once per request instead. Either is correct; the builder records which one the project uses.
- **Free project pausing:** a free project pauses after 7 days of low database activity.
- **Auth schema:** since April 2025, Supabase blocks creating objects in the `auth` schema. Foreign keys to `auth.users` and deleting rows from it are still allowed.
- **CSP:** the server's `helmet()` sends a Content-Security-Policy whose `connect-src` falls back to `'self'`. In production the browser must also reach the project URL for sign-in, so the policy has to allow it.
- **One new package:** `@supabase/supabase-js`, in both client and server. Nothing else is added.
- **Repo rules:** one branch (`main`), under 10 MB, no secrets committed. `.env` and `.env.*` are already git-ignored.

## Approaches (owner chose 1)

1. **Through our server (chosen).** The browser keeps the sign-in session. Our server verifies the token on every request, then asks Supabase for the data as that user, so RLS is a second guard. The server builds every plan saved through the app. It means more code: a token check plus routes for preferences, plans and deletion.
2. **Browser straight to Supabase.** No new server routes, about half the code. RLS would be the only guard and the app's own saves would not be checked by a server. It departs from `API.md` and from the acceptance test ("two-user isolation via direct API calls").

**Correction after the builder check (2026-11-18).** With option 1 a person can still skip our app and call Supabase's API directly. They would use the publishable key and their own token, which is the same access our server uses on their behalf. They can then write only their own rows. The database itself therefore enforces the limits: the 20-plan cap, the size limits and the object checks under Database. What the database cannot check is whether a plan written this way was built by our server. Only that person can ever see such a plan (see accepted risks). Stopping it fully would need a server-only key, which this design rules out. Option 1 still checks more than option 2 for every save made through the app.
3. **Server with the secret key (rejected).** It bypasses RLS, and `AUTHENTICATION_SECURITY.md` says to use that key as little as possible.

## Sign-in

- Supabase anonymous sign-in. The owner turns on "Allow anonymous sign-ins" in the dashboard. Linking an email later (manual identity linking) stays off.
- The client creates the account only when the person first clicks a save button, never on page load.
- supabase-js keeps the session in the browser's `localStorage` (its default) and refreshes the token itself.
- Text next to every save control: "Saved on this browser only. Clearing your browser data or switching devices loses it." The builder may adjust the wording within `DESIGN.md`.

## Server

**Configuration.** New optional env vars: `SUPABASE_URL` (https, from the dashboard) and `SUPABASE_PUBLISHABLE_KEY`. Without both, saving is off. Every saved-data route returns `503 SAVE_UNAVAILABLE` "Saving is not available right now." Startup logs `Supabase: configured` or `Supabase not configured; saving is off.`, like Gemini.

**Token check (`requireUser` middleware).**
- Reads `Authorization: Bearer <token>`.
- Verifies the token with `getClaims`.
- Requires `role === 'authenticated'`.
- Takes the user ID from `sub`.
- A missing, malformed, invalid or expired token gets `401 UNAUTHENTICATED` "Sign-in expired or missing." The code name is the one `API.md` §5 already lists.
- If the check can't reach Supabase (keys or Auth unreachable), the answer is `503 SAVE_UNAVAILABLE`, not 401: an unchecked token is not a bad token.
- Never reads a user ID from the body, the query or the path.
- `getClaims` runs on its own long-lived Supabase client. supabase-js turns off `auth` on a client built with `accessToken`, so the per-request client below can't do this check.

**Queries as the user.** Each request builds a Supabase client from the publishable key with `accessToken: async () => token`, so every query runs as that user under RLS. Queries also filter on `user_id = <sub>`. That repeats RLS, as `AUTHENTICATION_SECURITY.md` §3 asks.

**Reading back.**
- A preferences row is parsed with `householdContextSchema` before it is returned. A row that fails the parse (only possible if it was written outside the app) is returned as `null`, meaning nothing saved.
- A plan is returned as stored. No runtime schema for `DailyPlan` exists, and only its author can see a plan written outside the app.

**Routes.** All need `requireUser`. JSON bodies are limited to 4 KB, as on the daily-plan route.

| Route | Body / params | Success | Notes |
|---|---|---|---|
| `GET /api/v1/profile/preferences` | none | `200 { data: { context: HouseholdContext, updatedAt } \| null }` | `null` when nothing is saved yet |
| `PUT /api/v1/profile/preferences` | `HouseholdContext` (the existing strict `householdContextSchema`) | `200 { data: { context, updatedAt } }` | Upsert; unknown fields → 400 |
| `GET /api/v1/plans` | none | `200 { data: [{ id, savedAt, placeLabel }] }` | Newest first; at most 20 exist per user, so no paging |
| `GET /api/v1/plans/:id` | `id` uuid | `200 { data: { id, savedAt, plan: DailyPlan } }` | `404 NOT_FOUND` if missing or someone else's (same answer for both) |
| `POST /api/v1/plans` | same body as `POST /recommendations/daily-plan` | `201 { data: { id, savedAt, plan } }` | See "Saving a plan"; `409 LIMIT_REACHED` at 20 plans |
| `DELETE /api/v1/plans/:id` | `id` uuid | `204` | `404` if missing or someone else's |
| `DELETE /api/v1/account` | none | `204` | See "Deleting everything" |

- A bad `id` (not a uuid) → `400 VALIDATION_ERROR`.
- `POST /plans` uses the daily-plan route's 10-per-minute limit, because it can call Gemini. The other routes use only the existing 60-per-minute limit on `/api/v1`.
- New `ErrorCode` values: `UNAUTHENTICATED` (401), `SAVE_UNAVAILABLE` (503), `LIMIT_REACHED` (409). `API.md` §5 gains the last two.
- `409 LIMIT_REACHED` comes from the database. The insert raises a named error at the 21st plan and the server maps it, so there is no separate count-then-insert step.
- Supabase unreachable, paused or failing → `503 SAVE_UNAVAILABLE`. It is never treated as success and never as "nothing saved" (INTEGRATIONS §11: "do not claim persistence").

**Saving a plan (my call).** The client sends the same `{ place, householdContext }` body it sent for the plan, not the plan itself. The server builds the plan with the same code and the same 10-minute cache as `POST /recommendations/daily-plan`, saves that plan, and returns it.
- Why: a plan saved through the app can then never carry readings or text the server didn't produce, and the request stays small. Direct writes are covered in the correction under Approaches.
- Cost: if the cache has expired (more than 10 minutes since the plan was shown), the saved plan is built fresh and may differ from what was on screen. The response returns the saved plan, so the screen can show exactly what was saved.
- This means moving the daily-plan handler's body into one function that both routes call.

**Deleting everything.** `DELETE /api/v1/account` calls a database function `public.delete_my_account()` as the user. It deletes that user's row from `auth.users`, and their preferences and plans go with it (`on delete cascade`). The client then signs out locally.
- The function is `security definer`, `set search_path = ''`, and touches only the row where `id = (select auth.uid())`. Execute is revoked from `public` and `anon` and granted to `authenticated`.
- Fallback, only if the hosted project refuses that delete: the secret key on the server, used only for `auth.admin.deleteUser(sub)` after `requireUser`. The builder asks the owner before switching.
- An access token issued before deletion stays valid until it expires, but it reaches nothing: the rows are gone, and inserts fail the foreign key.

**Logging.** On a Supabase failure, one line: `Supabase request failed: <category>` (`network`, `http <status>`, `auth`). Never tokens, user IDs, household answers, labels, plan contents or request bodies.

**CSP.** When Supabase is configured, `connect-src` becomes `'self'` plus the `SUPABASE_URL` origin. All other helmet defaults stay.

## Database

One migration file in `supabase/migrations/`, dated when it is written. The owner runs it in the dashboard's SQL Editor; it is a data migration, so the owner says yes first.

**`household_preferences`** (one row per user)
- `user_id uuid primary key references auth.users(id) on delete cascade`
- `context jsonb not null default '{}'`: an object of at most 2 KB as text (CHECK)
- `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`, plus a trigger that keeps `updated_at` current

**`daily_plans`**
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `location_label text not null`: 1–120 characters (CHECK)
- `plan_json jsonb not null`: an object of at most 64 KB as text (CHECK)
- `created_at timestamptz not null default now()`
- Index on `(user_id, created_at desc)`
- A `before insert` trigger enforces at most 20 plans per user. It takes a per-user transaction lock (`pg_advisory_xact_lock` on the user ID) before counting, so two saves at once can't both pass. At the limit it raises a named error that the server maps to `409 LIMIT_REACHED`. The trigger holds for direct writes too.

**RLS**
- Enabled on both tables. Policies apply `to authenticated` with `(select auth.uid()) = user_id`.
- `household_preferences` gets 4 policies: select, insert, update (USING and WITH CHECK), delete.
- `daily_plans` gets 3 policies: select, insert, delete. It has no update policy, because a saved plan never changes (my call; least privilege).

**Changes from `DATABASE.md` (my calls)**
- One `context` column mirrors `HouseholdContext` instead of three jsonb columns. It is validated by the same schema as the plan request.
- No `location_label` in preferences. Places can't be reused without coordinates, and saved locations are P1.
- `user_id` is the primary key, because there is one row per user.
- `daily_plans` drops `data_context` and `updated_at`. The stored `DailyPlan` already carries its forecast provenance, air check, sources and safety note, and a saved plan is never edited.

## Client

- `client/src/lib/supabase.ts`
  - Creates the browser client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, or reports "not configured" when either is missing.
  - `ensureSession()` returns the current session or calls `signInAnonymously()`.
  - Each API call gets the current token just before sending.
- **Production build (my call: done in Phase 6).** The two `VITE_` values are baked in when the client is built. The Dockerfile gains `ARG VITE_SUPABASE_URL` and `ARG VITE_SUPABASE_PUBLISHABLE_KEY` before `npm run build -w client`. Phase 9 passes them as build args. Without them the image still builds, and its client says saving isn't available.
- `client/src/services/api.ts`
  - The existing `request` helper gains a method, a JSON body and an optional token. It also handles `204` replies, which have no body.
  - New functions: `getPreferences`, `savePreferences`, `listPlans`, `getPlan`, `savePlan`, `deletePlan`, `deleteAccount`.
  - Phase 7 uses the plan functions.
- `HouseholdPreferencesForm.tsx` on the dashboard
  - Asks every `HouseholdContext` question. All are optional, with no medical wording (PRD §10).
  - A "Save my answers" button calls `ensureSession()` and then `PUT`. If a session already exists on load, the form is filled from `GET`.
  - Shows the "this browser only" note and a "Delete my saved data" control. That control needs one confirming step, then calls `DELETE /account` and signs out.
  - When Supabase isn't configured or returns `SAVE_UNAVAILABLE`, the save controls say saving isn't available. The answers stay on screen and nothing claims they were saved.

## Tests

**Server, offline (default run).** Supabase is replaced by injected functions, the same way Phase 5 injects `generate`.
- `requireUser`: no header, a non-Bearer header, an invalid token and an expired token each get 401. A check that can't reach Supabase gets 503. A valid token passes the `sub` on.
- A stored preferences row that fails `householdContextSchema` reads back as `null`.
- Each route: body and params validation, unknown fields rejected, a `user_id` sent in a body is ignored or rejected.
- 404 for another user's plan.
- 409 at 20 plans.
- 503 when not configured or when Supabase fails.
- `POST /plans` saves the same plan the daily-plan route returns for the same body within 10 minutes.
- The CSP includes the project origin when configured.

**Live, opt-in** (`SUPABASE_LIVE=1` plus configured env; skipped otherwise, like the Gemini live test). Each run creates two anonymous users A and B, and deletes both at the end.
1. **Direct to Supabase with each user's token.**
   - A inserts preferences and a plan.
   - B selects them and gets 0 rows.
   - B's update or delete of A's rows changes 0 rows.
   - B inserting a row with A's `user_id` is rejected.
   - A's 21st direct plan insert is rejected by the trigger, and an oversized `context` is rejected by its CHECK.
2. **Through our API** (`createApp` with the real config).
   - A saves a plan.
   - B gets 404 on `GET` and `DELETE` for A's plan id.
   - A still has it.
3. **Deleting everything.**
   - A calls `DELETE /account`.
   - Selecting with A's still-unexpired token then returns 0 rows from both tables.

**Client.**
- The form loads saved answers, saves them and shows each failure state.
- Delete needs the confirming step.
- Save controls are disabled with an explanation when not configured.
- The axe check passes.

## Owner steps (before the live tests)

1. Create the free project: region South Asia (Mumbai), with the database password kept in a password manager.
2. Turn on "Allow anonymous sign-ins".
3. Paste the URL and publishable key into `server/.env` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) and `client/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). The builder supplies `.env.example` lines and never reads the values back.
4. Run the migration in the SQL Editor after reading it.

## Accepted risks

- **No CAPTCHA.** A script could create many anonymous accounts, limited to 30 per hour per IP by Supabase. The database caps each account at 1 preferences row of at most 2 KB and 20 plans of at most 64 KB each, including writes made outside the app.
- **Direct writes to one's own rows.** A person who calls Supabase's API with their own token can store a plan our server didn't build. It stays within the limits above and is visible only to them. React renders its text as text.
- **Saved data lives in one browser.** Clearing browser data loses access. The rows stay until a cleanup runs.
- **Abandoned anonymous accounts pile up.** Retention: kept until the person deletes them. A cleanup of accounts unused for 30 days is a Phase 9 follow-up, and `PRIVACY.md` will say so.
- **A saved plan can differ from the one on screen** when more than 10 minutes have passed since it was shown.
- **Free project pausing.** If judging runs past 7 days of low activity, saving returns `SAVE_UNAVAILABLE` until the owner restores the project. Phase 9 adds a keep-alive.

## Docs to update

- `API.md` §3: the routes above.
- `DATABASE.md`: an "As built" note with the changes listed under Database.
- `AUTHENTICATION_SECURITY.md` §2: anonymous sign-in.
- `PRIVACY.md`: what is stored, where, retention and deletion.
- `INTEGRATIONS.md` §5: "As built".
- `SETUP.md`: the env vars, the dashboard switch and running the migration.
- `THREAT_MODEL.md`: the anonymous-account abuse risk.
- `CHANGELOG.md`.
- `docs/IMPLEMENTATION_PLAN.md` Phase 6: "As built".
- Both `.env.example` files.

## Left to the builder

File split, test names, the form's question wording (within PRD §10 and `DESIGN.md`), SQL formatting and policy names, and the exact log categories.
