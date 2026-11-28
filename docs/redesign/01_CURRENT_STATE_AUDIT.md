# 01 · Current state audit

**Date:** 28 Nov 2026.
**Scope:** the local working tree at commit `b0c4278` ("docs: document FIRMS and Google geocoding, fix stale env and API notes", 28 Nov 2026).
- `git status --short` before this doc was written showed `.claude/launch.json` and `.gitignore` modified, plus two untracked docs (`UI_UX_Animation_Motion_3D_Skills_Directory.md` and `docs/redesign/AirAware_AI_UI_UX_Motion_3D_Claude_Code_Master_Guide.md`). None of them is app source.
- **The live site was not loaded for this doc.** Every OBSERVED item below comes from code, docs or a local test run. For what production looks like, see `docs/redesign/audit/LIVE_SITE_AUDIT.md` (24 Nov, commit `257352e`) and `docs/redesign/STAGE5_REPORT.md` (25 Nov).

**Labels:**
- **OBSERVED** means seen in the code, the docs or a test run, with `file:line`.
- **RECOMMENDED** means our proposal. It is not built.
- Paths are relative to the repo root.

**Companion docs:**
- `04_EXISTING_COMPONENT_INVENTORY.md`: every component and hook.
- `13_DATA_AND_API_DEPENDENCY_MATRIX.md`: every data source, which screens use it, and its limits.

---

## 1. Summary

| Question | Answer |
|---|---|
| What is it? | A React 19 single-page app (`client/`) and an Express 5 API (`server/`) in one npm workspace. On Netlify the API runs as one Function, and the CDN serves the client. |
| Is the codebase in good shape? | Yes. Unit tests on 28 Nov: server 446 passed and 27 skipped (live-API tests); client 708 passed (see §7). Data-integrity rules are enforced in code, not only in the copy. |
| Biggest strengths | The data comes with full provenance. The AI is fenced in by deterministic checks. Privacy is designed in from the start. The accessibility base is strong. The adaptive city backdrop is distinctive. |
| Biggest weaknesses | **Shell:** one 604-line shell owns all state. **Design system:** the only tokens are colours; there are no Button or Card primitives. **Journey:** the Take action and Learn stages are thin. **Cost:** the whole app ships to every route. **Tests:** e2e is not in CI, and tests pin much of the copy and layout. |
| shadcn/ui, Radix, a motion or 3D library, a chart library, a router? | **None of them is installed** (§3.1). Master guide §8.1–8.2 assumes "existing shadcn/ui + Radix" and an "existing chart solution". That is not true of this codebase. |

---

## 2. Architecture as built (OBSERVED)

```
Browser (React 19, Vite 8, Tailwind 4)
  App.tsx: path switch (no router)
    /            Landing
    /privacy     Privacy
    /app[/*]     AppShell: header, place chip, nav, backdrop, all page state
                   Today (inline), Welcome, Ask, MyHome, BetterHabits, Profile
  services/api.ts: one fetch wrapper, same-origin /api/v1/*
  lib/supabase.ts: anonymous sign-in only, to get a token for saving

Netlify: CDN (client/dist) + Function (server/src/netlify.ts, serverless-http)
  Express app (server/src/app.ts)
    helmet, rate limits (60/min/IP all; 10/min/IP shared by AI routes)
    /air-quality/forecast   Open-Meteo air + weather, server 24h check
    /air-quality/sources    static source list
    /air-quality/current    always 503 (CPCB not connected)
    /locations/search       Open-Meteo geocoding (India only)
    /locations/reverse      Google reverse geocoding (optional key)
    /fires/nearby           NASA FIRMS (optional key)
    /recommendations/guides static guide library
    /recommendations/daily-plan  rules, then Gemini, then Claude backup
    /assistant/answer       rules + topic, or Claude Haiku for typed questions
    /profile/preferences, /plans, /account   Supabase (token + RLS)
```

