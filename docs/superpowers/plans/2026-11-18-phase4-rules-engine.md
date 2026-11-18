# Phase 4 — Recommendation Rules Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure, deterministic server module that turns optional household details plus the Open-Meteo forecast into an ordered list of explainable recommendation candidates.

**Architecture:** Three pure modules in `server/src/services/recommendations/`: a Zod schema for household details, an air check that compares the next 24 forecast hours of PM2.5/PM10 with India's 2009 NAAQS 24-hour limits, and an ordered rule registry with `buildCandidates`. Types go in `shared/contracts.ts`. No route, no AI, no UI.

**Tech Stack:** Node 26 (type stripping), TypeScript 7 strict, Zod 4, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-18-phase4-rules-engine-design.md` (the wording table there is the exact copy for every rule).

## Global Constraints

- Work on `main`; no worktree, no branch (one-branch rule).
- Pure functions only: no I/O, no `Date.now()`/`new Date()` inside the modules (`now` is a parameter), never mutate inputs.
- Shared types are type-only in `shared/contracts.ts`; import them with `import type`. Zod stays on the server.
- Limits: PM2.5 **60** μg/m³, PM10 **100** μg/m³ (CPCB NAAQS, 18 November 2009, 24-hour).
- Unit string: exactly `'μg/m³'` with Greek mu U+03BC, as Open-Meteo returns it (see `server/src/services/air-data/fixtures/open-meteo-pune.json`).
- Averages: round to 1 decimal **before** comparing; above means `> limit`; text prints them with `toFixed(1)`.
- All rule copy is verbatim from the spec's wording table and shared strings.
- Never use the words safe, guarantee, healthy, diagnosis, medication or treatment in any candidate; never a blanket window instruction; no `%`.
- No new dependencies.
- Gate before each commit: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` all pass.

## Review Focus

1. Forecast hours not on the hour (e.g. `10:30Z`) → `unknown`, never a misaligned window. Test: Task 2 `half-hour timestamps are unknown`.
2. `now` exactly on an hour boundary → the window starts at that hour. Test: Task 2 `now on the hour starts the window at that hour`.
3. Flags set to `false` behave like absent ones (no exercise rule, no extra caution). Test: Task 3 `false flags add nothing`.
4. Elevated by PM10 alone → the notice names only PM10. Test: Task 3 `elevated notice lists only the pollutants above`.
5. Elevated with one pollutant unknown still counts as elevated. Test: Task 2 `one pollutant above and one unknown is elevated`.

---

### Task 1: Household details schema

**Files:**
- Modify: `shared/contracts.ts` (append `HouseholdContext`)
- Create: `server/src/services/recommendations/householdContext.ts`
- Test: `server/src/services/recommendations/householdContext.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  // shared/contracts.ts
  export interface HouseholdContext {
    routine?: {
      commuteMode?: 'walk' | 'cycle' | 'two_wheeler' | 'car' | 'public_transport' | 'work_from_home';
      outdoorExercise?: boolean;
      schoolCommute?: boolean;
    };
    home?: {
      nearBusyRoad?: 'yes' | 'no' | 'unknown';
      cookingFuel?: 'lpg' | 'electric' | 'biomass' | 'other' | 'prefer_not_to_say';
      kitchenExhaust?: boolean;
      airPurifier?: boolean;
    };
    householdNeeds?: {
      includesChildren?: boolean;
      includesOlderAdults?: boolean;
      mayBeMoreSensitive?: boolean;
    };
  }
  // householdContext.ts
  export const householdContextSchema: z.ZodType<HouseholdContext>;
  ```

- [ ] **Step 1: Commit the approved docs first**

```bash
git add docs/IMPLEMENTATION_PLAN.md docs/superpowers/specs/2026-11-18-phase4-rules-engine-design.md docs/superpowers/plans/2026-11-18-phase4-rules-engine.md
git commit -m "docs: record D1 and D3; phase 4 rules engine spec and plan"
```

