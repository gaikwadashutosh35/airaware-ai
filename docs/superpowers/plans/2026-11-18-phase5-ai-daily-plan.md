# Phase 5 — AI Daily Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/v1/recommendations/daily-plan` returns a daily plan in which Gemini features, orders and times the rules' candidates and adds a summary and "for you" lines, with a labelled rules-only plan whenever Gemini is absent, failing or rejected.

**Architecture:** Pure modules for the AI contract (`services/ai/planOutput.ts`, `personalize.ts`) and plan assembly (`services/recommendations/plan.ts`); a thin REST adapter for Gemini (`services/ai/gemini.ts`) injected into the app as a `GeneratePlan` function; one route that shares the forecast cache with the existing forecast endpoint.

**Tech Stack:** Node 26, Express 5, Zod 4 (`z.toJSONSchema`), Vitest 5, Supertest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-18-phase5-ai-daily-plan-design.md`

## Global Constraints

- Work on `main`; no worktree, no branch.
- No new dependencies: Gemini is called with `fetch` at `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, key in the `x-goog-api-key` header, never in the URL.
- Default model `gemini-3.8-flash`; override `GEMINI_MODEL`. Prompt version `daily-plan-v1`.
- Gemini receives only `toWriterInput(...)` output: no place label, coordinates, raw household answers, window time or user text.
- Never logged: the key, prompts, Gemini text, household details, labels, coordinates, request bodies. Failure log line: `Gemini plan failed: <category>`.
- Limits: body 4 KB; 10 plan requests/min per IP on the route; Gemini timeout 10 000 ms; temperature 0.4; `maxOutputTokens` 2048; plan cache 10 min, 500 entries.
- Checks: `summary` 20–300 chars; `forYou` 10–200 chars; `featured` 1–8, unique, non-notice ids only, all high-priority non-notice ids included; numbers ⊆ input numbers; banned-wording list from the spec.
- Safety note text: `General information only, not medical advice. Follow local public-health advisories.`
- The endpoint returns 200 for every valid request; Gemini and Open-Meteo failures degrade, never error.
- Gate before each commit: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.

## Review Focus

1. `server/.env` with an empty `GEMINI_API_KEY=` line (the file exists like that today) → the server starts and plans are rules-only. Test: Task 3 `an empty key counts as unset`.
2. Gemini ids that differ only in case or whitespace (`'Commute.lower-traffic '`) → rejected, rules-only. Test: Task 1 `ids must match exactly`.
3. The same request right after a Gemini failure → Gemini is asked again, not a cached fallback. Test: Task 4 `a fallback plan is not cached`.
4. A label containing markup (`<b>Pune</b>`) → echoed exactly as JSON text, never sent to Gemini. Test: Task 4 `markup in the label is echoed and never sent`.
5. Gemini wrapping its JSON in a Markdown fence → treated as invalid JSON (one retry, then rules-only), never half-parsed. Test: Task 1 `fenced JSON is invalid`.

---

### Task 1: AI output contract, checks and retry

**Files:**
- Create: `server/src/services/ai/planOutput.ts`, `server/src/services/ai/planOutput.test.ts`
- Create: `server/src/services/ai/personalize.ts`, `server/src/services/ai/personalize.test.ts`
- Modify: `shared/contracts.ts` (append `PlanPeriod`)

**Interfaces:**
- Consumes: `AirAssessment`, `RecommendationCandidate` (Phase 4).
- Produces:
  ```ts
  // shared/contracts.ts
  export type PlanPeriod = 'morning' | 'commute' | 'daytime' | 'evening' | 'home';
  // planOutput.ts
  export interface PlanWriterInput {
    air: { level: AirAssessment['level']; checks: Array<{ pollutant: 'PM2.5' | 'PM10'; status: LimitStatus; average24h: number | null; limit: number }> };
    candidates: Array<Pick<RecommendationCandidate, 'id' | 'section' | 'priority' | 'title' | 'text' | 'reason'>>;
  }
  export interface PlanOutput { summary: string; featured: Array<{ id: string; period: PlanPeriod; forYou: string }> }
  export const planOutputSchema: z.ZodType<PlanOutput>;   // z.object (strips unknown keys), no length rules
  export const PLAN_OUTPUT_JSON_SCHEMA: object;            // z.toJSONSchema(planOutputSchema)
  export type CheckFailure = 'length' | 'ids' | 'numbers' | 'wording';
  export function toWriterInput(air: AirAssessment, candidates: RecommendationCandidate[]): PlanWriterInput;
  export function checkPlanOutput(output: PlanOutput, input: PlanWriterInput): CheckFailure | null;
  // personalize.ts
  export type GeneratePlan = (input: PlanWriterInput) => Promise<string>; // the model's raw text
  export async function personalize(input: PlanWriterInput, generate: GeneratePlan): Promise<PlanOutput | null>;
  ```

