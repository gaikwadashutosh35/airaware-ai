# Phase 9 — Netlify Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve AirAware from Netlify: the client from the CDN, and the existing Express API as one Netlify Function. Verify it live, then finish Phase 9's keep-alive, cleanup and docs.

**Architecture:**
- `netlify/functions/api.ts` re-exports a `serverless-http` handler that wraps `createApp(...)`.
- The handler's options come from a shared `appOptionsFromEnv()`.
- `/api/*` is rewritten to the function. The pages carry helmet's headers through `client/public/_headers`, and a test keeps that file equal to helmet's output.

**Tech Stack:** Netlify (Git-connected builds, Functions), `serverless-http`, Express 5, express-rate-limit 8, helmet 8, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-phase9-netlify-design.md`. It supersedes the hosting part of `docs/superpowers/specs/2026-11-19-phase9-deploy-design.md`. That spec's keep-alive, cleanup and verification parts still apply.

## Global Constraints

- **Each needs the owner's yes at that moment:**
  - every git push;
  - triggering a deploy;
  - deleting the Google project;
  - running the cleanup migration (destructive scheduled delete);
  - setting GitHub repository variables.
- **The owner does these in Chrome:**
  - all sign-ins;
  - the Netlify GitHub authorization (an OAuth grant);
  - pasting the four Supabase values into Netlify.

  I never type keys or tokens into forms.
- **Secrets:** never read or print a secret. From `.env` files, grep only the public `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_*` lines.
- **Netlify settings:**
  - the client-IP header is `x-nf-client-connection-ip`;
  - `NODE_VERSION = "24"`;
  - `NPM_FLAGS = "--ignore-scripts"`;
  - publish `client/dist`;
  - functions in `netlify/functions` with the esbuild bundler.
- **No new runtime dependency** other than `serverless-http`.
- **Gate:** `npx prettier --write <files>; set -o pipefail; npm run typecheck && npm run lint && npm run format:check && npm test || exit 1`
- **Commits:** on `main`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **API path under the rewrite.** Express must see `/api/v1/...` when Netlify rewrites `/api/*` to the function. Expected live: `/api/v1/health` returns 200 `{"status":"ok"}`, not 404 `NOT_FOUND`. Pinned by Task 5, step 2.
2. **A spoofed `x-nf-client-connection-ip`.** Netlify must replace a client-sent value with the real IP. Expected: the 61st request with a fresh forged header gets 429. Pinned by Task 5, step 3.
3. **Node 24 on Netlify, Node 26 here and in CI.** The forecast and the plan build must run on Netlify's runtime. Pinned by the Task 5 smoke checks and the live e2e.
4. **Supabase values missing from the Netlify build.** The live page would say "Saving isn't set up on this site." Expected: a smoke check and the e2e step 9 fail. Pinned by Task 5, step 2.
5. **Client-IP header absent** (a direct function call, a local run). Expected: the limiter falls back to `req.ip` and never crashes. Pinned by Task 2, step 1.

---

### Task 1: Shared app options from the environment

**Files:**
- Create: `server/src/config/appOptions.ts`
- Test: `server/src/config/appOptions.test.ts`
- Modify: `server/src/server.ts` (replace its Gemini/Supabase wiring and both logs with the new function)

**Interfaces:**
- Consumes: `Env` and `loadEnv` (`config/env.ts`), `createGeminiGenerator`, `createSupabaseStore`, `AppOptions` (`app.ts`).
- Produces: `appOptionsFromEnv(env: Env): AppOptions`. It sets `trustProxy`, `generatePlan`, `aiModel` and `saved`. It does not set `clientDir`, which stays `server.ts`'s concern.

- [ ] **Step 1: Write the failing tests** in `appOptions.test.ts`. Spy on `console.log` in each.
  - `appOptionsFromEnv(loadEnv({}))`: `generatePlan` and `saved` are undefined, and `trustProxy` is false. It logs `'Gemini not configured; plans are rules-only.'` and `'Supabase not configured; saving is off.'`
  - `loadEnv({ SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })`: `saved?.origin` is `'https://abc.supabase.co'`, and it logs `'Supabase: configured'`.
  - `loadEnv({ GEMINI_API_KEY: 'k' })`: `typeof generatePlan` is `'function'`, `aiModel` is `'gemini-3.8-flash'`, and it logs `'Gemini: configured (gemini-3.8-flash)'`.
  - `loadEnv({ NODE_ENV: 'production' })`: `trustProxy` is true.
- [ ] **Step 2:** Run `npx vitest run src/config/appOptions.test.ts` (in `server/`). Expected: FAIL, the module is not found.
- [ ] **Step 3:** Implement `appOptionsFromEnv`. Move the wiring and the two `console.log` lines out of `server.ts` unchanged. `server.ts` becomes `createApp({ ...appOptionsFromEnv(env), clientDir })`.
- [ ] **Step 4:** Run the gate. Expected: all green. Also run `node --env-file-if-exists=server/.env server/src/server.ts` briefly. Expected: the same three startup lines as before. Stop the server.
- [ ] **Step 5:** Commit: `refactor(server): build app options from the environment in one place`.

### Task 2: Rate limits keyed on Netlify's client-IP header

**Files:**
- Modify: `server/src/app.ts` (`AppOptions`, both `rateLimit(...)` calls)
- Test: `server/src/app.test.ts` (new `describe('client-IP header')`)

**Interfaces:**
- Produces: `AppOptions.clientIpHeader?: string`.
  - When set, both limiters (60/min on `/api/v1`, 10/min `planLimit`) use one shared `keyGenerator`: the header's value, else `req.ip`, passed through `ipKeyGenerator` from `express-rate-limit`, else `'unknown'`.
  - It also passes `validate: { xForwardedForHeader: false }`.
  - When unset, the limiters behave exactly as today.

- [ ] **Step 1: Write the failing tests.** H is `'x-nf-client-connection-ip'`, and every app is `createApp({ clientIpHeader: H })`.
  - `limits each client separately by the header`:
    - 60 GETs of `/api/v1/air-quality/sources` with H `203.0.113.1` all return 200;
    - the next one with H `203.0.113.2` returns 200;
    - the next one with H `203.0.113.1` returns 429.
  - `ignores X-Forwarded-For when the header is set`:
    - 60 GETs with H `203.0.113.1`, each with a different `X-Forwarded-For` (`198.51.100.<i>`), all return 200;
    - the 61st, with H `203.0.113.1` and a new `X-Forwarded-For`, returns 429;
    - a `console.error` spy was never called.
  - `keys the plan limit on the header too`:
    - 10 POSTs of `{}` to `/api/v1/recommendations/daily-plan` with H `203.0.113.1` each return 400;
    - the 11th returns 429;
    - one with H `203.0.113.2` returns 400.
  - `falls back to the connection address without the header`: 60 GETs with no H return 200, and the 61st returns 429.
- [ ] **Step 2:** Run `npx vitest run src/app.test.ts`. Expected: the new tests fail. The current limiter keys on `req.ip`, so the per-header tests get 429 too early. The `X-Forwarded-For` test may also log a validation error.
- [ ] **Step 3:** Implement as the Interfaces block says. Build the options object once and spread it into both `rateLimit` calls.
- [ ] **Step 4:** Run the gate. Expected: all green, and the existing `proxy trust` tests still pass.
- [ ] **Step 5:** Commit: `feat(server): key rate limits on a trusted client-IP header when hosted on Netlify`.

### Task 3: The Netlify Function

**Files:**
- Create:
  - `server/src/netlify.ts`
  - `netlify/functions/api.ts`, one line: `export { handler } from '../../server/src/netlify.ts';`
- Test: `server/src/netlify.test.ts`
- Modify: `server/package.json` and `package-lock.json`, via `npm install serverless-http@^4.0.0 -w server --ignore-scripts`

**Interfaces:**
- Consumes:
  - `appOptionsFromEnv` (Task 1);
  - `AppOptions.clientIpHeader` (Task 2);
  - `loadEnv`.
- Produces: `handler`, which is `serverless(createApp({ ...appOptionsFromEnv(loadEnv(process.env)), clientIpHeader: 'x-nf-client-connection-ip' }))`.

- [ ] **Step 1: Write the failing tests.** The event is `{ httpMethod: 'GET', path, headers: { 'x-nf-client-connection-ip': '203.0.113.9' }, multiValueHeaders: {}, queryStringParameters: null, body: null, isBase64Encoded: false }`, and the context is `{}`.
  - `answers health through the Lambda handler`: for `path: '/api/v1/health'`, `statusCode` is 200, `JSON.parse(body).status` is `'ok'`, and the `content-security-policy` header is present.
  - `answers unknown API paths with 404 JSON`: for `path: '/api/v1/nope'`, `statusCode` is 404 and `JSON.parse(body).error.code` is `'NOT_FOUND'`.
- [ ] **Step 2:** Run `npx vitest run src/netlify.test.ts`. Expected: FAIL, the module is not found.
- [ ] **Step 3:** Install `serverless-http`, then implement `netlify.ts` and the one-line re-export.
- [ ] **Step 4:** Run the gate and `npm audit --omit=dev`. Expected: all green, 0 vulnerabilities.
- [ ] **Step 5:** Commit: `feat: run the API as one Netlify Function`.

### Task 4: Netlify config and page headers

**Files:**
- Create:
  - `client/public/_headers`: a `/*` block with helmet's 12 headers, as `createApp` sends them on `GET /api/v1/health` with `saved.origin` set to the project's Supabase origin (from `client/.env` `VITE_SUPABASE_URL`, origin only);
  - `netlify.toml`, exact content below.
- Test: `server/src/pageHeaders.test.ts`

```toml
[build]
  command = "npm run build -w client"
  publish = "client/dist"

[build.environment]
  NODE_VERSION = "24"
  NPM_FLAGS = "--ignore-scripts"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[redirects]]
  from = "/app"
  to = "/index.html"
  status = 200

[[redirects]]
  from = "/privacy"
  to = "/index.html"
  status = 200
```

**Interfaces:**
- Produces: the `_headers` file that Netlify serves on every page. The test owns its format: one `/*` line, then indented `Name: value` lines.

- [ ] **Step 1: Write the failing test** `the page headers match the API headers`:
  1. Read `client/public/_headers` and parse the `/*` block into a map of lower-cased names.
  2. Take `origin` from the second `connect-src` token of its CSP.
  3. Request `GET /api/v1/health` from `createApp({ saved: { ...createFakeStore().store, origin } })`. Use whatever the fake store returns as its `SavedStore`.
  4. Expect every helmet header to equal the map's value. The helmet headers are:
     - `content-security-policy`
     - `cross-origin-opener-policy`
     - `cross-origin-resource-policy`
     - `origin-agent-cluster`
     - `referrer-policy`
     - `strict-transport-security`
     - `x-content-type-options`
     - `x-dns-prefetch-control`
     - `x-download-options`
     - `x-frame-options`
     - `x-permitted-cross-domain-policies`
     - `x-xss-protection`
  5. Expect the map's keys, sorted, to equal that list.
- [ ] **Step 2:** Run `npx vitest run src/pageHeaders.test.ts`. Expected: FAIL, the file is not found.
- [ ] **Step 3:** Write `_headers` from the helmet output and `netlify.toml` as above.
- [ ] **Step 4:** Run the gate, then `npm run build -w client && ls client/dist/_headers`. Expected: all green, and the file is copied.
- [ ] **Step 5:** Commit: `feat: Netlify build config and page security headers`.

### Task 5: Push, Netlify setup in Chrome, live checks (operations)

- [ ] **Step 1: Push and set up** (yes to push).
  1. Push `main`.
  2. In the owner's Chrome, at app.netlify.com: Add new project → Import from Git → GitHub. The owner authorizes. Pick `gaikwadashutosh35/airaware-ai`, branch `main`, and confirm the build settings read from `netlify.toml`. Name the site `airaware-ai`, or the closest free name.
  3. The owner pastes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project configuration → Environment variables.
     - No `NODE_ENV`: it would make `npm ci` skip the client's build tools.
     - The owner checks whether auto-recharge is on, if they want a hard stop.
  4. Deploy (yes). Expected: the deploy log ends "Site is live", with 1 function deployed.
- [ ] **Step 2: Smoke checks** (read-only `curl`). Expected:
  - `/api/v1/health` returns 200 `{"status":"ok",…}`;
  - `/`, `/app` and `/privacy` return 200 HTML;
  - `/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86` returns 200 with `dataKind` `model_forecast` and a `retrievedAt` within 15 minutes;
  - the CSP on `/app` and on `/api/v1/health` is the same, with `connect-src 'self' <Supabase origin>`;
  - the `assets/index-*.js` referenced by `/` contains the Supabase host.

  If health returns 404 `NOT_FOUND`, see Review Focus 1. Rule on the fix (for example `serverless-http`'s `basePath`), add a test, and redeploy.
- [ ] **Step 3: Spoofing check.** Send 61 `GET /api/v1/air-quality/sources`, each with a different forged `x-nf-client-connection-ip` (`192.0.2.<i>`). Expected: request 61 returns 429. If all 61 return 200, it is a finding: fix it test-first before calling the site live.
- [ ] **Step 4: Live e2e.** Run `E2E_BASE_URL=https://<site>.netlify.app npm run e2e`. Expected: 16 passed, 0 skipped. Then check the Supabase Users page with the owner: no test users are left.
- [ ] **Step 5: Ledger.** Record the site URL, the deploy ID and the results.

### Task 6: Keep-alive and 30-day cleanup

- [ ] Execute Tasks 4 and 5 of `docs/superpowers/plans/2026-11-19-phase9-deploy.md` as written. Hosting does not change them.

### Task 7: Docs, final review, Google project

**Files:**
- Create:
  - `DEPLOYMENT.md`: the site, how deploys happen (push to `main`), the env vars, rollback (Netlify → Deploys → a past deploy → Publish deploy), adding Gemini (lower the quota first, then the owner adds `GEMINI_API_KEY` in Netlify), credits, keep-alive, cleanup, and post-deploy checks.
  - ADR-006 in `ARCHITECTURE_DECISIONS.md` (Netlify; supersedes ADR-005).
- Modify:
  - `ARCHITECTURE.md` §2 and §9;
  - `README.md` (the technology line);
  - `THREAT_MODEL.md`: rate limits and the Gemini counter are per function instance; Netlify's IP header; credits exhaustion pauses the site;
  - `COST_AND_LIMITS.md`;
  - `SETUP.md`;
  - `PRIVACY.md` and `DATABASE.md` (the cleanup is now real);
  - `CHANGELOG.md`;
  - `docs/IMPLEMENTATION_PLAN.md` (Phase 9 "as built");
  - the old Phase 9 spec's status line: "hosting superseded by …netlify-design.md".

- [ ] **Step 1:** Write the docs, run the gate, and commit: `docs: phase 9 Netlify deployment as built`.
- [ ] **Step 2:** Final review by a fresh Opus reviewer over the Phase 9 range. Critical and Important findings are fixed test-first. Push on a yes, which also deploys.
- [ ] **Step 3:** Ask the owner whether to delete Google project `airaware-ai-7341` and its budget, and whether to relink `fair-smile-435217-r0`. Act only on a yes.
