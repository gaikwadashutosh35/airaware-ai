# AirAware AI — Technical Architecture

## 1. Architecture goals

- Separate data acquisition, recommendation rules, AI explanation, persistence, and presentation.
- Preserve environmental data provenance end-to-end.
- Keep deterministic rules authoritative for thresholds and validation.
- Keep provider credentials server-side.
- Support provider replacement without rewriting application logic.
- Remain small and maintainable for the Hack2skill repository limit.

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
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── air-quality/
│   │   │   ├── ask/
│   │   │   ├── daily-plan/
│   │   │   ├── guides/
│   │   │   ├── location/
│   │   │   ├── onboarding/
│   │   │   └── today/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   └── test/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── air-data/
│   │   │   ├── location/
│   │   │   ├── recommendations/
│   │   │   └── saved/
│   │   ├── test-fixtures/
│   │   ├── app.ts
│   │   ├── netlify.ts
│   │   └── server.ts
│   └── package.json
├── shared/
│   └── contracts.ts
├── netlify/
│   └── functions/
├── e2e/
├── supabase/
│   └── migrations/
├── docs/
├── .github/
│   └── workflows/
├── netlify.toml
├── Dockerfile
├── .gitignore
└── README.md
```

## 4. Architectural layers

### Client

Responsible for navigation, forms, display, local UI state, accessibility, and calling typed API services. It must not calculate a CPCB National AQI or call private AI keys directly.

**Paths:** there is no router library. `App.tsx` switches on the path that `lib/navigation.ts` provides (`usePath`, `navigate`, `appPage`).
- `/` is the landing page; `/privacy` is the privacy page.
- Every `/app/*` path renders `AppShell`:
  - `/app` is Today;
  - `/app/ask` is Ask AirAware, `/app/home` is My Home, `/app/habits` is Better Habits, and `/app/welcome` is the first-visit questions;
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

The Open-Meteo adapter returns a normalized forecast series (`ModelForecast`: a `ForecastSeries` without `freshness`) with provenance. It does not silently convert forecast data into observations. Normalization includes units, hour times, provider source, model resolution, and limitations. The forecast route adds `freshness: 'unknown'` when it serves the series, because Open-Meteo does not report the model run time.

### Rules engine

Evaluates allowed recommendation rules (`buildCandidates` in `server/src/services/recommendations/rules.ts`). Inputs are the 24-hour air check and optional household answers. Outputs are recommendation cards, each with a written reason, an evidence type, its sources and the inputs it used.

### AI layer

Receives only the 24-hour check result and the cards (id, section, priority, title, text, reason): the rule cards and, for Ask, guide-library cards. For the plan and the topic chips it gets no place, coordinates or typed questions. The one exception is Ask: a typed question that is not medical goes to Claude with up to 2 earlier questions, the check, the allowed cards' text and the forecast's provider and limitations, but still no place name, coordinates or raw household answers (J26, ADR-008). Claude chooses at most 3 of those cards and writes 1 to 3 sentences, and its answer faces the same kind of checks, with the rules' answer as the fallback. The AI may pick, order and time the action cards and write a short summary and "for you" lines. Notices are always shown as they are and cannot be featured. It cannot change a card's text, its sources or any forecast value. Its answer is parsed with Zod and must pass content checks (lengths; 1 to 8 known action-card ids with no repeats; every high-priority action card featured; numbers, in digits or common number words, only from its input; banned wording), or it is dropped and the rules' plan is shown.

### Persistence

Supabase tables store user preferences and saved plans with RLS. Avoid persisting precise coordinates unless the user explicitly saves a location.

## 5. Domain types

Shared types live in `shared/contracts.ts` (types only), used by the server and the client. The server stays authoritative for validation. The air-data types, abridged:

```ts
export type DataKind = 'official_observation' | 'model_forecast' | 'demo';
export type Pollutant = 'PM2_5' | 'PM10' | 'NO2' | 'SO2' | 'O3' | 'CO';

export interface ForecastSeries {
  provider: 'Open-Meteo';
  sourceUrl: string;
  dataKind: 'model_forecast';
  modelResolution: string;
  retrievedAt: string;
  // Open-Meteo does not report the model run time.
  freshness: 'unknown';
  units: Partial<Record<Pollutant, string>>;
  hours: Array<{
    time: string;
    values: Partial<Record<Pollutant, number | null>>;
  }>;
  limitations: string[];
}

export type LimitStatus = 'above_limit' | 'within_limit' | 'unknown';

// A model-forecast 24-hour average compared with India's NAAQS 24-hour
// limit. Not an AQI and not a CPCB category.
export interface PollutantCheck {
  pollutant: 'PM2_5' | 'PM10';
  status: LimitStatus;
  // Rounded to 1 decimal; null when unknown.
  average24h: number | null;
  // μg/m³
  limit: number;
}

export interface AirAssessment {
  level: 'elevated' | 'not_elevated' | 'unknown';
  // UTC ISO time of the first of the 24 forecast hours averaged; null when
  // no complete window exists.
  windowStart: string | null;
  // Always [PM2_5, PM10].
  checks: PollutantCheck[];
}
```

There is no index field. A CPCB National AQI field may be added only when a valid CPCB value or a correctly implemented, documented CPCB method is available: never from PM2.5 alone or from Open-Meteo's European or US index values.

## 6. Provider interfaces

```ts
// server/src/services/air-data/cachedForecast.ts
export type CachedForecast = (
  latitude: number,
  longitude: number,
  now: Date,
) => Promise<ModelForecast>;

// server/src/services/ai/personalize.ts
export type GeneratePlan = (input: PlanWriterInput) => Promise<string>;
```

The forecast comes from one provider, Open-Meteo, through a 10-minute cache. Each AI writer (Gemini, then the optional Claude backup) is a `GeneratePlan` function. Claude also answers typed Ask questions through its own Ask writer (`server/src/services/ai/askWriter.ts`), outside this chain. `createPlanWriter` (`server/src/services/recommendations/dailyPlan.ts`) builds one plan writer that asks them in order, each within a daily call budget, and resolves to null when none gives an accepted answer; `createPlanWriter` itself returns null when no writer is set up. Which writers exist comes from validated server configuration (`server/src/config/appOptions.ts`): a writer is set up only when its key is set. There is no demo mode: when Open-Meteo fails, the app says the forecast is unavailable.

## 7. Request flow

The daily plan:

1. The client sends the place (label and coordinates) and any household answers to `POST /api/v1/recommendations/daily-plan`.
2. The API applies the plan rate limit and a 4 kB body limit, and validates the body with Zod.
3. The forecast comes from Open-Meteo through the 10-minute cache. A provider failure is not an error: the air check becomes unknown.
4. `assessAir` makes the 24-hour check, and `buildCandidates` turns it and the answers into rule cards.
5. If an AI writer is set up, it receives only the check result and the cards (`toWriterInput`).
6. Its answer is parsed with Zod and must pass `checkPlanOutput`. A writer is asked a second time only when its answer is not valid JSON or fails the schema; a failed content check or a failed call moves on to the next writer. When no writer's answer passes, the plan is the rules' plan.
7. The API returns the plan: who made it, the check, the forecast's provider, source, retrieval time and limitations, the cards with their reasons and sources, and the `safetyNote`.
8. Saving is a separate request when the user presses Save plan. The server builds the plan again, and database RLS and ownership apply.

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
- Netlify environment variables hold the server settings. `GEMINI_API_KEY` and the optional `ANTHROPIC_API_KEY` (the Claude backup, and the reader of typed Ask questions) are marked secret and scoped to Functions.
- Supabase: Auth/Postgres.
- External data APIs called from server.
- AI model called from server.

Same-origin hosting means no CORS allowlist is needed; if the client is ever hosted separately, add a strict CORS allowlist. Use HTTPS. Check free-tier limits and provider terms before deployment.