- [ ] **Step 2: Write the failing tests** in `householdContext.test.ts`

```ts
const full: HouseholdContext = {
  routine: { commuteMode: 'two_wheeler', outdoorExercise: true, schoolCommute: false },
  home: { nearBusyRoad: 'unknown', cookingFuel: 'prefer_not_to_say', kitchenExhaust: true, airPurifier: false },
  householdNeeds: { includesChildren: true, includesOlderAdults: false, mayBeMoreSensitive: true },
};
it('accepts an empty object', () => expect(householdContextSchema.parse({})).toEqual({}));
it('accepts every field', () => expect(householdContextSchema.parse(full)).toEqual(full));
it('rejects an unknown top-level field', () =>
  expect(householdContextSchema.safeParse({ diagnosis: 'asthma' }).success).toBe(false));
it('rejects an unknown nested field', () =>
  expect(householdContextSchema.safeParse({ householdNeeds: { asthma: true } }).success).toBe(false));
it('rejects a value outside an enum', () =>
  expect(householdContextSchema.safeParse({ routine: { commuteMode: 'helicopter' } }).success).toBe(false));
it('rejects a non-boolean flag', () =>
  expect(householdContextSchema.safeParse({ home: { airPurifier: 'yes' } }).success).toBe(false));
```

- [ ] **Step 3: Run to see it fail**

Run: `npm test -w server -- src/services/recommendations/householdContext.test.ts`
Expected: FAIL, cannot resolve `./householdContext.ts`.

- [ ] **Step 4: Add `HouseholdContext` to `shared/contracts.ts` and implement `householdContextSchema`** with `z.strictObject` at every level, every field `.optional()`, annotated `z.ZodType<HouseholdContext>`. One-line comment: no medical fields by design (PRD §10).

- [ ] **Step 5: Run to see it pass**

Run: `npm test -w server -- src/services/recommendations/householdContext.test.ts`
Expected: 6 passed.

- [ ] **Step 6: Gate and commit**

```bash
git add shared/contracts.ts server/src/services/recommendations/householdContext.ts server/src/services/recommendations/householdContext.test.ts
git commit -m "feat(server): household details schema for recommendations"
```

---

### Task 2: Air check against the 24-hour limits

**Files:**
- Modify: `shared/contracts.ts` (append `LimitStatus`, `PollutantCheck`, `AirAssessment`)
- Create: `server/src/services/recommendations/airCheck.ts`
- Test: `server/src/services/recommendations/airCheck.test.ts`
- Modify: `INTEGRATIONS.md` (append §12)

**Interfaces:**
- Consumes: `ForecastSeries` from `shared/contracts.ts`.
- Produces:
  ```ts
  // shared/contracts.ts
  export type LimitStatus = 'above_limit' | 'within_limit' | 'unknown';
  export interface PollutantCheck {
    pollutant: 'PM2_5' | 'PM10';
    status: LimitStatus;
    average24h: number | null; // 1 decimal; null when unknown
    limit: number;             // μg/m³
  }
  export interface AirAssessment {
    level: 'elevated' | 'not_elevated' | 'unknown';
    checks: PollutantCheck[];  // always [PM2_5, PM10]
  }
  // airCheck.ts
  export const UG_PER_M3 = 'μg/m³';
  export const NAAQS_24H_LIMITS = { PM2_5: 60, PM10: 100 } as const;
  export function assessAir(
    series: Pick<ForecastSeries, 'units' | 'hours'> | null,
    now: Date,
  ): AirAssessment;
  ```

- [ ] **Step 1: Write the failing tests** in `airCheck.test.ts`

Test helper (in the test file): `series(startIso, pm25, pm10, units = { PM2_5: UG_PER_M3, PM10: UG_PER_M3 })` builds one hour per array index at `startIso + i h`. `now = new Date('2026-11-18T10:20:00Z')`. `fill(n, v) = Array(n).fill(v)`.