| Layer | Fact | Evidence |
|---|---|---|
| Routing | No router. `usePath()` reads `window.location.pathname` through `useSyncExternalStore`. `navigate()` pushes or replaces history and keeps the query string, so the place travels between pages. | `client/src/App.tsx:7-12`, `client/src/lib/navigation.ts:15-38` |
| App pages | `today`, `welcome`, `ask`, `home`, `habits`, `profile`. An unknown name redirects to `/app`. | `navigation.ts:30-38`, `AppShell.tsx:146-148` |
| Five primary destinations | Today, Ask AirAware, My Home, Better Habits, My Profile: one `<nav aria-label="Main">`. It is a bottom bar on phones and sits inline in the header from `md`. Icons come from Lucide. | `client/src/components/AppNav.tsx:4-35,38-44` |
| State | All app state lives in `AppShell`: the place, the forecast, household context, Ask thread, saved-list version, the reset counter, Welcome step. It reaches each page through props. Today is not a component; it is inline JSX in the shell. Today and My Profile stay mounted and are hidden when not shown, so a built plan or unsaved answers survive navigation. | `client/src/pages/AppShell.tsx:65-142,343-359,406-567` |
| Data fetching | One `useRequest(key, load)` hook: abort on key change, `retry`, and `previous` (so the backdrop never flashes during a reload). No React Query or SWR. | `client/src/features/air-quality/useRequest.ts:14-75` |
| Freshness | `useNow()` ticks every minute and when the tab becomes visible. Over 60 minutes old means "Not current". The forecast reloads one hour after loading on Today, My Home and Ask. | `client/src/lib/clock.ts:5-31`, `AppShell.tsx:172-189` |
| API client | One `request()` wrapper with the `{data}` / `{error:{code,message}}` envelope. Coordinates are always rounded with `toFixed(2)` before sending. | `client/src/services/api.ts:52-110` |
| Shared types | `shared/contracts.ts` is types only. `DataKind` = `official_observation` / `model_forecast` / `demo` / `satellite_detection`. | `shared/contracts.ts:1-7` |
| Server composition | `createApp(options)`: every optional provider is injected, so a missing key degrades gracefully instead of crashing. | `server/src/app.ts:29-57`, `server/src/config/appOptions.ts:15-86` |
| Validation | Zod at every trust boundary: query coordinates (at most 2 decimals), bodies (`strictObject`, 4 kB limit), env, and every provider response. | `routes/airQuality.ts:15-25`, `services/recommendations/dailyPlan.ts:45-59`, `services/recommendations/ask.ts:32-47`, `config/env.ts:3-63` |
| Errors | `HttpError` plus one handler. Upstream failures become a single generic 502 `PROVIDER_ERROR`, and only the host is logged. | `server/src/errors.ts:5-74`, `server/src/services/fetchJson.ts:9-18` |
| Hosting | Netlify. Redirects `/api/*` to the Function and `/app`, `/app/*`, `/privacy` to `index.html`. Static security headers (CSP) are in `client/public/_headers`. | `netlify.toml`, `client/public/_headers` |

### 2.1 How a recommendation is made (OBSERVED)

1. **Forecast:** `fetchForecast` asks Open-Meteo for 48 hourly values of 6 pollutants (`domains=cams_global`). The result is cached for 10 minutes per rounded place. (`services/air-data/openMeteo.ts:58-103`, `cachedForecast.ts:4-25`)
2. **24-hour check (deterministic):** `assessAir` averages the 24 hours from the current UTC hour for PM2.5 and PM10 and compares each average with NAAQS 2009 (60 / 100 μg/m³). The result is `elevated`, `not_elevated` or `unknown`. It is "unknown" if any hour is missing or the unit is wrong. (`services/recommendations/airCheck.ts:11,23-67`)
3. **Rule cards:** `buildCandidates(context, air)` applies 17 fixed rules, for example `air.elevated`, `indoor.cooking-exhaust` and `swap.no-open-burning`. Each card has a title, text, reason, sources, inputs used and an optional caveat. (`services/recommendations/rules.ts:125-411`)
4. **AI wording, optional:** Gemini, then the Claude backup, picks and orders cards and writes a summary and "For you" lines. Every answer must pass the Zod schema, the id checks, a "no new numbers" check and a banned-words check, or it is dropped. (`services/ai/personalize.ts:12-48`, `services/ai/planOutput.ts:127-202`)
5. **Assembly:** `buildPlan` uses only the rules' candidate objects. The AI never writes the advice text itself. (`services/recommendations/plan.ts:1-61`)
6. **Ask AirAware:** a topic chip gives rules plus the plan writer. A typed question goes to Claude Haiku, which chooses up to 3 eligible card ids and writes at most 300 characters. A medical question goes to no AI. Any Claude failure falls back to the rules answer. (`services/recommendations/ask.ts:267-379`, `services/ai/askOutput.ts:16-86`, `routes/assistant.ts:22-48`)

