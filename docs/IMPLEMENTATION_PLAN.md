# AirAware AI — Phase 0 Discovery Report and Implementation Plan

**Date:** 2026-11-17 · **Status:** DRAFT — awaiting owner approval · **No code has been written.**

---

## 0. Decisions needed before Phase 1

| # | Decision | My default if you don't choose |
|---|---|---|
| D1 | Is a Claude Code–built submission allowed? The official FAQ says Google Antigravity is **required** (see §5.1). | ✅ **Decided 2026-11-18: allowed** (owner decision) — continue building with Claude Code |
| D2 | Hosting/stack: Option A, B or C (see §6). | ✅ **Decided 2026-11-17: Option B** — Cloud Run (one service) + Gemini + Supabase |
| D3 | Challenge 06 submission deadline. | ✅ **Decided 2026-11-18: 2026-11-29** (time of day and timezone not stated) — target attempt 1 by 2026-11-27, leaving two days for attempts 2–3 |
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

1. **Google Antigravity requirement.** promptwars.in FAQ (checked 2026-11-17): "using Google Antigravity is a requirement for all submissions." The same page elsewhere says "Google Antigravity **or other AI tools**." Contradictory. A Claude Code–built entry may be invalid. → **D1 decided 2026-11-18: the owner allows Claude Code.**
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

**As built (2026-11-18):**
- **Pages:** a landing page (`/`) with real chapters only, and a dashboard (`/app`). Both use Tailwind v4 with the DESIGN.md tokens in `@theme`, and a Hallmark pass inside DESIGN.md.
- **Awwwards-inspired revision** (owner-approved):
  - search in the landing hero
  - a searched place carried in `/app?place=&lat=&lon=` (2 decimals; device location never in the URL)
  - a four-step "Where every number comes from" diagram
  - PM2.5 as the dashboard's headline figure
- **Structure:** no router. Types are shared through a type-only `shared/contracts.ts`.
- **Server:** Express serves `client/dist` and sets `trust proxy` 1 only in production.
- **Container:** a multi-stage Dockerfile, verified locally.
- **Deferred:**
  - Playwright E2E (Phase 7)
  - a demo state (no demo adapter)
  - the Cloud Run deploy, waiting on D4 and your yes
- **Plan files:** `docs/superpowers/specs/2026-11-17-phase3-design-shell-design.md`, `docs/superpowers/plans/2026-11-17-phase3-design-shell.md`.

### Phase 4 — Recommendation rules engine (≈2 h)

| | |
|---|---|
| Tasks | Rule registry with stable IDs; household-context Zod schema (all optional, "prefer not to say"); rules: outdoor exercise, commute mode, school commute, near busy road, cooking fuel/exhaust, purifier, sensitivity preference, stale/missing data, forecast-only caveat; each candidate carries reason code, evidence type, inputs used, caveat |
| Files | `shared/src/householdContext.ts`, `server/src/services/recommendations/{rules,engine}.ts` + tests |
| Acceptance | Same inputs → same output; stale data → no current-condition actions; no numeric health thresholds invented; no blanket window instruction |
| Tests | One test per rule + TESTING_QA §6 scenarios 1–8 |
| Open item | Any threshold needs a cited public source (CPCB health statements per category). Without one, rules key off **CPCB category only** (when available) or "data available/unavailable" — never raw µg/m³ cut-offs. |

**As built (2026-11-18):**
- **Air signal (owner decision):** India's NAAQS 24-hour limits (CPCB, 2009): PM2.5 60 μg/m³, PM10 100 μg/m³. The engine compares them with the 24-hour average of the Open-Meteo forecast, starting at the current hour. No CPCB AQI or category is computed. Source and method: `INTEGRATIONS.md` §12.
- **Code:** `server/src/services/recommendations/`:
  - `householdContext.ts`: Zod schema; unknown fields rejected
  - `airCheck.ts`: `assessAir`
  - `rules.ts`: 17 rules and `buildCandidates`
  - Types in `shared/contracts.ts`.
