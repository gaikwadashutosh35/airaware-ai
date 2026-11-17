# AirAware AI — Phase 0 Discovery Report and Implementation Plan

**Date:** 2026-11-17 · **Status:** DRAFT — awaiting owner approval · **No code has been written.**

---

## 0. Decisions needed before Phase 1

| # | Decision | My default if you don't choose |
|---|---|---|
| D1 | Is a Claude Code–built submission allowed? The official FAQ says Google Antigravity is **required** (see §5.1). | Cannot default. You must confirm with the organisers. |
| D2 | Hosting/stack: Option A, B or C (see §6). | ✅ **Decided 2026-11-17: Option B** — Cloud Run (one service) + Gemini + Supabase |
| D3 | Challenge 06 submission deadline. | Plan sized for ~25 hours of build work. |
| D4 | Which accounts/keys exist today (Gemini, Supabase, GCP billing, data.gov.in, SonarQube Cloud)? | Build Phases 1–4 without any keys. |
| D5 | MVP language. | English only; Hindi/Marathi stay P1. |

---

## 1. Understanding

AirAware AI is a household/community assistant for urban India. It turns **clearly labelled** air-quality data into explainable daily actions: low-emission routines, indoor-air practices, sustainable swaps, and a "why" for each recommendation. It is not a medical app, not an AQI dashboard, and never guarantees safety.

Core path: **location → validated data → deterministic rules → AI wording (Zod-validated) → saved plan.**

Hard constraints: public GitHub repo, exactly one branch `main`, <10 MB including history, max three submission attempts, no fabricated readings/CPCB data/test results/deploy status.

---

## 2. Repository state (verified 2026-11-17)

- **Not a Git repository.** No `.git`, no branch, no remote.
- **No source code.** 37 Markdown docs + 4 path-scoped rules in `.claude/rules/`. Total 240 KB.
- No `package.json`, lockfile, migrations, CI, CodeQL, SonarQube, env examples, or tests.
- Docs live at the repo root; the README/ARCHITECTURE tree expects a `docs/` folder.
- `../AirAware_AI_Claude_Code_Master_Prompt.md` (parent folder) is byte-identical to `CLAUDE_CODE_START_PROMPT.md`.
- GitHub CLI: logged in as `gaikwadashutosh35`, scopes `repo, workflow, gist, read:org` (write-capable). Repo `airaware-ai` does **not** exist yet.

**Local tooling**

| Present | Version | Missing (not installed) |
|---|---|---|
| Node | 26.13.0 | supabase CLI (usable via `npx`) |
| npm | 11.7.0 | gcloud CLI (needed for Option B/C) |
| git | 2.55.0 | vercel CLI (Option A only) |
| gh | 2.93.0 | CodeQL CLI, sonar-scanner (not needed locally — run in GitHub) |
| Docker | 29.8.0 | pnpm (not needed) |
| Python | 3.13.7 | |

---

## 3. Document completeness

### 3.1 Missing documents referenced by `START_HERE.md` / start prompt

| Missing | Closest existing substitute |
|---|---|
| `DATA_SOURCES_AND_SAFETY.md` | `INTEGRATIONS.md` + `DATA_GOVERNANCE.md` |
| `DEPLOYMENT.md` | `SETUP.md` + `RELEASE_CHECKLIST.md` + ARCHITECTURE §9 |

Proposal: create `DEPLOYMENT.md` in Phase 9 once the host is chosen. Point `START_HERE.md` at `INTEGRATIONS.md` instead of creating a duplicate data doc.

### 3.2 Contract inconsistencies found (fix in docs during the phase that implements them)

