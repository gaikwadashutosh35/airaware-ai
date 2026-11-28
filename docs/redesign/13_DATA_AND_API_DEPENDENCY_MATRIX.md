# 13 · Data and API dependency matrix

**Date:** 28 Nov 2026.
**Scope:** the local working tree at commit `b0c4278`. Read from code and the repo's own docs. The live site was not loaded, and no provider was called for this doc.

**Labels:**
- **OBSERVED** means seen in code or a repo doc, with `file:line`.
- **RECOMMENDED** means our proposal.
- **Not recorded in repo** means the repo states no figure. We did not fill one in from memory.

**Configured in production?**
- This doc does not say which optional keys are set in production. `server/src/config/appOptions.ts:15-86` logs it at start-up.
- `DEPLOYMENT.md` lists the variables.
- For what the live site showed on 24 Nov, see `docs/redesign/audit/LIVE_SITE_AUDIT.md`.

---

## 1. Sources at a glance (OBSERVED)

| # | Source | Kind (`DataKind`) | Called from | Key | Server route(s) | Required? |
|---|---|---|---|---|---|---|
| S1 | **Open-Meteo Air Quality API** (CAMS global, 0.4° / about 45 km) | `model_forecast` | Server only. `air-quality-api.open-meteo.com/v1/air-quality` (`server/src/services/air-data/openMeteo.ts:11`) | none | `GET /api/v1/air-quality/forecast`. Also inside `POST /recommendations/daily-plan`, `POST /assistant/answer` and `POST /plans` | **Yes.** It is the core data. |
| S2 | **Open-Meteo Weather Forecast API** | `model_forecast` (weather) | Server only. `api.open-meteo.com/v1/forecast` (`openMeteoWeather.ts:7`) | none | Bundled into `GET /air-quality/forecast` as `weather` (`routes/airQuality.ts:88-91`) | No. It falls back to `weather: null`. |
| S3 | **Open-Meteo Geocoding API** (search) | n/a (place names) | Server only. `geocoding-api.open-meteo.com/v1/search` (`services/location/geocoding.ts:5`) | none | `GET /api/v1/locations/search` | Yes, for choosing a place by name. |
| S4 | **Google Maps Geocoding** (reverse) | n/a (a town name for display) | Server only. `maps.googleapis.com/maps/api/geocode/json` (`services/location/reverseGeocode.ts:6`) | `GOOGLE_MAPS_API_KEY` | `GET /api/v1/locations/reverse` | No. It falls back to `name: null`. |
| S5 | **NASA FIRMS** (VIIRS NOAA-20, NOAA-21 NRT) | `satellite_detection`. Never an air reading. | Server only. `firms.modaps.eosdis.nasa.gov/api/area/csv` (`services/fires/firms.ts:7-9`) | `FIRMS_MAP_KEY` | `GET /api/v1/fires/nearby`. Also listed in `/air-quality/sources`. | No. Without the key it returns `not_configured`. |
| S6 | **Google Gemini** (`gemini-3.8-flash` default) | AI wording of rule cards | Server only. REST `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, key in a header, `redirect: 'error'` (`services/ai/gemini.ts:26-68`) | `GEMINI_API_KEY` | Inside daily-plan, save-plan, and Ask topic answers (the plan writer) | No. Rules-only without it. |
| S7 | **Anthropic Claude** (`claude-haiku-5-5` default, `config/env.ts:29-34`) | AI: (a) backup plan writer; (b) answers typed Ask questions (J26) | Server only. Official SDK, fixed `baseURL`, `maxRetries: 0`, logging off (`services/ai/claude.ts:22-34`) | `ANTHROPIC_API_KEY` | (a) daily-plan and save-plan, only when Gemini gives no accepted answer; (b) `POST /assistant/answer` for typed, non-medical questions | No. Rules-only without it. |
| S8 | **Supabase** (Postgres + Auth, Mumbai region per `PRIVACY.md:35`) | Saved user data | **Browser:** Auth only (anonymous sign-in, session in localStorage; `client/src/lib/supabase.ts:8-40`). **Server:** token check plus database as that user, with RLS (`services/saved/supabaseStore.ts:39-80`). | `SUPABASE_URL` and a `sb_publishable_` key (server). `VITE_SUPABASE_*` (client). | `GET/PUT /profile/preferences`, `GET/POST/DELETE /plans`, `DELETE /account` | No. Without it the routes return 503 `SAVE_UNAVAILABLE`. |
| S9 | **CPCB National AQI** | `official_observation` | **Not connected.** Declared `unavailable` in the sources list (`routes/airQuality.ts:39-48`). | n/a | `GET /air-quality/current` always returns 503 `DATA_UNAVAILABLE` (`:106-113`) | n/a |
| S10 | **Browser Geolocation** | Device position, rounded to 2 decimals | Client only. `getCurrentPosition({enableHighAccuracy:false, timeout:10000, maximumAge:600000})` (`features/location/UseMyLocation.tsx:28-43`) | permission | none (the coordinates then go to S1, S4 and S5) | No. Search always remains. |
| S11 | **Static server content:** 17 rule cards; 17 guide cards (7 for My Home, 6 for Better Habits, one of them `CLEANER_FUEL` shared, plus 5 Ask-only cards in `ASK_GUIDES`; `guides.ts:164-245`); source references; the sources list | Rule text, sourced (WHO, EPA, MoHFW, BEE, PIB, CPCB NAAQS 2009) | Server code (`services/recommendations/rules.ts`, `guides.ts`; `routes/airQuality.ts:27-61`) | none | `GET /recommendations/guides` (`Cache-Control: public, max-age=3600`, `routes/guides.ts:16`). Also inside plans and Ask. | Yes (no network). |
| S12 | **Static client content:** landing examples, the `today-phone.jpg` capture, Inter font, copy constants | Copy and assets | Bundle (`client/src/pages/landingExamples.ts`, `client/src/assets/`, `client/public/fonts/`) | none | none | Yes |

---

## 2. Freshness, limits, cost and failure per source (OBSERVED)

| Source | Freshness and caching | Limits | Cost | Failure: server | Failure: UI |
|---|---|---|---|---|---|
| **S1 Air forecast** | **Request:** 48 hourly values from now, `domains=cams_global` (`openMeteo.ts:63-70`). `freshness: 'unknown'` because the model run time is not reported (`routes/airQuality.ts:92-99`). **Caches:** server 10 min per rounded place (`cachedForecast.ts:4`); the plan cache is also 10 min (`dailyPlan.ts:20`). **Client:** reloads 60 min after loading; "Not current" when `retrievedAt` is over 60 min old (`AppShell.tsx:172-189`, `clock.ts:5-8`). | **Upstream:** "10 000/day" total Open-Meteo calls is noted as an accepted residual risk (`server/src/app.ts:82-83`). **Terms:** non-commercial free tier and CC BY 4.0 (`INTEGRATIONS.md:135`). **App:** 60 requests/min/IP on `/api/v1` (`app.ts:84-99`). Fetch timeout 5 s (`fetchJson.ts:4`). | Free tier. Attribution required (`components/Attribution.tsx`). | Any failure (network, timeout, non-2xx, schema) gives a 502 `PROVIDER_ERROR` (`fetchJson.ts:9-18`). Inside plans and Ask, the air check becomes `unknown` and the response is not an error (`dailyPlan.ts:151-155`). | **Today:** `ErrorState` "We couldn't load the forecast" with Try again (`AppShell.tsx:450-460`). The plan still builds from rules with "Air information unavailable". **Backdrop:**
- after an error it goes to the `NEUTRAL` scene, because `previous` exists only while a reload is loading (`useRequest.ts:66-72`, `scene.ts:88-101`);
- while the data is over an hour old it **keeps the last-known look**, and only the footer says "Not current" (F-44; `AppShell.tsx:183-186,573-581`).

**Old data:** `StaleBanner` with Reload. |
| **S2 Weather** | `timezone=auto`, `past_days=1`, `forecast_days=2` plus daily values (`openMeteoWeather.ts:84-90`). Server cache 10 min, used only while it holds the current hour (`cachedWeather.ts:14-28`). The scene uses weather for up to 120 min past its hour (`scene.ts:80-83`). | Same Open-Meteo terms (`INTEGRATIONS.md:51`). 5 s timeout. | Free | Returns `null` and never throws. The air forecast never fails because of weather (`openMeteoWeather.ts:73-96`, `routes/airQuality.ts:87-91`). | `WeatherCompare` is hidden on null, if the days don't line up, or when "Not current" (`WeatherCompare.tsx:27-34`, `AppShell.tsx:500`). The scene draws no weather. `weatherLine` says "Weather unavailable" (`forecast.ts:70-71`). |
| **S3 Geocoding search** | No cache. 5 results, `countryCode=IN`, English (`geocoding.ts:21-33`). | Query 2–80 characters (`routes/locations.ts:8`). Same Open-Meteo terms (`INTEGRATIONS.md:135`). | Free | 502 `PROVIDER_ERROR` ("Data provider unavailable.") | `LocationSearch` status line. "No places found" for an empty result. |
| **S4 Google reverse** | **No caching at all:** `Cache-Control: no-store` (Google terms; `routes/locations.ts:25-26`, `reverseGeocode.ts:28-30`). It is only displayed, never saved or sent on (`AppShell.tsx:74-92`). | No daily cap until the owner sets a Cloud quota. Only the app's 60/min/IP limit applies (`COST_AND_LIMITS.md:54`). | Price: **not recorded in repo.** | `name: null` on any failure. `ZERO_RESULTS` is treated as normal (`reverseGeocode.ts:38-53`). | The heading stays "Today near you (approximate)". There is a "Place name: Google Maps" credit when the name is shown (`AppShell.tsx:414-426`). |
| **S5 NASA FIRMS** | Server cache 30 min per place. Window 24 h, radius 50 km. Low-confidence detections dropped (`firms.ts:10-15,57-60`). Client refreshes every 30 min (`FireHotspots.tsx:13-14,58-61`). Detections arrive up to about 3 h after a pass (`firms.ts:18-22`). | 8 s timeout (`firms.ts:13`). Quota: **not recorded in repo.** | Free key (the price is not recorded in repo). | `unavailable` if **either** satellite fails, never a partial count, and that result is not cached (`firms.ts:100-138`). `not_configured` without a key. | The card shows "Fire hotspot data is unavailable right now." with Try again. Hidden when `not_configured` (`FireHotspots.tsx:65-100`). |
| **S6 Gemini** | **Caches:** accepted answers 10 min, keyed by the exact writer input; plans 10 min. Fallback plans are not cached (`dailyPlan.ts:84-135,175-178`). **Request:** `thinkingLevel: low`, `maxOutputTokens: 8192`, 10 s timeout (`gemini.ts:8,45-52`). Up to 2 tries on invalid JSON or a schema failure (`personalize.ts:22-46`). | 200 calls per UTC day **per server instance** (`dailyPlan.ts:23,104-122`). 10 requests/min/IP shared by the daily-plan, Ask and save-plan routes (`app.ts:126-138`). | Price: **not recorded in repo.** `INTEGRATIONS.md:71` notes that free-tier prompts may be used by Google. Only the app's own text and model numbers are sent. | Any failure, or failing any check, gives `null`. Then the Claude backup runs if configured, else the rules (`dailyPlan.ts:124-133`). It logs the category only. | "Made by our rules". A complete rules-only plan with no "Your day" timeline (`planDisplay.ts:56-59`). |
| **S7 Claude** | **Settings:** no caching for Ask (each question differs, `askWriter.ts:1-3`); `max_tokens: 4096`; effort low; 10 s timeout; `maxRetries: 0` (`claude.ts:14,56-114`). **Input:** the 24-hour check, eligible card texts, the forecast's provider, kind and limitations, the question, and up to 2 earlier questions with card titles. **No weather, fire or hourly values** (J26 D3; `ask.ts` createAsker). | **Ask:** 200 calls per UTC day per instance (`askWriter.ts:26`). **Backup plan writer:** 200/day/instance (shared mechanism). 10/min/IP shared limiter. | **Haiku 5.5:** $0.10 per million input tokens and $0.50 per million output, about $0.0005 a call typically and about $0.0025 at worst; at most about $0.50 a day per instance for Ask. **Owner:** set an Anthropic spend limit (`COST_AND_LIMITS.md:55-66`). | Any failure or check failure falls back to the rules answer, with no Gemini call (J26 D4; `ask.ts:336-379`). `out_of_scope` falls back to the rules' out-of-scope answer. A medical question goes to no AI (`routes/assistant.ts:30-39`). | The answer shows "Made by our rules" cards. The medical and out-of-scope lines come from `ASK_COPY` (`features/ask/ask.ts:43-82`). The intro discloses Claude (`ask.ts:56`). |
| **S8 Supabase** | Live reads. Saved plans are snapshots ("not current air information", `Profile.tsx`). | 10 s timeout on every request (`supabaseStore.ts:16-17,48-60`). 20 plans per user, enforced by a DB trigger (`supabase/migrations/20261118120000_saved_data.sql:37-52`). 30 anonymous sign-ins/hour/IP by default (`INTEGRATIONS.md:116`). The free plan pauses after 7 days idle; a keep-alive runs every 3 days (`.github/workflows/keep-alive.yml`). Idle anonymous accounts are deleted after 30 days by pg_cron (`20261119180000_cleanup_idle_anonymous.sql:9-61`). Whether that job is scheduled in production: **not verified here.** | Free plan (`COST_AND_LIMITS.md:68`) | `StoreUnavailableError` gives 503 `SAVE_UNAVAILABLE`. The plan limit gives 409 `LIMIT_REACHED`. A bad token gives 401 (`services/saved/userFrom.ts:12-52`). | "Saving isn't available right now. Your answers are still on screen." "Saving isn't set up on this site." The load failure is shown (`HouseholdPreferencesForm.tsx:35-48`). Nothing claims a save that did not happen. |
| **S9 CPCB** | n/a | n/a | n/a | 503 `DATA_UNAVAILABLE` | "No verified machine-readable CPCB feed is connected; official observations are not shown." (`routes/airQuality.ts:45-47`), shown as `cpcbNote` in Air quality details (`AppShell.tsx:292-295,563`). |
| **S10 Geolocation** | 10 min browser cache (`maximumAge`) | 10 s timeout | Free | n/a | Messages for denied and not-found (`UseMyLocation.tsx:40-41`). Search remains. |
| **S11 Static rules and guides** | Changes only on deploy. Guides cached 1 h in the browser (`routes/guides.ts:16`). | n/a | n/a | n/a | Guides fail to load: `ErrorState` "We couldn't load the guides" (`MyHome.tsx:155-165`, `BetterHabits.tsx:34-45`). |

---

## 3. Screen × source matrix (OBSERVED)

● = the primary source for that screen's main content. Most still degrade as §2 describes: for example, a plan without S1 says "Air information unavailable", and Ask without S7 answers from rules. ○ = optional or decorative. Blank = not used.

| Screen / feature | S1 Air | S2 Weather | S3 Search | S4 Google | S5 FIRMS | S6 Gemini | S7 Claude | S8 Supabase | S9 CPCB | S10 Geo | S11 Rules/guides |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Header place chip** (all `/app` pages) | | | ● | | | | | | | ○ | |
| **Backdrop** (all `/app` pages, `CitySkyline`) | ● (air look) | ○ (clouds, rain, heat, glow) | | | | | | | | | |
| **Today:** verdict `TodayLead` (top line is `weatherLine`, `TodayLead.tsx:37-39`) | ● | ○ ("Weather for …" line; "Weather unavailable" on null) | | | | | | | | | |
| **Today:** H1 "Today near {town} (approximate)" | | | | ○ (device place only; the chip keeps the generic label, `AppShell.tsx:325,414-417`) | | | | | | | |
| **Today:** recommendation `DailyPlanSection` | ● (via the server) | | | | | ○ | ○ (backup) | ○ (Save plan) | | | ● |
| **Today:** `WeatherCompare` | ○ (shown only when the forecast is current) | ● | | | | | | | | | |
| **Today:** `FireHotspots` | | | | | ● | | | | | | |
| **Today:** `AirDetails` (readout, tables, chart, sources) | ● | | | | | | | | ○ (CPCB "not connected" note) | | ○ (sources list) |
| **Today:** `HelpChoices`, `AskBox` | | | | | | | | | | | (they send to Ask) |
| **Today:** remembered place restored on load | | | | | | | | ○ (`GET /profile/preferences` when a session exists) | | | |
| **Ask AirAware** | ● ("Using … retrieved" line, and answers via the server) | | ○ (when no place) | | | ○ (topic answers) | ● (typed questions; rules fallback) | | | ○ | ● |
| **My Home** | ● (today's indoor cards come from the plan) | | | | | ○ | ○ | | | | ● (`GET /recommendations/guides?topic=home`) |
| **Better Habits** | (backdrop only) | | | | | | | | | | ● (`topic=habits`) |
| **My Profile** | | | | | | | | ● (preferences, plans, delete account) | | | |
| **Welcome** (3 steps) | | | ● | | | | | ○ ("Remember on this device") | | ○ | |
| **Landing** `/` | | | ● (hero search) | | | | | | | | ○ (static example cards) |
| **Privacy** | | | | | | | | | | | |
| **Footer** | ○ (`backdropNote`) | | | | | | | | | | |

Notes:
- Today and My Profile stay mounted while hidden (`AppShell.tsx:341-359,406`). The household form inside My Profile does the saved-preferences load on **every** `/app` visit that has a session, so Today waits for it (`loaded`) before it decides to open Welcome (`AppShell.tsx:150-155`; `HouseholdPreferencesForm.tsx:140-155`).
- The Google name lookup (`AppShell.tsx:80-90`) runs on whichever `/app` page is open when a device place is set, not only on Today.
- My Home has no plan request of its own. It mirrors Today's `DailyPlanSection` through `onPlan` (`AppShell.tsx:471-491`; `MyHome.tsx:20-33`).

---

## 4. Data flows that cross a trust or privacy line (OBSERVED)

| Data | Leaves the browser? | Reaches | Notes |
|---|---|---|---|
| Coordinates | Yes, rounded to 2 decimals (about 1 km) | Our API, then Open-Meteo, Google (device places only) and FIRMS | The server rejects more than 2 decimals (`routes/airQuality.ts:12-25`). A device location never goes into the URL (`AppShell.tsx:219-236`). |
| Place label | Yes | Our API (plans, Ask) | Never to the AI writers: `toWriterInput` sends no place (`planOutput.ts:53-79`). |
| Household answers | Yes | Our API, then the rules. The AI sees only the resulting card texts. Supabase only after Save. | No medical fields by design (`householdContext.ts:4-6`). |
| Typed Ask question | Yes | Our API, then **Claude only** | Never logged, cached by text, stored, or sent to Gemini (`routes/assistant.ts:9-11`, J26 D5). |
| Google place name | Server to browser only | Display | Never saved or sent on (`AppShell.tsx:74-79`). |
| Saved data | Yes, after Save | Supabase, as that user, with RLS | Deleting the account deletes everything (`routes/account.ts:8-12`). |

**Content Security Policy** (`client/public/_headers`; helmet keeps the API the same, enforced by `server/src/pageHeaders.test.ts`):
- `script-src 'self'`;
- `img-src 'self' data:`;
- `connect-src 'self' https://<supabase-project>`;
- `style-src 'self' https: 'unsafe-inline'`;
- `font-src 'self' https: data:`.