- **Deferred:**
  - TESTING_QA §6 scenario 7 (observation vs forecast), until a CPCB feed exists
  - the endpoint and the AI wording, in Phase 5
  - the screen, in Phase 7
- **Plan files:** `docs/superpowers/specs/2026-11-18-phase4-rules-engine-design.md`, `docs/superpowers/plans/2026-11-18-phase4-rules-engine.md`.

### Phase 5 — AI explanation layer (≈2–3 h)

| | |
|---|---|
| Tasks | `AIProvider` interface; Gemini adapter (`@google/genai`, server-only key, timeout, token caps, structured JSON output); prompts from AI_PROMPTS.md versioned in code; output Zod validation + allowlist checks (source IDs, no numbers not present in input, no medical/safety-guarantee phrases); one retry max; rules-only fallback labelled; `POST /recommendations/daily-plan`, `POST /assistant/chat` (bounded length, rate-limited); AI output may only reuse candidate IDs from the rules engine and must keep the `air.*` or `data.unavailable` notice (it carries the model-forecast caveat; Phase 4 review); `express.json()` with a size limit, with its 400/413 errors mapped to `VALIDATION_ERROR`/`PAYLOAD_TOO_LARGE` in `errorHandler` and **no request body in logs** (Phase 2 review) |
| Files | `server/src/services/ai/{provider,gemini,prompts,validate}.ts` + tests, `server/src/routes/{recommendations,assistant}.ts` + tests |
| Acceptance | Invented pollutant value → rejected; unknown source ID → rejected; prompt-injection fixtures keep constraints; AI down → labelled rules-only plan |
| Tests | Mock provider for all logic; one opt-in live test (skipped without key) |
| Needs from you | `GEMINI_API_KEY` |

**As built (2026-11-18):**
- **Scope (owner decisions):** daily plan only; the chat endpoint is deferred until after Phase 8. Option 2, "Gemini adds, your wording stays": Gemini picks, orders and times the rules' candidates and writes a summary and "for you" lines; the advice text, reasons, caveats and sources stay the rules' own.
- **Gemini call:** REST `generateContent` with `fetch`, not `@google/genai` (no new dependency, full control over logging). `GeneratePlan` is the provider-neutral seam. Details: `INTEGRATIONS.md` §4.
- **Code:**
  - `server/src/services/ai/`: `planOutput.ts` (contract and checks), `personalize.ts` (one retry), `prompts.ts` (`daily-plan-v1`), `gemini.ts` (adapter)
  - `server/src/services/recommendations/plan.ts`: `buildPlan`
  - `server/src/services/air-data/cachedForecast.ts`: one forecast cache for both routes
  - `server/src/routes/recommendations.ts`: the endpoint; contract in `API.md`
- **Live check (2026-11-18): blocked by the Gemini account, not the code.**
  - The key in `server/.env` reaches Gemini, which answers `HTTP 402 RESOURCE_EXHAUSTED`, "Your prepayment credits are depleted", for any request, even a one-line prompt.
  - The AI Studio project ("Default Gemini Project") uses prepaid billing with no credits left.
  - Not yet verified live: the request fields (`systemInstruction`, `responseJsonSchema`, `thinkingConfig`) and a passing Gemini answer.
  - To finish: top up that project's credits, or use a key from a project on the free tier. Then run `GEMINI_LIVE=1 npm test -w server -- src/services/ai/gemini.live.test.ts`.
- **End-to-end check (2026-11-18):**
  - Request: `POST /api/v1/recommendations/daily-plan` for Delhi (28.65, 77.23), against the real Open-Meteo forecast.
  - Result: `200` with `generatedBy` `"rules"`. Air is `elevated` (24-hour PM2.5 average 71 against the limit of 60; PM10 71.9, within its limit of 100).
  - The `air.elevated` notice was present and 6 actions were featured.
  - The server logged only `Gemini plan failed: http 402`.