**"AI explains approved rule cards; deterministic code owns numbers" is enforced in code, not only stated:**
- `checkTexts` rejects any number that is not in the validated input (`planOutput.ts:156-168`);
- `BANNED` covers safe, healthy, AQI, clean air, good/bad air, medical terms, URLs and `%` (`planOutput.ts:127-154`);
- `VERDICT` rejects yes/no and "go ahead" answers (`askOutput.ts:16-17`).

---

## 3. Stack and dependencies (OBSERVED, `package.json` files and `package-lock.json`)

| Area | Package (locked version) |
|---|---|
| Client runtime | `react` / `react-dom` 19.3.1, `lucide-react` 1.66.0, `@supabase/supabase-js` ^2.119.1 |
| Client build | `vite` 8.3.8, `@vitejs/plugin-react` ^6.1.2, `tailwindcss` + `@tailwindcss/vite` 4.3.4, `typescript` ~7.0.2 |
| Server runtime | `express` ^5.3.0, `express-rate-limit` ^8.7.2, `helmet` ^8.3.0, `zod` 4.6.7, `@anthropic-ai/sdk` 1.8.0 (pinned), `@supabase/supabase-js`, `serverless-http` ^4.0.0 |
| Gemini | No SDK: plain `fetch` to the REST endpoint (`server/src/services/ai/gemini.ts:26-68`) |
| Tests | `vitest` ^5.1.0, `@testing-library/react` ^16.3.3, `jsdom` ^31.0.1, `axe-core` ^4.14.0, `supertest`, `@playwright/test` ^1.65.1, `@vitest/coverage-v8` |
| Quality | `oxlint` (type-aware, deny warnings), `prettier`. CI runs format check, lint, typecheck, unit tests with coverage, build, Sonar and gitleaks (`.github/workflows/ci.yml`). |
| Node | `>=24` (root `package.json`). CI uses Node 26, Netlify uses 24 (`netlify.toml`). |
| Font | Inter variable, self-hosted, Latin subset (`client/public/fonts/`, `client/src/index.css:10-20`) |

### 3.1 Verified absent

Each of these has 0 entries in `package-lock.json` (checked by grep on 28 Nov):
- `shadcn`, `radix-ui`;
- `framer-motion`, `motion`;
- `three`, `@react-three`;
- `recharts`, `node_modules/d3`;
- `react-router`;
- `clsx`, `tailwind-merge`, `class-variance-authority`;
- `@fontsource`.

The chart is a hand-written SVG (`features/air-quality/ForecastChart.tsx`). The city backdrop is hand-written SVG plus CSS (`features/air-quality/CitySkyline.tsx`, `skylineGeometry.ts`).

**Reconciliation:** this contradicts `AirAware_AI_UI_UX_Motion_3D_Claude_Code_Master_Guide.md` §8.1 ("Keep existing shadcn/ui components", "Keep Radix primitives") and §8.2 ("Existing shadcn/ui + Radix"). It agrees with `COMPONENT_REUSE_MAP.md` §3, "Why no new component library or dependency". **RECOMMENDED:** treat the guide's component table as aspirational. Any of those libraries would be a new dependency, which needs owner approval (AGENTS.md §9).

---

## 4. Design tokens and styling (OBSERVED, `client/src/index.css`)

