# AirAware AI — API Endpoints and Contracts

## 1. Conventions

- Base path: `/api/v1` (recommended).
- JSON over HTTPS.
- ISO-8601 UTC timestamps.
- Validate all inputs using Zod.
- Use a consistent error envelope.
- Require Supabase bearer JWT on user-specific routes.
- Derive user ID from verified claims; never trust a client-supplied owner ID.
- All environmental values include provider and provenance.

## 2. Common response types

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

type DataKind = 'official_observation' | 'model_forecast' | 'demo';

interface PollutantReading {
  pollutant: 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';
  value: number;
  unit: string;
  timestamp: string;
}

interface AirQualitySnapshot {
  locationLabel: string;
  provider: string;
  sourceUrl: string;
  dataKind: DataKind;
  retrievedAt: string;
  observedAt?: string;
  forecastFor?: string;
  stationName?: string;
  modelResolution?: string;
  pollutants: PollutantReading[];
  freshness: 'fresh' | 'stale' | 'unknown';
  limitations: string[];
  nationalAqi?: {
    value: number;
    category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
    methodology: 'CPCB';
  };
}
```

## 3. Endpoints

### `GET /api/v1/health`

Public liveness endpoint.

Response:
```json
{ "status": "ok", "version": "1.0.0" }
```

Do not return secrets, connection strings, or detailed infrastructure topology.

### `GET /api/v1/air-quality/current?latitude=...&longitude=...`

Returns available current observation data. The endpoint must not quietly return a forecast while labelling it current official observation.

**Current status:** no verified CPCB feed is connected, so after coordinate validation this endpoint always returns `503 DATA_UNAVAILABLE` ("Official CPCB observations are not connected yet."). The shape below is the target once a feed is verified.

Target response:
```json
{
  "data": {
    "locationLabel": "Example area",
    "provider": "CPCB",
    "sourceUrl": "https://app.cpcbccr.com/AQIIndia",
    "dataKind": "official_observation",
    "retrievedAt": "2026-11-17T08:30:00Z",
    "observedAt": "2026-11-17T08:00:00Z",
    "stationName": "Example station",
    "pollutants": [],
    "freshness": "fresh",
    "limitations": []
  }
}
```

Example values are illustrative only; production must not return fabricated data.

### `GET /api/v1/air-quality/forecast?latitude=...&longitude=...`

Returns an hourly model forecast (48 hours from the current hour) and the provider/model metadata.

**Request handling:**
- `latitude` and `longitude` must be in range and be plain decimals with **at most 2 decimal places** (~1.1 km; the model grid is ~45 km). Anything else returns `400 VALIDATION_ERROR`.
- Clients round before sending, so a precise location never appears in request logs or reaches Open-Meteo.
- The server keeps forecasts in a 10-minute cache.

**Response shape:**
- `units` comes from the provider response.
- A pollutant the model does not return is omitted and named in `limitations`.
- Missing hourly values are `null`.
- There is never an AQI field.
- `airCheck` is the server's own 24-hour check, the same one the daily plan uses (`AirAssessment`, below the daily-plan section). It compares the PM2.5 and PM10 model-forecast averages over the 24 hours from the current UTC hour with India's NAAQS 24-hour limits.
  - Its `level` is `unknown` when the forecast has no complete 24-hour window.
  - Clients show it as given and never derive limits themselves.

```ts
type Pollutant = 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';

interface ForecastSeries {
  provider: 'Open-Meteo';
  sourceUrl: string;
  dataKind: 'model_forecast';
  modelResolution: string;
  retrievedAt: string;
  freshness: 'unknown'; // Open-Meteo does not report the model run time; see retrievedAt
  units: Partial<Record<Pollutant, string>>;
  hours: Array<{ time: string; values: Partial<Record<Pollutant, number | null>> }>;
  limitations: string[];
}