| Test name | Input | Expected |
|---|---|---|
| `PM2.5 average of 60.1 is above` | pm25 `fill(24, 60.1)`, pm10 `fill(24, 50)` from `10:00Z` | `level 'elevated'`; `checks[0]` `{ pollutant: 'PM2_5', status: 'above_limit', average24h: 60.1, limit: 60 }`; `checks[1]` `{ pollutant: 'PM10', status: 'within_limit', average24h: 50, limit: 100 }` |
| `exactly 60.0 and 100.0 are within` | pm25 `fill(24, 60)`, pm10 `fill(24, 100)` | `level 'not_elevated'`, both `within_limit` |
| `PM10 average of 100.1 is above` | pm25 `fill(24, 10)`, pm10 `fill(24, 100.1)` | `level 'elevated'`, `checks[1].status 'above_limit'` |
| `rounds before comparing` | pm25 `[...fill(23, 60), 61]` (mean 60.04), pm10 `fill(24, 10)` | `checks[0]` `{ status: 'within_limit', average24h: 60 }` |
| `starts at the hour containing now` | from `09:00Z`, pm25 `[1000, ...fill(24, 10)]`, pm10 `[1000, ...fill(24, 10)]` | `level 'not_elevated'`, `checks[0].average24h` 10 |
| `now on the hour starts the window at that hour` | `now = 10:00:00.000Z`, same series as above from `09:00Z` | `checks[0].average24h` 10 |
| `a null in the window is unknown` | pm25 `[...fill(23, 10), null]`, pm10 `fill(24, 10)` | `checks[0]` `{ status: 'unknown', average24h: null }`; `level 'unknown'` |
| `one pollutant above and one unknown is elevated` | pm25 `[...fill(23, 10), null]`, pm10 `fill(24, 150)` | `level 'elevated'` |
| `fewer than 24 hours is unknown` | both `fill(23, 10)` from `10:00Z` | `level 'unknown'`, both `unknown` |
| `a gap between hours is unknown` | 24 hours where hour 12 is at `+13 h` (build manually) | `level 'unknown'` |
| `half-hour timestamps are unknown` | both `fill(24, 10)` from `10:30Z` | `level 'unknown'` |
| `a past series is unknown` | both `fill(24, 10)` from `2026-11-17T00:00Z` | `level 'unknown'` |
| `a different unit is unknown` | units `{ PM2_5: 'µg/m³' /* U+00B5 */, PM10: UG_PER_M3 }`, both `fill(24, 10)` | `checks[0].status 'unknown'`, `level 'unknown'` |
| `no series is unknown` | `assessAir(null, now)` | `{ level: 'unknown', checks: [{ pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 }, { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 }] }` |

- [ ] **Step 2: Run to see it fail**

Run: `npm test -w server -- src/services/recommendations/airCheck.test.ts`
Expected: FAIL, cannot resolve `./airCheck.ts`.

- [ ] **Step 3: Add the types and implement `assessAir`.** Window start = `now` truncated to the UTC hour; find the hour whose `Date.parse(time)` equals it; take it and the next 23; every one must equal `start + i × 3 600 000`, else the window is empty. Per pollutant: unit must `===` `UG_PER_M3` and all 24 values numbers; `average24h = Math.round(mean × 10) / 10`; `> limit` → above. Level per the spec. File header comment cites the NAAQS notification (No. B-29016/20/90/PCI-L, 18 Nov 2009) and the method's known limit.

- [ ] **Step 4: Run to see it pass**

Run: `npm test -w server -- src/services/recommendations/airCheck.test.ts`
Expected: 14 passed.

- [ ] **Step 5: Document the threshold** (DATA_GOVERNANCE §8). Append to `INTEGRATIONS.md`:

`## 12. Recommendation thresholds` with: the source (CPCB NAAQS notification above, URL `http://cpcb.nic.in/uploads/National_Ambient_Air_Quality_Standards.pdf`, values verified 2026-11-18), the two limits, the four method steps from the spec, the known limit (station-based annual compliance vs a 24-hour mean of a ~45 km model grid), and "no CPCB AQI or category is computed".