- [ ] **Step 1: Commit the approved docs**

```bash
git add docs/superpowers/specs/2026-11-18-phase5-ai-daily-plan-design.md docs/superpowers/plans/2026-11-18-phase5-ai-daily-plan.md
git commit -m "docs: phase 5 AI daily plan spec and plan"
```

- [ ] **Step 2: Write the failing tests** in `planOutput.test.ts`. Fixture: `input = toWriterInput(elevated, buildCandidates(full, elevated))` with Phase 4's `elevated`/`full` shapes (PM2.5 above at 72.4, PM10 within at 80, `windowStart` set). `valid(): PlanOutput` = summary `'Particle levels are forecast above the national limit, so plan indoor exercise and a quieter commute.'` and featured = every high-priority non-notice id in rules order, each `{ period: 'daytime', forYou: 'Your household includes children, so shorter outdoor time helps.' }`.
  - `toWriterInput drops times and labels pollutants`: `input.air` has no `windowStart`; checks pollutants `['PM2.5', 'PM10']`; every candidate has exactly keys `id, section, priority, title, text, reason`.
  - `a valid answer passes`: `checkPlanOutput(valid(), input)` is `null`.
  - `summary length`: 19 chars → `'length'`; 301 chars → `'length'`. `forYou` 9 chars → `'length'`.
  - `ids must match exactly`: an id `'Commute.lower-traffic '` → `'ids'`.
  - `ids must be candidates, unique, non-notice, 1 to 8`: unknown id `'exercise.run-faster'`, a duplicate, `'air.elevated'`, `[]`, and 9 items → each `'ids'`.
  - `every high-priority action is featured`: dropping `household.extra-caution` → `'ids'`.
  - `numbers must come from the input`: summary containing `72.4`, `PM2.5`, `24-hour` passes; containing `15` → `'numbers'`; forYou containing `3 hours` → `'numbers'`.
  - `banned wording`: each of `'safe'`, `'Safety'`, `'guaranteed'`, `'healthy'`, `'risk-free'`, `'no risk'`, `'diagnosis'`, `'treatment'`, `'cure'`, `'medical'`, `'prescribed'`, `'symptoms'`, `'asthma'`, `'COPD'`, `'inhaler'`, `'AQI'`, `'https://x.y'`, `'www.x.y'`, `'always open'`, `'close all windows'`, `'%'` inside an otherwise valid summary → `'wording'`.
  - `the JSON schema has the three fields`: `PLAN_OUTPUT_JSON_SCHEMA` has `properties.summary`, `properties.featured.items.properties.period.enum` equal to the five periods.

- [ ] **Step 3: Run to see it fail**

Run: `npm test -w server -- src/services/ai/planOutput.test.ts`
Expected: FAIL, cannot resolve `./planOutput.ts`.

- [ ] **Step 4: Implement `planOutput.ts`** (and append `PlanPeriod`). Numbers: collect `/\d+(?:\.\d+)?/g` matches from `JSON.stringify(input)`; every match in `summary` and each `forYou` must be in that set. Banned list as one array of case-insensitive regexes: `/\bsafe(ly|ty)?\b/i, /guarantee/i, /healthy/i, /risk[- ]free/i, /\bno risk\b/i, /diagnos/i, /\btreat/i, /\bcure/i, /medic/i, /prescri/i, /symptom/i, /asthma/i, /\bcopd\b/i, /inhaler/i, /\baqi\b/i, /https?:|www\./i, /always (open|close)/i, /(open|close) all (the )?windows/i, /%/`. Check order: length, ids, numbers, wording.