| Item | Fact | Evidence |
|---|---|---|
| Token system | Tailwind v4 `@theme static`. `--color-*: initial` and `--font-*: initial` clear Tailwind's default palette and fonts, so only project colours exist as utilities. | `index.css:26-27,71-74` |
| Colours (16) | Eleven hex colours from DESIGN.md §3: `bg` #080f1c, `surface` #101c2b, `elevated` #172638, `surface-light` #f5f8fa, `primary` #39d5c2, `secondary` #64a9ff, `text` #f4f7fa, `text-dark` #182435, `warning` #f5b84b, `danger` #f06b72, `success` #3baa82. Five added for contrast: `text-muted`, `text-dark-muted`, `rule`, `rule-dark`, `focus` #1f6fd6. | `index.css:28-43`, `DESIGN.md:28-47` |
| Motion tokens | Two: `--animate-rain` (0.8 s × 6, rests after 4.8 s) and `--animate-drift` (one 4.8 s settle). Both are transform-only. | `index.css:45-69` |
| Not tokenised | Spacing, radius, shadow and the type scale use Tailwind's built-in scale (`rounded-lg`, `p-5`, `text-2xl`), which was not cleared. There are no elevation tokens. | `index.css:26-75` (no such entries) |
| Card material | The `card-surface` utility: 85 % `surface-light` with an 8 px backdrop blur, solid under `prefers-reduced-transparency`. Contrast numbers are documented inline. | `index.css:77-100` |
| Focus | 2 px `focus` outline with a 2 px offset. Lighter on dark surfaces and dark on the title block and stale banner. | `index.css:242-268` |
| Reduced motion | A global `0.01ms` override. Press feedback becomes an opacity change. | `index.css:270-284` |
| Micro-motion | `.press` scale 0.97 at 120 ms. `.ask-answer` rises in with `@starting-style`. Landing `.reveal` uses `animation-timeline: view()`. All of these sit only under `no-preference`. | `index.css:180-225` |
| Modern CSS already in use | A `scroll-state(stuck: bottom)` container query on the Ask composer, `:has()`-driven `scroll-padding-bottom`, `color-mix(in oklab)` throughout the skyline. | `index.css:158-174,291-301`; `CitySkyline.tsx:22-83` |
| One hard-coded colour | `text-[#5E5E5E]` on the Google Maps credit. It may be deliberate (it follows the attribution spec), but it bypasses the tokens. | `AppShell.tsx:423` |
| Repetition | The card class string `rounded-lg border border-rule card-surface p-5 sm:p-6` appears in many places: `card-surface` occurs 34 times across 16 non-test `.tsx` files. The outlined button `min-h-11 rounded-md border border-text-dark px-4` is repeated about 14 times. There is no shared Button or Card component. | grep, 28 Nov |

---

## 5. Strengths to keep (OBSERVED)

1. **Data honesty is enforced in code:**
   - every forecast carries `provider`, `sourceUrl`, `dataKind`, `modelResolution`, `retrievedAt`, `units` and `limitations` (`contracts.ts:47-61`);
   - `freshness: 'unknown'` is said honestly (`routes/airQuality.ts:92-99`);
   - CPCB is declared but `unavailable`, and `/current` returns 503 instead of inventing data (`routes/airQuality.ts:39-48,106-113`);
   - fire hotspots are a distinct `satellite_detection` kind and never "zero" on failure (`contracts.ts:4-31`, `services/fires/firms.ts:100-138`).
2. **The AI is fenced in.** See §2.1. The prompt versions are `daily-plan-v3` and `ask-v1` (`services/ai/prompts.ts:3,64`). Claude runs with `maxRetries: 0`, a fixed `baseURL`, `logLevel: 'off'` and OpenTelemetry off (`services/ai/claude.ts:22-34`).
3. **Graceful degradation everywhere:**
   - no Gemini key: rules-only plans;
   - no Anthropic key: rules-only Ask;
   - no FIRMS key: the card is hidden;
   - no Google key: "Near you (approximate)";
   - no Supabase: 503 `SAVE_UNAVAILABLE` and "Saving isn't set up".
   
   (`config/appOptions.ts:15-86`, `routes/fires.ts:10-17`, `routes/locations.ts:20-28`, `services/saved/userFrom.ts:26-27`)
