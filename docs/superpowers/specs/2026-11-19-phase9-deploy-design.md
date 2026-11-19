# Phase 9 — Production deployment (design)

Status: approved by the owner, 2026-11-19 ("Approve, start"). Plan: `docs/superpowers/plans/2026-11-19-phase9-deploy.md`. Owner choices:
- deploy from this machine (build here, push to Artifact Registry, deploy to Cloud Run);
- a new Google Cloud project, `airaware-ai`.

Sources: `docs/IMPLEMENTATION_PLAN.md` §7 Phase 9 and §8; ADR-005 (one Cloud Run service); `THREAT_MODEL.md` "Residual risks"; `PRIVACY.md` and `DATABASE.md` (the 30-day cleanup promise); the Phase 8 Docker check (the image builds with `--ignore-scripts` and serves `/`, `/app`, `/privacy` and health).

## Intent

Put AirAware online at a public HTTPS address that judges can open. It is the same single Express service that serves the API and the built client, the image verified in Phase 8. Phase 9 also closes three promises made earlier:
- bound Gemini spend by capping Cloud Run instances;
- keep the free Supabase project from pausing before judging;
- remove anonymous accounts nobody has used for 30 days.

## Goals

- **A live service:** Cloud Run service `airaware` in `asia-south1` (Mumbai, next to Supabase), public (`--allow-unauthenticated`), from an image in Artifact Registry tagged with the git commit.
- **Production settings:**
  - `NODE_ENV=production` (already baked into the image; it trusts exactly one proxy hop, Cloud Run's front end);
  - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as plain environment variables (they are public by design);
  - the client built with the two `VITE_SUPABASE_*` build args.
- **Instances:** `--max-instances 1`, `--min-instances 0`, 512 MiB memory, 1 CPU, default concurrency (80). This stays in Cloud Run's free tier and keeps the in-memory rate limits and Gemini counter consistent. The in-memory counter resets when the instance scales to zero, so on its own it does not bound Gemini spend (see "Settled after the builder check").
- **Gemini, wired but off:** the first deploy has no `GEMINI_API_KEY`, so every plan says "Made by our rules…" and startup logs "Gemini not configured". `DEPLOYMENT.md` gives the owner one command that creates the secret in Secret Manager from a pasted key and redeploys with `--set-secrets`. I never see or handle the key.
- **Supabase keep-alive:** a scheduled GitHub Actions workflow (`.github/workflows/keep-alive.yml`) runs every 3 days.
  - It makes one read request to the project's REST API with the publishable key and checks that the API answers.
  - It counts as API activity, so the free project doesn't pause after 7 quiet days.
  - It reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from repository variables, not secrets (both are public).
- **30-day cleanup:** a migration (`supabase/migrations/2026111912xxxx_cleanup_idle_anonymous.sql`) schedules a nightly `pg_cron` job.
  - It deletes anonymous users (`auth.users.is_anonymous`) whose newest session activity, or creation if they have no session, is more than 30 days old.
  - Their saved answers and plans go with them (`on delete cascade`).
  - It never touches non-anonymous users. A test against the live database proves an active anonymous user is kept.
- **Verified live:**
  - Health, `/`, `/app`, `/privacy` and the forecast API for Pune return real Open-Meteo data, with a `retrievedAt` within minutes.
  - The CSP allows exactly self plus the Supabase origin.
  - The full Playwright suite (journey, failures, pages) runs against the live address at both sizes.
  - Every test account is deleted again.
- **Docs:** `DEPLOYMENT.md` covers deploy, rollback, adding the Gemini key, costs, keep-alive and cleanup. Also updated: `docs/IMPLEMENTATION_PLAN.md` Phase 9 "as built", `PRIVACY.md` and `DATABASE.md` (cleanup now real), `THREAT_MODEL.md`, and `CHANGELOG.md`.

## Non-goals

- Turning on Gemini (the owner adds credits and the key later).
- A custom domain; the `*.run.app` address is enough.
- Deploying automatically from GitHub (owner chose deploying from this machine).
- The CPCB data follow-up.
- Phase 10 submission work (README, narrative).

## Anti-goals

- Any secret in the image, the repository, a command line, a log or this conversation.
- A live site that silently serves stale, demo or invented data.
- A cleanup that could delete an active person's data, or any non-anonymous user.
- Cost surprises: no paid tier enabled, and no instance kept warm.

## Constraints

- **Each needs the owner's yes at that moment:**
  - installing gcloud (`winget install Google.CloudSDK`);
  - creating the project and linking billing;
  - enabling APIs and creating the Artifact Registry repo;
  - `gcloud auth configure-docker` (changes local Docker config);
  - pushing the image;
  - every deploy;
  - setting GitHub repository variables;
  - enabling `pg_cron` and running the cleanup migration (a scheduled delete);
  - any budget alert (a billing setting).
- **The owner signs in.** `gcloud auth login` opens Google sign-in in the browser; the owner completes it. I never enter passwords.
- **No new runtime dependency.** The keep-alive workflow uses only `curl` and actions pinned by SHA.
- **Git rules:** one branch, `main`; pushes need the owner's yes.

## Approaches (owner chose 1)

1. **From this machine (chosen):** local `docker build`, `docker push` to Artifact Registry, `gcloud run deploy --image`. Simplest, and it reuses the verified image. Deploys happen only when run.
2. **From GitHub on every push:** Workload Identity Federation plus a deploy workflow. Repeatable and more Google tooling, but needs a service account and IAM setup (about 45 minutes more and more to secure).
3. **`gcloud run deploy --source .`** (Cloud Build): rejected, because it can't pass the `VITE_*` build args to the Dockerfile without an extra `cloudbuild.yaml`, and it adds Cloud Build to the bill.

## Order of work

1. **Install gcloud** (yes). The owner runs `gcloud auth login` in their browser.
2. **Project** (yes):
   1. `gcloud projects create airaware-ai` (or `airaware-ai-<suffix>` if taken);
   2. link the billing account (`gcloud billing accounts list` shows it; the owner confirms which);
   3. enable `run.googleapis.com` and `artifactregistry.googleapis.com`;
   4. create the Docker repository `airaware` in `asia-south1`.
3. **Optional budget alert** (yes): for example ₹500 a month with emails at 50%, 90% and 100%. Offered, not assumed.
4. **Build and push** (yes):
   1. `gcloud auth configure-docker asia-south1-docker.pkg.dev`;
   2. `docker build` with the two `VITE_SUPABASE_*` build args, read from `client/.env` (public values);
   3. tag `asia-south1-docker.pkg.dev/<project>/airaware/app:<short sha>`, then push.
5. **Deploy** (yes): `gcloud run deploy airaware` with the image, region, `--allow-unauthenticated`, `--max-instances 2`, `--min-instances 0`, `--memory 512Mi`, `--cpu 1`, and `--set-env-vars SUPABASE_URL=…,SUPABASE_PUBLISHABLE_KEY=…`.
6. **Smoke checks** against the URL (read-only `curl`): health, the pages, forecast and timestamps, the CSP header.
7. **Live Playwright:** `e2e/playwright.config.ts` gains `E2E_BASE_URL`. When it is set, it becomes the `baseURL` and no local `webServer` starts. Run the whole suite against the live URL.
8. **Keep-alive:**
   1. set the two repository variables (yes);
   2. add `keep-alive.yml` (schedule every 3 days, plus `workflow_dispatch`);
   3. push (yes);
   4. run it once by hand and check that it passes.
9. **Cleanup:**
   1. write the migration, with its delete rule in one SQL function;
   2. the owner approves;
   3. enable `pg_cron` (Supabase dashboard → Database → Extensions; done with the owner, in their Chrome);
   4. run the migration in the SQL Editor;
   5. a live test (opt-in, like the Phase 6 one) proves an anonymous user active today is kept, and that the function's selection excludes non-anonymous users.
10. **Docs and commit;** push (yes).

## Grading of what we find in production

Treated like Phase 8: a Critical or high problem (data across users, a secret exposed, stale data shown as current, the site down) is fixed test-first before the address is called live. Anything else is fixed or written down.

## Settled after the builder check (my calls)

1. **What "unused for 30 days" means.** A user counts as unused only if every activity signal is older than 30 days:
   - `auth.users`: `created_at`, `last_sign_in_at`, `updated_at`;
   - `auth.sessions`: the newest `created_at`, `updated_at`, `refreshed_at`;
   - `auth.refresh_tokens`: the newest `created_at`, `updated_at`.

   The job takes the greatest of all of them, so a user whose sessions were pruned still counts their user-row dates. It deletes only rows with `is_anonymous = true`. The rule lives in one function that the live test can call in a select-only "dry run" form.
2. **The Gemini ceiling is not 400 a day.** Scale-to-zero and replacement instances reset the in-memory counter, so the real global limit must be Gemini's own.
   - Before adding the key, `DEPLOYMENT.md` has the owner lower the Generative Language API quota "requests per day" in the Cloud console, plus an optional budget alert.
   - The in-process cap of 200 a day stays as a second line.
   - `--max-instances 1` keeps the rate limits per client consistent.
   - `THREAT_MODEL.md` is corrected to match.
3. **Build args.** I read only the two `VITE_SUPABASE_*` lines from `client/.env`; both values are public by design, and I handled them in Phase 6. A smoke check fails if the live page says "Saving isn't set up on this site". When the suite targets the live address (`E2E_BASE_URL`), a skipped save step counts as a failure.
4. **One Supabase project.** It serves both production and testing (free tier).
   - The live suite creates 4 anonymous users and deletes each one through the app's own `DELETE /api/v1/account`.
   - A cleanup that fails is reported (Phase 8 change), and the nightly job catches any orphan after 30 days.
   - The rate limiter is keyed by the client IP that Cloud Run's front end appends (`trust proxy` 1, tested since Phase 2). The suite's 8 plan requests come from this machine's IP only, so judges are unaffected.
5. **The cleanup migration.**
   - It runs through the SQL Editor (as in Phase 6; no Supabase CLI).
   - It is idempotent: it unschedules the job if it exists, then schedules it.
   - The delete runs in a `SECURITY DEFINER` function owned by `postgres`, with `search_path = ''` and `EXECUTE` revoked from `public`, `anon` and `authenticated`. Only the `pg_cron` job (run as `postgres`) calls it.
6. **The keep-alive request.**
   - It sends `GET {SUPABASE_URL}/rest/v1/daily_plans?select=id&limit=1` with the publishable key, which reaches Postgres through PostgREST.
   - The `anon` role has no grant on the table, so PostgREST answers 401 with a JSON error, and that counts as success. A paused project, a 5xx or a network failure fails the workflow, and GitHub emails the owner.
7. **Billing.** A budget alert only sends emails; it never caps spend. It is offered and the owner may decline it. Node 26 with `--ignore-scripts` was verified in the image in Phase 8.

## Left to the builder

- Exact `gcloud` flag spelling.
- The image tag format.
- The cron time of day (night in India).
- How the keep-alive request is shaped, as long as it is read-only and public-key only.
- Test names.