- **Plan files:** `docs/superpowers/specs/2026-11-18-phase5-ai-daily-plan-design.md`, `docs/superpowers/plans/2026-11-18-phase5-ai-daily-plan.md`.

### Phase 6 — Auth + persistence (≈3 h)

| | |
|---|---|
| Tasks | Migration: `household_preferences`, `daily_plans` (+ RLS 4 policies each, indexes, `updated_at` trigger, `on delete cascade`); Supabase Auth (email magic link) on client; server verifies JWT, derives `userId`, queries with the **user's JWT** (RLS enforced); preferences GET/PUT; plans list/save/delete; "delete my account" (only service-role use) |
| Files | `supabase/migrations/20261117000000_init.sql`, `server/src/middleware/auth.ts`, `server/src/repositories/{plans,preferences}.ts`, `server/src/routes/{plans,preferences,account}.ts` + tests, `client/src/lib/supabase.ts`, `client/src/features/daily-plan/HouseholdPreferencesForm.tsx` |
| Acceptance | Two-user isolation tests pass via direct API calls and direct DB calls with each user's JWT; deletion removes all user rows |
| Needs from you | Supabase project (or approval to run local Supabase in Docker) |

**As built (2026-11-18):**
- **Scope:** owner-chosen: a free Supabase cloud project, "one-click, this device" sign-in, and saving through our server. Email magic links were dropped, because the free plan's email sender only reaches the project's own organization.
- **Server:**
  - `services/saved/` holds the `SavedStore` interface, the Supabase adapter (`getClaims` token check; queries run as the user, so RLS applies) and `userFrom`, the single auth gate.
  - Routes: `routes/{preferences,plans,account}.ts`.
  - `services/recommendations/dailyPlan.ts` is shared by the plan route and the save route, so saved plans are always server-built.
- **Database:** `supabase/migrations/20261118120000_saved_data.sql`. It has both tables and RLS (3 policies on `daily_plans`, none for update), the 20-plan trigger, and `delete_my_account()`. The secret (service-role) key is not used.
- **Client:**
  - `lib/supabase.ts` creates the anonymous session only inside a save action.
  - `features/daily-plan/HouseholdPreferencesForm.tsx` is on the dashboard.
  - The Dockerfile takes the two `VITE_` settings as build args.
- **Tests:** server 194 passed + 5 skipped (4 live Supabase + 1 live Gemini), client 79/79. The route tests use an in-memory fake store. The real token check is tested offline against a local ES256 key set.
- **Final review (Opus):** 1 Critical, 5 Important and 8 Minor findings. The Critical and Important ones were fixed test-first, plus #11 (explicit grants), which was raised from Minor to Important. Critical: an expired session that couldn't be refreshed read as "no session", so "Delete my saved data" could claim success. Important: malformed tokens returned 500; Supabase calls had no timeout; the token check was untested; the live test could pass while failing; PRIVACY.md over-promised; the migration relied on default grants.
- **Live checks (2026-11-18):** run against the free project `airaware-ai` in South Asia (Mumbai).
  - **Project setup:** Data API on, automatic API access for new tables off, automatic RLS on, anonymous sign-ins on. The migration ran in the SQL Editor ("Success. No rows returned").
  - **Signing keys:** the project signs tokens with ES256 (one key in its JWKS), so the server verifies them locally.
  - **Live test:** `SUPABASE_LIVE=1 npm test -w server -- src/services/saved/supabase.live.test.ts` gave **4 passed** on the second run. The first run gave 3 passed and 1 failed; the failure was a test expectation that predated review fix #5 and has been corrected.
  - **Proven by the live test:** direct database access by user B to A's rows reads, updates and deletes nothing. A forged insert with A's id is refused. The owner can't edit a saved plan (no update grant). An oversized `context` is refused. Through our API, B gets 404 for A's plan. The 21st plan is refused by the trigger (`plan_limit_reached`) and through the API (409). `DELETE /api/v1/account` removes the rows, which confirms `delete_my_account()` works on hosted Supabase, so no secret-key fallback is needed. The test output contains no tokens or keys.
  - **Browser check (Vite + API):** no session before the first click. "Save my answers" showed "Saved on this browser." and created one session, and the answers came back after a reload. "Delete my saved data" needed the confirm step (focus on Cancel), then showed "Deleted. Nothing is saved now.", cleared the session, and a reload showed nothing saved. No server errors.
  - **Cleanup:** the dashboard's Users page lists no users afterwards; every test account was deleted through the app.
