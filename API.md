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

Response:
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

Returns model-based forecast and the provider/model metadata.

Response:
```json
{
  "data": {
    "locationLabel": "Example area",
    "provider": "Open-Meteo",
    "dataKind": "model_forecast",
    "retrievedAt": "2026-11-17T08:30:00Z",
    "forecastFor": "2026-11-17T12:00:00Z",
    "modelResolution": "Provider-documented resolution for selected domain",
    "pollutants": [],
    "freshness": "fresh",
    "limitations": ["Model forecast; not a station observation"]
  }
}
```

### `GET /api/v1/air-quality/sources`

Returns configured provider names, source descriptions, and limitations. Do not expose secret configuration.

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
