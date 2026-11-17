# Phase 2 — Data Contracts and Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The API serves a real Open-Meteo model forecast and India-only place search, with provenance on every value. Provider failures return a JSON error and never fall back to fake data.

**Architecture:**
- Adapters call fixed Open-Meteo URLs with a 5 s timeout and validate the raw response with Zod.
- Adapters map the raw response into our own types.
- Express routers validate query strings with Zod.
- Routers cache forecasts in memory for 10 minutes.
- Errors are thrown as `HttpError`. One error handler turns them into the `API.md` envelope.

**Tech Stack:** Express 5, Zod 4, global `fetch` with `AbortSignal.timeout`, express-rate-limit 8, Vitest 5 + Supertest (fetch stubbed with `vi.spyOn`).

**Spec:**
- `docs/IMPLEMENTATION_PLAN.md` §7 Phase 2, plus the §3.2 contract fixes #2, #3, #4, #7 and #8.
- `API.md`, `INTEGRATIONS.md`, `DATA_GOVERNANCE.md`, `.claude/rules/air-data.md`.

## Facts verified on 2026-11-17 (by live calls and the Open-Meteo docs page)

**Air-quality endpoint:**
- URL: `https://air-quality-api.open-meteo.com/v1/air-quality`.
- `domains=cams_global` selects the CAMS global forecast: 0.4° (~45 km) grid, 3-hourly source resolution, updated every 12 hours.
- `forecast_hours=N` starts at the current hour.
- `timeformat=unixtime` returns integer seconds, so no timezone parsing is needed.
- Units: `hourly_units` gives `"μg/m³"` (Greek mu) for all six variables.
- Coordinates are snapped to the grid. Requesting `18.52, 73.86` returns `18.5, 73.90001`.
- Bad input returns HTTP 400 `{"error":true,"reason":"..."}`.

**Geocoding endpoint:**
- URL: `https://geocoding-api.open-meteo.com/v1/search`.
- `countryCode=IN` limits results to India.
- No match returns `{"generationtime_ms":…}` with no `results` key.
- A 1-character name returns nothing.

**Attribution:** the docs require "a clear attribution to CAMS ENSEMBLE data provider as well as a reference to Open-Meteo". The free tier is non-commercial and licensed CC BY 4.0.

## Global Constraints

**Data integrity**
- `dataKind` is always `'model_forecast'` for Open-Meteo data.
- No response contains an AQI field. We never request `european_aqi` or `us_aqi`.
- `nationalAqi` does not exist in Phase 2.
- Units pass through from `hourly_units`, never hard-coded.
- Timestamps are ISO-8601 UTC with `Z`.

**Privacy**
- Coordinates are rounded to 2 decimals (~1.1 km) before they leave the server or become a cache key.
- Coordinates are never logged.
- The rounding loses no accuracy because the model grid is ~45 km.

**Failure handling**
- Provider errors return `502 PROVIDER_ERROR`. This covers network errors, timeouts, non-2xx responses, invalid JSON and schema mismatches.
- Provider failure never returns `data`, a demo series or a stale series.

**Error envelope**
- Exactly `{ "error": { "code", "message", "details"? } }`.
- No stack traces and no provider `reason` text.

**Network**
- Upstream URLs are module constants built with `new URL()` and `searchParams.set`. No user input reaches the host or path.
- Tests never touch the network. Fixtures are recorded real responses, trimmed.

**Housekeeping**
- No new env vars this phase. TTL, rate limit and base URLs are code constants.
- One branch `main`. Commit after each task. Push only on the owner's yes.

## Deviations from IMPLEMENTATION_PLAN §7 Phase 2 (for your approval)