- **Plan files:** `docs/superpowers/specs/2026-11-18-phase6-saved-data-design.md`, `docs/superpowers/plans/2026-11-18-phase6-saved-data.md`.

### Phase 7 — Complete feature experience (≈3–4 h)

| | |
|---|---|
| Tasks | Pollutant trend chart + text/table alternative; daily plan timeline; recommendation cards with evidence panel; indoor air assistant; sustainable swaps; sources & limitations panel (incl. CC BY 4.0 attribution); privacy page; `break-ui` stress pass |
| Deps | recharts |
| Acceptance | Full E2E journey (TESTING_QA §7 steps 1–11) on desktop + mobile viewport; repeated with provider down, stale data, AI down |
| Deferred | Share card (needs privacy review) — P1 |

**As built (2026-11-19):**
- **Scope:** owner-chosen: a hand-drawn SVG chart instead of recharts (no new runtime dependency), and Playwright for the journey. The "indoor air assistant" is the "Indoor air" section of the plan; chat stays deferred.
- **Client, `features/air-quality/`:**
  - `chart.ts` (pure maths) and `ForecastChart.tsx`: a 48-hour PM2.5 (solid) and PM10 (dashed) chart with a text summary and an "At load" marker, and no limit line. The hourly table stays.
  - `SourcesPanel.tsx`: "Sources and limitations", with 4 fixed limitations from `limitations.ts` plus the forecast's own.
- **Client, `features/daily-plan/`:**
  - `planDisplay.ts`: grouping into "Your day" and the three topics, the made-by line and plain input labels.
  - `PlanView.tsx` and `PlanCard.tsx`: the plan, with "Why?" panels.
  - `DailyPlanSection.tsx`: build, save and the snapshot banner.
  - `SavedPlansList.tsx`: open, and delete with confirmation.
- **Client, other files:**
  - `lib/clock.ts`: `isOlderThan` and the running `useNow` clock, which ticks every minute and when the tab is shown again.
  - `pages/Privacy.tsx` at `/privacy`.
  - The household form now reports its answers, so a plan uses what is on screen, saved or not.
- **Server:** `/privacy` serves the client. There are no new API endpoints.
- **Tests (Vitest):** server 195 passed + 5 skipped (live), client 168/168.
- **Final review (Opus):** 0 Critical, 2 Important, 7 Minor.
  - Fixed test-first: "Build" stayed enabled during a save, and deleting the just-saved plan left "Saved on this browser" on screen.
  - Also fixed, raised from Minor by their effect: "Back to today" dropped keyboard focus, and building had no lasting live region for screen readers.
  - Playwright re-run afterwards: 12/12.
- **Tests (Playwright, `e2e/`, `npm run e2e`):** 12/12 on 2026-11-19, desktop and Pixel 7.
  - `failures.spec.ts`: provider down, stale data, AI down, AI up and plan rate limit, each with axe in a real browser (colour contrast included).
  - `journey.spec.ts`: `TESTING_QA.md` §7 steps 1–12 against real Open-Meteo and Supabase. Gemini returned 402, so the plans were rules-only. Step 11 proves isolation in the UI with a second browser context.
  - A deliberate break of the made-by line made the "AI down" test fail, which shows the tests can catch a regression.
- **Stress pass (`break-ui`):** tested with every rule candidate, a 120-character place label, empty topics, missing averages and 20 saved plans, at 320 px and 1280 px.
  - Fixed: cards inside the plan panel became flat ruled cards, and plan text got a prose measure at wide widths.
  - Held up: no horizontal scroll at 320 px.