4. **Privacy by design:**
   - coordinates are rounded to 2 decimals in the client and rejected otherwise by the server (`api.ts:98-110`, `routes/airQuality.ts:12-25`);
   - a device location never goes into the URL (`AppShell.tsx:219-239`);
   - there is no account until Save, and then it is anonymous (`lib/supabase.ts:28-35`);
   - the Google place name is never saved or sent on (`AppShell.tsx:74-92`);
   - a typed question is never logged or cached (`routes/assistant.ts:9-11`);
   - RLS is on, plus a server-side ownership filter (`supabase/migrations/20261118120000_saved_data.sql:63-78`);
   - delete everything in one step (`routes/account.ts:9-12`).
5. **Accessibility base:**
   - a skip link (`AppShell.tsx:304-309`);
   - one nav landmark with `aria-current`;
   - a native `<dialog>` for the place chip (`PlaceChip.tsx:58`);
   - an ARIA combobox and listbox for search (`LocationSearch.tsx:147-190`);
   - `<details>` disclosures and `<output>` live regions;
   - a text alternative for the chart (`chart.ts` `summarize`);
   - focus moved deliberately after actions;
   - axe in unit tests (`client/src/test/axe.ts`) and e2e (`e2e/axe.ts`);
   - forced-colours handling (the skyline is hidden under `forced-colors`, `CitySkyline.tsx:102`).
6. **A distinctive, honest visual signature:**
   - the city backdrop's look follows only the server's air check and this hour's weather, with no fog or smog inference (`features/air-quality/scene.ts:20-31,44-70`);
   - it is `aria-hidden`, and a footer sentence carries its meaning (`AppShell.tsx:573-581`).

---

## 6. Weaknesses and technical debt (OBSERVED unless marked)

| # | Area | What | Evidence | Impact on the brief |
|---|---|---|---|---|
| D1 | Structure | `AppShell.tsx` is 604 lines and holds every page's state, Today's layout, the header and the footer. Pages get 6–10 props each. Today has no component of its own. | `AppShell.tsx:65-602` | Any Today or shell redesign touches the riskiest file. Its test is 2,681 lines (`AppShell.test.tsx`). |
| D2 | Design system | Only colours and two animations are tokens. There are no Button, Card, Chip, Section or Badge primitives; class strings are copied. | §4 | Hard to make the app "premium and consistent" without first extracting primitives. |
| D3 | Layout stability | Skeleton heights are hard-coded per breakpoint, for example `min-h-[110.8rem] … min-[68.125rem]:min-h-[40.6rem]`. | `MyHome.tsx:98,169`; `BetterHabits.tsx:49`; `TodayLeadLoading` in `TodayLead.tsx:73` | Any layout or copy change breaks these silently and brings layout shift back (F-02). |
| D4 | Bundle | No route splitting. `App.tsx` imports Landing, Privacy and the whole AppShell eagerly, so Landing ships the Supabase client and the Ask code. F-37 is still open. | `App.tsx:1-4`; no `lazy`/`Suspense` in `client/src` (grep) | Conflicts with the "lazy heavy scenes" target. A 3D or rich scene must not be added to this single chunk. |
| D5 | Sharing metadata | No `og:*` tags, no manifest, no touch icon. F-36 is still open. | `client/index.html` | Weak first impression when a link is shared. |
| D6 | Per-instance state | The forecast, weather, FIRMS and plan caches, plus the 200-per-day AI budgets, live in memory per Function instance. | `services/air-data/cache.ts:2-3`, `services/ai/askWriter.ts:27-29`, `dailyPlan.ts:104-107` | Spend and cache hit rates scale with the number of instances. Fine for now. Any feature that needs shared state would need a store. |
| D7 | Rate limit coupling | One 10-per-minute-per-IP limiter covers daily plans, Ask and saving plans. | `app.ts:126-138,151-164` | A chattier Ask UX (for example auto follow-ups) would eat into plan builds. |
| D8 | Vestigial endpoint | `GET /air-quality/current` always returns 503. | `routes/airQuality.ts:106-113` | Keep it. It documents the CPCB gap honestly. |
| D9 | Known corners (recorded `ponytail:` comments) | Weather "same hour" is off by one on DST change days. A FIRMS box across ±180° is unavailable. | `openMeteoWeather.ts:111-112`, `firms.ts:114-119` | None for India. |
| D10 | Google cost cap | Reverse geocoding has no daily cap until the owner sets a Cloud quota. | `COST_AND_LIMITS.md:54` | Owner action. Not code. |
| D11 | Hard-coded attribution colour | `text-[#5E5E5E]` | `AppShell.tsx:423` | Minor token drift. |
| D12 | Dev and prod share one Supabase project | F-42 in the 24 Nov register. **Not re-checked** in this audit. | `FINDINGS_REGISTER.md` F-42 | e2e `journey.spec.ts` creates real anonymous accounts. |