- [ ] **Step 6: Gate and commit**

```bash
git add shared/contracts.ts server/src/services/recommendations/airCheck.ts server/src/services/recommendations/airCheck.test.ts INTEGRATIONS.md
git commit -m "feat(server): compare the 24-hour forecast with India's NAAQS limits"
```

---

### Task 3: Rule registry and `buildCandidates`

**Files:**
- Modify: `shared/contracts.ts` (append `SourceReferenceId`, `RecommendationCandidate`)
- Create: `server/src/services/recommendations/rules.ts`
- Test: `server/src/services/recommendations/rules.test.ts`
- Modify: `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 4 "As built")

**Interfaces:**
- Consumes: `HouseholdContext` (Task 1); `AirAssessment`, `UG_PER_M3`, `NAAQS_24H_LIMITS` (Task 2).
- Produces:
  ```ts
  // shared/contracts.ts
  export type SourceReferenceId = 'open-meteo' | 'cpcb-naaqs-2009';
  export interface RecommendationCandidate {
    id: string;
    section: 'notice' | 'action' | 'indoor' | 'swap';
    priority: 'high' | 'medium' | 'low';
    title: string;
    text: string;
    reason: string;
    evidenceType: 'data_driven_rule' | 'general_suggestion';
    sourceIds: SourceReferenceId[];
    inputsUsed: string[];
    caveat?: string;
  }
  // rules.ts
  export const SOURCE_REFERENCES: Record<SourceReferenceId, { name: string; url: string }>;
  export function buildCandidates(
    context: HouseholdContext,
    air: AirAssessment,
  ): RecommendationCandidate[];
  ```
  `SOURCE_REFERENCES` values are the spec's allowlist; `open-meteo` reuses `SOURCE_URL` from `air-data/openMeteo.ts`.

- [ ] **Step 1: Write the failing tests** in `rules.test.ts`

Fixtures (in the test file):
```ts
const elevated: AirAssessment = { level: 'elevated', checks: [
  { pollutant: 'PM2_5', status: 'above_limit', average24h: 72.4, limit: 60 },
  { pollutant: 'PM10', status: 'within_limit', average24h: 80, limit: 100 } ] };
const within: AirAssessment = { level: 'not_elevated', checks: [
  { pollutant: 'PM2_5', status: 'within_limit', average24h: 41.2, limit: 60 },
  { pollutant: 'PM10', status: 'within_limit', average24h: 63.5, limit: 100 } ] };
const unknown: AirAssessment = { level: 'unknown', checks: [
  { pollutant: 'PM2_5', status: 'unknown', average24h: null, limit: 60 },
  { pollutant: 'PM10', status: 'unknown', average24h: null, limit: 100 } ] };
const full: HouseholdContext = {
  routine: { commuteMode: 'two_wheeler', outdoorExercise: true, schoolCommute: true },
  home: { nearBusyRoad: 'yes', cookingFuel: 'biomass', kitchenExhaust: false, airPurifier: true },
  householdNeeds: { includesChildren: true, includesOlderAdults: true, mayBeMoreSensitive: true } };
const AIR_IDS = ['air.elevated', 'air.within-limit', 'exercise.indoor-alternative', 'commute.lower-traffic',
  'school.less-roadside-waiting', 'household.extra-caution', 'indoor.ventilation-tradeoff', 'indoor.purifier'];