**Any new client-side third-party call, remote image, map tile or CDN script is blocked until both header copies change.**

---

## 5. What new features would need that does not exist yet

Absence is OBSERVED. "What it needs" is RECOMMENDED. **Every row here needs an owner decision before any build**, including rows that do not say so: each one adds data, an API or contract change, a schema, a service or a dependency (AGENTS.md §9; critic pass, 28 Nov).

| Possible feature (journey stage) | What exists | What is missing | What it would need | Data rule to watch |
|---|---|---|---|---|
| **Hourly "when is it highest" strip on Today** (UNDERSTAND, GUIDANCE) | 48 hourly values of 6 pollutants already reach the client (`ForecastSeries.hours`). There is a chart and tables in the details. | A summary outside the details, and any server rule about timing. | **Client:** no new data; reuse `chart.ts`. **Server:** for a timed rule card, a new deterministic function in `recommendations/` plus tests. | Label it as a model forecast with the retrieval time. Never call an hour "safe" or "good". No AQI. Cross-doc: 06 §4.3 (N1) keeps the values behind a closed disclosure (DI-04, 14 D3). |
| **Air history, trends or "Insights"** (UNDERSTAND, LEARN) | Nothing. The request is `forecast_hours=48` from now (`openMeteo.ts:69`), and no past values are stored. | A past-data source and storage. | Either ask the provider for past model data (capability and terms **to verify**, not recorded in repo), or store server snapshots in a new Supabase table: a migration, RLS or a public table, retention, and cost. Owner approval (AGENTS.md §9). | Past model data is not an observation. Keep it labelled "past model data". Never fill gaps invisibly (master guide §9.7). |
| **Official observations (CPCB)** | Declared `unavailable`; `/current` returns 503. | A verified machine-readable feed. | A new integration, a licence review and an owner decision (`INTEGRATIONS.md` §2). | Never relabel model data as CPCB. Never compute an AQI. |
| **Fire hotspots on a map** (UNDERSTAND) | `FireSummary` returns only count, nearest km and latest time (`contracts.ts:13-31`). | Point coordinates in the API, a map renderer, tile access. | An API contract change, a map library or static SVG, a CSP change for tiles (§4), and a tile provider's terms. | A hotspot is "not proof that smoke reaches you". Keep that line. |
| **Weather or fire context in Ask answers** (ASK) | `AskWriterInput` has the air check, cards, forecast metadata and question only (`services/ai/askOutput.ts:19-27`). | Those fields, and checks that cover them. | An owner decision (J26 D3 excluded them from v1), a prompt version bump, and tests. | Never infer pollution from weather (`prompts.ts:76`). |
| **Streaming answers** (ASK) | Completed JSON responses. The Function runs through `serverless-http` (`server/src/netlify.ts`). | A streaming transport end to end. | A different route and transport. Validation must still run on the complete output before display. | Do not fake streaming (master guide §8.3). |
| **Conversation kept across visits** (ASK) | In memory only, at most 10 entries (`useAsk.ts:51`). | Storage, consent and deletion. | A new table plus RLS, a Privacy page update, and an owner decision. | Typed questions are deliberately not stored today (`routes/assistant.ts:9-11`). |
| **"Done today" action tracking, streaks** (TAKE ACTION) | Saved plans only (`daily_plans` table). | Any action state. | Simplest: device-local state (no account). Whether that means memory only or a browser storage key is owner decision O-5 (06 §4.6 recommends memory only; 15 Q-16 bars new keys without a ruling). Server-side: a new table plus RLS through `userFrom`. | No health claims for completing actions. No invented savings. |
| **Reminders or notifications** (TAKE ACTION) | None. There is no service worker and no manifest (F-36 open; `client/index.html`). | A push provider, a service worker, scheduling. | A new service. Cost and privacy review. Owner approval. | Never alert as if it were an official advisory. |
| **More than one saved place** | `SavedPreferences.place` is a single `SavedPlace` (`contracts.ts:320-336`). | A schema for a list. | A contract change, an API change and a migration (the place sits inside the stored JSON). | Searched places only. Never store device locations (`contracts.ts:319`). |
| **Languages other than English** | English copy. Claude is told to answer in English (`prompts.ts:74`). The Ask check rejects non-Latin script (`askOutput.ts:57-65`). | i18n, and translated rule texts and checks. | A large change across copy, checks and tests. | The banned-word checks are English-only today. |
| **Indoor readings** | None. All air data is outdoor model data. | A sensor source. | A new integration. | Never present outdoor values as indoor. |
| **Quantified emissions savings** (LEARN) | Qualitative guides only (`BetterHabits.tsx:26-27`). | A documented method. | A sourced method and an owner decision. | AGENTS.md §6: no numbers without a method. |
| **Rich or 3D cityscape** (visual) | Hand-written SVG and CSS (`CitySkyline.tsx`). No WebGL library. | A runtime library and assets. | A new dependency (approval), lazy loading (`App.tsx` has none), and a reduced-motion and forced-colours fallback that stays the current SVG. | The scene may reflect only the air check and weather (`scene.ts`). No smog drawn from weather. |
| **Shared caps and caches across instances** (scale) | Per-instance memory (`cache.ts:2-3`, `askWriter.ts:27-29`). | A shared key-value store. | A new service. Only if traffic justifies it. | n/a |
| **Product analytics** | None found in `client/src` (grep for analytics or service worker: only Privacy copy matches). | All of it. | A new service, a Privacy page update, a CSP change, consent. | Never log coordinates, questions or household data (`.claude/rules/backend.md`). |

---

## 6. Owner actions recorded in the repo (OBSERVED, not code)

- Set a Google Geocoding API daily quota (`COST_AND_LIMITS.md:54`).
- Set an Anthropic workspace monthly spend limit (`COST_AND_LIMITS.md:66`, `DEPLOYMENT.md:31`).
- Confirm the pg_cron cleanup job is scheduled on the production Supabase project. The migration says "Run once in the SQL Editor after enabling the pg_cron extension" (`20261119180000_cleanup_idle_anonymous.sql:4`).