### 6.1 Status of the 24 Nov findings register (re-checked by grep, 28 Nov)

| Finding | Status | Evidence |
|---|---|---|
| F-01 save wording | Fixed (all three strings) | `HouseholdPreferencesForm.tsx:35-36` (`SAVE_NOTE`), `DailyPlanSection.tsx:40` ("Saved to your anonymous account…"), `Welcome.tsx:324` ("Creates an anonymous account…") |
| F-06 saved plans without a session | Fixed | `SavedPlansList.tsx:17` ("No saved plans yet…") |
| F-07 retention mismatch | Fixed in copy | `Privacy.tsx:112` (nightly job, 30 days) |
| F-08 branded 404 | Fixed | `client/public/404.html`; `e2e/pages.spec.ts` |
| F-09 unknown app page | Fixed | `AppShell.tsx:146-148` |
| F-15 "of 10 answers" | Fixed | `Ask.tsx:145` |
| F-16 "Live air information" | Fixed | `today.ts:47`, `rules.ts:133` |
| F-23 one "Why?" label | Fixed | No "Why this recommendation" or "Why it matters" in non-test `.tsx` |
| F-24 "Greener habits" | Fixed | No match in `client/src` |
| F-28 logo goes to `/app` | Fixed | `AppShell.tsx:316-322` |
| F-30 Reload in the stale banner | Fixed | `TodayLead.tsx:53` passes `onReload` |
| F-32 "updated" → "retrieved" | Fixed on Today | `TodayLead.tsx:51` |
| F-40 "clean air" in a rule | Fixed | No match in `rules.ts` |
| F-41 saved-plan AQI line | Fixed | `PlanView.tsx:14` |
| **F-36** og tags and manifest | **Open** | `client/index.html` |
| **F-37** no route splitting | **Open** | `App.tsx:1-4` |
| All others (F-02 to F-05, F-10 to F-14, F-17 to F-22, F-25 to F-27, F-29, F-31, F-33 to F-35, F-38, F-39, F-42 to F-44) | **Not re-checked** in this audit | n/a |

---

## 7. Test coverage (OBSERVED)

| Suite | Files | Result (28 Nov, local `npm test`) | Notes |
|---|---|---|---|
| Server unit and integration (Vitest + supertest) | 43 (3 live-API files skipped) | **446 passed, 27 skipped** | Covers every route, provider parser, cache, AI output check, rule and guide, the Supabase store and auth gate, env and headers. The live tests (`gemini.live.test.ts`, `supabase.live.test.ts`, `askEval.live.test.ts`) need real keys. |
| Client unit (Vitest + Testing Library + axe) | 49 | **708 passed** | Almost every component has its own test. Heaviest: `AppShell.test.tsx` (2,681 lines), `Ask.test.tsx` (760), `MyHome.test.tsx` (507). `styles.test.ts` pins CSS rules. |
| E2E (Playwright, desktop Chrome + Pixel 7) | 12 specs | **Not run for this audit.** Counted statically: about 159 `test(` calls (regex `^\s*test(\.\w+)?\(`), before projects and describe loops multiply them. | Specs: `firstscreen` (62, 2,204 lines), `responsive` (36), `backdrop` (18), `landing` (13), `copy` (5), `failures` (5), `pages` (5), `ask` (4), `keyboard` (4), `journey` (3), `scene` (3), `onboarding` (1). Most stub every API (`e2e/routes.ts`). `journey.spec.ts` uses real services. |
| CI | n/a | n/a | CI runs unit tests with coverage, typecheck, lint, format and build. **E2E is not in CI** (`e2e/playwright.config.ts:4-6`, `.github/workflows/ci.yml`). |