const ids = (list: RecommendationCandidate[]) => list.map((c) => c.id);
const byId = (list: RecommendationCandidate[], id: string) => list.find((c) => c.id === id);
```

Tests and assertions:
- `unknown air with no details gives only evergreen advice`: `ids(buildCandidates({}, unknown))` equals `['data.unavailable', 'indoor.smoke-sources', 'swap.no-open-burning']`.
- `elevated air with no details`: equals `['air.elevated', 'indoor.ventilation-tradeoff', 'indoor.smoke-sources', 'swap.no-open-burning']`.
- `within-limit air with no details`: equals `['air.within-limit', 'indoor.smoke-sources', 'swap.no-open-burning']`.
- `full details and elevated air, in registry order`: equals `['air.elevated', 'exercise.indoor-alternative', 'commute.lower-traffic', 'school.less-roadside-waiting', 'household.extra-caution', 'indoor.ventilation-tradeoff', 'indoor.purifier', 'indoor.cooking-ventilate', 'indoor.cleaner-fuel', 'indoor.smoke-sources', 'home.busy-road', 'swap.fewer-car-trips', 'swap.no-open-burning']`.
- `elevated notice text`: `byId(buildCandidates({}, elevated), 'air.elevated')?.text` is `'The 24-hour model forecast average is above the national limit for PM2.5 (72.4 μg/m³, limit 60).'`; with PM10 also `above_limit` at `120` it ends `'… for PM2.5 (72.4 μg/m³, limit 60) and PM10 (120.0 μg/m³, limit 100).'`.
- `elevated notice lists only the pollutants above`: PM2.5 within 41.2, PM10 above 120 → text `'The 24-hour model forecast average is above the national limit for PM10 (120.0 μg/m³, limit 100).'`.
- `within-limit notice text`: text is `'The 24-hour model forecast averages are PM2.5 41.2 μg/m³ (limit 60) and PM10 63.5 μg/m³ (limit 100).'`; caveat starts `'Being within the national limit does not mean the air is clean or free of risk.'`.
- `commuter scenario` (TESTING_QA §6.1): `{ routine: { commuteMode: 'two_wheeler', outdoorExercise: true } }`, elevated → contains `exercise.indoor-alternative`, `commute.lower-traffic`, `swap.fewer-car-trips`; commute reason `'You travel by two-wheeler close to traffic, and the forecast is above the national 24-hour limit.'`; swap reason `'You said you get around by two-wheeler.'`.
- `car commute gets the swap but not the route advice`: `commuteMode: 'car'`, elevated → no `commute.lower-traffic`; swap reason `'You said you get around by car.'`. `public_transport` → neither.
- `parent scenario` (§6.2): `{ routine: { schoolCommute: true }, householdNeeds: { includesChildren: true } }`, elevated → contains `school.less-roadside-waiting`; caution reason `'You said your household includes children, and the forecast is above the national 24-hour limit.'`; caution `inputsUsed` equals `['householdNeeds.includesChildren', 'air.level']`.
- `extra caution names every group`: all three flags → reason `'You said your household includes children, older adults and someone who may be more sensitive to air pollution, and the forecast is above the national 24-hour limit.'`.
- `indoor scenario` (§6.3): `{ home: { cookingFuel: 'lpg', kitchenExhaust: true, airPurifier: true } }`, elevated → contains `indoor.ventilation-tradeoff`, `indoor.purifier`, `indoor.cooking-exhaust`; not `indoor.cooking-ventilate`, not `indoor.cleaner-fuel`. `kitchenExhaust: false` → `indoor.cooking-ventilate`; absent → neither cooking rule. `cookingFuel: 'biomass'` → `indoor.cleaner-fuel`.
- `busy road scenario` (§6.4): `nearBusyRoad: 'yes'` → `home.busy-road` with caveat containing `'45 km'`; `'no'` and `'unknown'` → absent.
- `unknown data gives no air advice` (§6.5): `buildCandidates(full, unknown)` → first id `data.unavailable`; no id from `AIR_IDS`; contains `exercise.check-conditions`.
- `forecast caveat on every air candidate` (§6.6): for `buildCandidates(full, elevated)` and `(full, within)`, every candidate whose `sourceIds` include `'open-meteo'` has `evidenceType 'data_driven_rule'`, `sourceIds` equal `['open-meteo', 'cpcb-naaqs-2009']`; the `air.*` notices' caveats contain `'not the CPCB National AQI'`; every other candidate has `evidenceType 'general_suggestion'` and `sourceIds` `[]`.
- `sensitive household scenario` (§6.8): `{ householdNeeds: { mayBeMoreSensitive: true } }`, elevated → caution reason contains `'someone who may be more sensitive to air pollution'`, caveat `'General information only, not medical advice.'`.
- `exercise advice follows the air`: `outdoorExercise: true` → elevated gives `exercise.indoor-alternative` and not `exercise.check-conditions`; within and unknown give the reverse.
- `false flags add nothing`: `{ routine: { outdoorExercise: false, schoolCommute: false }, home: { airPurifier: false }, householdNeeds: { includesChildren: false, includesOlderAdults: false, mayBeMoreSensitive: false } }`, elevated → ids equal the "elevated air with no details" list.
- `no banned wording`: for `full` and `{}` × `elevated`, `within`, `unknown`, every `title`, `text`, `reason`, `caveat` matches none of `/\bsafe(ly|ty)?\b/i`, `/guarantee/i`, `/healthy/i`, `/diagnos/i`, `/medicat/i`, `/\btreat/i`, `/always (open|close)/i`, `/(open|close) all (the )?windows/i`, `/%/`.
- `measurements only in the air notices`: across the same 6 runs, `/\d\s*μg/` matches only candidates whose id starts with `air.`.
- `ids are unique and sources are known`: for `buildCandidates(full, elevated)`, ids are unique; every `sourceIds` entry is a key of `SOURCE_REFERENCES`.
- `same input, same output, inputs untouched`: deep-freeze `full` and `elevated` (recursive `Object.freeze`); two calls return equal arrays and do not throw.

- [ ] **Step 2: Run to see it fail**

Run: `npm test -w server -- src/services/recommendations/rules.test.ts`
Expected: FAIL, cannot resolve `./rules.ts`.

- [ ] **Step 3: Add the types and implement `rules.ts`.** One ordered `const` array of rules (`id`, a `when(context, air)` predicate, and a function returning the rest of the candidate); `buildCandidates` filters and maps in array order. Copy every title/text/reason/caveat verbatim from the spec table; `LIMITS_REASON` and `FORECAST_CAVEAT` are module constants; interpolations use `UG_PER_M3`, `NAAQS_24H_LIMITS` and `toFixed(1)`. Joining for the extra-caution groups: one item as is, two with `' and '`, three as `'a, b and c'`. `inputsUsed` = the household field paths in the rule's condition (only the true ones for extra caution), then `'air.level'` for air rules; `air.*` notices use `['air.PM2_5', 'air.PM10']`; `data.unavailable` uses `['air.level']`; always-on rules use `[]`. `data.unavailable` is a `general_suggestion` with no sources (the spec marks it as no air rule).

- [ ] **Step 4: Run to see it pass**

Run: `npm test -w server -- src/services/recommendations/rules.test.ts`
Expected: all passed (22 tests).

- [ ] **Step 5: Docs.** `CHANGELOG.md` → under Added: "Phase 4 recommendation rules engine: household details schema, a 24-hour forecast check against India's NAAQS PM2.5/PM10 limits, and 17 explainable rules (server-only; no endpoint yet)." `docs/IMPLEMENTATION_PLAN.md` Phase 4 → an "As built (2026-11-18)" note: the air signal decision (NAAQS 24-hour limits), files, scenario 7 deferred until a CPCB feed exists, no endpoint until Phase 5, spec and plan paths.

- [ ] **Step 6: Full gate and commit**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test`
Expected: all pass; server count = previous 55 + 6 + 14 + 22.

```bash
git add shared/contracts.ts server/src/services/recommendations/rules.ts server/src/services/recommendations/rules.test.ts CHANGELOG.md docs/IMPLEMENTATION_PLAN.md
git commit -m "feat(server): deterministic recommendation rules with explanations"
```