- [ ] **Step 5: Run to see it pass**, same command. Expected: all pass.

- [ ] **Step 6: Write the failing tests** in `personalize.test.ts` (fake `generate = vi.fn()`, `console.error` spied):
  - `returns a valid answer`: generate resolves `JSON.stringify(valid())` → result equals `valid()`; called once.
  - `retries once after invalid JSON`: first `'not json'`, then valid → result equals `valid()`; called twice; `console.error` called with `'Gemini plan failed: invalid json'`.
  - `fenced JSON is invalid`: both answers ``'```json\n' + JSON.stringify(valid()) + '\n```'`` → `null`; called twice.
  - `gives up after two schema failures`: both `'{"summary":1}'` → `null`; called twice; logged `'Gemini plan failed: schema'`.
  - `does not retry a content failure`: answer with summary containing `safe` → `null`; called once; logged `'Gemini plan failed: wording'`.
  - `does not retry a transport failure`: generate rejects `new Error('timeout')` → `null`; called once; logged `'Gemini plan failed: timeout'`.
  - `never logs the model's text`: across the cases above, no `console.error` argument contains `valid().summary`.

- [ ] **Step 7: Run to see it fail**

Run: `npm test -w server -- src/services/ai/personalize.test.ts`
Expected: FAIL, cannot resolve `./personalize.ts`.

- [ ] **Step 8: Implement `personalize`.** Up to 2 attempts. `generate` rejects → log `error.message` (or `'unknown'`), return `null`. `JSON.parse` throws → log `invalid json`, next attempt. `planOutputSchema.safeParse` fails → log `schema`, next attempt. `checkPlanOutput` non-null → log it, return `null`. Every log is exactly `console.error(\`Gemini plan failed: ${category}\`)`.

- [ ] **Step 9: Run to see it pass**, same command. Expected: all pass.

- [ ] **Step 10: Gate and commit**

```bash
git add shared/contracts.ts server/src/services/ai/
git commit -m "feat(server): validate Gemini plan output with one retry"
```

---

### Task 2: Plan assembly

**Files:**
- Create: `server/src/services/recommendations/plan.ts`, `server/src/services/recommendations/plan.test.ts`
- Modify: `shared/contracts.ts` (append `DailyPlan`)

**Interfaces:**
- Consumes: `PlanOutput` (Task 1); `SOURCE_REFERENCES` (Phase 4); `ModelForecast` (`air-data/openMeteo.ts`).
- Produces:
  ```ts
  // shared/contracts.ts
  export interface DailyPlan {
    generatedBy: 'ai' | 'rules';
    model: string | null;
    promptVersion: string | null;
    summary: string | null;
    place: { label: string };
    air: AirAssessment;
    forecast: Pick<ForecastSeries, 'provider' | 'sourceUrl' | 'dataKind' | 'modelResolution' | 'retrievedAt' | 'limitations'> | null;
    notices: RecommendationCandidate[];
    featured: Array<{ candidate: RecommendationCandidate; period: PlanPeriod | null; forYou: string | null }>;
    more: RecommendationCandidate[];
    sources: Array<{ id: SourceReferenceId; name: string; url: string }>;
    safetyNote: string;
  }
  // plan.ts
  export const SAFETY_NOTE = 'General information only, not medical advice. Follow local public-health advisories.';
  export function buildPlan(input: {
    label: string;
    air: AirAssessment;
    forecast: ModelForecast | null;
    candidates: RecommendationCandidate[];
    ai: { output: PlanOutput; model: string; promptVersion: string } | null;
  }): DailyPlan;
  ```