**Gaps (RECOMMENDED to close before or with a redesign):**
- no automated CLS check exists (`COMPONENT_REUSE_MAP.md` §5 says the same);
- no visual regression snapshots;
- e2e is not gated in CI, so a redesign can break the 320 px or keyboard specs unnoticed unless someone runs them by hand;
- the heavy copy and layout pinning in `AppShell.test.tsx` and `firstscreen.spec.ts` will make even approved copy changes expensive. Budget time for test updates.

---

## 8. Gaps against the brief's journey (UNDERSTAND → ASK → GET GUIDANCE → TAKE ACTION → LEARN)

| Stage | What exists (OBSERVED) | Gap (OBSERVED absence) | Direction (RECOMMENDED, within the data rules) |
|---|---|---|---|
| **UNDERSTAND** | **Today:** the verdict card (`TodayLead.tsx:14-66`) opens with a "Weather for …" line (`:37-39`), then the 24-hour check title, a status tag, "Model forecast · Open-Meteo · retrieved HH:MM" and the caveat. The weather comparison table (`WeatherCompare.tsx`), the fire hotspots card (`FireHotspots.tsx`), the city backdrop and "Air quality details" (`AirDetails.tsx`) all sit on the same screen. The details panel holds the PM readout, the hourly table and chart, the method, and sources and limitations. | The hourly shape (when particles peak) is folded inside closed details. The chart is PM2.5 and PM10 only. There is no plain-language explainer of what "model forecast" or "24-hour limit" mean outside the details. **There is no past data:** the app requests `forecast_hours=48` from now (`openMeteo.ts:69`) and stores nothing. | Bring a compact, labelled hourly strip out of the details (deterministic, from `hours`). Add a one-tap "What does this mean?" explainer reusing `LIMITATIONS` and `APP_LIMITATIONS` (`limitations.ts`). History or "Insights" (master guide §9.7) needs a new data source and storage (see doc 13). |
| **ASK** | **Ask page:** a guided chat. 4 starters and 6 topic chips under "More topics", a typed question answered by Claude Haiku from the rule cards, up to 2 earlier questions as context, questions back to the household, copy answer, provenance per answer. Today has its own Ask box and help choices. (`Ask.tsx`, `AskEntry.tsx`, `useAsk.ts`; OWNER_DECISIONS J25/J26) | The thread lives in memory only and holds at most 10 entries (`useAsk.ts:51`), so it is lost on reload (by design). Claude does not see weather, fire or hourly values (J26 D3). Answers are English only (`prompts.ts:74`). There is no streaming: the API returns a completed answer. | Keep. A UI refresh only. Do not fake streaming (master guide §8.3 agrees). Adding weather or fire context to Claude is a separate owner decision (J26 D3). |
| **GET GUIDANCE** | **Daily plan:** "Your recommendation for today" shows the top card, then "See your full day" with "Your day" grouped by morning, commute, daytime, evening and at home, plus topic groups, each card with a "Why?". It is built automatically on Today and My Home. (`DailyPlanSection.tsx`, `PlanView.tsx`, `planDisplay.ts`) | "Your day" periods exist **only for AI plans** (`planDisplay.ts:56-59`). A rules-only plan has no timeline. Periods are AI-chosen labels, not tied to forecast hours. | An hour-aware guidance view would need new deterministic code (for example "PM2.5 forecast highest around HH:00"). It must use model-forecast labels and never say an hour is "safe". A timed rule card is a server change and needs approval. **Cross-doc note (critic, 28 Nov):** doc 06 §4.3 later found a client-only option (N1, no API change); doc 14 schedules a simpler "Your day" strip in R4 and holds N1 as "Later". |
| **TAKE ACTION** | **Save plan:** creates an anonymous account, keeps 20 plans as snapshots. The rule cards are action-shaped. (`DailyPlanSection.tsx:160-182`, `SavedPlansList.tsx`) | There is no way to mark an action done, no checklist, no reminders or notifications, and no per-day action history. No schema exists for any of it (`supabase/migrations/20261118120000_saved_data.sql` has only `household_preferences` and `daily_plans`). | A device-local "done today" tick list (no account) is the lowest-risk step. **Storage is owner decision O-5 (doc 06 §4.6):** the team default is memory only for the visit; any browser storage key needs a ruling (doc 15 Q-16). Server-side tracking needs a migration plus RLS, which is an approval gate. |
| **LEARN** | **Better Habits:** 6 guide cards in 4 groups. **My Home:** 7 indoor guide cards in 6 groups, which hide duplicates of today's personal card. The library has 17 guide cards in total; 5 serve Ask only (`guides.ts:164-245`). Sources cited include WHO, EPA, MoHFW, BEE and PIB. Both are qualitative only. (`services/recommendations/guides.ts:31-256`, `BetterHabits.tsx`, `MyHome.tsx`) | No progress or learning path, and no content about pollutants or forecast methods beyond the limitation lines. No quantitative impact by rule ("never show an emissions saving we can't calculate", `BetterHabits.tsx:26-27`). | Short, sourced explainer cards in the same `GuideCard` shape (server-owned, cited) fit the existing pattern. Do not add numbers without a documented method. |

