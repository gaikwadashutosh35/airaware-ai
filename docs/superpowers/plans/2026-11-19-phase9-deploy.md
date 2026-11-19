# Phase 9 — Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run AirAware as the public Cloud Run service `airaware` (asia-south1), verified live, with the Supabase keep-alive and the 30-day anonymous-account cleanup in place.

**Architecture:**
- The Phase 8 Docker image is built locally, pushed to Artifact Registry and deployed with `gcloud run deploy --image`.
- A scheduled GitHub workflow keeps Supabase active.
- A `pg_cron` job calls one locked-down SQL function that deletes idle anonymous users.

**Tech Stack:** gcloud CLI, Docker, Cloud Run, Artifact Registry, GitHub Actions, Supabase Postgres (`pg_cron`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-phase9-deploy-design.md`

## Global Constraints

- **Each needs the owner's yes at that moment:**
  - installing gcloud;
  - creating the project and linking billing;
  - enabling APIs and creating the registry;
  - configuring Docker's credential helper;
  - pushing the image;
  - every deploy;
  - setting repository variables;
  - enabling `pg_cron` and running the cleanup migration;
  - a budget alert;
  - every git push.
- **The owner does all sign-ins** (`gcloud auth login`). I never enter a password, never read or print any secret, and never handle `GEMINI_API_KEY`.
- **Public values only:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and their `VITE_` copies. I read only those lines, never a whole `.env` file.
- **Region and service:** region `asia-south1`; service `airaware`; `--max-instances 1 --min-instances 0 --memory 512Mi --cpu 1 --allow-unauthenticated`.
- **Workflows:** actions pinned by commit SHA, with `permissions: contents: read`.
- **Gate:** `npx prettier --write <files>; set -o pipefail; npm run typecheck; npm run lint; npm run format:check; npm test`.
- **Commits:** on `main`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The live build silently built without Supabase values.** Expected: a smoke check fails on "Saving isn't set up on this site". Pinned by Task 3, step 4.
2. **The live suite skipping its save steps.** Expected: when `E2E_BASE_URL` is set, a skip is a failure. Pinned by Task 2.
3. **The live suite's second browser pointing at localhost.** Expected: it uses the project's `baseURL`. Pinned by Task 2.
4. **The cleanup selecting a non-anonymous or recently active user.** Expected: never. Pinned by Task 5's SQL checks.
5. **The keep-alive passing against a paused or broken project.** Expected: only 2xx, 401 or 403 from PostgREST pass. Pinned by Task 4, step 3.

---

### Task 1: gcloud, project and registry (operations)

- [ ] **Step 1: Install gcloud.** Ask, then run `winget install --id Google.CloudSDK -e --silent`. Open a new shell and check `gcloud --version`.
- [ ] **Step 2: Owner signs in.** The owner runs `gcloud auth login` themselves; it opens a browser. Then I read `gcloud auth list` (account email only).
- [ ] **Step 3: Create the project.** Ask, then run:
  1. `gcloud projects create airaware-ai --name="AirAware AI"` (if the ID is taken, use `airaware-ai-<4 digits>` and tell the owner);
  2. `gcloud billing accounts list`, and the owner confirms which account;
  3. `gcloud billing projects link <project> --billing-account=<id>`;
  4. `gcloud services enable run.googleapis.com artifactregistry.googleapis.com --project <project>`;
  5. `gcloud artifacts repositories create airaware --repository-format=docker --location=asia-south1 --project <project>`.
- [ ] **Step 4: Budget alert.** Offer it (emails only, for example ₹500 a month). Create it only on a yes.
- [ ] **Step 5: Ledger.** Record the project ID, region and registry path.

### Task 2: Live-address support in the Playwright suite

**Files:**
- Modify: `e2e/playwright.config.ts`, `e2e/journey.spec.ts`

**Interfaces:**
- Produces: running `E2E_BASE_URL=<url> npm run e2e` points the whole suite at that address, with no local server.

- [ ] **Step 1: Change the config.**
  - `const live = process.env.E2E_BASE_URL;`
  - `use.baseURL = live ?? 'http://localhost:8090'`
  - `webServer = live ? undefined : {…as today…}`
- [ ] **Step 2: Change the journey.**
  - Step 9: when `process.env.E2E_BASE_URL` is set, `expect(notSetUp, 'saving must be set up on the live site').toBe(false)` instead of skipping.
  - Step 11: the second context uses `testInfo.project.use.baseURL` instead of the hard-coded localhost URL.
- [ ] **Step 3: Check the local run is unchanged.** Run `npm run e2e`. Expected: 16 passed. Run the gate and commit with the message `test: run the Playwright suite against a live address`.

### Task 3: Build, push, deploy and smoke checks (operations)

- [ ] **Step 1: Configure Docker's credentials.** Ask, then run `gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet`.
- [ ] **Step 2: Build and push.**
  1. Read only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `client/.env`, using `grep '^VITE_SUPABASE_URL=' | cut`.
  2. Build: `docker build --build-arg VITE_SUPABASE_URL=… --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=… -t asia-south1-docker.pkg.dev/<project>/airaware/app:<short sha> .`
  3. Ask, then push.
- [ ] **Step 3: Deploy.** Ask, then run:

```bash
gcloud run deploy airaware --image <image> --region asia-south1 --project <project> \
  --allow-unauthenticated --max-instances 1 --min-instances 0 --memory 512Mi --cpu 1 \
  --set-env-vars SUPABASE_URL=…,SUPABASE_PUBLISHABLE_KEY=…
```

  Record the service URL.
- [ ] **Step 4: Smoke checks** (read-only `curl`). Expected:
  - `/api/v1/health` → `{"status":"ok"}`;
  - `/`, `/app` and `/privacy` → 200;
  - `/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86` → 200 with `dataKind: model_forecast` and a `retrievedAt` within 15 minutes;
  - the CSP `connect-src` is exactly `'self'` plus the Supabase origin;
  - the logs show "Supabase: configured" and "Gemini not configured" (`gcloud run services logs read`).
  - Also confirm the built bundle contains the Supabase host. Fetch `/`, take the `assets/index-*.js` path from it and grep the bundle, so the page can't say "Saving isn't set up on this site".

### Task 4: Supabase keep-alive

**Files:**
- Create: `.github/workflows/keep-alive.yml`

- [ ] **Step 1: Set the repository variables.** Ask, then run `gh variable set SUPABASE_URL` and `gh variable set SUPABASE_PUBLISHABLE_KEY`, with the values piped from the grep of `server/.env`, never printed.
- [ ] **Step 2: Write the workflow.**
  - Triggers: `on: schedule: [{cron: '17 3 */3 * *'}]` and `workflow_dispatch`.
  - `permissions: contents: read`; one job; `timeout-minutes: 5`.
  - It runs `curl -sS -o body.json -w '%{http_code}' "$URL/rest/v1/daily_plans?select=id&limit=1" -H "apikey: $KEY"`. A 200, 401 or 403 succeeds; anything else prints the body and fails.
- [ ] **Step 3: Check the status rule locally.** Run the same `curl` from this machine. Expected: 401, with a JSON body containing `"code"`.
- [ ] **Step 4: Gate, commit, push, run.**
  1. Gate, then commit with the message `ci: keep the free Supabase project active`.
  2. Push (yes).
  3. Run `gh workflow run keep-alive.yml` and watch it. Expected: success.

### Task 5: 30-day anonymous-account cleanup

**Files:**
- Create: `supabase/migrations/20261119180000_cleanup_idle_anonymous.sql`

**Interfaces:**
- Produces:
  - `public.idle_anonymous_users(cutoff interval default interval '30 days') returns setof uuid`, select-only;
  - `public.delete_idle_anonymous_users() returns integer`;
  - the `pg_cron` job `delete-idle-anonymous-users` at `'30 21 * * *'` (03:00 IST).

- [ ] **Step 1: Write the migration.** Both functions are `SECURITY DEFINER`, `set search_path = ''`, with `EXECUTE` revoked from `public, anon, authenticated`.

```sql
-- idle = anonymous, and every activity date older than the cutoff
select u.id from auth.users u
where u.is_anonymous
  and greatest(
    u.created_at, u.last_sign_in_at, u.updated_at,
    (select max(greatest(s.created_at, s.updated_at, s.refreshed_at)) from auth.sessions s where s.user_id = u.id),
    (select max(greatest(t.created_at, t.updated_at)) from auth.refresh_tokens t where t.user_id = u.id::text)
  ) < now() - cutoff
```

  `delete_idle_anonymous_users()` deletes `auth.users` where `id in (select public.idle_anonymous_users())` and returns `row_count`. Scheduling is idempotent: unschedule `delete-idle-anonymous-users` if it exists, then `cron.schedule` it.
- [ ] **Step 2: Owner approval and `pg_cron`.** Show the owner the migration; on a yes, enable `pg_cron` in the dashboard together (their Chrome).
- [ ] **Step 3: Run it in the SQL Editor** (as in Phase 6). Expected: "Success. No rows returned".
- [ ] **Step 4: SQL checks** (select-only, in the editor). Expected:
  - `select count(*) from public.idle_anonymous_users();` → `0`, because every user is newer than 30 days;
  - `select bool_and(u.is_anonymous) from auth.users u where u.id in (select public.idle_anonymous_users(interval '0 seconds'));` → `true` or `null`, so non-anonymous users are never selected;
  - `select jobname, schedule, active from cron.job;` shows the job.
- [ ] **Step 5: Commit** with the message `feat(db): nightly cleanup of anonymous accounts unused for 30 days`.

### Task 6: Live verification, docs, final review

**Files:**
- Create: `DEPLOYMENT.md`
- Modify:
  - `docs/IMPLEMENTATION_PLAN.md` (Phase 9 "as built")
  - `PRIVACY.md`, `DATABASE.md` (the cleanup is now real)
  - `THREAT_MODEL.md` (correct the Gemini ceiling; abandoned accounts are now cleaned)
  - `SETUP.md` (link to DEPLOYMENT)
  - `CHANGELOG.md`

- [ ] **Step 1: Live Playwright.** Run `E2E_BASE_URL=<url> npm run e2e`. Expected: 16 passed, with no skip. Then check the Supabase Users page together, or ask the owner.
- [ ] **Step 2: Write `DEPLOYMENT.md`:**
  - the service, region, limits and URL;
  - build, push and deploy commands;
  - rollback (`gcloud run services update-traffic airaware --to-revisions <rev>=100`);
  - adding Gemini: lower the quota first, then `printf '%s' "<paste>" | gcloud secrets create gemini-api-key --data-file=-`, grant the runtime service account `roles/secretmanager.secretAccessor`, and redeploy with `--set-secrets GEMINI_API_KEY=gemini-api-key:latest`. All of this is done by the owner;
  - costs and the free tier;
  - keep-alive and cleanup;
  - what to check after a deploy.
- [ ] **Step 3: Gate, commit, final review.** Gate, then commit with the message `docs: phase 9 deployment as built`. Then a fresh Opus reviewer checks the range; Critical and Important findings are fixed test-first, and the push needs a yes.
