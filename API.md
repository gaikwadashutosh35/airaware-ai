# AirAware AI — API Endpoints and Contracts

## 1. Conventions

- Base path: `/api/v1`.
- All `/api/v1` routes share a rate limit of 60 requests per minute per IP. Requests over the limit get `429 RATE_LIMITED`.
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
    details?: unknown;
  };
}

type DataKind = 'official_observation' | 'model_forecast' | 'demo' | 'satellite_detection';

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
{ "status": "ok", "version": "0.1.0" }
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
- `weather` is this hour's Open-Meteo weather forecast (`https://api.open-meteo.com/v1/forecast`, the same rounded coordinates, cached for 10 minutes). The server fetches it alongside the air forecast. It is `null` when that call fails or returns no hour containing the request time, and the air forecast never fails because of it.
  - It also asks for `past_days=1`, `forecast_days=2` and daily values, so `weather.days` holds yesterday, today and tomorrow (the place's own local dates, from `utc_offset_seconds`). Each `atHour` is the same local hour as the request time on that day. Yesterday is past model data, not a station measurement. A value the provider leaves out is `null`; nothing is filled in.
  - `atHour` also carries feels like, humidity and wind (`apparent_temperature`, `relative_humidity_2m`, `wind_speed_10m` in km/h, `wind_direction_10m`), and each day its highest chance of rain (`precipitation_probability_max`). A chance is a forecast, so yesterday's `rainChancePct` is always `null`. These five fields are optional: an older server leaves them out, and clients show them as missing.

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

// One local day of Open-Meteo model weather. `atHour` is the same local hour
// as the request time on that day.
interface WeatherDay {
  day: 'yesterday' | 'today' | 'tomorrow';
  date: string; // the place's local date, YYYY-MM-DD
  minC: number | null;
  maxC: number | null;
  precipitationMm: number | null;
  rainChancePct?: number | null; // the day's highest chance of rain, %; always null for yesterday
  atHour: {
    time: string;
    temperatureC: number | null;
    cloudCoverPct: number | null;
    feelsLikeC?: number | null; // apparent temperature
    humidityPct?: number | null; // relative humidity
    windKmh?: number | null; // wind speed at 10 m
    windFromDeg?: number | null; // direction the wind comes from
  };
}

// Open-Meteo weather forecast for the hour containing the request time.
interface WeatherNow {
  time: string;
  temperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbability: number | null;
  cloudCoverPercent: number | null;
  visibilityM: number | null;
  isDay: boolean | null; // Open-Meteo is_day for this hour
  retrievedAt: string;
  utcOffsetSeconds: number; // the place's offset from UTC, to show hours in its own time
  days: WeatherDay[]; // yesterday, today, tomorrow, in that order
}

// What `data` holds.
interface ForecastData extends ForecastSeries {
  airCheck: AirAssessment;
  weather: WeatherNow | null; // null when the weather provider fails or has no current hour
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
    "freshness": "unknown",
    "airCheck": {
      "level": "unknown",
      "windowStart": null,
      "checks": [
        { "pollutant": "PM2_5", "status": "unknown", "average24h": null, "limit": 60 },
        { "pollutant": "PM10", "status": "unknown", "average24h": null, "limit": 100 }
      ]
    }
  }
}
```

(This one-hour example is too short for a 24-hour window, so its check is `unknown`. A full 48-hour forecast gives, for example, `"level": "elevated"` with `"average24h": 72.4` for PM2.5.)

Provider failure (network, timeout, non-2xx, malformed response) returns `502 PROVIDER_ERROR` with no `data`. It never falls back to demo or stale data.

### `GET /api/v1/air-quality/sources`

Returns configured provider names, source descriptions, licence/attribution, and limitations. Do not expose secret configuration.

Response: `{ "data": [{ "id", "name", "dataKind", "status": "available" | "unavailable", "url", "licence"?, "attribution"?, "limitations" }] }`. It currently lists:
- Open-Meteo (`available`, CC BY 4.0, with the Open-Meteo + CAMS attribution)
- CPCB (`unavailable`)
- Open-Meteo weather (`open-meteo-weather`, `available`, CC BY 4.0)

### `GET /api/v1/locations/search?q=...`

Searches places in India (Open-Meteo Geocoding, `countryCode=IN`, up to 5 results). `q` is trimmed and must be 2–80 characters. No match returns `{ "data": [] }`. A provider failure returns `502 PROVIDER_ERROR`.

Response (illustrative):
```json
{ "data": [{ "id": 1259229, "name": "Pune", "admin1": "Maharashtra", "country": "India", "latitude": 18.51957, "longitude": 73.85535, "timezone": "Asia/Kolkata" }] }
```

### `GET /api/v1/locations/reverse?latitude=...&longitude=...`

The town or city name for a device location (owner, 27 Nov), from Google Maps Geocoding (`result_type=locality`, English). Coordinates follow the forecast's rules: at most 2 decimals, so nothing more precise than about 1 km reaches Google. The response is `Cache-Control: no-store` and nothing is cached or stored on the server.

Response: `{ "data": { "name": "Pune" } }`. `name` is `null` when `GOOGLE_MAPS_API_KEY` is unset, Google finds no locality, or Google fails; the call itself never fails for those. Clients show the name only beside a "Google Maps" credit, and never save it or send it on with a plan or question.

### `GET /api/v1/fires/nearby?latitude=...&longitude=...`

Fire hotspots near a place from NASA FIRMS (owner, 27 Nov): VIIRS near-real-time detections from NOAA-20 and NOAA-21, within 50 km and the last 24 hours, low-confidence detections left out. Coordinates follow the forecast's rules (at most 2 decimals). The server asks FIRMS for a box around the place and caches the answer for 30 minutes per place. Data kind `satellite_detection`: never an air-quality reading.

Response `data` is a `FireSummary`:
- `{ "status": "not_configured" }` when `FIRMS_MAP_KEY` is unset (clients hide the card);
- `{ "status": "unavailable" }` when either satellite's request fails or FIRMS answers with something other than its CSV (never a partial count; not cached);
- `{ "status": "available", "dataKind": "satellite_detection", "count": 3, "nearestKm": 12.4, "latestAt": "2026-11-27T09:04:00.000Z", "radiusKm": 50, "windowHours": 24, "retrievedAt": "…", "provider": "NASA FIRMS", "sourceUrl": "https://firms.modaps.eosdis.nasa.gov/", "limitations": […] }`. `nearestKm` and `latestAt` are `null` when `count` is 0.

`GET /api/v1/air-quality/sources` lists NASA FIRMS (`nasa-firms`, `satellite_detection`), `available` only when the key is set.

### `GET /api/v1/recommendations/guides?topic=home|habits`

Public. Returns the guide library for My Home (`home`) or Better Habits (`habits`): general cards with neutral reasons and cited sources, grouped as the page shows them. The wording is fixed by `docs/superpowers/specs/2026-11-20-guide-library.md`. It calls no AI, so it does not count against the daily plan's 10-per-minute limit (only the shared 60 per minute). It changes only on deploy, so it is sent with `Cache-Control: public, max-age=3600`. A missing, unknown or extra parameter returns `400 VALIDATION_ERROR`.

Response (shortened):
```json
{ "data": { "topic": "habits", "groups": [{ "id": "waste", "heading": "Waste", "cards": [{ "id": "guide.no-open-burning", "personalRuleId": "swap.no-open-burning", "section": "swap", "priority": "medium", "title": "Don't burn waste or leaves", "text": "…", "reason": "…", "evidenceType": "general_suggestion", "sourceIds": ["swm-rules-2026", "mohfw-air-advisory-2025"], "inputsUsed": [] }] }], "sources": [{ "id": "swm-rules-2026", "name": "Solid Waste Management Rules, 2026 (Gazette of India)", "url": "https://static.pib.gov.in/…" }], "safetyNote": "General information only, not medical advice. Follow local public-health advisories." } }
```

`personalRuleId` names the rule that gives the same advice personally; My Home hides the guide card when today's plan shows that rule (Better Habits shows the guides only). Guide cards never enter a daily plan.

### `POST /api/v1/recommendations/daily-plan`

Public, rate-limited; no sign-in. Returns a daily plan for one place and optional household details. Gemini picks, orders and times the rules' recommendation candidates and adds a summary and one "for you" line per featured action; every advice text, reason, caveat and source stays the rules' own wording. Without an AI writer, or when Gemini and then the Claude backup (when its key is set) both give no accepted answer, the same request returns a complete rules-only plan.

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
- An Open-Meteo failure gives `air.level` `unknown`, `forecast` `null` and the "Air information unavailable" notice. It never falls back to demo or stale data.
- AI plans and full rules-only plans (no AI writer configured) are cached for 10 minutes by coordinates, label, household details and the forecast window. Fallback plans (every AI writer or the forecast failed) are not cached, so the next request tries again.

Response (illustrative, shortened):
```json
{
  "data": {
    "generatedBy": "ai",
    "model": "gemini-3.8-flash",
    "promptVersion": "daily-plan-v3",
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

### `POST /api/v1/assistant/answer`

Public, rate-limited endpoint behind Ask AirAware (Phase 7). Answers one question or one topic for one place, from the same forecast check, rules and guide cards as the daily plan. It is one question and one answer. The server keeps no conversation: the client may send up to 2 earlier questions with a new one (`history`), and nothing is stored.

Request (illustrative), with exactly one of `question` or `topic`:
```json
{
  "question": "What should I consider before a morning walk today?",
  "history": [{ "question": "Is it okay to run the fan today?", "cardIds": ["guide.fans-and-ac"] }],
  "place": { "label": "Pune, Maharashtra", "latitude": 18.52, "longitude": 73.86 },
  "householdContext": { "routine": { "outdoorExercise": true } }
}
```

**Request handling:**
- `question`: trimmed, 1–200 characters. The server first matches it against fixed word lists: `medical` (checked first) gets the fixed reply and no AI call. Any other typed question goes to Claude (see Behaviour). It is never logged, stored, cached by its text or sent to Gemini.
- `history` (optional, only with `question`): up to 2 earlier questions from this visit, each `{ question, cardIds }` (question 1–200 characters; at most 3 card ids of 1–60 characters). The server re-checks each earlier question for medical words and drops those. No answer text is accepted or sent: Claude gets only the earlier questions and the titles of the cards shown for them. The server stores nothing between requests.
- `topic`: one of `outdoors`, `windows`, `indoor`, `family`, `commuting`, `habits` (the topic chips).
- Both or neither of `question` and `topic` → `400 VALIDATION_ERROR`.
- `place` and `householdContext`: the same rules as the daily plan (label 1–120 characters with no control characters, coordinates with at most 2 decimal places).
- Unknown fields → `400`. Malformed JSON → `400` "Malformed JSON body.". A body over 4 KB → `413 PAYLOAD_TOO_LARGE`.
- Rate limit: it shares the daily plan's 10 requests per minute per IP (one counter for every route that can call the AI), on top of the 60 per minute on all of `/api/v1`. Over the limit → `429 RATE_LIMITED`.

**Behaviour:**
- Returns 200 for every valid request, whatever happens to the AI or Open-Meteo. An Open-Meteo failure gives `air.level` `unknown`, `forecast` `null` and the "Air information unavailable" notice.
- Typed question the medical word list does not flag: Claude Haiku (`CLAUDE_MODEL`, default `claude-haiku-5-5`) gets the question, the earlier questions, the 24-hour check, the text of the cards the rules allow for this household, and the forecast's provider, data kind and limitations. It never gets the place name, coordinates, raw household answers, timestamps or source ids. It returns `scope`, `answer`, `topic` and 0–3 `cardIds`; it writes no card text and no sources. The answer becomes `summary` with `generatedBy` `"ai"`, `topic` is Claude's, and `cards` are the chosen ones. It must be 20–300 characters, use card ids from the cards sent, quote numbers only from the check, the cards and the forecast, avoid the banned wording and give no yes or no on safety. `out_of_scope` gives the fixed out-of-scope reply.
- Claude fails (error, timeout, refusal, a failed check, or the cap of 200 Claude Ask calls per UTC day per server instance): the rules' answer for the keyword topic, `summary` `null`, `generatedBy` `"rules"`, with no retry and no Gemini call. Without `ANTHROPIC_API_KEY` a typed question takes the topic path below. The 10-per-minute limiter is shared.
- `medical`: no AI call. `out_of_scope` (the keyword lists' or Claude's): the fixed reply. Neither shows cards, and a topic chip or follow-up re-ask never calls Claude; the air check, notices, sources and safety note are still returned. The client shows the fixed medical or out-of-scope reply.
- A topic chip, a follow-up re-ask, or a typed question on the rules' topic path: up to three cards, the household's own rules for that topic first (most important first), then general guide cards. A guide is never shown beside its personal twin, and the busy-road and kitchen-exhaust guides follow the same hide rules as My Home.
- On that path the 1–2 sentence `summary` comes from the daily plan's writer (prompt `daily-plan-v3`), so Ask and the daily plan share one daily AI budget and one 10-minute answers cache. A summary that reads as a yes or no on safety, or fails the plan's own checks, is dropped: `generatedBy` is then `"rules"` and `summary` `null`.
- `followUps` (guided chat, 21 Nov): the topic's unanswered household questions whose answers would change this answer's cards today. Today's air and the three-card cap both count.
  - Each item is `{ field, changes }`. `field` is a My Profile field id. `changes` lists the answers that would change the cards: `"yes"`/`"no"` for a Yes/No question, else the option value.
  - Items come in a fixed order per topic, worked out from the rules only, with no AI call.
  - `[]` for `medical` and `out_of_scope`, and for a Claude answer that chose no cards.
  - "May be more sensitive" is never offered.

Response (illustrative, shortened):
```json
{
  "data": {
    "topic": "outdoors",
    "summary": "Particle levels are forecast above the national limit, so plan indoor exercise today.",
    "generatedBy": "ai",
    "cards": [{ "id": "exercise.indoor-alternative", "section": "action", "priority": "high", "title": "…", "text": "…", "reason": "…", "evidenceType": "data_driven_rule", "sourceIds": ["open-meteo", "cpcb-naaqs-2009"], "inputsUsed": ["routine.outdoorExercise", "air.level"], "caveat": "…" }],
    "air": { "level": "elevated", "windowStart": "2026-11-18T10:00:00.000Z", "checks": [] },
    "forecast": { "provider": "Open-Meteo", "dataKind": "model_forecast", "retrievedAt": "2026-11-18T10:05:00.000Z", "…": "…" },
    "notices": [{ "id": "air.elevated", "section": "notice", "…": "…" }],
    "sources": [{ "id": "open-meteo", "name": "Open-Meteo Air Quality API", "url": "https://open-meteo.com/en/docs/air-quality-api" }],
    "safetyNote": "General information only, not medical advice. Follow local public-health advisories.",
    "followUps": [{ "field": "routine.outdoorExercise", "changes": ["yes"] }, { "field": "routine.commuteMode", "changes": ["walk", "cycle", "two_wheeler"] }]
  }
}
```

A guide card also carries `personalRuleId`, as in the guides route. The response shape is the same on every path. It has no `question`, `model` or `promptVersion` field.

### Saved data (as built, Phase 6)

Every route below needs `Authorization: Bearer <Supabase access token>`. The token comes from a one-click anonymous Supabase sign-in in the browser (no email). The server verifies it (`getClaims`), takes the user from its `sub` claim, and queries Supabase as that user, so Postgres row-level security applies as well. No route reads a user id from the body, query or path. JSON bodies are limited to 4 KB.

| Route | Body / params | Success |
|---|---|---|
| `GET /api/v1/profile/preferences` | none | `200 { data: { context: HouseholdContext, place: SavedPlace \| null, updatedAt } \| null }` |
| `PUT /api/v1/profile/preferences` | `{ context?: HouseholdContext, place?: SavedPlace \| null }`, at least one (unknown fields → 400) | `200 { data: { context, place, updatedAt } }` |
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
- **Preferences `PUT`** changes only the fields it sends. Omitted fields keep their saved values, and `place: null` forgets the place.
- **`SavedPlace`** is `{ label, latitude, longitude }`, with the same rules as the daily-plan place:
  - the label is up to 120 characters, with no control characters;
  - coordinates have at most 2 decimals.

  The client saves only a searched place, never a device location (D2).

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
  sourceIds: SourceReferenceId[]; // 'open-meteo', 'cpcb-naaqs-2009' or a guide-library source (shared/contracts.ts)
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
  sources: Array<{ id: SourceReferenceId; name: string; url: string }>;
  safetyNote: string;
}
```

## 5. Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request |
| 401 | `UNAUTHENTICATED` | Missing/invalid token |
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
