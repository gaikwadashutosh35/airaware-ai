# AirAware AI — Database Schema and Relationships

## 1. Database principles

- PostgreSQL on Supabase.
- UUID primary keys.
- Foreign keys and explicit deletion behavior.
- RLS on every user-owned table.
- Store only what the product needs.
- Avoid detailed health records.
- Exact coordinates are not persisted by default.
- Environmental readings should be cached separately from personal preferences if caching is required.

## 2. Entity relationship overview

```text
auth.users
   |
   +--- profiles (1:1)
   |
   +--- household_preferences (1:1)
   |
   +--- saved_locations (1:N)
   |
   +--- daily_plans (1:N) --- plan_feedback (1:N)
```

Daily plans contain a provenance snapshot so that a saved plan retains the data context used when it was generated. Do not treat a saved snapshot as current data.

## 3. Tables

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK/FK | References `auth.users(id)` |
| `display_name` | text nullable | Optional |
| `preferred_language` | text | `en`, `hi`, or `mr` |
| `created_at` | timestamptz | Default now |
| `updated_at` | timestamptz | Maintained on update |

### `household_preferences`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Owner |
| `location_label` | text | User-visible area label |
| `routine` | jsonb | Commute/exercise/school preferences |
| `home_context` | jsonb | Cooking/exhaust/near-road/filter availability |
| `household_needs` | jsonb | Optional broad preferences, no diagnoses |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique constraint on `user_id` if one preference profile per user is chosen.

### `saved_locations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Owner |
| `label` | text | User-provided display name |
| `latitude` | double precision nullable | Persist only with explicit consent |
| `longitude` | double precision nullable | Persist only with explicit consent |
| `provider_place_id` | text nullable | Provider-specific ID, if allowed |
| `created_at` | timestamptz | |

Validate latitude [-90, 90] and longitude [-180, 180]. Do not expose coordinates unnecessarily.

### `daily_plans`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Owner |
| `location_label` | text | Display label |
| `plan_json` | jsonb | Validated action plan |
| `data_context` | jsonb | Provider, data kind, timestamps, units, limitations |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `plan_feedback`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | Owner |
| `plan_id` | uuid FK | Owned plan |
| `rating` | smallint | Constrain range, e.g. 1–5 |
| `comment` | text nullable | Limit size; do not solicit medical data |
| `created_at` | timestamptz | |

## 4. Relationships

- `profiles.id` → `auth.users.id` (one-to-one).
- `household_preferences.user_id` → `auth.users.id` (one-to-one or one-to-many by chosen design; document it).
- `saved_locations.user_id` → `auth.users.id` (one-to-many).
- `daily_plans.user_id` → `auth.users.id` (one-to-many).
- `plan_feedback.plan_id` → `daily_plans.id` and `user_id` → `auth.users.id`.

Ensure a feedback row cannot refer to another user's plan. A composite ownership constraint or server-side check may be used in addition to RLS.

## 5. RLS policy intent

For each user-owned table:
- SELECT only rows where `auth.uid() = user_id`.
- INSERT only when `auth.uid() = user_id`.
- UPDATE only when `auth.uid() = user_id` both before and after the update.
- DELETE only own rows.

For `profiles`, compare `id` with `auth.uid()`.

Example policy pattern (adapt table names and test in Supabase):

```sql
alter table public.daily_plans enable row level security;

create policy "users read own plans"
on public.daily_plans for select
to authenticated
using (auth.uid() = user_id);

create policy "users insert own plans"
on public.daily_plans for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users update own plans"
on public.daily_plans for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users delete own plans"
on public.daily_plans for delete
to authenticated
using (auth.uid() = user_id);
```

Apply equivalent policies to all user-owned tables. RLS must be tested using different authenticated users, not only the service role.

## 6. Environmental data caching (optional)

If caching provider responses, use a separate table such as `air_data_cache` with:
- Provider and provider cache key.
- Location grid/coordinates as allowed by provider terms.
- Data kind.
- Payload JSON.
- Retrieved time and source valid time.
- Expiration time.

Do not store user-linked precise coordinates in a global cache. Do not allow cached model forecasts to be labelled official station observations. Keep cache retention short and provider-compliant.

## 7. Migrations and indexes

- Use versioned SQL migrations under `supabase/migrations/`.
- Add indexes for `user_id`, `created_at`, and common query filters.
- Add CHECK constraints for rating ranges and coordinate ranges.
- Use explicit `on delete` behavior.
- Add `updated_at` triggers where needed.
- Keep migration history in Git.

## 8. Data retention and deletion

- Provide deletion for preferences, saved locations, and plans.
- Avoid persisting raw AI conversation history in MVP unless needed.
- Document retention of operational logs and provider caches.
- When a user deletes their account, define a deletion workflow for associated records.
- Never claim complete deletion from external provider logs unless that behavior is controlled and verified.

## 9. As built (Phase 6, 2026-11-18)

Migration: `supabase/migrations/20261118120000_saved_data.sql`. Design: `docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md`.

Built tables:
- `household_preferences`: `user_id` (primary key, → `auth.users`, `on delete cascade`), `context` jsonb (an object of at most 2048 bytes as text), `created_at`, `updated_at` (kept current by a trigger).
- `daily_plans`: `id`, `user_id` (→ `auth.users`, `on delete cascade`), `location_label` (1–120 characters), `plan_json` (an object of at most 65536 bytes as text), `created_at`; index on `(user_id, created_at desc)`. A `before insert` trigger allows at most 20 plans per user, under a per-user lock.

Grants are explicit, so access never depends on project defaults. `anon` gets nothing. `authenticated` gets select, insert, update and delete on `household_preferences`, and select, insert and delete on `daily_plans`.

RLS is enabled on both tables, `to authenticated`, with `(select auth.uid()) = user_id`:
- `household_preferences`: select, insert, update (USING and WITH CHECK), delete.
- `daily_plans`: select, insert, delete. There is no update policy, because a saved plan never changes.

`public.delete_my_account()` (`security definer`, `search_path = ''`) deletes only the calling user from `auth.users`, and their rows go with them. Only `authenticated` may execute it.

Changes from §3:
1. One `context` column mirrors `HouseholdContext` instead of three jsonb columns.
2. No `location_label` in preferences: saved locations are P1, and coordinates are not stored.
3. `user_id` is the primary key of `household_preferences` (one row per user).
4. `daily_plans` has no `data_context` or `updated_at`. The stored `DailyPlan` carries its own forecast provenance, air check, sources and safety note, and it is never edited.

`profiles`, `saved_locations` and `plan_feedback` are not built (P1).

Retention: rows are kept until the person deletes them ("Delete my saved data" or `DELETE /api/v1/account`). Supabase does not clean up anonymous users by itself. The `pg_cron` job `delete-idle-anonymous-users` (`supabase/migrations/20261119180000_cleanup_idle_anonymous.sql`) runs nightly at 21:30 UTC.
- It deletes anonymous users whose user-row, session and refresh-token dates are all older than 30 days. Their rows go with them (`on delete cascade`).
- Its two functions are `SECURITY DEFINER`, with `EXECUTE` revoked from `public`, `anon` and `authenticated`.
