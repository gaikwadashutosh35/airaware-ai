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

Authenticated or rate-limited demo endpoint.

Request:
```json
{
  "locationLabel": "Pune",
  "householdContext": {
    "routine": { "commuteMode": "two_wheeler", "outdoorExercise": true },
    "home": { "nearBusyRoad": true, "kitchenExhaust": true },
    "householdNeeds": { "includesChildren": true },
    "language": "en"
  },
  "snapshotIds": ["server-side-reference-id"]
}
```

Do not accept an arbitrary client-supplied pollutant value as authoritative context. Prefer server-resolved snapshot IDs or retrieve data server-side.

Response:
```json
{
  "data": {
    "summary": "Review today's local conditions before strenuous outdoor activity.",
    "dataContext": {
      "provider": "provider-name",
      "dataKind": "model_forecast",
      "timestamp": "2026-11-17T08:00:00Z",
      "limitations": []
    },
    "actions": [],
    "indoorSuggestions": [],
    "sustainableSwaps": [],
    "assumptions": [],
    "safetyNote": "General information only; follow local advisories."
  }
}
```

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

### `GET /api/v1/profile`

Returns current authenticated user's profile and saved preferences.

### `PUT /api/v1/profile/preferences`

Updates only the current user's optional household preferences. Reject unknown fields and coordinate persistence unless explicit saved-location consent exists.

### `GET /api/v1/plans`

Lists current user's saved plans, paginated.

### `POST /api/v1/plans`

Saves a validated plan and the environmental data context used to create it.

### `DELETE /api/v1/plans/:id`

Deletes a plan only if it belongs to the authenticated user.

## 4. Daily plan schema

```ts
interface DailyActionPlan {
  summary: string;
  dataContext: {
    provider: string;
    dataKind: DataKind;
    timestamp: string;
    limitations: string[];
  };
  actions: Array<{
    period: 'morning' | 'commute' | 'daytime' | 'evening' | 'home';
    title: string;
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    evidenceType: 'official_guidance' | 'data_driven_rule' | 'general_suggestion';
    sourceReferences: string[];
    confidence: 'high' | 'medium' | 'low';
  }>;
  indoorSuggestions: Array<{ title: string; action: string; reason: string; caveat?: string }>;
  sustainableSwaps: Array<{ currentHabit: string; alternative: string; practicalBenefit: string }>;
  assumptions: string[];
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
| 413 | `PAYLOAD_TOO_LARGE` | Request limit exceeded |
| 429 | `RATE_LIMITED` | Request limit reached |
| 502 | `PROVIDER_ERROR` | External provider failed |
| 503 | `DATA_UNAVAILABLE` | No valid source data available |
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