**Cross-cutting gaps:**
- the journey is not visible as a journey: the five destinations are peers in the nav, with no "next step" between them except the Today help choices (`HelpChoices.tsx`, `helpChoices.ts:7-40`) and the invite "Make it personal: 2 quick questions" (`AppShell.tsx:519-541`);
- Landing and Welcome already explain value (`Landing.tsx`, `Welcome.tsx`), but Today does not re-surface the journey once onboarding is done.

---

## 9. Reconciliation notes with existing docs

| Doc | Point | Status |
|---|---|---|
| `OWNER_DECISIONS.md` J26 | Claude Haiku answers typed Ask questions; medical questions call no AI; 200 calls per UTC day per instance. | **Matches the code:** `routes/assistant.ts:28-39`, `askWriter.ts:26`, `config/env.ts:29-34` (default `claude-haiku-5-5`), `ask.ts` `ASK_COPY.intro`. |
| `COMPONENT_REUSE_MAP.md` (24 Nov) | Maps 30 `.tsx` files. | **Superseded in part.** `CyclingHint.tsx`, `FireHotspots.tsx` and `WeatherCompare.tsx` came later. Many "Change behaviour" items have shipped (`STAGE5_REPORT.md`, P2–P8). Use doc 04 for the current list. Its line references are a 24 Nov snapshot; do not reuse them. |
| `STAGE5_REPORT.md` | Direction A shipped (P0–P8); P9 (Direction B) and P10 not built. | Consistent with the code: no dark masthead. |
| Master guide §8.1–8.2 | Assumes shadcn/ui and Radix exist. | **Contradicted** (§3.1). |
| Master guide §9.7 "Insights" | Proposes a page of trends. | The brief keeps five destinations, and no history data exists. Treat it as future work inside an existing destination, after a data decision. |
| Brief banned words vs approved negated caveat | `today.ts:32` keeps the caveat "…does not mean the air is clean or free of risk." The brief bans "clean air". `planOutput.ts:147-148` bans "air is clean" for AI output only. | The caveat is a fixed rule string, approved earlier (F-40 discussion). **Flag for the owner:** keep the negated caveat or reword it. Do not change it silently. |
| `DESIGN.md` §3 | The token table. | Matches `index.css:28-38` exactly. |
| Not opened for this doc | `INFORMATION_ARCHITECTURE.md`, `WIREFRAMES.md`, `DESIGN_SYSTEM_PROPOSAL.md`, `DESIGN_CONCEPTS.md`, `REDESIGN_ACCEPTANCE_CRITERIA.md`, the Ask UX spec, the question bank, the adaptive cityscape spec. | Reconciliation with these is **partial**. This audit reports the code; the owner or the doc leads for those files should check for conflicts. |
