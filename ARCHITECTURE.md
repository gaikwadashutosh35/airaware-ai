# AirAware AI — Technical Architecture

## 1. Architecture goals

- Separate data acquisition, recommendation rules, AI explanation, persistence, and presentation.
- Preserve environmental data provenance end-to-end.
- Keep deterministic rules authoritative for thresholds and validation.
- Keep provider credentials server-side.
- Support provider replacement without rewriting application logic.
- Remain small and maintainable for the Hack2Skills repository limit.

## 2. Stack in use

| Layer | Technology |
|---|---|
| Web client | React, Vite, TypeScript |
| Styling/components | Tailwind CSS v4, Lucide React icons, native HTML elements (no component kit) |
| Charts | Hand-drawn SVG (`ForecastChart.tsx`), no chart library |
| Motion | CSS only, respecting reduced motion (no motion library) |
| API | Node.js, Express, TypeScript |
| Schemas | Zod |
| Database/auth | Supabase PostgreSQL, Supabase Auth |
| AI | Gemini (REST via `fetch`), with an optional Claude backup (`@anthropic-ai/sdk`); the fixed rules' plan when neither gives an accepted answer |
| Air data | Open-Meteo Air Quality API (CAMS global model forecast), Open-Meteo geocoding, and the Open-Meteo weather forecast for Today's weather line and backdrop; CPCB observations not connected (no verified permitted feed); no demo adapter |
| Tests | Vitest, Testing Library, Supertest, Playwright, axe-core |
| Quality | oxlint (type-aware), Prettier, TypeScript, CodeQL, SonarQube Cloud |
| Hosting | Netlify — CDN for the built client, one Function running the Express API (ADR-006) |

## 3. Repository structure

```text
airaware-ai/
├── client/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── location/
│   │   │   ├── air-quality/
│   │   │   ├── daily-plan/
│   │   │   ├── indoor-air/
│   │   │   ├── sustainable-swaps/
│   │   │   └── assistant/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── lib/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── air-data/
│   │   │   ├── recommendations/
│   │   │   └── ai/
│   │   ├── repositories/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── supabase/
│   └── migrations/
├── docs/
├── .github/
│   └── workflows/
├── .gitignore
└── README.md
```

## 4. Architectural layers

### Client

Responsible for navigation, forms, display, local UI state, accessibility, and calling typed API services. It must not calculate official AQI or call private AI keys directly.

**Paths:** there is no router library. `App.tsx` switches on the path that `lib/navigation.ts` provides (`usePath`, `navigate`, `appPage`).
- `/` is the landing page; `/privacy` is the privacy page.
- Every `/app/*` path renders `AppShell`:
  - `/app` is Today;
  - `/app/ask`, `/app/home`, `/app/habits` and `/app/welcome` are the redesign pages, built in later phases;
  - `/app/profile` is My Profile.
- `AppShell` holds the place, forecast, answers and saved-plan state, so moving between pages refetches nothing.
- Today and My Profile stay mounted and are hidden when not shown, so a built plan, a build in progress and unsaved answers survive moving between pages.
- After Back or Forward, the shell rewrites the address so its place matches the place on screen.
- Nav links scroll to the top of the page.
- A searched place travels in `?place=&lat=&lon=` on any app path. A device location never does.
- The server (`app.ts`) and `netlify.toml` serve `index.html` for `/app/*`.

### API

Authenticates users, validates payloads, applies rate limits, enforces ownership, invokes services, and returns normalized responses.

### Air data layer

Provider adapters return normalized snapshots with provenance. The adapter does not silently convert forecast data into observations. Normalization includes units, valid time, provider source, station/model details, freshness, and limitations.

### Rules engine

Evaluates allowed recommendation rules. Inputs are validated data snapshots and optional household preferences. Outputs are structured recommendation candidates with reason codes and evidence types.

### AI layer

Receives a bounded, validated context and recommendation candidates. AI improves wording and personalization, but cannot invent values, change AQI categories, create source URLs, or make medical claims. Output is validated with Zod and checked against allowed action types.

### Persistence

Supabase tables store user preferences and saved plans with RLS. Avoid persisting precise coordinates unless the user explicitly saves a location.

## 5. Domain types

Use shared types generated or exported from a small shared package/folder. Keep the server authoritative for validation.

```ts
export type DataKind = 'official_observation' | 'model_forecast' | 'demo';
export type Freshness = 'fresh' | 'stale' | 'unknown';

export interface PollutantReading {
  pollutant: 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';
  value: number;
  unit: string;
  timestamp: string;
}

export interface AirQualitySnapshot {
  locationLabel: string;
  dataKind: DataKind;
  provider: string;
  sourceUrl: string;
  retrievedAt: string;
  observedAt?: string;
  forecastFor?: string;
  stationName?: string;
  modelResolution?: string;
  pollutants: PollutantReading[];
  freshness: Freshness;
  limitations: string[];
  nationalAqi?: {
    value: number;
    category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
    methodology: 'CPCB';
  };
}
```

`nationalAqi` is allowed only when a valid CPCB AQI or a correctly implemented documented CPCB method is available. Do not fill it from PM2.5 alone or from Open-Meteo's other AQI indices.

## 6. Provider interfaces

```ts
export interface AirQualityProvider {
  getCurrent(input: LocationInput): Promise<AirQualitySnapshot | null>;
  getForecast(input: LocationInput): Promise<AirQualityForecast | null>;
}

export interface AIProvider {
  generateDailyPlan(input: PlannerContext): Promise<unknown>;
  answerQuestion(input: AssistantContext): Promise<unknown>;
}
```

Provider selection comes from validated server configuration. A fallback to demo mode must be explicit and visible to the user.

## 7. Request flow

1. Client selects a location.
2. API validates the location and retrieves data from configured providers.
3. Data service normalizes and evaluates freshness.
4. Recommendation rules create allowed candidate actions.
5. AI receives only validated and bounded context.
6. AI response is parsed and validated.
7. Safety validator removes/rejects unsupported claims.
8. API returns the plan, source context, assumptions, and limitations.
9. User explicitly saves a plan; database RLS and ownership apply.

## 8. Quality architecture

- TypeScript strict mode.
- oxlint (type-aware, jsx-a11y rules) and Prettier.
- Unit tests for rules, conversion, freshness, and validation.
- Integration tests for providers and APIs.
- Playwright for primary journeys.
- CodeQL for static security analysis.
- SonarQube for code quality/maintainability analysis.
- Unslop/Hallmark for visual audits where installed.

## 9. Deployment topology

- Netlify (ADR-006, `DEPLOYMENT.md`): the CDN serves the built client, and `/api/*` is rewritten to one Function that runs the Express app, all on one origin.
- Netlify environment variables hold the server settings. A Gemini key, when added, is marked secret.
- Supabase: Auth/Postgres.
- External data APIs called from server.
- AI model called from server.

Same-origin hosting means no CORS allowlist is needed; if the client is ever hosted separately, add a strict CORS allowlist. Use HTTPS. Check free-tier limits and provider terms before deployment.
