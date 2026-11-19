# AirAware AI — Deployment

Live site: **https://airaware-ai.netlify.app** (Netlify project `airaware-ai`, owner's team). Decision: ADR-006.

## How it runs

- **Pages:** Netlify's CDN serves the built client (`client/dist`). `/app` and `/privacy` are rewritten to `index.html`.
- **API:** `/api/*` is rewritten to one Netlify Function, `netlify/functions/api.ts`, which re-exports `server/src/netlify.ts`. It is the same Express app (`createApp`) as the local server, wrapped by `serverless-http`.
- **Security headers:** the API gets them from helmet. The pages get the same headers from `client/public/_headers`, and `server/src/pageHeaders.test.ts` fails if the two ever differ. On pages, Netlify's own HSTS header (which adds `preload`) replaces ours.
- **Rate limits** key on `x-nf-client-connection-ip`, which Netlify sets. A forged value is overwritten (checked live, 2026-11-19).
- **Data:** Supabase (Mumbai) for anonymous sign-in and saved data; Open-Meteo for the forecast. Gemini is wired but off until its key is added.

## Deploys

- **Every push to `main` deploys production.** Netlify builds from GitHub with the settings in `netlify.toml`:
  - `npm run build -w client`;
  - `NODE_VERSION = "24"`;
  - `NPM_FLAGS = "--ignore-scripts"`;
  - functions bundled by esbuild.
- There are no preview branches: the challenge allows one branch.
- **Cost:** about 15 credits per production deploy.

## Environment variables (Netlify → Project configuration → Environment variables)

| Name | Used by | Notes |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | the function | Public values. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | the client build | Public, and built into the bundle. |

- **Don't mark these four "secret".** Netlify scans build output for secret values and fails the build, and the bundle contains them by design.
- **Never add `NODE_ENV`.** `npm` would skip the client's build tools.
- **Never add a Supabase secret key** (`sb_secret_…`).

## Rollback

Netlify → Deploys → pick an earlier published deploy → **Publish deploy**. To stop pushes from going live while you investigate, use **Lock to stop auto publishing** on the same page.

## Adding Gemini later (owner only)

1. **Lower the quota.** In the Google Cloud console for the Gemini project, lower the Generative Language API quota "requests per day". The in-process cap (200 calls per UTC day per function instance) is only a second line, because Netlify can run several instances and each starts its own count.
2. **Add the key.** Add `GEMINI_API_KEY` in Netlify's environment variables, marked **secret**, scoped to Functions. Optionally add `GEMINI_MODEL`.
3. **Redeploy.** Use Deploys → Trigger deploy. After that, plans say "Made with AI" when Gemini answers.

## Credits and limits (checked 2026-11-19)

| Item | Netlify credits |
|---|---|
| Production deploy | 15 each |
| Bandwidth | 20 per GB |
| Web requests | 2 per 10 000 |
| Function compute | 10 per GB-hour |

- If the balance runs out, Netlify pauses the site ("Site not available") until credits are added or renewed.
- The owner decides whether auto-recharge is on.

## Supabase keep-alive

- **What it does:** `.github/workflows/keep-alive.yml` runs every 3 days (03:17 UTC) and on demand. It reads `daily_plans` through the REST API with the publishable key.
- **What passes:** a 200, or a 401/403 carrying Postgres's `42501` code, means the project is up. Anything else fails the run, and GitHub emails the owner. That includes a gateway "Invalid API key".
- **Settings:** it uses the repository variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, which are public.

## 30-day cleanup

- **The job:** `pg_cron` job `delete-idle-anonymous-users` runs at 21:30 UTC (03:00 IST). It calls `public.delete_idle_anonymous_users()`. That deletes anonymous users whose user-row, session and refresh-token dates are all older than 30 days. Their saved data goes with them.
- **Setup:** `supabase/migrations/20261119180000_cleanup_idle_anonymous.sql`, run in the SQL Editor after enabling `pg_cron`. It is safe to re-run.
- **Who can call it:** nobody through the API. `anon` and `authenticated` can't execute the functions; the REST API returns 401.

## After every deploy

1. `curl https://airaware-ai.netlify.app/api/v1/health` returns 200 `{"status":"ok",…}`.
2. `/`, `/app` and `/privacy` return 200.
3. The Pune forecast (`/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86`) is `model_forecast`, with a fresh `retrievedAt`.
4. The CSP on `/app` equals the CSP on `/api/v1/health`.
5. `E2E_BASE_URL=https://airaware-ai.netlify.app npm run e2e` gives 16 passed, none skipped. The suite deletes every account it creates.

## Local production run

The Dockerfile still builds the same app as one Express process; see `SETUP.md` §8.