- [ ] **Step 1: Write the failing tests** in `plan.test.ts` (candidates from `buildCandidates(full, elevated)`; `forecast` = a `ModelForecast` built from the Pune fixture via the same shape `fetchForecast` returns, or a literal):
  - `rules-only plan`: `ai: null` → `generatedBy 'rules'`, `model`, `promptVersion`, `summary` all `null`; `notices` = the `section === 'notice'` candidates; `featured` = every other candidate in order, each `{ period: null, forYou: null }`; `more` `[]`.
  - `AI plan keeps Gemini's order`: output featuring `['household.extra-caution', 'exercise.indoor-alternative', …all other highs]` → `featured[0].candidate.id` `'household.extra-caution'` with its `period` and `forYou`; `more` = the non-featured non-notice candidates in rules order; `generatedBy 'ai'`, `model` and `promptVersion` as given; `summary` as given.
  - `notices are always all there`: in both plans `notices.map(id)` equals `['air.elevated']`.
  - `featured candidates are the rules' own text`: each `featured[i].candidate` `toEqual` the matching input candidate.
  - `sources are only those cited`: elevated → ids `['open-meteo', 'cpcb-naaqs-2009']` with `SOURCE_REFERENCES` names/urls; `buildCandidates({}, unknown)` → `[]`.
  - `forecast metadata without hours`: present → keys exactly `provider, sourceUrl, dataKind, modelResolution, retrievedAt, limitations`; `null` in → `null` out.
  - `safety note`: equals `SAFETY_NOTE` text from Global Constraints.

- [ ] **Step 2: Run to see it fail**

Run: `npm test -w server -- src/services/recommendations/plan.test.ts`
Expected: FAIL, cannot resolve `./plan.ts`.

- [ ] **Step 3: Implement `buildPlan`** (and append `DailyPlan`). Sources: the set of `sourceIds` across all candidates, listed in `SOURCE_REFERENCES` key order.

- [ ] **Step 4: Run to see it pass**, same command. Expected: all pass.

- [ ] **Step 5: Gate and commit**

```bash
git add shared/contracts.ts server/src/services/recommendations/plan.ts server/src/services/recommendations/plan.test.ts
git commit -m "feat(server): assemble AI and rules-only daily plans"
```

---

### Task 3: Gemini adapter, prompts and configuration

**Files:**
- Create: `server/src/services/ai/prompts.ts`, `server/src/services/ai/gemini.ts`, `server/src/services/ai/gemini.test.ts`
- Modify: `server/src/config/env.ts`, its test (`server/src/config/env.test.ts`), `server/.env.example`, `AI_PROMPTS.md` §3

**Interfaces:**
- Consumes: `GeneratePlan`, `PlanWriterInput`, `PLAN_OUTPUT_JSON_SCHEMA` (Task 1).
- Produces:
  ```ts
  // prompts.ts
  export const PROMPT_VERSION = 'daily-plan-v1';
  export const SYSTEM_PROMPT: string; // AI_PROMPTS.md §2, verbatim
  export const TASK_PROMPT: string;   // exact text below
  // gemini.ts
  export function createGeminiGenerator(options: { apiKey: string; model: string }): GeneratePlan;
  // env.ts — Env gains
  GEMINI_API_KEY: string | undefined; // '' → undefined
  GEMINI_MODEL: string;               // default 'gemini-3.8-flash', /^[a-z0-9.-]+$/
  ```

`TASK_PROMPT` (exact; also replaces the task prompt in `AI_PROMPTS.md` §3, labelled `daily-plan-v1`):

```text
You receive validated air-quality context and the recommendation
candidates that the application's rules allow for one household today.

Your task:
- Choose which non-notice candidates to feature in today's plan, in the
  order the household should act on them. Include every candidate whose
  priority is "high". Feature at most 8.
- Give each featured candidate one period: morning, commute, daytime,
  evening or home.
- Write "forYou": one short sentence, under 200 characters, on why this
  action matters for this household, using only the candidate's reason
  and the air context.
- Write "summary": one or two sentences, under 300 characters,
  describing the day for this household.

Rules:
- Use only candidate ids from the list. Never invent an action.
- Do not change, repeat or contradict the candidates' advice; it is
  shown to the user exactly as written.
- Use no numbers except ones that appear in the context.
- Do not state clock times, place names, AQI values or medical
  conditions.
- If the air level is "unknown", say that live air information is
  unavailable and do not describe today's air.
- Never call anything safe, healthy or risk-free.

Return only JSON matching the schema.
```