1. **Health path:** `API.md` says `/api/v1/health`; `OBSERVABILITY_RUNBOOK.md` says `/api/health`. → Use `/api/v1/health`.
2. **Error envelope:** `API.md` codes (`PROVIDER_ERROR`, `DATA_UNAVAILABLE`) vs runbook (`AIR_PROVIDER_UNAVAILABLE` + `retryable`). → Keep `API.md` codes. (`retryable` dropped in Phase 2: the client derives it from `code`.)
3. **`AirQualityForecast` is used but never defined.** A forecast is an hourly series, not one `forecastFor` timestamp. → Define `ForecastSeries { provider, sourceUrl, dataKind:'model_forecast', retrievedAt, modelResolution, units, hours: [{ time, values }], freshness, limitations }` (as built in Phase 2; see `API.md`).
4. **Forecast example lacks `sourceUrl`** although the type requires it.
5. **`snapshotIds` in the daily-plan request** implies a server-side snapshot store that is not designed anywhere. → Request carries a transient location `{ label, latitude, longitude }`; the server fetches (cached) data itself. Client never supplies pollutant values. Coordinates are not persisted or logged.
6. **Pollutant enum lacks `NH3` (and `Pb`).** CPCB National AQI uses 8 pollutants incl. NH3. → Add `NH3` only if a CPCB feed is adopted.
7. **CPCB band edges are integers** (0–50, 51–100…). Behaviour for non-integers and values >500 is undefined. → Define: input must be an integer 0–500 as published by CPCB; anything else is rejected, not mapped.
8. **Open-Meteo "current" values are model values.** Docs don't warn about this trap. → They must be labelled `model_forecast`, never "current observation".
9. **Branch policy vs Superpowers:** `CONTRIBUTING.md` forbids feature branches and worktrees. Superpowers' `using-git-worktrees` and `finishing-a-development-branch` create them. → Do not use those two skills. Work directly on `main`.

---

## 4. Installed skills, plugins, and MCP servers

### 4.1 What is actually installed