- **Landing chapters 3–6 (follow-up, 2026-11-19):** done.
  - Each chapter shows a real rule card through `PlanCard`, captioned "Example from our rules", with no screenshot.
  - `server/src/services/recommendations/landingExamples.test.ts` fails if the card text drifts from the rules.
  - Plan files: `docs/superpowers/specs/2026-11-19-landing-chapters-design.md`, `docs/superpowers/plans/2026-11-19-landing-chapters.md`.
- **Deferred:**
  - Playwright in CI, which Phase 8 decides.
  - A server-side length cap on Gemini's summary and "For you" text. The UI wraps any length.
- **Plan files:** `docs/superpowers/specs/2026-11-19-phase7-plan-screen-design.md`, `docs/superpowers/plans/2026-11-19-phase7-plan-screen.md`.

### Phase 8 — Quality and security audit (≈2–3 h)

| | |
|---|---|
| Tasks | CodeQL **default setup** (GitHub settings — no workflow file); SonarQube Cloud CI analysis (`sonar-project.properties` + scan step); `npm audit`; secret scan of history; RLS re-test; axe + manual keyboard walk; Unslop audit (if installed); code review + security review; fix critical/high; document accepted risks |
| Acceptance | Scans actually run and findings reviewed (reported with real counts); no unresolved critical |
| Needs from you | Repo pushed public; SonarQube Cloud account + `SONAR_TOKEN` secret |

**As built (2026-11-19):**
- **Repo:** public at `github.com/gaikwadashutosh35/airaware-ai`, one branch (`main`). GitHub secret scanning, push protection and Dependabot security updates are on by default.
- **CI:** CI's first GitHub run was green. CI now has three jobs: `verify` (with coverage), `secrets` (gitleaks) and `sonar`. CodeQL default setup is on. See `TESTING_QA.md` §9.

**Real counts, by source:**

| Source | Result |
|---|---|
| gitleaks | Local: 61 commits, no leaks. CI: 63 commits, no leaks. |
| `npm audit` | 0 vulnerabilities |
| CodeQL | 0 alerts (JavaScript/TypeScript 87 rules, Actions 17 rules) |
| SonarQube Cloud, first analysis | 0 bugs, 0 security hotspots, 0% duplication, 6 issues. Five were fixed: 2× http link, 3× `npm ci` without `--ignore-scripts`. One is accepted with a reason: `tabIndex` on the scrollable table. Coverage read 87% because the Playwright files were counted as app code; that scope is now fixed. |
| Security audit (`security-audit` skill, quick profile, source-only) | 9 agents; 13 of 16 areas covered. 0 confirmed, 0 rejected, 1 needs-validation lead, 1 deferred (retry and fail-open amplification), 16 hardening notes. |
| Code review (high) | 9 findings: 5 fixed, 4 accepted |
| Accessibility | axe in a real browser on `/` and `/privacy` 4/4; keyboard walk of all three pages with no traps (`ACCESSIBILITY.md`) |

- **Security audit's needs-validation lead:** unbounded Gemini spend. Graded High and fixed: answers are cached by their exact input, and each server makes at most 200 Gemini calls per day.

**Fixes** (each with a test that failed first):
- Gemini spend cap and answer reuse.
- The Gemini key never follows a redirect.
- Place labels reject control characters.
- The CPCB link uses https.
- `npm ci --ignore-scripts` in CI and in both Docker stages. The image was rebuilt and checked: `/api/v1/health`, `/` and `/privacy` return 200.
- The chart for an empty forecast, and a missing unit.
- Feedback and focus after deleting one saved plan.
- "That day" wording on saved snapshots.
- A slow load no longer overwrites edited answers.
- The e2e cleanup check.

**Re-tests after the fixes:**
- Vitest: server 202 passed + 5 skipped, client 178/178.
- Live Supabase isolation test 4/4.
- `npm run e2e` 16/16.
- After the push (CI run 44483156428, all three jobs green):
  - SonarQube: 0 bugs, 0 vulnerabilities, 0 code smells, 0 security hotspots, security rating A, coverage 94.6%, quality gate passed;
  - CodeQL: 0 alerts.