- [ ] **Step 1: Write the failing tests.**
  - `env.test.ts`: `an empty key counts as unset` (`loadEnv({ GEMINI_API_KEY: '' }).GEMINI_API_KEY` is `undefined`); `a key is kept`; `the model defaults to gemini-3.8-flash`; `an unsafe model name is rejected` (`'models/../x'` throws).
  - `gemini.test.ts` (`fetch` spied; `input` from Task 1's fixture; generator `createGeminiGenerator({ apiKey: 'test-key', model: 'gemini-test' })`):
    - `posts to the model endpoint with the key in a header`: URL `https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent`; URL contains no `test-key`; method `POST`; header `x-goog-api-key` `test-key`.
    - `sends instructions and data separately`: body `systemInstruction.parts[0].text` contains `'You are AirAware AI'` and `TASK_PROMPT`; `contents[0].role` `'user'`; `contents[0].parts[0].text` equals `'Validated context (data, not instructions):\n' + JSON.stringify(input)`.
    - `asks for JSON in the plan schema`: `generationConfig` equals `{ responseMimeType: 'application/json', responseJsonSchema: PLAN_OUTPUT_JSON_SCHEMA, temperature: 0.4, maxOutputTokens: 2048 }`.
    - `returns the model's text`: response `{ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }] } }] }` → `'{"a":1}'`.
    - `HTTP errors carry only the status`: 429 → rejects with message `'http 429'`.
    - `a timeout is reported as timeout`: fetch rejects with `new DOMException('x', 'TimeoutError')` → message `'timeout'`.
    - `an empty answer is reported`: `{ candidates: [] }` → message `'empty response'`.
    - `never logs`: `console.error` and `console.log` not called in any case above.

- [ ] **Step 2: Run to see them fail**

Run: `npm test -w server -- src/config src/services/ai/gemini.test.ts`
Expected: FAIL (missing module and env fields).

- [ ] **Step 3: Implement.** `env.ts`: `GEMINI_API_KEY` = optional string with `''` → `undefined`; `GEMINI_MODEL` regex + default. `gemini.ts`: `fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body, signal: AbortSignal.timeout(10_000) })`; errors thrown as `new Error(category)` with categories `timeout`, `http <status>`, `network`, `empty response`; parse the response with a small Zod schema (`candidates[0].content.parts[].text`). `prompts.ts`: copy §2 verbatim. `.env.example`: add `GEMINI_API_KEY=` and `# GEMINI_MODEL=gemini-3.8-flash` with a one-line comment each.

- [ ] **Step 4: Run to see them pass**, same command. Expected: all pass.

- [ ] **Step 5: Gate and commit**

```bash
git add server/src/services/ai/prompts.ts server/src/services/ai/gemini.ts server/src/services/ai/gemini.test.ts server/src/config server/.env.example AI_PROMPTS.md
git commit -m "feat(server): Gemini REST adapter and daily-plan prompt v1"
```

---

### Task 4: The daily-plan endpoint

**Files:**
- Create: `server/src/services/air-data/cachedForecast.ts`, `server/src/routes/recommendations.ts`, `server/src/routes/recommendations.test.ts`
- Modify: `server/src/routes/airQuality.ts` (take the shared forecast function), `server/src/app.ts`, `server/src/server.ts`, `server/src/errors.ts` (+ `errors.test.ts`), `shared/contracts.ts` (`ErrorCode` += `'PAYLOAD_TOO_LARGE'`)
- Docs: `API.md`, `INTEGRATIONS.md` §4, `SETUP.md`, `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 5 "As built")

**Interfaces:**
- Consumes: everything above; `householdContextSchema`, `assessAir`, `buildCandidates` (Phase 4).
- Produces:
  ```ts
  // cachedForecast.ts — the 10-minute, 500-entry cache moved out of airQuality.ts
  export type CachedForecast = (latitude: number, longitude: number, now: Date) => Promise<ModelForecast>;
  export function createCachedForecast(): CachedForecast;
  // airQuality.ts
  export function airQualityRouter(forecast: CachedForecast): Router;
  // recommendations.ts
  export function recommendationsRouter(deps: { forecast: CachedForecast; generate: GeneratePlan | null; model: string | null }): Router;
  // app.ts — AppOptions gains
  generatePlan?: GeneratePlan; aiModel?: string;
  // errors.ts
  export function parseQuery<T>(schema: z.ZodType<T>, query: unknown, message?: string): T; // default 'Invalid query parameters.'
  ```
  `createApp` makes one `createCachedForecast()` and passes it to both routers; mounts `recommendationsRouter` at `/api/v1/recommendations`.

- [ ] **Step 1: Write the failing tests** in `recommendations.test.ts`. Helpers: `openMeteoBody(startSeconds, pm25, pm10)` returns an Open-Meteo-shaped body with 48 hourly values; `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime` so "now" sits inside the series; `fetch` spied for Open-Meteo; `generate = vi.fn()`; `post(app, body)` = `request(app).post('/api/v1/recommendations/daily-plan').send(body)`; `body = { place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 }, householdContext: { routine: { outdoorExercise: true } } }`.
  - `returns an AI plan`: PM2.5 values all 80 → generate returns a valid answer featuring every high id → 200, `generatedBy 'ai'`, `model` as passed to `createApp`, `notices[0].id 'air.elevated'`, `featured[0].forYou` set.
  - `falls back to rules when Gemini fails`: generate rejects → 200, `generatedBy 'rules'`, `summary null`.
  - `falls back when Gemini's answer is rejected`: answer with `'safe'` in summary → 200, `generatedBy 'rules'`.
  - `rules-only when Gemini is not configured`: `createApp()` → 200, `generatedBy 'rules'`.
  - `a forecast failure still returns a plan`: Open-Meteo fetch rejects → 200, `air.level 'unknown'`, `forecast null`, `notices[0].id 'data.unavailable'`.
  - `Gemini never sees the place or coordinates`: `JSON.stringify(generate.mock.calls[0][0])` contains none of `'Pune'`, `'18.52'`, `'73.86'`, `'outdoorExercise'`.
  - `markup in the label is echoed and never sent`: label `'<b>Pune</b>'` → `place.label` equals it exactly; not in generate's input.
  - `validation`: unknown top-level field, `latitude: 18.523`, `label: '  '`, `householdContext: { diagnosis: 'x' }` → each 400 `VALIDATION_ERROR`; malformed JSON (`.set('content-type','application/json').send('{')`) → 400 with message `'Malformed JSON body.'`; a 5 000-character label → 413 `PAYLOAD_TOO_LARGE`; for the malformed case `console.error` was not called with the body text.
  - `plan requests are limited to 10 a minute`: 11th request → 429 `RATE_LIMITED`.
  - `identical requests reuse the plan`: two identical posts → generate called once.
  - `a fallback plan is not cached`: generate rejects once then resolves → two identical posts → second is `generatedBy 'ai'`; generate called twice.
  - `forecast and plan share one cache`: `GET /air-quality/forecast` then a plan for the same coordinates → one Open-Meteo fetch.
  - In `errors.test.ts`: `body-parser errors map to the envelope` (an error `{ type: 'entity.too.large', status: 413 }` → 413 `PAYLOAD_TOO_LARGE`; `{ type: 'entity.parse.failed', status: 400, body: '{secret' }` → 400 `'Malformed JSON body.'`, not logged).

