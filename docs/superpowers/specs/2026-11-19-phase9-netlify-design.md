# Phase 9 — Hosting on Netlify (design)

Status: draft for the owner's approval. It replaces the Cloud Run hosting in `2026-11-19-phase9-deploy-design.md`; that spec's keep-alive, cleanup and live-verification parts still stand.

Owner's decisions (2026-11-19):
- no Google billing; keep hosting free;
- host on Netlify, on the owner's account, which has 10 000 credits;
- the pages go on Netlify's CDN and one Netlify Function runs the API;
- set it up through the owner's Chrome.

## Why

- Cloud Run needs a billing-linked Google project; the owner wants none.
- Netlify gives the site credits rather than a bill.
- Cost: the unofficial rubric's "deployed on Cloud Run" point is given up. Gemini stays the Google service once its key is added.

## Approaches

1. **CDN pages + one function wrapping the existing Express app (chosen).**
   - Netlify's CDN serves the pages and assets. They cost no function calls and never cold-start.
   - Netlify rewrites `/api/*` to one function, which runs `createApp(...)` through `serverless-http`.
   - Everything stays on one origin, so CORS is never needed.
2. **The function serves the pages too.** One CSP source, but every page view costs a function call and can wait for a cold start. Rejected.
3. **Render free web service.** Runs the Docker image unchanged, but sleeps after 15 minutes idle; the first visit then takes about a minute. Rejected.

## What gets built

1. **`server/src/config/appOptions.ts`.**
   - `appOptionsFromEnv(env: Env): AppOptions` builds the Gemini generator, the Supabase store and the model name, and logs the two "configured / not configured" lines.
   - `server.ts` and the function both use it, so the wiring isn't written twice.
2. **`netlify/functions/api.ts`:**
   ```ts
   export const handler = serverless(createApp({ ...appOptionsFromEnv(loadEnv(process.env)), clientIpHeader: 'x-nf-client-connection-ip' }))
   ```
   - New runtime dependency: `serverless-http` (in `server/package.json`).
   - A unit test calls the handler with a Lambda-style `GET /api/v1/health` event and expects 200 with `{"status":"ok"}`.
3. **Rate-limit key.**
   - `AppOptions.clientIpHeader?: string`. When set, both limiters (60/min and the plan 10/min) key on that header's value, passed through `ipKeyGenerator`, and fall back to `req.ip` when the header is missing.
   - Netlify sets `x-nf-client-connection-ip` itself. `X-Forwarded-For` is not trusted on Netlify.
   - Tests:
     - two different header values get separate buckets;
     - a changing `X-Forwarded-For` with the same header value shares one bucket.
4. **`client/public/_headers`.**
   - It holds the same security headers helmet sets on API responses, with the CSP `connect-src 'self' <Supabase origin>`. Vite copies it into `client/dist`.
   - The Supabase origin is written in the file. It is public: it is already in the live bundle.
   - A test reads the file, takes the origin from it, and checks that every header equals what `createApp({ saved })` sends for that origin. The two copies cannot drift.
5. **`netlify.toml`:**
   - the build command `npm run build -w client`;
   - `NPM_FLAGS = "--ignore-scripts"`, as in Phase 8;
   - `NODE_VERSION = "24"` (`engines` is `>=24`; Lambda runs Node 24);
   - publish `client/dist`;
   - functions `netlify/functions` with the esbuild bundler;
   - rewrites:
     - `/api/*` → `/.netlify/functions/api/:splat` 200;
     - `/app` → `/index.html` 200;
     - `/privacy` → `/index.html` 200.

## Setup in the owner's Chrome

1. **Netlify sign-in.** The owner signs in. If Netlify asks to authorize GitHub, the owner clicks Authorize; OAuth grants are theirs.
2. **New project.** Import `gaikwadashutosh35/airaware-ai`, branch `main`. Build settings come from `netlify.toml`. Site name `airaware-ai`, or the closest one free.
3. **Environment variables.** The owner pastes four values from their own `.env` files: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. I don't type keys into forms.
   - `NODE_ENV` is not set: it would make `npm ci` skip the client's build tools.
4. **Deploy.** Every push to `main` deploys production, about 15 credits each. There are no preview branches, because the challenge allows one branch.
5. **Credit limit (owner).** The owner checks whether auto-recharge is on if they want a hard stop at the credit balance.

## Verification (unchanged from the Cloud Run spec, new address)

- Smoke checks:
  - health;
  - `/`, `/app`, `/privacy`;
  - the Pune forecast with a fresh `retrievedAt`;
  - the CSP on a page and on an API response;
  - the bundle contains the Supabase host.
- **Spoofing check on the live site:** 61 health requests from this machine, each with a different forged `x-nf-client-connection-ip`. If Netlify keeps our real IP, request 61 gets 429. If it doesn't, the key is spoofable: that is a finding to fix before calling the site live.
- `E2E_BASE_URL=https://<site>.netlify.app npm run e2e`: 16 passed, none skipped.

## Unchanged

- The keep-alive workflow and the 30-day cleanup migration (Tasks 4–5 of the Phase 9 plan).
- The Dockerfile stays for local runs.

## Risks accepted

- **Rate limits per function instance.** Each running copy counts on its own, so the limits are weaker under parallel load. The Gemini daily counter is per instance too. The Gemini quota in Google's console stays the real cap when the key is added.
- **Function region.** The default is Netlify's US region; Supabase is in Mumbai. Saves and loads gain roughly 0.2 s, not yet measured.

## Docs

- ADR-006, which supersedes ADR-005;
- `ARCHITECTURE.md` §2 and §9;
- `README.md` (the technology line);
- `DEPLOYMENT.md`;
- `THREAT_MODEL.md`;
- `COST_AND_LIMITS.md`;
- `SETUP.md`;
- `CHANGELOG.md`;
- `docs/IMPLEMENTATION_PLAN.md` (Phase 9 "as built").

## After it is live (owner's yes)

Delete the Google project `airaware-ai-7341` and its ₹500 budget. Optionally relink `fair-smile-435217-r0` to billing.

## Left to the builder

- Test names.
- The `_headers` parser.
- How `ipKeyGenerator` is applied.
- Exact `netlify.toml` spelling.