// What `data` holds.
interface ForecastData extends ForecastSeries {
  airCheck: AirAssessment;
}
```

Response (illustrative values):
```json
{
  "data": {
    "provider": "Open-Meteo",
    "sourceUrl": "https://open-meteo.com/en/docs/air-quality-api",
    "dataKind": "model_forecast",
    "modelResolution": "CAMS global atmospheric composition forecast, 0.4° (~45 km) grid",
    "retrievedAt": "2026-11-17T17:05:00.000Z",
    "units": { "PM2_5": "μg/m³", "PM10": "μg/m³" },
    "hours": [{ "time": "2026-11-17T17:00:00.000Z", "values": { "PM2_5": 48, "PM10": 52.4 } }],
    "limitations": ["Model forecast, not a station observation.", "Not the CPCB National AQI."],
    "freshness": "unknown"
  }
}
```

Provider failure (network, timeout, non-2xx, malformed response) returns `502 PROVIDER_ERROR` with no `data`. It never falls back to demo or stale data.

### `GET /api/v1/air-quality/sources`

Returns configured provider names, source descriptions, licence/attribution, and limitations. Do not expose secret configuration.

Response: `{ "data": [{ "id", "name", "dataKind", "status": "available" | "unavailable", "url", "licence"?, "attribution"?, "limitations" }] }`. It currently lists:
- Open-Meteo (`available`, CC BY 4.0, with the Open-Meteo + CAMS attribution)
- CPCB (`unavailable`)

### `GET /api/v1/locations/search?q=...`

Searches places in India (Open-Meteo Geocoding, `countryCode=IN`, up to 5 results). `q` is trimmed and must be 2–80 characters. No match returns `{ "data": [] }`.

Response (illustrative):
```json
{ "data": [{ "id": 1259229, "name": "Pune", "admin1": "Maharashtra", "country": "India", "latitude": 18.51957, "longitude": 73.85535, "timezone": "Asia/Kolkata" }] }
```

All `/api/v1` routes share a rate limit of 60 requests per minute per IP. Requests over the limit get `429 RATE_LIMITED`.

### `POST /api/v1/recommendations/daily-plan`

Public, rate-limited endpoint (no sign-in until Phase 6). Returns a daily plan for one place and optional household details. Gemini picks, orders and times the rules' recommendation candidates and adds a summary and one "for you" line per featured action; every advice text, reason, caveat and source stays the rules' own wording. Without Gemini, or when Gemini fails or its answer fails a check, the same request returns a complete rules-only plan.

Request (illustrative):
```json
{
  "place": { "label": "Pune, Maharashtra", "latitude": 18.52, "longitude": 73.86 },
  "householdContext": { "routine": { "commuteMode": "two_wheeler" } }
}
```

**Request handling:**
- `place.label`: trimmed, 1–120 characters. Echoed back in `place.label`; never sent to Gemini.
- `latitude`/`longitude`: JSON numbers in range with **at most 2 decimal places**, the same privacy rule as the forecast endpoint. More decimals → `400 VALIDATION_ERROR`.
- `householdContext`: optional; every field optional (see `HouseholdContext` in `shared/contracts.ts`). Missing → `{}`.
- Unknown fields → `400 VALIDATION_ERROR`. Malformed JSON → `400 VALIDATION_ERROR` "Malformed JSON body.". A body over 4 KB → `413 PAYLOAD_TOO_LARGE`.
- Rate limit: 10 requests per minute per IP on this route, on top of the 60 per minute on all of `/api/v1`. Over the limit → `429 RATE_LIMITED`.
- The client never sends pollutant values: the server fetches the forecast itself (through the same 10-minute cache as the forecast endpoint).

**Behaviour:**
- Returns 200 for every valid request, whatever happens to Gemini or Open-Meteo.
- An Open-Meteo failure gives `air.level` `unknown`, `forecast` `null` and the "Live air information unavailable" notice. It never falls back to demo or stale data.
- AI plans and full rules-only plans (Gemini not configured) are cached for 10 minutes by coordinates, label, household details and the forecast window. Fallback plans (Gemini or the forecast failed) are not cached, so the next request tries again.

Response (illustrative, shortened):
```json
{
  "data": {
    "generatedBy": "ai",
    "model": "gemini-3.8-flash",
    "promptVersion": "daily-plan-v1",
    "summary": "Particle levels are forecast above the national limit, so plan indoor exercise and a quieter commute.",
    "place": { "label": "Pune, Maharashtra" },
    "air": { "level": "elevated", "windowStart": "2026-11-18T10:00:00.000Z", "checks": [] },
    "forecast": { "provider": "Open-Meteo", "sourceUrl": "https://open-meteo.com/en/docs/air-quality-api", "dataKind": "model_forecast", "modelResolution": "…", "retrievedAt": "2026-11-18T10:05:00.000Z", "limitations": [] },
    "notices": [{ "id": "air.elevated", "section": "notice", "priority": "high", "title": "…", "text": "…", "reason": "…", "evidenceType": "data_driven_rule", "sourceIds": ["open-meteo", "cpcb-naaqs-2009"], "inputsUsed": [], "caveat": "…" }],
    "featured": [{ "candidate": { "id": "commute.lower-traffic", "…": "…" }, "period": "commute", "forYou": "…" }],
    "more": [],
    "sources": [{ "id": "open-meteo", "name": "Open-Meteo Air Quality API", "url": "https://open-meteo.com/en/docs/air-quality-api" }],
    "safetyNote": "General information only, not medical advice. Follow local public-health advisories."
  }
}
```

- AI plan: `featured` in Gemini's order with its `period` and `forYou`; `more` lists the other actions in rules order.
- Rules-only plan: `generatedBy` `"rules"`; `model`, `promptVersion` and `summary` are `null`; `featured` lists every action in rules order with `period` and `forYou` `null`; `more` is empty.
- `notices` always holds every notice; the air notice carries the model-forecast caveat.

### `POST /api/v1/assistant/chat`

Request:
```json
{
  "message": "How should I plan my morning walk?",
  "locationLabel": "Pune",
  "planId": null
}
```

Bound message length and conversation context. AI must not invent readings or give diagnosis/medication advice.

### Saved data (as built, Phase 6)

Every route below needs `Authorization: Bearer <Supabase access token>`. The token comes from a one-click anonymous Supabase sign-in in the browser (no email). The server verifies it (`getClaims`), takes the user from its `sub` claim, and queries Supabase as that user, so Postgres row-level security applies as well. No route reads a user id from the body, query or path. JSON bodies are limited to 4 KB.

| Route | Body / params | Success |
|---|---|---|
| `GET /api/v1/profile/preferences` | none | `200 { data: { context: HouseholdContext, updatedAt } \| null }` |
| `PUT /api/v1/profile/preferences` | `HouseholdContext` (unknown fields → 400) | `200 { data: { context, updatedAt } }` |
| `GET /api/v1/plans` | none | `200 { data: [{ id, savedAt, placeLabel }] }`, newest first |
| `GET /api/v1/plans/:id` | `id` uuid | `200 { data: { id, savedAt, plan: DailyPlan } }` |
| `POST /api/v1/plans` | the daily-plan request body | `201 { data: { id, savedAt, plan } }` |
| `DELETE /api/v1/plans/:id` | `id` uuid | `204` |
| `DELETE /api/v1/account` | none | `204`; deletes the user and all their rows |

- `POST /api/v1/plans` takes the same `{ place, householdContext? }` body as `POST /api/v1/recommendations/daily-plan`. The server builds the plan itself, using the same 10-minute cache, and saves that plan; it never accepts a plan from the client. It shares the daily plan's 10-per-minute limit, because it can call Gemini.
- A saved plan is a snapshot from `savedAt`. It is never current air information.
- At most 20 plans per user (the database enforces it) → `409 LIMIT_REACHED`.
- A missing plan and another user's plan both get `404 NOT_FOUND` "Saved plan not found." A non-uuid `id` gets 400.
- A missing or invalid token → `401 UNAUTHENTICATED`. Saving not configured, or Supabase unreachable → `503 SAVE_UNAVAILABLE`.
- A stored preferences row that no longer matches the household schema reads back as `null`.

Not built: profiles, saved locations and plan feedback (P1).

## 4. Daily plan schema

The source of truth is `shared/contracts.ts` (`DailyPlan`, `RecommendationCandidate`, `AirAssessment`).

```ts
type PlanPeriod = 'morning' | 'commute' | 'daytime' | 'evening' | 'home';