**Final review (Opus):** 0 Critical, 1 Important, 7 Minor. Two items were fixed test-first (client tests now 179/179):
- the slow-load fix dropped the other saved answers, so loads now merge;
- answers deleted while still loading could come back. This was raised from Minor because a Save would store them again.

Four minors are deferred:
- lone surrogate characters in labels;
- the client's link check is looser than the server's;
- a saved rules plan says "right now";
- the counter reset around midnight UTC.

**Accepted risks:** listed in `THREAT_MODEL.md`, "Residual risks".

**Not done:**
- Unslop isn't installed, so that audit was skipped.
- No screen-reader pass with a real reader.
- Tidy-ups left for the owner's call: duplicated button styles and delete confirmation.

**Plan files:** `docs/superpowers/specs/2026-11-19-phase8-audit-design.md`, `docs/superpowers/plans/2026-11-19-phase8-audit.md`.

### Phase 9 — Production deployment (≈1–2 h + your account setup)

Option B: Dockerfile (multi-stage, client built into server static dir) → Cloud Run; secrets in Secret Manager; Supabase auth redirect URLs; verify real provider responses and timestamps in production; fresh-session and two-user checks; write `DEPLOYMENT.md`.

**As built (2026-11-19).**

*Hosting changed.* The owner chose Netlify to avoid Google billing (ADR-006 supersedes ADR-005). The site is live at https://airaware-ai.netlify.app.
- **Serving:** Netlify's CDN serves the client. `/api/*` goes to one Function: `server/src/netlify.ts` wraps `createApp` with `serverless-http`.
- **Shared settings:** `appOptionsFromEnv()` gives the local server and the Function the same wiring.
- **Rate limits** key on `x-nf-client-connection-ip`. A forged value was overwritten in a live check.
- **Page headers:** `client/public/_headers` matches helmet, and a test enforces it.
- **Deploys:** Netlify builds from GitHub `main`.

*Verified live:*
- health, `/`, `/app` and `/privacy` return 200;
- the Pune forecast is `model_forecast` with a fresh `retrievedAt`;
- the page and API CSPs are equal;
- the bundle contains the Supabase host;
- `E2E_BASE_URL=… npm run e2e` gives 16 passed, 0 skipped;
- Supabase has 0 users afterwards.

*Also done:*
- **Keep-alive:** the workflow passed (HTTP 401 means up).
- **Cleanup:** `pg_cron` job `delete-idle-anonymous-users` at 21:30 UTC. Checks: 0 idle users, `anon` and `authenticated` cannot execute the functions, and the REST rpc returns 401.

*Supabase auth redirect URLs* are not needed: anonymous sign-in has no redirect.

*Google Cloud:* a project `airaware-ai-7341` was created before the switch. Nothing was deployed or pushed there; deleting it is the owner's call.

*Tests now:* server 213 passed + 5 skipped; client 179/179.

**Plan files:**
- `docs/superpowers/specs/2026-11-19-phase9-deploy-design.md` (Cloud Run; hosting superseded);
- `docs/superpowers/specs/2026-11-19-phase9-netlify-design.md`;
- `docs/superpowers/plans/2026-11-19-phase9-deploy.md`;
- `docs/superpowers/plans/2026-11-19-phase9-netlify.md`.

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
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server + client (`VITE_`) | 6 | no (RLS protects; publishable key only) |
| `SUPABASE_SERVICE_ROLE_KEY` | not used (Phase 6 deletes accounts with a database function) | — | **yes** |
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

1. **D4:** Which of these do you already have: Gemini API key, Supabase project, GCP project with billing, data.gov.in key, SonarQube Cloud account?

(D1 resolved: Claude Code allowed. D2 resolved: Option B. D3 resolved: deadline 2026-11-29.)

Everything else uses the defaults stated above and can be changed later.