| Requested | Installed? | Notes |
|---|---|---|
| Superpowers | ✅ v7.0.2 | brainstorming, writing-plans, TDD, systematic-debugging, verification-before-completion, requesting/receiving-code-review, subagent-driven-development |
| Karpathy | ❌ | Not installed. **Ponytail v4.10 is installed and always-on** via a session hook; it covers "simplicity first / surgical changes". `AGENTS.md` says not to stack Ponytail with Karpathy — with Karpathy absent there is no stacking. |
| Unslop | ❌ | Not installed. Install needs your approval; scan with `skillspector` first. |
| Hallmark | ✅ v2.0.0 (user skill) | Use once, for initial landing/dashboard visual direction. |
| Emil Kowalski skills | ✅ `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `animation-performance` | Motion polish only, late. |
| ECC | ❌ | Substitute: built-in `/security-review`, `code-review`, and the `security-audit` user skill. |

Also relevant and installed: `modern-web-guidance` (Google Chrome team, required for HTML/CSS work), `frontend-design` (overlaps Hallmark — use Hallmark only), `dataviz` (charts), `break-ui` (worst-case data), `mobile-native`, `archify` (README architecture diagram), `skillspector` (vet skills before install), `run`.

Not relevant to this project (leave unused): claude-seo, openseo, posthog, egm, humanizer, superdesign, firecrawl (used only for this research).

**Always-on session hooks you should know about:** `i-have-adhd` (response format), `ponytail` (code minimalism), `gitkraken-hooks` (runs `gk.exe ai hook run` on many Claude Code events — third-party, I did not inspect `gk.exe` behaviour).

### 4.2 Skill routing by phase

| Phase | Skills |
|---|---|
| 0 Plan | superpowers:brainstorming (used), superpowers:writing-plans (after approval) |
| 1 Scaffold | superpowers:test-driven-development, superpowers:verification-before-completion |
| 2 Data layer | TDD, systematic-debugging (on failures) |
| 3 Design shell | hallmark (direction), modern-web-guidance, mobile-native |
| 4 Rules | TDD |
| 5 AI | TDD, security-audit (prompt-injection focus) |
| 6 Persistence | TDD, security-review (RLS/ownership) |
| 7 Features | dataviz (charts), break-ui, emil-design-eng / animate only if motion is needed |
| 8 Audit | requesting-code-review, code-review, security-review, security-audit, Unslop (if approved + installed), verification-before-completion |
| 9–10 Deploy/submit | verification-before-completion |
| Never | using-git-worktrees, finishing-a-development-branch (branch rule) |

### 4.3 MCP servers and permissions

| Server | State | Use here | Permission stance |
|---|---|---|---|
| Playwright (plugin) | Connected | Local E2E + screenshots | localhost only |
| Built-in browser pane | Available | Visual review of local dev server | localhost only |
| context7 | **Needs auth** (`/mcp`) | Current React/Vite/Tailwind/Supabase/Gemini docs | Read-only — worth authorising |
| firecrawl | Connected (billed credits) | Provider-terms research only | Read-only |
| Figma, Claude in Chrome, Claude Docs | Available | Not needed | Leave unused |
| gsc, openseo, posthog | Present / need auth | Not relevant | Leave unused |
| GitHub MCP | Not installed | Use `gh` CLI instead | I ask before every write (repo create, push, settings) |
| Supabase MCP | Not installed | Not recommended | Use versioned SQL migrations; no service-role key to any MCP |

---

## 5. Risk report

### 5.1 Challenge-rule risks (highest)

1. **Google Antigravity requirement.** promptwars.in FAQ (checked 2026-11-17): "using Google Antigravity is a requirement for all submissions." The same page elsewhere says "Google Antigravity **or other AI tools**." Contradictory. A Claude Code–built entry may be invalid. → **D1, you must confirm.**
2. **Submission = code + live preview + narrative** (LinkedIn post and/or technical blog). The narrative is not in any project doc. → Add to Phase 10.
3. **Evaluation rubric (unofficial).** A past PromptWars Virtual entrant's public README lists: Code Quality, Security, Efficiency, Testing, Accessibility, **Google Services**, Problem Statement Alignment, deployed on **Cloud Run**. Not verified against an official Challenge 06 brief. Current docs use Vercel + Render + Supabase, so only Gemini counts as a Google service. → Drives D2.
4. **10 MB / one branch:** Low risk if `.gitignore` is in place before the first commit and no screenshots/reports are committed.

### 5.2 Data-source feasibility

| Source | Status | Finding | Plan |
|---|---|---|---|
| **CPCB official observations** | ❌ Not usable yet (Phase 2 spike, 2026-11-17) | The CPCB dashboard is not a documented API, so do not scrape it. The candidate is the data.gov.in OGD dataset "Real time Air Quality Index from various locations" (resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`). **Spike findings:** (1) owner CPCB/MoEFCC, licence **GODL-India**, updated **hourly** (per the AIKosh mirror of the catalogue entry); (2) pollutants SO2, NO2, PM10, PM2.5, CO and O3, with **no NH3 or Pb**, so the dataset can never supply all of CPCB's AQI inputs; (3) `api.data.gov.in` without a key → `400 "Authorization field missing"`; (4) data.gov.in pages returned **HTTP 503** again, so field semantics are **still unverified**: whether `min/max/avg_value` are concentrations or sub-indices, their units, and whether any AQI value is published. | `/current` returns `503 DATA_UNAVAILABLE` and `/sources` lists CPCB as unavailable. Re-check only with `DATA_GOV_IN_API_KEY` (D4): fetch one record and compare it against the CPCB dashboard (~30 min). Show values only if the units are confirmed. **Never compute National AQI.** |
| **Open-Meteo Air Quality** | ✅ Usable with conditions | Terms (checked 2026-11-17): free tier is **non-commercial only**; 600/min, 5 000/h, 10 000/day, 300 000/month; **CC BY 4.0 attribution required**. Model data: over India, CAMS global (requested with `domains=cams_global`), 0.4° (~45 km) grid, 3-hourly source resolution, updated every 12 h. Confirmed from the docs in Phase 2. The API does not report the model run time. | Primary `model_forecast` source. Visible attribution. Server cache (10 min TTL) keeps volume tiny. |
| **Open-Meteo Geocoding** | ✅ Recommended | Same terms. Avoids Nominatim's usage policy limits (no autocomplete, 1 req/s). | Manual city search provider. |
| **Gemini** | ⚠️ Key + model ID unverified | Model ID and free-tier quota must be checked at Phase 5. Free-tier prompts may be used by Google to improve products → send minimal context only. | Behind `AIProvider`; deterministic fallback labelled "rules-only". |
| **Demo fixtures** | ✅ | — | Tests and local dev only. Visible **DEMO** label. Never a silent fallback in production. |