interface RecommendationCandidate {
  id: string;
  section: 'notice' | 'action' | 'indoor' | 'swap';
  priority: 'high' | 'medium' | 'low';
  title: string;
  text: string;
  reason: string;
  evidenceType: 'data_driven_rule' | 'general_suggestion';
  sourceIds: Array<'open-meteo' | 'cpcb-naaqs-2009'>;
  inputsUsed: string[];
  caveat?: string;
}

interface DailyPlan {
  generatedBy: 'ai' | 'rules';
  model: string | null;
  promptVersion: string | null;
  summary: string | null;
  place: { label: string };
  air: {
    level: 'elevated' | 'not_elevated' | 'unknown';
    windowStart: string | null; // UTC start of the 24-hour window checked
    checks: Array<{
      pollutant: 'PM2_5' | 'PM10';
      status: 'above_limit' | 'within_limit' | 'unknown';
      average24h: number | null;
      limit: number; // India's NAAQS 24-hour limit, μg/m³
    }>;
  };
  forecast: {
    provider: 'Open-Meteo';
    sourceUrl: string;
    dataKind: 'model_forecast';
    modelResolution: string;
    retrievedAt: string;
    limitations: string[];
  } | null;
  notices: RecommendationCandidate[];
  featured: Array<{ candidate: RecommendationCandidate; period: PlanPeriod | null; forYou: string | null }>;
  more: RecommendationCandidate[];
  sources: Array<{ id: 'open-meteo' | 'cpcb-naaqs-2009'; name: string; url: string }>;
  safetyNote: string;
}
```

## 5. Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request |
| 401 | `UNAUTHENTICATED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Authenticated but not authorized |
| 404 | `NOT_FOUND` | Resource not found or not accessible |
| 409 | `LIMIT_REACHED` | 20 saved plans already; delete one first |
| 413 | `PAYLOAD_TOO_LARGE` | Request limit exceeded |
| 429 | `RATE_LIMITED` | Request limit reached |
| 502 | `PROVIDER_ERROR` | External provider failed |
| 503 | `DATA_UNAVAILABLE` | No valid source data available |
| 503 | `SAVE_UNAVAILABLE` | Saving is not configured, or Supabase could not be reached |
| 500 | `INTERNAL_ERROR` | Unexpected error |

Do not return stack traces or provider secrets.

## 6. API acceptance criteria

- Zod validates every query, param, and body.
- Data kinds and source metadata survive all transformations.
- No forecast-to-observation fallback relabelling.
- User ID comes from verified claims.
- Ownership checks cover saved plans and child records.
- Rate limits and request-size caps apply.
- Examples in docs are labelled illustrative.