- [ ] **Step 2: Run to see them fail**

Run: `npm test -w server -- src/routes/recommendations.test.ts src/errors.test.ts`
Expected: FAIL (route missing, 404s).

- [ ] **Step 3: Implement.**
  - `cachedForecast.ts`: move the cache and fetch-on-miss from `airQuality.ts` unchanged; existing forecast tests stay green.
  - `recommendations.ts`: `express.json({ limit: '4kb' })` and a `rateLimit` of 10/min (same options shape as `app.ts`) on this router; body schema `z.strictObject({ place: z.strictObject({ label: z.string().trim().min(1).max(120), latitude, longitude }), householdContext: householdContextSchema.optional() })` where coordinates are numbers in range with `Number(v.toFixed(2)) === v` (message `'At most 2 decimal places.'`), parsed with `parseQuery(schema, req.body, 'Invalid request body.')`. Forecast errors → `null`. Plan cache: `createTtlCache<DailyPlan>(10 * 60_000, 500)`, key `` `${lat},${lon}|${label}|${air.windowStart}|${JSON.stringify(context)}` ``; store only when `generate` is `null` or the plan is `generatedBy 'ai'`.
  - `errors.ts`: before the 500 branch, an error with string `type` and numeric `status` 400–499 → 413 `PAYLOAD_TOO_LARGE` `'Request body too large.'` for 413, 400 `VALIDATION_ERROR` `'Malformed JSON body.'` for `entity.parse.failed`, else 400 `'Invalid request body.'`; never logged.
  - `server.ts`: `generatePlan = env.GEMINI_API_KEY ? createGeminiGenerator({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }) : undefined`; log `Gemini: configured (${env.GEMINI_MODEL})` or `Gemini not configured; plans are rules-only.`; pass `generatePlan` and `aiModel`.