| Planned | This plan | Why |
|---|---|---|
| `shared/` workspace with Zod response schemas | Response types are TS types in the adapter that produces them. Move them to `shared/` in Phase 3. | No client consumer yet. Zod is used where data enters: provider responses and query strings. |
| `AirQualitySnapshot`, `PollutantReading` | Deferred to the CPCB adapter | Nothing produces a snapshot until a CPCB feed is verified |
| CPCB category mapper + boundary tests | Deferred to the CPCB adapter | Without a published CPCB AQI value it is dead code. Its boundary tests move with it. |
| Demo adapter | Deferred to the first consumer (offline E2E or dev without network) | Tests use recorded fixtures. A demo provider nobody calls is scaffolding. |
| `retryable` in the error envelope (§3.2 #2) | Dropped | The client derives it from `code` (`PROVIDER_ERROR`, `DATA_UNAVAILABLE`, `RATE_LIMITED`) |
| Env vars `OPEN_METEO_*`, `AIR_DATA_CACHE_TTL_SECONDS`, `RATE_LIMIT_*` | Code constants | Values never change between environments. Base URLs as config would weaken the allowlist. |
| Geocoding worldwide | `countryCode=IN` | PRD: the initial audience is households in India. "Pune" otherwise also matches Brazil and Timor-Leste. |

## Review Focus

1. **Empty or junk coordinate** (`?latitude=&longitude=73.8`, `latitude=abc`, `latitude=1e2`, a repeated param) → 400 `VALIDATION_ERROR`. It must never coerce to `0`. Test in Task 4.
2. **Open-Meteo returns 200 with a missing variable** → that pollutant is omitted and a limitation names it. A value with no unit → 502. Test in Task 2.
3. **Provider down or slow** → 502 envelope with no `data` key, and the next request retries instead of caching the failure. Test in Task 4.
4. **Precise user coordinates sent upstream** → the fetch URL carries `latitude=18.52`, not `18.519571`. Test in Task 4.
5. **No place matches the search** (no `results` key) → `200 { data: [] }`, not 502. Test in Task 3.

---

### Task 1: Error envelope and central error handler

**Files:**
- Create: `server/src/errors.ts`, `server/src/errors.test.ts`
- Modify: `server/src/app.ts` (mount the handler last)

**Interfaces — Produces:**
- `type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'PROVIDER_ERROR' | 'DATA_UNAVAILABLE' | 'INTERNAL_ERROR'`
- `class HttpError extends Error { readonly status: number; readonly code: ErrorCode; readonly details?: unknown }` with constructor `(status, code, message, details?)`.
  - Fields must be declared explicitly. `erasableSyntaxOnly` forbids parameter properties.
- `errorHandler: express.ErrorRequestHandler`. It is the last middleware in `createApp`.

Steps:
- [ ] Write the failing tests. Mount `errorHandler` on a bare `express()` app with two test routes:
  - `/known` throws `new HttpError(502, 'PROVIDER_ERROR', 'Air-quality provider unavailable.')`. Expect exactly that status and envelope.
  - `/boom` throws `new Error('db password in stack')`. Expect 500 with body exactly `{ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } }`. The response text must not contain `password` or `at `.
- [ ] Run `npm test -w server`. Expect failure: module `./errors.ts` not found.
- [ ] Implement:
  - `HttpError` → `res.status(err.status).json({ error: { code, message, details } })`. Omit `details` when it is undefined.
  - Any other error → `console.error(err)` (server log only) and the 500 body above.
- [ ] Run the tests and expect them to pass. Mount `errorHandler` after the 404 handler in `app.ts`. Existing app tests stay green.
- [ ] Commit `feat(server): add central JSON error handler`.

### Task 2: Open-Meteo forecast adapter

**Files:**
- Create:
  - `server/src/services/fetchJson.ts`
  - `server/src/services/air-data/openMeteo.ts`
  - `server/src/services/air-data/openMeteo.test.ts`
  - `server/src/services/air-data/fixtures/open-meteo-pune.json`: a recorded real response (`latitude=18.52&longitude=73.86`, all six variables, `domains=cams_global&timeformat=unixtime&forecast_hours=3`), kept verbatim.

**Interfaces:**
- Consumes `HttpError` (Task 1).
- Produces:
  - `fetchJson<T>(url: URL, schema: z.ZodType<T>): Promise<T>`. Uses `fetch(url, { signal: AbortSignal.timeout(5000) })`. Any failure throws `HttpError(502, 'PROVIDER_ERROR', 'Air-quality provider unavailable.')`. Failures are: rejected fetch, timeout, `!res.ok`, invalid JSON, or schema failure.
  - `type Pollutant = 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO'`
  - `interface ForecastSeries { provider: 'Open-Meteo'; sourceUrl: string; dataKind: 'model_forecast'; modelResolution: string; retrievedAt: string; units: Partial<Record<Pollutant, string>>; hours: Array<{ time: string; values: Partial<Record<Pollutant, number | null>> }>; limitations: string[] }`
  - `fetchForecast(latitude: number, longitude: number, now: Date): Promise<ForecastSeries>`. Callers pass coordinates that are already rounded.

**Pinned values:**
- Variable map:
  - `pm2_5→PM2_5`, `pm10→PM10`
  - `nitrogen_dioxide→NO2`, `sulphur_dioxide→SO2`
  - `ozone→O3`, `carbon_monoxide→CO`
- Query: `hourly=<six vars>&domains=cams_global&timeformat=unixtime&forecast_hours=48`
- `sourceUrl`: `https://open-meteo.com/en/docs/air-quality-api`
- `modelResolution`: `'CAMS global atmospheric composition forecast, 0.4° (~45 km) grid'`
- Base `limitations`:
  - `'Model forecast, not a station observation.'`
  - `'Not the CPCB National AQI.'`
  - `'Grid cell is about 45 km wide; conditions near roads or local sources can differ.'`
- Missing variable adds the limitation `'<Pollutant> is not provided by the model for this location.'`

**Raw Zod schema:**
- `hourly.time`: a non-empty array of integers.
- Each variable: an array of `number ≥ 0 | null`, the same length as `time`.
- `hourly_units`: a record of strings.

Steps:
- [ ] Write the failing tests (fetch stubbed with `vi.spyOn(globalThis, 'fetch')`):
  - The fixture maps to 3 hours. The first `time` is `'2026-11-17T17:00:00.000Z'` (unix `1794934800`). `units.PM2_5 === 'μg/m³'`. The first hour has `values.PM2_5 === 48`. `dataKind === 'model_forecast'`.
  - `JSON.stringify(result)` does not match `/aqi/i`.
  - The fixture with `pm10` removed has no `PM10` key in `units` or `values`, and its limitations include the PM10 sentence.
  - A fixture with `hourly_units.ozone` deleted rejects with `PROVIDER_ERROR` (bad unit).
  - Each of these rejects with `HttpError` code `PROVIDER_ERROR`, status 502:
    - a negative value
    - a length mismatch
    - an empty `time`
    - HTTP 500
    - a non-JSON body
    - a fetch rejecting with `DOMException('timeout', 'TimeoutError')`
  - The requested URL host is `air-quality-api.open-meteo.com` and includes `domains=cams_global`.
- [ ] Run and confirm the failures are "module not found".
- [ ] Implement `fetchJson` and `fetchForecast`.
- [ ] Run and expect pass. Also run `npm run typecheck` and `npm run lint`.
- [ ] Commit `feat(server): add Open-Meteo forecast adapter`.

### Task 3: Open-Meteo geocoding adapter

**Files:**
- Create:
  - `server/src/services/location/geocoding.ts`
  - `server/src/services/location/geocoding.test.ts`
  - `server/src/services/location/fixtures/open-meteo-geocoding-pune.json`: recorded with `name=Pune&count=5&language=en&format=json&countryCode=IN`.

**Interfaces:**
- Consumes `fetchJson`.
- Produces:
  - `interface LocationResult { id: number; name: string; admin1?: string; country: string; latitude: number; longitude: number; timezone: string }`
  - `searchLocations(query: string): Promise<LocationResult[]>`

Pinned query: `name=<query>&count=5&language=en&format=json&countryCode=IN`.

Steps:
- [ ] Write the failing tests:
  - The fixture maps to results whose first item is `{ id: 1259229, name: 'Pune', admin1: 'Maharashtra', country: 'India', latitude: 18.51957, longitude: 73.85535, timezone: 'Asia/Kolkata' }`. Extra raw fields such as `population` are dropped.
  - `{ generationtime_ms: 0.09 }` → `[]`.
  - The URL host is `geocoding-api.open-meteo.com` and it carries `countryCode=IN`.
  - HTTP 500 → `PROVIDER_ERROR`.
- [ ] Run and confirm the failures.
- [ ] Implement. The raw schema has `results` optional and keeps only the listed fields.
- [ ] Run and expect pass.
- [ ] Commit `feat(server): add Open-Meteo geocoding adapter`.

### Task 4: Freshness, TTL cache and routes

**Files:**
- Create:
  - `server/src/services/air-data/freshness.ts` + test
  - `server/src/services/air-data/cache.ts` + test
  - `server/src/routes/airQuality.ts` + test
  - `server/src/routes/locations.ts` + test
- Modify: `server/src/app.ts`
  - Add the `express-rate-limit` limiter on `/api/v1`.
  - Mount the routers before the 404 handler.
- Modify: `server/package.json`. Add `express-rate-limit@8.7.2`, the newest release ≥14 days old on 2026-11-17.

**Interfaces:**
- Consumes `fetchForecast`, `searchLocations`, `HttpError`.
- Produces:
  - `freshness(timestamp: string, now: Date, maxAgeMs: number): 'fresh' | 'stale' | 'unknown'`. An unparseable timestamp gives `unknown`. Age above `maxAgeMs` gives `stale`.
  - `createTtlCache<T>(ttlMs: number, maxEntries: number): { get(key: string, nowMs: number): T | undefined; set(key: string, value: T, nowMs: number): void }`. At `maxEntries` it evicts the oldest inserted key, using Map insertion order.
  - `airQualityRouter(): express.Router` and `locationsRouter(): express.Router`. Each call creates its own cache, so every `createApp()` starts empty.

**Endpoints** (all under `/api/v1`):
- `GET /air-quality/forecast?latitude&longitude` → `{ data: ForecastSeries & { freshness } }`.
  - Coordinates are rounded to 2 decimals before fetching and keying the cache.
  - Cache TTL is 10 min with a maximum of 500 entries.
  - Freshness is computed at serve time from `retrievedAt` with a max age of 12 h (the model update cycle).
- `GET /air-quality/current?latitude&longitude` → validates the coordinates, then responds `503 DATA_UNAVAILABLE` with the message `'Official CPCB observations are not connected yet.'`.
- `GET /air-quality/sources` → `{ data: [...] }` with two entries:
  - **Open-Meteo:** `id`, `name`, `dataKind: 'model_forecast'`, `status: 'available'`, `url`, `licence: 'CC BY 4.0'`, `attribution`, `limitations`. The attribution names Open-Meteo.com and CAMS.
  - **CPCB:** `dataKind: 'official_observation'`, `status: 'unavailable'`, `url: 'https://app.cpcbccr.com/AQIIndia'`, and the limitation `'No verified machine-readable CPCB feed is connected; official observations are not shown.'`.
- `GET /locations/search?q` → `{ data: LocationResult[] }`. `q` is trimmed and must be 2–80 characters.

**Validation and limits:**
- Coordinate schema:
  - Each value must match `/^-?\d{1,3}(\.\d{1,10})?$/` before it becomes a number.
  - Latitude must be in [-90, 90] and longitude in [-180, 180].
  - Failure → `HttpError(400, 'VALIDATION_ERROR', 'Invalid query parameters.', issues)`, where `issues` is `[{ path, message }]`.
- Rate limit: 60 requests/min per IP. The response body is `{ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' } }`.

Steps:
- [ ] Write the failing unit tests:
  - Freshness:
    - exactly 12 h old → `fresh`
    - 12 h + 1 ms → `stale`
    - `'not-a-date'` → `unknown`
  - Cache:
    - an entry is read back before its TTL
    - an entry is gone at exactly the TTL
    - at `maxEntries = 2`, a third set evicts the first
- [ ] Write the failing route tests (Supertest, fetch stubbed with the Task 2 and 3 fixtures):
  - Forecast 200: body `data.dataKind === 'model_forecast'`, `data.freshness === 'fresh'`, and `data.units.PM2_5 === 'μg/m³'`.
  - Privacy: `latitude=18.519571&longitude=73.855347` → the fetch URL has `latitude=18.52&longitude=73.86`.
  - Cache: a second identical request and a nearby request (`18.5201`) both reuse the cache, so `fetch` is called once.
  - Each of these → 400 `VALIDATION_ERROR`:
    - `latitude=` (empty)
    - `latitude=abc`
    - `latitude=1e2`
    - `latitude=91`
    - a repeated `latitude`
    - missing `longitude`
  - Provider failure: fetch rejects → 502 `PROVIDER_ERROR` with no `data` key. A following request calls fetch again (failures are not cached).
  - `/current` with valid coordinates → 503 `DATA_UNAVAILABLE`. With bad coordinates → 400.
  - `/sources` → two entries, and the CPCB entry has `status: 'unavailable'`.
  - `/locations/search?q=Pune` → 200 with the mapped results.
  - `q=P` → 400. 81 characters → 400.
  - The 61st request to `/api/v1/air-quality/sources` within a minute → 429 `RATE_LIMITED` envelope.
- [ ] Run and confirm the failures.
- [ ] Implement:
  - `npm install express-rate-limit@8.7.2 -w server`.
  - Write `freshness`, `cache` and the two routers.
  - Wire them in `app.ts`.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run format:check`. Expect all green.
- [ ] Manual check: `npm run dev -w server`, then `curl "localhost:8080/api/v1/air-quality/forecast?latitude=18.52&longitude=73.86"`. Expect real values with `dataKind: model_forecast`. Record the output in the task report and do not commit it.
- [ ] Commit `feat(server): add air-quality and location routes with cache and rate limit`.

### Task 5: CPCB OGD spike (research only, 1 h time-box) and docs

**Files:**
- Modify:
  - `docs/IMPLEMENTATION_PLAN.md`: §5.2 CPCB row with the spike result; Phase 2 "As built" note; §3.2 #2; §8 env table; Phase 9 tasks
  - `API.md` §3: forecast example → `ForecastSeries`, labelled illustrative; add `/locations/search`; `/sources` shape
  - `SETUP.md` §6: drop the env vars that became constants
  - `INTEGRATIONS.md` §6: Open-Meteo geocoding selected, India-only
  - `CHANGELOG.md`

Steps:
- [ ] Spike, with no API key and no scraping. Read the data.gov.in resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` page and its API docs. Record five things:
  - licence (GODL?)
  - update cadence
  - whether `min/max/avg_value` are concentrations or sub-indices
  - whether an AQI value is published
  - the key requirement

  Outcome:
  - **Viable:** it becomes a follow-up task that needs `DATA_GOV_IN_API_KEY` (D4) and your approval.
  - **Not viable:** `/current` stays `DATA_UNAVAILABLE` and the reason is written in §5.2.
- [ ] Make the doc edits listed above.
  - Phase 9 gains: `app.set('trust proxy', 1)` on Cloud Run, so the rate limiter sees client IPs instead of one shared proxy IP.
- [ ] Full gate: `npm ci && npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`. Also check `git count-objects -vH`.
- [ ] Commit `docs: record phase 2 contracts and CPCB spike result`.