### 5.3 Engineering risks

| Risk | Mitigation |
|---|---|
| Render free tier spins down when idle → slow first load for judges | Option B avoids it (Cloud Run min-instances 0 still cold-starts, but in ~seconds) |
| Split hosting (Vercel + Render) needs CORS + two URLs | Option B serves client and API from one origin — no CORS |
| RLS tests need two real users | Local Supabase via Docker (`npx supabase start`, ~2–3 GB images — will ask first) or a dev project |
| Scope vs deadline | P0 only; every P1 item deferred (§7 "Deferred") |
| Open-Meteo daily quota (10 000) | The 60/min per-IP limit does not cap total upstream calls: one persistent client, or many IPs, can exhaust the quota, and then every user gets `502` until it resets. **Accepted for the demo** (Phase 2 review). Add a global upstream budget if abuse appears. |

---

## 6. Architecture options (D2 — **B selected 2026-11-17**)

| | A — As documented | **B — Recommended** | C — Full Google |
|---|---|---|---|
| Frontend | Vercel | Cloud Run (Express serves built client) | Cloud Run |
| API | Render | Same Cloud Run service | Same |
| Auth/DB | Supabase + RLS | Supabase + RLS | Firebase Auth + Firestore rules |
| AI | Gemini | Gemini | Gemini |
| Secrets | Render/Vercel env | Secret Manager | Secret Manager |
| Google services | Gemini | Gemini, Cloud Run, Secret Manager, Cloud Logging | + Firebase Auth, Firestore |
| Doc changes | None | ARCHITECTURE §9, SETUP, deploy docs | DATABASE, AUTH_SECURITY, API rewritten |
| Cost/accounts | Free tiers, 2 hosts | GCP project **with billing enabled** (Cloud Run free tier) | Same as B |
| Risk | Cold starts, CORS, weak rubric fit | Needs gcloud + billing | Largest rewrite; loses tested RLS design |

**Why B:** one URL, no CORS, Google-hosted, keeps the fully specified Supabase/RLS design. Only deployment docs change.

### 6.1 Smaller adjustments (apply under any option)

1. **Build order:** data layer before UI (swap roadmap Phases 2 and 3). The design phase then renders real Open-Meteo data instead of placeholders ("no fake dashboards").
2. **Deploy a walking skeleton early** (end of Phase 3), not at Phase 9.
3. **Shared contracts:** one `shared/` workspace of Zod schemas; TypeScript types via `z.infer`. Server stays authoritative.
4. **Server layout:** merge `controllers/` into `routes/` (one file per resource). Fewer files, same separation.
5. **Cache:** in-memory TTL map; skip the `air_data_cache` table (optional per DATABASE.md).
6. **MVP tables:** `household_preferences`, `daily_plans` only. `saved_locations`, `plan_feedback`, `profiles` are P1 features → deferred. Result: **no coordinates are ever persisted** in MVP.
7. **Dependencies skipped:** `dotenv` (Node 26 has `--env-file`), `ts-node-dev` (use `tsx`), Framer Motion (CSS first), full shadcn (native `<dialog>` first; add single Radix primitives only where native falls short).

---

## 7. Phased implementation plan

Estimates = my build time per phase, excluding your review and account setup.

### Phase 1 — Repository + quality baseline (≈1.5–2 h)

**Goal:** empty but fully wired monorepo; CI green.