- [ ] **Step 4: Run to see them pass**

Run: `npm test -w server`
Expected: all pass (previous 99 plus the new ones).

- [ ] **Step 5: Docs.**
  - `API.md`: replace the daily-plan request/response and `DailyActionPlan` schema with the spec's Request and Response sections; note 413 and the 10/min limit.
  - `INTEGRATIONS.md` §4: model and version check date, REST call, what is and is not sent, the free-tier data note, logging rule, fallback.
  - `SETUP.md` §6: `GEMINI_API_KEY` (optional, server-only) and `GEMINI_MODEL` (optional).
  - `CHANGELOG.md`: Added line for the endpoint; Security line for the body limit and log rules.
  - `docs/IMPLEMENTATION_PLAN.md` Phase 5: "As built (2026-11-18)" note (chat deferred, option 2, REST not SDK, live check result from Task 5).

- [ ] **Step 6: Gate and commit**

```bash
git add shared/contracts.ts server/src API.md INTEGRATIONS.md SETUP.md CHANGELOG.md docs/IMPLEMENTATION_PLAN.md
git commit -m "feat(server): daily-plan endpoint with Gemini and rules-only fallback"
```

---

### Task 5: Live check with the real key

**Files:**
- Create: `server/src/services/ai/gemini.live.test.ts`

**Interfaces:**
- Consumes: `createGeminiGenerator`, `personalize`, `toWriterInput`, `checkPlanOutput`, `buildCandidates`.

- [ ] **Step 1: Write the opt-in live test.** It loads `server/.env` with `process.loadEnvFile` when the file exists, and is `describe.skipIf(!process.env.GEMINI_LIVE || !process.env.GEMINI_API_KEY)`. One test, `Gemini returns a plan that passes every check`: input from `buildCandidates(full, elevated)`; `personalize(input, createGeminiGenerator({ apiKey, model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash' }))` resolves non-null within 30 s. It prints nothing.

- [ ] **Step 2: Confirm it is skipped by default**

Run: `npm test -w server -- src/services/ai/gemini.live.test.ts`
Expected: 1 skipped.

- [ ] **Step 3: Run it live** (needs the owner's key in `server/.env`; if absent, stop here, report Task 5 as blocked, and continue to the final review).

Run: `GEMINI_LIVE=1 npm test -w server -- src/services/ai/gemini.live.test.ts`
Expected: 1 passed. If Gemini rejects `responseJsonSchema` (HTTP 400), rule on the smallest change (for example `responseSchema`), fix the adapter test first, and ledger it.

- [ ] **Step 4: One end-to-end call.** Start the API with the key (`npm run dev -w server`), then:

```bash
curl -s -X POST http://localhost:8080/api/v1/recommendations/daily-plan -H 'content-type: application/json' -d '{"place":{"label":"Delhi","latitude":28.65,"longitude":77.23},"householdContext":{"routine":{"commuteMode":"two_wheeler","outdoorExercise":true}}}'
```

Expected: 200 with `generatedBy` `"ai"` (or `"rules"` with the logged category explained). Record the outcome, without the key, in the Phase 5 "As built" note.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/ai/gemini.live.test.ts docs/IMPLEMENTATION_PLAN.md
git commit -m "test(server): opt-in live Gemini check"
```