| | |
|---|---|
| Tasks | `git init -b main`; `.gitignore` **before first commit**; npm workspaces (`client`, `server`, `shared`); TS strict base config; ESLint flat config (+ `jsx-a11y`, `react-hooks`); Prettier; Vitest in each workspace; `GET /api/v1/health`; Zod-validated env loader; `.env.example` files; GitHub Actions CI (install → typecheck → lint → test → build, `permissions: contents: read`); record ADR-005 (Cloud Run single service) and update ARCHITECTURE §2/§9 + SETUP env examples (no `CLIENT_URL`/CORS) |
| Files | `package.json`, `.gitignore`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.github/workflows/ci.yml`, `shared/{package.json,src/index.ts}`, `server/{package.json,tsconfig.json,src/app.ts,src/server.ts,src/config/env.ts,src/routes/health.ts,src/routes/health.test.ts,.env.example}`, `client/` (Vite react-ts template), `client/.env.example` |
| Deps | root dev: typescript, eslint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, prettier · server: express, helmet, express-rate-limit, zod · server dev: tsx, vitest, supertest, @types/express, @types/supertest · client: react, react-dom (template) · client dev: vitest, @testing-library/react, jsdom |
| Acceptance | `npm ci` clean; `npm run typecheck/lint/test/build` all pass at root; health returns `{status:'ok',version}`; unknown env → startup fails with a clear message; no secrets tracked (`git ls-files` reviewed) |
| Tests | Supertest: health 200, no secret fields; env loader rejects missing/invalid values |
| Needs from you | Approval to `git init` here (or rename folder to `airaware-ai`) |

**As built (2026-11-17):** oxlint (type-aware + jsx-a11y) instead of ESLint, because typescript-eslint does not support TypeScript 7 and `eslint-plugin-jsx-a11y` does not support ESLint 10. Server runs `.ts` directly on Node (no build step, no `tsx`). Deferred as unneeded yet: `shared/` (Phase 2), `express-rate-limit` (Phase 2), `client/.env.example` (Phase 6), `tsconfig.base.json` (dropped). Task plan: `docs/superpowers/plans/2026-11-17-phase1-scaffold.md`.

### Phase 2 — Data contracts + providers (≈2–3 h)

| | |
|---|---|
| Tasks | Shared Zod schemas (`DataKind`, `PollutantReading`, `AirQualitySnapshot`, `ForecastSeries`, `ApiError`); Open-Meteo forecast adapter (fixed base URL allowlist, 5 s timeout, unit taken from API response); Open-Meteo geocoding adapter; freshness function (documented TTL per provider); CPCB category mapper (pure, integer 0–500 only); demo adapter (tests/dev); TTL cache; central JSON error handler returning the `API.md` envelope with no stack traces (deferred from Phase 1 review; test it with a throwing route and a malformed query); endpoints `GET /air-quality/forecast`, `GET /air-quality/current` (returns `DATA_UNAVAILABLE` until CPCB verified), `GET /air-quality/sources`, `GET /locations/search`; **CPCB OGD spike, 1 h time-box** |
| Files | `shared/src/schemas.ts`, `server/src/services/air-data/{openMeteo,demo,freshness,cpcbCategory,cache}.ts` + tests, `server/src/services/location/geocoding.ts` + test, `server/src/routes/{airQuality,locations}.ts` + tests, `server/test/fixtures/*.json` (recorded real responses, trimmed) |
| Acceptance | Every value carries provider, sourceUrl, dataKind, timestamps, unit, limitations; `european_aqi`/`us_aqi` never populate `nationalAqi`; provider failure → 502/503, never demo |
| Tests | Fixture contract tests; missing variable; bad unit; stale timestamp; timezone parse; CPCB boundaries 0/50/51/100/101/200/201/300/301/400/401/500 + −1, 501, 50.5, null; PM2.5-only → no AQI |

**As built (2026-11-17):**
- Live endpoints:
  - `GET /api/v1/air-quality/forecast`
  - `/current`, which always returns `503 DATA_UNAVAILABLE`
  - `/sources`
  - `GET /api/v1/locations/search`, India only
  - All are rate-limited to 60/min per IP.
- Forecasts come from Open-Meteo with `domains=cams_global` (0.4° grid), `timeformat=unixtime` and 48 hours, cached for 10 min.
- Coordinates must have at most 2 decimals, or the API returns 400. This keeps precise locations out of request logs and away from Open-Meteo.
- `freshness` is `unknown`, because Open-Meteo does not report the model run time.
- Deferred until a CPCB feed exists: the `shared/` workspace (moves to Phase 3), the demo adapter, the CPCB category mapper and its boundary tests, and `AirQualitySnapshot`.
- Not added: `retryable`. TTL, rate limit and base URLs are code constants, not env vars.
- Task plan: `docs/superpowers/plans/2026-11-17-phase2-data-layer.md`.

### Phase 3 — Design system + app shell (≈3–4 h)

| | |
|---|---|
| Tasks | Hallmark visual direction (one pass, reviewed with you); Tailwind v4 tokens from DESIGN.md; landing page (7 chapters, original visuals, no fake data); dashboard layout; `LocationSearch` (keyboard combobox, live-region announcements); opt-in `useGeolocation` (round to 2 decimals before any request; the API rejects more); provenance/freshness badges; loading/empty/error/stale/unavailable/demo states; reduced motion; **walking-skeleton deploy** with `app.set('trust proxy', 1)`, so the rate limiter keys on client IPs and not the Google front end (verify with two clients) |
| Files | `client/src/app/*`, `client/src/styles/tokens.css`, `client/src/pages/{Landing,Dashboard}.tsx`, `client/src/features/location/*`, `client/src/features/air-quality/{ForecastSummary,PollutantMetric}.tsx`, `client/src/components/{DataProvenanceBadge,FreshnessIndicator,States}.tsx`, `client/src/services/api.ts` |
| Deps | tailwindcss, @tailwindcss/vite, react-router, lucide-react |
| Acceptance | Search Pune/Delhi → real Open-Meteo values with source/time/unit/"Model forecast" label; GPS denial keeps search usable; no dead controls; 320/768/1280 px reviewed in a browser; axe: 0 critical |
| Tests | RTL: search keyboard flow, denied geolocation, badge text; Playwright smoke |

### Phase 4 — Recommendation rules engine (≈2 h)

| | |
|---|---|
| Tasks | Rule registry with stable IDs; household-context Zod schema (all optional, "prefer not to say"); rules: outdoor exercise, commute mode, school commute, near busy road, cooking fuel/exhaust, purifier, sensitivity preference, stale/missing data, forecast-only caveat; each candidate carries reason code, evidence type, inputs used, caveat |
| Files | `shared/src/householdContext.ts`, `server/src/services/recommendations/{rules,engine}.ts` + tests |
| Acceptance | Same inputs → same output; stale data → no current-condition actions; no numeric health thresholds invented; no blanket window instruction |
| Tests | One test per rule + TESTING_QA §6 scenarios 1–8 |
| Open item | Any threshold needs a cited public source (CPCB health statements per category). Without one, rules key off **CPCB category only** (when available) or "data available/unavailable" — never raw µg/m³ cut-offs. |

### Phase 5 — AI explanation layer (≈2–3 h)

| | |
|---|---|
| Tasks | `AIProvider` interface; Gemini adapter (`@google/genai`, server-only key, timeout, token caps, structured JSON output); prompts from AI_PROMPTS.md versioned in code; output Zod validation + allowlist checks (source IDs, no numbers not present in input, no medical/safety-guarantee phrases); one retry max; rules-only fallback labelled; `POST /recommendations/daily-plan`, `POST /assistant/chat` (bounded length, rate-limited); `express.json()` with a size limit, with its 400/413 errors mapped to `VALIDATION_ERROR`/`PAYLOAD_TOO_LARGE` in `errorHandler` and **no request body in logs** (Phase 2 review) |
| Files | `server/src/services/ai/{provider,gemini,prompts,validate}.ts` + tests, `server/src/routes/{recommendations,assistant}.ts` + tests |
| Acceptance | Invented pollutant value → rejected; unknown source ID → rejected; prompt-injection fixtures keep constraints; AI down → labelled rules-only plan |
| Tests | Mock provider for all logic; one opt-in live test (skipped without key) |
| Needs from you | `GEMINI_API_KEY` |

### Phase 6 — Auth + persistence (≈3 h)

| | |
|---|---|
| Tasks | Migration: `household_preferences`, `daily_plans` (+ RLS 4 policies each, indexes, `updated_at` trigger, `on delete cascade`); Supabase Auth (email magic link) on client; server verifies JWT, derives `userId`, queries with the **user's JWT** (RLS enforced); preferences GET/PUT; plans list/save/delete; "delete my account" (only service-role use) |
| Files | `supabase/migrations/20261117000000_init.sql`, `server/src/middleware/auth.ts`, `server/src/repositories/{plans,preferences}.ts`, `server/src/routes/{plans,preferences,account}.ts` + tests, `client/src/lib/supabase.ts`, `client/src/features/daily-plan/HouseholdPreferencesForm.tsx` |
| Acceptance | Two-user isolation tests pass via direct API calls and direct DB calls with each user's JWT; deletion removes all user rows |
| Needs from you | Supabase project (or approval to run local Supabase in Docker) |

### Phase 7 — Complete feature experience (≈3–4 h)

| | |
|---|---|
| Tasks | Pollutant trend chart + text/table alternative; daily plan timeline; recommendation cards with evidence panel; indoor air assistant; sustainable swaps; sources & limitations panel (incl. CC BY 4.0 attribution); privacy page; `break-ui` stress pass |
| Deps | recharts |
| Acceptance | Full E2E journey (TESTING_QA §7 steps 1–11) on desktop + mobile viewport; repeated with provider down, stale data, AI down |
| Deferred | Share card (needs privacy review) — P1 |

### Phase 8 — Quality and security audit (≈2–3 h)

| | |
|---|---|
| Tasks | CodeQL **default setup** (GitHub settings — no workflow file); SonarQube Cloud CI analysis (`sonar-project.properties` + scan step); `npm audit`; secret scan of history; RLS re-test; axe + manual keyboard walk; Unslop audit (if installed); code review + security review; fix critical/high; document accepted risks |
| Acceptance | Scans actually run and findings reviewed (reported with real counts); no unresolved critical |
| Needs from you | Repo pushed public; SonarQube Cloud account + `SONAR_TOKEN` secret |

### Phase 9 — Production deployment (≈1–2 h + your account setup)

Option B: Dockerfile (multi-stage, client built into server static dir) → Cloud Run; secrets in Secret Manager; Supabase auth redirect URLs; verify real provider responses and timestamps in production; fresh-session and two-user checks; write `DEPLOYMENT.md`.

### Phase 10 — Submission audit (≈30 min + narrative)

`git branch -a` shows only `main`; `git count-objects -vH` <10 MB; history secret scan; README (vertical, approach, logic, operation, assumptions, verified live URL); final test run with real output; draft LinkedIn/blog narrative for you to post; **you** submit — attempt 1 only after this checklist passes.

### Deferred to P1 (not in this plan)

Saved locations, plan history, plan feedback, share card, Hindi/Marathi, reminders, impact tracker.

**Total build estimate: ≈20–27 hours** of my work across ~10 sessions, plus your reviews.

---

## 8. Environment variables and accounts

| Variable | Where | Phase | Secret? |
|---|---|---|---|
| `NODE_ENV`, `PORT` | server | 1 | no |
| `DATA_GOV_IN_API_KEY` | server | CPCB follow-up (spike was blocked on it) | **yes** |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | 5 | key: **yes** |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | server + client (`VITE_`) | 6 | no (RLS protects) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | 6 (account deletion only) | **yes** |
| `CLIENT_URL` | server | Option A only (CORS) | no |
| `SONAR_TOKEN` | GitHub Actions secret | 8 | **yes** |

Open-Meteo base URLs, cache TTL and rate limits are code constants (Phase 2), not env vars.

Accounts: GitHub (have), Gemini/AI Studio, Supabase, GCP with billing (B/C), data.gov.in (optional), SonarQube Cloud.

---

## 9. Commands I propose for Phase 1 (run only after approval)

```bash
git init -b main
npm create vite@latest client -- --template react-ts
npm install            # root workspaces, after package.json is written
npm run typecheck && npm run lint && npm test && npm run build
git add -A && git status   # review before first commit
```

Remote actions (`gh repo create airaware-ai --public`, `git push`) wait for a separate explicit yes.

---

## 10. Blocking questions

1. **D1:** Have you confirmed with Hack2Skill that a Claude Code–built Challenge 06 entry is valid, given the FAQ's Antigravity requirement?
2. **D3:** What is the Challenge 06 submission deadline?
3. **D4:** Which of these do you already have: Gemini API key, Supabase project, GCP project with billing, data.gov.in key, SonarQube Cloud account?

(D2 resolved: Option B.)

Everything else uses the defaults stated above and can be changed later.
