# Phase 7 — The Daily Plan on Screen: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the daily plan on the dashboard (build, explain, save, reopen), add the forecast chart, a sources and limitations panel and a privacy page, and check the whole journey with Playwright.

**Architecture:** Client-only feature work on top of the Phase 5–6 endpoints. The plan, chart and stale-data rules live in small pure modules (`planDisplay.ts`, `chart.ts`, `clock.ts`) with unit tests. Thin React components draw them, and `Dashboard.tsx` holds the shared state: household answers, the opened saved plan, the list version and a running clock. The only server change is serving `index.html` at `/privacy`. Playwright runs the built app on one port, as in production.

**Tech Stack:** React 19, Tailwind v4 (DESIGN.md tokens), Vitest 5 + Testing Library + axe-core, Express 5, `@playwright/test` (new, root dev dependency, Chromium only).

**Spec:** `docs/superpowers/specs/2026-11-19-phase7-plan-screen-design.md`

## Global Constraints

- **Dependencies:** exactly one new dependency, `@playwright/test` as a root dev dependency. Chromium only. No new runtime dependency. Accessibility checks reuse the installed `axe-core`.
- **Data kinds:**
  - The forecast stays a `model_forecast`.
  - Nothing is called an AQI or relabelled as CPCB.
  - The air-check row always carries: "Model forecast for an area about 45 km wide. Not a station measurement and not the CPCB AQI."
- **Stale data:**
  - `isOlderThan(iso, now, 60)`, with `now` from a running clock (ticks every minute and when the tab becomes visible).
  - Forecast figures and the chart marker stay at load time; the marker says "At load".
  - A saved plan always shows under the snapshot banner.
- **Accounts:** building a plan never creates an account. Only "Save plan" and "Save my answers" call `tokenForSave()`.
- **Coordinates** leave the browser with at most 2 decimals.
- **Colour:**
  - Colour is never the only signal.
  - Only DESIGN.md token utilities are used (`text-text-dark`, `stroke-text-dark-muted`, `border-rule`, …), never a literal colour.
- **Wording:**
  - No medical advice, no "safe", no guarantee.
  - Rule text is shown unchanged.
  - Every user-facing string named below is copied verbatim.
- **Repo:** under 10 MB, one branch (`main`), no worktrees. Playwright browsers go to the user cache.
- **Gate:** after every task, run `npx prettier --write <changed files>; set -o pipefail; npm run typecheck; npm run lint; npm run format:check; npm test`. Every part must be clean.
- **Commits:** on `main`. Every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never run `git checkout`/`git restore` on a file with uncommitted work; revert with Edit.

**Fixed copy** (spec):

| Where | Text |
|---|---|
| Build button | "Build my daily plan" |
| No place | "Choose a place first." |
| Answers changed | "Your answers changed. Build the plan again to use them." |
| Made-by, AI | "Made with AI (`<model>`, prompt `<promptVersion>`). The advice text and sources come from our fixed rules." (rendered without backticks) |
| Made-by, rules | "Made by our rules. AI personalisation is unavailable right now." |
| Empty topic | "No suggestions in this area for your answers today." |
| High priority | "Important today" |
| Based on | "today's forecast check" / "general guidance" |
| No source | "No external source; this is general guidance." |
| Save note | "Saved on this browser only. Clearing your browser data or switching devices loses it." |
| Save success | "Saved on this browser. This is the plan as saved." |
| Save 409 | "You can keep up to 20 saved plans. Delete one to save another." |
| Save failure | "Saving isn't available right now." |
| Not set up | "Saving isn't set up on this site." |
| List empty | "No saved plans yet." |
| List failure | "Your saved plans couldn't be loaded right now." |
| Banner | "Saved plan from `<savedAt>`. This is a snapshot, not current air information." + button "Back to today" |
| Forecast stale | "Retrieved more than an hour ago. Reload for the latest forecast." |
| Plan stale | "This plan was built more than an hour ago. Build it again for the latest forecast." |
| No air data | "Air information is unavailable for this plan." |
| Limitations 1–4 | as in spec §"Sources and limitations panel", verbatim |

**Copy this plan adds** (the spec leaves exact copy to the builder):

| Where | Text |
|---|---|
| Loading | "Building your plan. This can take up to 30 seconds." |
| Plan error fallback | "Something went wrong building your plan." |
| Open failure | "This saved plan couldn't be opened right now." |
| Delete one plan | legend "Delete this saved plan? It can't be undone.", buttons "Delete plan" / "Cancel" |
| Household path in "What it used" | `Your answer to "<question label>"` |

## Review Focus

1. **"Delete my saved data" while saved plans are listed or one is open.**
   - Expected: the list disappears, the snapshot closes, and the live plan area resets, so no "Saved on this browser" claim outlives the data.
   - Pinned in Task 7 (reset) and Task 8 (list and snapshot).
2. **A slow plan response arriving after the person picked another place.**
   - Expected: the old place's plan never shows under the new place.
   - Pinned in Task 7 (Dashboard test).
3. **Double-activating "Build my daily plan" or "Save plan".**
   - Expected: one request, not two. A second save would also eat the 20-plan limit.
   - Pinned in Task 7.
4. **Opening a saved plan from the list, which sits below the plan.**
   - Expected: focus moves to the snapshot banner, and "Back to today" brings the live plan back, not lost.
   - Pinned in Task 8.
5. **A tab left hidden for hours, then shown again.**
   - Expected: the stale messages appear at once, not up to a minute later.
   - Pinned in Task 1 (`useNow`) and Task 3 (Dashboard).

---

### Task 1: Clock and date helpers

**Files:**
- Create: `client/src/lib/clock.ts`, `client/src/lib/clock.test.ts`
- Modify: `client/src/features/air-quality/forecast.ts` (add `formatDateTime`), `client/src/features/air-quality/forecast.test.ts`

**Interfaces:**
- Produces:
  - `isOlderThan(iso: string, now: Date, minutes: number): boolean`
  - `useNow(): Date`
  - `formatDateTime(iso: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// clock.test.ts
const now = new Date('2026-11-19T12:00:00Z');
it('is older only past the limit', () => {
  expect(isOlderThan('2026-11-19T10:59:00Z', now, 60)).toBe(true);
  expect(isOlderThan('2026-11-19T11:00:00Z', now, 60)).toBe(false);
  expect(isOlderThan('2026-11-19T11:30:00Z', now, 60)).toBe(false);
  expect(isOlderThan('2026-11-19T13:00:00Z', now, 60)).toBe(false);
});
it('treats an unreadable time as old, never current', () => {
  expect(isOlderThan('not a time', now, 60)).toBe(true);
});
// useNow, with vi.useFakeTimers() and vi.setSystemTime(now); renderHook
it('ticks every minute', ...);            // advanceTimersByTime(60_000) → result is now + 60 s
it('updates at once when the tab is shown again', ...); // Review Focus 5:
// setSystemTime(now + 3 h), set document.visibilityState 'visible' (Object.defineProperty),
// dispatch 'visibilitychange' without advancing timers → result.current equals now + 3 h
it('stops ticking after unmount', ...);   // unmount, then vi.getTimerCount() === 0

// forecast.test.ts
it('formats a date with day, month and time zone', () => {
  const iso = '2026-11-20T02:30:00Z';
  const text = formatDateTime(iso);
  expect(text).toContain(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(iso)));
  expect(text).toContain(new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(new Date(iso)));
  expect(text).toMatch(/[A-Z]{2,}|GMT/); // a zone name
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -w client -- src/lib/clock.test.ts src/features/air-quality/forecast.test.ts`
Expected: FAIL (`isOlderThan`, `useNow` and `formatDateTime` are not exported).

- [ ] **Step 3: Implement**

- `isOlderThan`: `Date.parse(iso)`. NaN → `true`. Otherwise `now − t > minutes × 60 000`.
- `useNow`: `useState(() => new Date())`. One `setInterval(…, 60_000)` and one `visibilitychange` listener, which updates only when `document.visibilityState === 'visible'`. Clean both up on unmount.
- `formatDateTime`: one module-level `Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })`, next to `formatTime`.

- [ ] **Step 4: Run them and watch them pass**

Run: the same command. Expected: PASS.

- [ ] **Step 5: Gate and commit**

```bash
git add client/src/lib/clock.ts client/src/lib/clock.test.ts client/src/features/air-quality/forecast.ts client/src/features/air-quality/forecast.test.ts
git commit -m "feat(client): running clock, stale check and date formatting"
```

### Task 2: Chart maths

**Files:**
- Create: `client/src/features/air-quality/chart.ts`, `client/src/features/air-quality/chart.test.ts`

**Interfaces:**
- Consumes: `formatDateTime` (Task 1), `ForecastHour` (from `forecast.ts`).
- Produces:
  - `niceCeiling(max: number): number`. The smallest 1, 2 or 5 × 10ⁿ that is ≥ max; `10` when max ≤ 0 or not finite.
  - `valueRuns(values: ReadonlyArray<number | null | undefined>, yMax: number): Array<Array<{ x: number; y: number }>>`
    - Coordinates are in a 0–100 × 0–100 box, with y = 0 at the top.
    - `x = n === 1 ? 50 : (i × 100) / (n − 1)` and `y = 100 − (v × 100) / yMax`. Multiply first, so the test's exact values hold.
    - A new run starts after every missing value.
  - `tickIndexes(count: number, every = 6): number[]`, i.e. `0, 6, 12, …` while the index is below `count`.
  - `markerIndex(times: ReadonlyArray<string>, at: Date): number | null`. The index of the hour that contains `at`; otherwise `null`. Unlike `hourForNow`, it never falls back to the first hour.
  - `summarize(hours: ReadonlyArray<ForecastHour>, pollutant: 'PM2_5' | 'PM10', unit: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
it('rounds the axis up to 1, 2 or 5 × 10ⁿ', () => {
  expect([niceCeiling(0), niceCeiling(7), niceCeiling(48), niceCeiling(92), niceCeiling(101), niceCeiling(Number.NaN)])
    .toEqual([10, 10, 50, 100, 200, 10]);
});
it('breaks the line at a missing hour instead of joining across it', () => {
  expect(valueRuns([10, null, 20, 30], 40)).toEqual([
    [{ x: 0, y: 75 }],
    [{ x: 200 / 3, y: 50 }, { x: 100, y: 25 }],
  ]);
  expect(valueRuns([null, undefined], 10)).toEqual([]);
  expect(valueRuns([5], 10)).toEqual([[{ x: 50, y: 50 }]]);
});
it('labels every 6th hour', () => {
  expect(tickIndexes(48)).toEqual([0, 6, 12, 18, 24, 30, 36, 42]);
  expect(tickIndexes(3)).toEqual([0]);
});
it('marks the load hour only when it is in the forecast', () => {
  const times = forecastFixture.hours.map((h) => h.time); // 17:00, 18:00, 19:00 UTC
  expect(markerIndex(times, new Date('2026-11-17T18:30:00Z'))).toBe(1);
  expect(markerIndex(times, new Date('2026-11-17T21:00:00Z'))).toBeNull();
});
it('summarises range, peak time and gaps', () => {
  const hours = forecastFixture.hours; // PM2.5 48, 45.6, 43.1
  expect(summarize(hours, 'PM2_5', 'μg/m³')).toBe(
    `PM2.5 ranges from 43.1 to 48 μg/m³ over the next 3 hours, highest around ${formatDateTime(hours[0].time)}.`);
  const gappy = hours.map((h, i) => (i === 1 ? { ...h, values: { ...h.values, PM10: null } } : h));
  expect(summarize(gappy, 'PM10', 'μg/m³')).toMatch(/ No value for 1 of 3 hours\.$/);
  const none = hours.map((h) => ({ ...h, values: {} }));
  expect(summarize(none, 'PM10', 'μg/m³')).toBe('No PM10 values in this forecast.');
});
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/air-quality/chart.test.ts`. Expected: FAIL, the module is not found.
- [ ] **Step 3: Implement the five functions** in `chart.ts`. The pollutant's short name comes from `POLLUTANTS`. A tie for the peak takes the first hour.
- [ ] **Step 4: Run and watch pass.** Same command. Expected: PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): forecast chart maths`.

### Task 3: Forecast chart and stale forecast message

**Files:**
- Create: `client/src/features/air-quality/ForecastChart.tsx`, `client/src/features/air-quality/ForecastChart.test.tsx`
- Modify: `client/src/features/air-quality/ForecastPanel.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: Task 2's functions, plus `useNow` and `isOlderThan` (Task 1).
- Produces:
  - `ForecastChart({ series, loadedAt }: { series: ForecastSeries; loadedAt: Date })`
  - `ForecastPanel` gains the prop `stale?: boolean` (default `false`).
  - `Dashboard` now calls `const now = useNow()`. Later tasks reuse it.

**Drawing contract:**
- The SVG uses `viewBox="0 0 100 100"`, `preserveAspectRatio="none"` and a fixed CSS height (`h-48`).
- Every line has `vector-effect="non-scaling-stroke"`.
  - PM2.5 is a solid 2 px `stroke-text-dark` polyline per run.
  - PM10 is a dashed `stroke-text-dark-muted` polyline (`stroke-dasharray` 6 4).
  - A run of one point is a zero-length `<line>` with a round cap.
  - Grid lines use `stroke-rule`.
  - Every line or dot carries `data-pollutant="PM2_5"` or `"PM10"`.
- Axis labels are HTML, not SVG text, so they stay readable at 320 px:
  - y: `yMax μg/m³` at the top and `0` at the bottom;
  - x: `formatTime` of each `tickIndexes` hour, positioned with `left: x%`.
- The "At load" marker is a vertical dotted line plus an HTML label "At load".
- The SVG has `role="img"` and `aria-label="PM2.5 and PM10 forecast chart"`.
- Below it:
  - a text legend: "PM2.5 (solid line)" and "PM10 (dashed line)";
  - two `<p>` summaries from `summarize`.
- The chart goes just above the "Hourly forecast" `<details>` and replaces nothing.

- [ ] **Step 1: Write the failing tests**

```ts
// ForecastChart.test.tsx (forecastFixture; loadedAt 2026-11-17T17:30Z)
it('is a labelled image with a text summary', ...);
// getByRole('img', { name: 'PM2.5 and PM10 forecast chart' });
// getByText(summarize(forecastFixture.hours, 'PM2_5', 'μg/m³')); same for PM10;
// getByText('PM2.5 (solid line)'); getByText('PM10 (dashed line)')
it('marks the load hour as "At load", never "now"', ...); // getByText('At load'); queryByText(/\bnow\b/i) === null
it('draws no marker when the load time is outside the forecast', ...); // loadedAt 2026-11-18 → no 'At load'
it('breaks the PM2.5 line at a missing hour', ...); // hour 1 PM2_5 null → container.querySelectorAll('[data-pollutant="PM2_5"]') has 2 marks
it('passes axe', ...);

// Dashboard.test.tsx (system time 2026-11-17T17:30Z, fixture retrieved 17:05Z)
it('says the forecast is old once it passes an hour, without a reload', async () => {
  routeFetch(ok()); render(<Dashboard />); await choosePlace();
  expect(screen.queryByText(FORECAST_STALE)).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(36 * 60_000); }); // 18:06Z
  expect(screen.getByText(FORECAST_STALE)).toBeDefined();
  // the figures stay at load time
  expect(screen.getByText(`Values for ${formatTime(forecastFixture.hours[0].time)}`)).toBeDefined();
});
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/air-quality/ForecastChart.test.tsx src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL and the old ones pass.
- [ ] **Step 3: Implement.**
  - `ForecastChart` uses only `stroke-*` and `text-*` token utilities.
  - `ForecastPanel` renders `<ForecastChart series={series} loadedAt={now} />` and, when `stale`, a `<p>` with the forecast-stale copy under the "Retrieved" line.
  - `Dashboard` passes `stale={isOlderThan(series.retrievedAt, now, 60)}`.
- [ ] **Step 4: Run and watch pass.** Same command, then `npm test -w client`. Expected: all PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): 48-hour forecast chart and stale forecast notice`.

### Task 4: Sources and limitations panel

**Files:**
- Modify: `client/src/features/air-quality/SourcesPanel.tsx`, `client/src/features/air-quality/ForecastPanel.tsx` (remove the "Limitations" block), `client/src/pages/Dashboard.tsx`, `client/src/pages/Dashboard.test.tsx`
- Create: `client/src/features/air-quality/SourcesPanel.test.tsx`

**Interfaces:**
- Produces:
  - `SourcesPanel({ sources, forecastLimitations }: { sources: SourceInfo[] | null; forecastLimitations: string[] })`
  - `export const LIMITATIONS: readonly string[]`, which holds spec lines 1–4 verbatim.

**Layout:**
- An `h2` "Sources and limitations", then an `h3` "Sources" (only when `sources` is non-null) and an `h3` "Limitations".
- Each source keeps its current fields.
- Limitations show `LIMITATIONS` followed by `forecastLimitations`.
- `Dashboard` renders the panel at the end of `<main>`, always:
  - `sources` when ready, else `null`;
  - `forecastLimitations` from the ready forecast, else `[]`.

- [ ] **Step 1: Write the failing tests**

```ts
it('always lists the four fixed limitations, then the forecast ones', ...);
// getAllByRole('listitem') inside the Limitations list → [...LIMITATIONS, ...forecastFixture.limitations]
it('lists sources with licence and connection state', ...); // 'Connected', 'Not connected', 'Licence: CC BY 4.0'
it('leaves out the sources list when sources failed', ...); // sources null → no 'Sources' h3, limitations still there
it('passes axe', ...);
// Dashboard.test.tsx
it('shows the forecast limitations once, in the sources panel', ...);
// getAllByText('Not the CPCB National AQI.') has length 1, inside region 'Sources and limitations'
```
Update `never shows an AQI number`. Before the `\bAQI\b` assertion, strip these phrases, longest first:
1. `'We do not calculate the CPCB National AQI'`
2. `'Not the CPCB National AQI'`
3. `'CPCB National AQI'`, the CPCB source's name.

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/air-quality/SourcesPanel.test.tsx src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as described.
- [ ] **Step 4: Run and watch pass.** Run `npm test -w client`. Expected: all PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): sources and limitations panel`.

### Task 5: Plan display rules and plan fixtures

**Files:**
- Create: `client/src/features/daily-plan/planDisplay.ts`, `client/src/features/daily-plan/planDisplay.test.ts`, `client/src/test/planFixtures.ts`

**Interfaces:**
- Consumes: `FIELDS` and `fieldId` (`householdFields.ts`), plus the contract types.
- Produces:

```ts
export type Topic = 'action' | 'indoor' | 'swap';
export interface PlanItem {
  candidate: RecommendationCandidate;
  forYou: string | null;
  period: PlanPeriod | null;
  compact: boolean; // true = title + "In your day: <period label>" only
}
export const PERIODS: ReadonlyArray<readonly [PlanPeriod, string]>;
// [morning 'Morning'], [commute 'Commute'], [daytime 'Daytime'], [evening 'Evening'], [home 'At home']
export const TOPICS: ReadonlyArray<readonly [Topic, string]>;
// [action 'Outdoors and travel'], [indoor 'Indoor air'], [swap 'Sustainable swaps']
export function groupPlan(plan: DailyPlan): {
  yourDay: Array<{ period: PlanPeriod; label: string; items: PlanItem[] }>;
  topics: Array<{ section: Topic; heading: string; items: PlanItem[] }>;
};
export function madeByLine(plan: Pick<DailyPlan, 'generatedBy' | 'model' | 'promptVersion'>): string;
export function basedOn(evidence: RecommendationCandidate['evidenceType']): string;
export function inputLabel(path: string): string;
export function checkText(check: PollutantCheck): string;
```

`checkText` copy:
- Known: `PM2.5: 24-hour average 71.2 μg/m³, limit 60 μg/m³, above the limit` (or `within the limit`).
- Unknown: `PM2.5: 24-hour average not available, limit 60 μg/m³`.

`inputLabel`:
- A household path → `Your answer to "<FIELDS label>"`.
- `air.level` → `the 24-hour forecast check`.
- `air.PM2_5` → `the PM2.5 24-hour forecast average`.
- `air.PM10` → `the PM10 24-hour forecast average`.
- Anything else is returned as-is.

**Fixtures** (`client/src/test/planFixtures.ts`, test-only, with a header comment saying so):
- Generate the candidates once with a scratch script that imports `buildCandidates` from `server/src/services/recommendations/rules.ts` (Node runs TypeScript directly). Inputs:
  - context: `{ routine: { outdoorExercise: true, commuteMode: 'car' }, home: { airPurifier: true, kitchenExhaust: false } }`;
  - an elevated `AirAssessment`: PM2.5 above, PM10 within, `windowStart` `2026-11-17T17:00:00.000Z`.
- Paste the candidates unchanged. Never hand-edit rule text.
- Then build three fixtures:
  - `rulesPlanFixture`: shaped like `buildPlan`'s rules output.
    - `generatedBy: 'rules'`, `model`, `promptVersion` and `summary` null.
    - `featured`: every non-notice candidate with `period: null` and `forYou: null`; `more: []`.
    - `forecast`: retrieved `2026-11-17T17:05:00.000Z`.
    - `sources`: both entries.
  - `aiPlanFixture`: `generatedBy: 'ai'`, `model: 'gemini-3.8-flash'`, `promptVersion: 'daily-plan-v1'`, plus a summary.
    - `featured` holds exactly:
      - an action in `morning`, with a `forYou`;
      - an indoor candidate in `home`, with a `forYou`;
      - a swap with `period: null`.
    - `more` holds the remaining non-notice candidates.
  - `unavailablePlanFixture`: what `buildPlan` returns for a provider failure.
    - `air.level` `unknown`, `windowStart` null, both checks `unknown` with null averages.
    - `forecast: null`, and `notices` holds the `data.unavailable` candidate. Generate it the same way, with an `unknown` assessment.

- [ ] **Step 1: Write the fixtures, then the failing tests**

```ts
it('puts every rules-plan suggestion in its topic, in full, with no "Your day"', () => {
  const { yourDay, topics } = groupPlan(rulesPlanFixture);
  expect(yourDay).toEqual([]);
  expect(topics.map((t) => t.heading)).toEqual(['Outdoors and travel', 'Indoor air', 'Sustainable swaps']);
  const ids = topics.flatMap((t) => t.items.map((i) => i.candidate.id));
  expect(ids.sort()).toEqual(rulesPlanFixture.featured.map((f) => f.candidate.id).sort());
  expect(topics.flatMap((t) => t.items).every((i) => !i.compact)).toBe(true);
});
it('orders "Your day" by period and drops empty periods', () => {
  expect(groupPlan(aiPlanFixture).yourDay.map((p) => p.period)).toEqual(['morning', 'home']);
});
it('repeats a "Your day" item compactly in its topic, featured before more', ...);
// the morning action is compact in 'Outdoors and travel' and is its first item; the null-period swap is full
it('always returns the three topics, even when empty', ...); // featured [] and more [] → 3 topics with items []
it('never shows a notice as a topic item', ...);
it('says who made the plan', () => {
  expect(madeByLine(rulesPlanFixture)).toBe('Made by our rules. AI personalisation is unavailable right now.');
  expect(madeByLine(aiPlanFixture)).toBe('Made with AI (gemini-3.8-flash, prompt daily-plan-v1). The advice text and sources come from our fixed rules.');
});
it('labels inputs in plain words and never hides an unknown one', () => {
  expect(inputLabel('routine.outdoorExercise')).toBe('Your answer to "Do you exercise outdoors?"');
  expect(inputLabel('air.level')).toBe('the 24-hour forecast check');
  expect(inputLabel('air.PM2_5')).toBe('the PM2.5 24-hour forecast average');
  expect(inputLabel('air.PM10')).toBe('the PM10 24-hour forecast average');
  expect(inputLabel('weather.wind')).toBe('weather.wind');
});
it('describes the evidence', ...); // basedOn → "today's forecast check" / "general guidance"
it('states each check in words', ...); // above, within and unknown, with the exact copy above
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/daily-plan/planDisplay.test.ts`. Expected: FAIL, the module is not found.
- [ ] **Step 3: Implement `planDisplay.ts`.**
  - `groupPlan` ignores any `section: 'notice'` item.
  - "Featured" means `plan.featured` in its given order; `more` follows in its given order.
- [ ] **Step 4: Run and watch pass.** Same command. Expected: PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): daily-plan display rules`.

### Task 6: Plan view

**Files:**
- Create: `client/src/features/daily-plan/PlanView.tsx`, `client/src/features/daily-plan/PlanCard.tsx`, `client/src/features/daily-plan/PlanView.test.tsx`

**Interfaces:**
- Consumes: Task 5's exports and `formatDateTime` (Task 1).
- Produces: `PlanView({ plan }: { plan: DailyPlan })`, used by Task 7 and Task 8.

**Render order (spec):**
1. The made-by line.
2. The summary (AI only, when non-null).
3. `h3` "Air notice": every notice as a card with its caveat visible, never collapsed.
4. `h3` "Air check":
   - window: `Next 24 hours from <formatDateTime(windowStart)>`, or `No complete 24-hour forecast window`;
   - one `checkText` line per check;
   - the fixed model-forecast line;
   - the source line `Open-Meteo model forecast, retrieved <formatDateTime(forecast.retrievedAt)>`, or the no-air-data copy when `forecast` is null.
5. `h3` "Your day", only when `yourDay` is non-empty: an `h4` per period, then cards with their "For you" line.
6. The three topic `h3`s, with cards or the empty-topic line.
7. `plan.safetyNote`, last.

**Card (`PlanCard`):**
- The title and text; "Important today" only for `high`.
- A compact card shows the title plus `In your day: <label>` only.
- A full or notice card has `<details>` (closed) with `<summary>Why?<span className="sr-only"> (<title>)</span></summary>`, listing:
  - Reason;
  - Based on (`basedOn`);
  - What it used (`inputLabel` for each path; left out when the list is empty);
  - Sources: links built from `plan.sources` for the card's `sourceIds`, or the no-source copy;
  - Caveat, when present. Notices also show their caveat outside the details.

- [ ] **Step 1: Write the failing tests**

```ts
it('shows a complete rules plan: made-by, notice first, three topics, no "Your day"', ...);
// made-by rules copy; no heading 'Your day'; topic headings in order;
// the notice title precedes 'Outdoors and travel' (compareDocumentPosition & DOCUMENT_POSITION_FOLLOWING);
// the safety note is the last paragraph
it('shows the AI summary, "Your day" in order and "For you" lines', ...);
it('shows every suggestion text exactly once', ...);
// for each non-notice candidate in aiPlanFixture: getAllByText(c.text) has length 1;
// getByText('In your day: Morning')
it('says when air information is unavailable', ...);
// unavailablePlanFixture → 'Air information is unavailable for this plan.' and the data.unavailable title
it('always says the air check is a model forecast, not a station or the CPCB AQI', ...);
it('shows the empty-topic line', ...); // rulesPlanFixture with every swap removed from featured → under 'Sustainable swaps'
it('explains each card in a closed "Why?" panel', ...);
// first details element not open; inside it: the reason, "today's forecast check" or "general guidance",
// a source link with the plan's url; a candidate with sourceIds [] → the no-source copy
it('marks only high priority as "Important today"', ...);
it('passes axe for the rules plan and the AI plan', ...);
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/daily-plan/PlanView.test.tsx`. Expected: FAIL, the module is not found.
- [ ] **Step 3: Implement `PlanView` and `PlanCard`.** Cards use `border-rule` panels like the existing dashboard.
- [ ] **Step 4: Run and watch pass.** Same command. Expected: PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): daily plan view with "Why?" panels`.

### Task 7: Building and saving the plan

**Files:**
- Create: `client/src/features/daily-plan/DailyPlanSection.tsx`, `client/src/features/daily-plan/DailyPlanSection.test.tsx`
- Modify:
  - `client/src/services/api.ts`, `client/src/services/api.test.ts`
  - `client/src/components/States.tsx`
  - `client/src/features/daily-plan/HouseholdPreferencesForm.tsx` and its test
  - `client/src/pages/Dashboard.tsx`, `client/src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `PlanView` (Task 6), `isOlderThan` (Task 1), `toContext` and `Answers`.
- Produces:
  - `export interface PlanBody { place: { label: string; latitude: number; longitude: number }; householdContext?: HouseholdContext }`. `savePlan(token, body: PlanBody)` now uses it.
  - `buildDailyPlan(body: PlanBody, signal?: AbortSignal): Promise<DailyPlan>`, which POSTs to `/api/v1/recommendations/daily-plan`.
  - `ErrorState` gains `fallback?: string`, the default message. The forecast default stays as it is.
  - `HouseholdPreferencesForm` changes:
    - new props `onChange?: (context: HouseholdContext) => void` and `onDeleted?: () => void`;
    - `onChange` fires with `toContext(next)` wherever the answers change (select, loaded saved answers, delete);
    - `onDeleted` fires only after a successful "Delete everything";
    - `SAVE_NOTE` and `NOT_SET_UP` are exported, and the form's own constants are renamed to them.
  - `DailyPlanSection({ place, context, now, onSaved }: { place: Place | null; context: HouseholdContext; now: Date; onSaved: () => void })`. `section` gets an `h2` "Your daily plan".

**Behaviour:**
- **Body:** the label, `Number(latitude.toFixed(2))`, `Number(longitude.toFixed(2))`, and `householdContext: context`.
- **Build:**
  - The button is disabled while building, so a double click sends one request.
  - Loading shows a `role="status"` paragraph with the loading copy.
  - Errors show `<ErrorState fallback="Something went wrong building your plan." onRetry={build} />`.
  - An `AbortController` is aborted on unmount.
- **Answers changed:** `JSON.stringify(context)` at build is kept. When it differs from the current one, show the answers-changed copy.
- **Stale:** `isOlderThan(plan.forecast?.retrievedAt ?? builtAt.toISOString(), now, 60)` shows the plan-stale copy.
- **Save:**
  - Calls `tokenForSave()`, then `savePlan(token, sameBody)`.
  - Disabled while saving.
  - On success:
    - show `saved.plan`;
    - set `builtAt = new Date(saved.savedAt)` (the server's save time), so the stale check covers a saved plan whose `forecast` is null;
    - show the save-success copy;
    - hide the Save button;
    - call `onSaved()`.
  - `ApiError` 409 → the 409 copy. Anything else → the save-failure copy.
  - Show the save note under the button.
  - `!savingAvailable` → the button is disabled and the not-set-up copy shows.
- **Dashboard:**
  - holds `context` (from the form's `onChange`) and `resets` (bumped by `onDeleted`);
  - renders `<DailyPlanSection key={`${place?.label}|${forecastKey}#${resets}`} … />` after the form;
  - `onSaved` is a no-op until Task 8.

- [ ] **Step 1: Write the failing tests**

```ts
// api.test.ts
it('posts the plan request and returns the plan', ...); // method POST, JSON body as given, path above

// DailyPlanSection.test.tsx (mock lib/supabase.ts as HouseholdPreferencesForm.test.tsx does; place Pune 18.51957/73.85535)
it('needs a place first', ...); // place null → button disabled, aria-describedby → 'Choose a place first.'
it('sends the place with 2 decimals and the answers on screen', ...);
// body { place: { label: 'Pune, Maharashtra', latitude: 18.52, longitude: 73.86 }, householdContext: { home: { airPurifier: true } } }
it('shows the loading status, then the plan', ...);
it('sends one request for a double click', ...);                         // Review Focus 3
it('never creates an account to build a plan', ...);                     // tokenForSave and currentToken not called
it('explains a rate limit and retries', ...);                            // 429 → 'Too many requests. Try again in a minute.'; 'Try again' → second POST
it('uses plan wording for other errors', ...);                           // 500 INTERNAL_ERROR → fallback copy
it('says when the answers changed since the plan was built', ...);       // rerender with another context → copy; back → gone
it('says the plan is old once its forecast passes an hour', ...);        // rerender now = retrievedAt + 61 min
it('falls back to the build time when the plan has no forecast', ...);   // unavailablePlanFixture; now + 61 min
it('saves the plan the server returns', ...);
// tokenForSave → POST /api/v1/plans with 'Bearer tok' and the same body; the returned plan has place.label 'Saved label'
// → 'Saved label' shown; success copy; Save button gone; onSaved called once
it('treats a saved plan as old an hour after it was saved', ...);
// the save returns unavailablePlanFixture (forecast null) with savedAt = now; rerender now + 61 min → plan-stale copy
it('sends one save for a double click', ...);                            // Review Focus 3
it('explains the 20-plan limit', ...);                                   // 409 → copy, no success text
it('never claims a save that failed', ...);                              // 503 and tokenForSave rejects → save-failure copy
it('says when saving is not set up', ...);                               // available false → disabled + copy
it('passes axe with a plan shown', ...);

// HouseholdPreferencesForm.test.tsx
it('reports answers as they change', ...);       // select Yes for air purifier → onChange({ home: { airPurifier: true } })
it('reports loaded saved answers', ...);
it('reports a finished delete only', ...);       // onDeleted after success; not after DELETE_FAILED

// Dashboard.test.tsx gains the form test's vi.mock('../lib/supabase.ts'), with available: false
// by default so every existing test keeps saving off; tests that need a session switch it on.
it('builds the plan from the answers on screen without saving them', ...);
it('clears the shown plan when a new place is chosen', ...);
it('never shows an old place plan under a new place', ...);              // Review Focus 2
// build for Pune with a pending daily-plan promise; choosePlace(1); resolve it → no made-by line, the button is idle
it('clears the shown plan after "Delete everything"', ...);              // Review Focus 1 (reset part)
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/services/api.test.ts src/features/daily-plan src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as described.
- [ ] **Step 4: Run and watch pass.** Run `npm test -w client`. Expected: all PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): build and save the daily plan`.

### Task 8: Saved plans list and snapshots

**Files:**
- Create: `client/src/features/daily-plan/SavedPlansList.tsx`, `client/src/features/daily-plan/SavedPlansList.test.tsx`
- Modify: `client/src/features/daily-plan/DailyPlanSection.tsx` and its test, `client/src/pages/Dashboard.tsx`, `client/src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `currentToken`, `listPlans`, `getPlan`, `deletePlan`, `formatDateTime` and `PlanView`.
- Produces:
  - `SavedPlansList({ version, onOpen, onDeleted }: { version: number; onOpen: (saved: SavedPlan) => void; onDeleted: (id: string) => void })`
  - `DailyPlanSection` gains `opened: SavedPlan | null` and `onBackToToday: () => void`.

**SavedPlansList:**
- Loads on mount and whenever `version` changes:
  - `currentToken()` null → render nothing;
  - otherwise `listPlans`.
- `h2` "Saved plans". Rows show `placeLabel` and `saved <formatDateTime(savedAt)>`, sorted newest first on the client too. Each row has "Open" and "Delete".
- Open → `getPlan` → `onOpen`. A failure shows the open-failure copy.
- Delete:
  - shows a fieldset with the delete-one copy, and focus goes to "Cancel";
  - "Delete plan" → `deletePlan` → `onDeleted(id)`, then reload;
  - a failure leaves the row and shows "Nothing was deleted. Try again in a moment."
- Empty and failure use their copy.

**DailyPlanSection with `opened`:**
- Show the banner (focused on open, `tabIndex={-1}`), its "Back to today" button and `<PlanView plan={opened.plan} />`.
- No Save button, no stale or answers-changed lines.
- The live plan state is kept underneath and comes back on "Back to today".

**Dashboard:**
- New state: `opened`, `listVersion`.
- `choose()` also clears `opened`.
- `onSaved` bumps `listVersion`.
- The form's `onDeleted` also clears `opened` and bumps `listVersion`.
- `SavedPlansList` renders after the plan section: `onOpen={setOpened}`, `onDeleted={(id) => opened?.id === id && setOpened(null)}`.

- [ ] **Step 1: Write the failing tests**

```ts
// SavedPlansList.test.tsx
it('shows nothing and fetches nothing without a session', ...);
it('lists saved plans newest first with local times', ...);   // unsorted input → sorted rows; formatDateTime text
it('says when there are none', ...);
it('says when the list could not load', ...);                 // currentToken rejects; listPlans 503
it('opens a saved plan', ...);                                // getPlan with token + id → onOpen(saved)
it('says when a saved plan could not be opened', ...);
it('deletes one plan after a confirmation', ...);             // focus on Cancel; 'Delete plan' → DELETE; onDeleted(id); reloads
it('reloads when the version changes', ...);
it('handles 20 saved plans and long labels', ...);            // 20 rows; 120-character label is shown in full
it('passes axe', ...);

// DailyPlanSection.test.tsx
it('shows a saved plan under the snapshot banner, focused', ...);   // Review Focus 4
// banner text with formatDateTime(savedAt); document.activeElement is the banner; no Save button; no stale copy
it('brings the live plan back after "Back to today"', ...);         // Review Focus 4

// Dashboard.test.tsx (mock lib/supabase.ts with a session for these)
it('hides the list and closes the snapshot after "Delete everything"', ...);  // Review Focus 1
it('closes a snapshot when a new place is chosen', ...);
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/features/daily-plan src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as described.
- [ ] **Step 4: Run and watch pass.** Run `npm test -w client`. Expected: all PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat(client): saved plans list and snapshots`.

### Task 9: Privacy page

**Files:**
- Create: `client/src/pages/Privacy.tsx`
- Modify:
  - `client/src/App.tsx`, `client/src/App.test.tsx`
  - `client/src/pages/Landing.tsx`, `client/src/pages/Dashboard.tsx` (footer link), with their tests
  - `server/src/app.ts`, `server/src/app.test.ts`

**Interfaces:**
- Produces:
  - `/privacy` renders `Privacy`.
  - The server sends `index.html` for `app.get(['/app', '/privacy'], …)`.

**Privacy page:**
- `<title>Privacy | AirAware AI</title>`, an `h1` "Privacy", and the same header and light surface as the dashboard.
- Plain language, from `PRIVACY.md` "as built", one `h2` each:
  1. **What stays in your browser:**
     - answers on screen;
     - the saving session, only after a save click.
  2. **What Open-Meteo receives,** through our server:
     - the search text;
     - coordinates rounded to 2 decimals. Device location is asked only after "Use my location".
  3. **What Gemini receives,** when AI personalisation is on:
     - the 24-hour forecast check;
     - the text of the suggestions our rules picked, whose reasons can mention your answers (for example "You said you exercise outdoors");
     - never the place name, coordinates or account.
  4. **What Supabase stores** (Mumbai), only after a save click:
     - an anonymous account;
     - saved answers;
     - saved plans with the place label, without coordinates;
     - Supabase Auth's IP address and user agent;
     - Supabase logs, which are not removed on deletion.
     - The owner and Supabase can access the database.
  5. **How to delete:**
     - "Delete my saved data";
     - deleting single plans;
     - clearing browser data loses access but doesn't delete;
     - unused accounts are not removed automatically yet.
  6. **No analytics.** Server logs hold no tokens, account ids, answers, labels or plans.
- It says it is not legal advice only if `PRIVACY.md` does; it does not add claims.
- Footers: a "Privacy" link (`href="/privacy"`) next to the attribution on the landing, dashboard and privacy pages.

- [ ] **Step 1: Write the failing tests**

```ts
// App.test.tsx
it('shows the privacy page at /privacy', ...); // one main; h1 'Privacy'; the six h2s; axe
// Landing.test.tsx / Dashboard.test.tsx
it('links to the privacy page from the footer', ...); // getByRole('link', { name: 'Privacy' }) href '/privacy'
// server/src/app.test.ts: add '/privacy' to the 'serves the built client at %s' list
```

- [ ] **Step 2: Run and watch fail.** Run `npm test -w client -- src/App.test.tsx src/pages` and `npm test -w server -- src/app.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as described. Update the `App.tsx` comment: three pages, still no router.
- [ ] **Step 4: Run and watch pass.** Run `npm test`. Expected: all PASS.
- [ ] **Step 5: Gate and commit.** Message: `feat: privacy page`.

### Task 10: Stress pass

**Files:**
- Modify: whatever the pass finds.
- Temporary, never committed: `client/src/pages/StressPreview.tsx` and any route to it.

- [ ] **Step 1: Run `break-ui`** on `DailyPlanSection`/`PlanView` and `SavedPlansList`. Use a temporary preview page under `npm run dev -w client`. Worst cases:
  - a 120-character place label;
  - every rule candidate present;
  - all three topics empty;
  - both averages missing;
  - 20 saved plans;
  - long caveats and reasons.

  Check at 320 px and 1280 px in the browser pane.
- [ ] **Step 2: For each break in logic:** write a failing test in the owning component's test file, watch it fail, fix it, watch it pass. **For each visual-only break:** fix it and re-check at both widths.
- [ ] **Step 3: Delete the preview page and route.** Run `git status --short`. Expected: no stress-preview file listed.
- [ ] **Step 4: Gate and commit.** Message: `fix(client): stress-pass fixes for the plan screen`. If nothing broke, there is no commit; write a ledger line saying so.

### Task 11: Playwright setup and failure tests

**Files:**
- Modify: `package.json` (root: dev dependency, `"e2e": "playwright test --config e2e/playwright.config.ts"`, `"typecheck": "npm run typecheck --workspaces --if-present && tsc -p e2e"`)
- Create: `e2e/playwright.config.ts`, `e2e/tsconfig.json`, `e2e/axe.ts`, `e2e/routes.ts`, `e2e/failures.spec.ts`

**Interfaces:**
- Consumes: `forecastFixture` (`client/src/test/fixtures.ts`), the three plan fixtures (Task 5), and the copy above.
- Produces:
  - `expectNoAxeViolations(page: Page): Promise<void>`. It reads `node_modules/axe-core/axe.min.js` and loads it with `page.evaluate(source)` (not `addScriptTag`, which the CSP blocks). It runs `axe.run(document)` with colour contrast **on**, and expects the `${id}: ${help}` list to equal `[]`.
  - Used by Task 12.

**Config:**
- `testDir: '.'`, `workers: 1`, `fullyParallel: false`, `retries: 0`, `timeout: 120_000`.
- `use.baseURL: 'http://localhost:8090'`.
- Projects:
  - `desktop`: `devices['Desktop Chrome']`;
  - `phone`: `devices['Pixel 7']`.
- `webServer`:
  - `command: 'npm run build -w client && node --env-file-if-exists=server/.env server/src/server.ts'`
  - `cwd: '..'`
  - `env: { PORT: '8090' }`
  - `url: 'http://localhost:8090/api/v1/health'`
  - `reuseExistingServer: false`
  - `timeout: 180_000`

**`e2e/tsconfig.json`:**
- `compilerOptions`: strict, `module` nodenext, `lib` ES2023 + DOM, `types: ["node"]`, `noEmit`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `skipLibCheck`.
- `include: ["."]`.

**Failure tests:**
- Open `/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86`.
- `page.route` covers `**/api/v1/air-quality/forecast**` and `**/api/v1/recommendations/daily-plan`.
- `routes.ts` moves fixture times to "now":
  - forecast hours start at the current UTC hour, with `retrievedAt` = now;
  - plan `forecast.retrievedAt` = now and `air.windowStart` = that hour.

| Test | Routed responses | Expected on screen |
|---|---|---|
| Provider down | forecast 502 `PROVIDER_ERROR`; plan `unavailablePlanFixture` | "Forecast provider unavailable."; after building: the `data.unavailable` notice title and the no-air-data copy |
| Stale | forecast and plan retrieved 3 h ago | the forecast-stale copy; after building: the plan-stale copy |
| AI down | fresh `rulesPlanFixture` | the made-by rules copy; the three topic headings; no "Your day" heading |
| AI up | fresh `aiPlanFixture` | the summary; "Your day" with "Morning" before "At home"; a "For you" line |
| Plan error | daily-plan 429 `RATE_LIMITED` | "Too many requests. Try again in a minute." |

Every failure test ends with `expectNoAxeViolations(page)`.

- [ ] **Step 1: Install.** Run `npm install -D @playwright/test` (root), then `npx playwright install chromium`. Expected: `package.json` gains one dev dependency, and the browser downloads to the user cache (`git status` shows only `package.json` and `package-lock.json`).
- [ ] **Step 2: Write the config, tsconfig, helpers and `failures.spec.ts`.**
- [ ] **Step 3: Run it.** Run `npm run e2e -- failures.spec.ts`. Expected: 10 passed (5 tests × 2 projects). These check behaviour built in Tasks 3–8, so a first-run failure is a finding: debug it, don't adjust the test to match.
- [ ] **Step 4: Prove a test can fail.**
  1. Change the rules made-by copy in `planDisplay.ts` with Edit.
  2. Run `npm run e2e -- failures.spec.ts -g "AI down"`. Expected: FAIL on the made-by line.
  3. Revert with Edit (never `git checkout`) and rerun. Expected: PASS.
- [ ] **Step 5: Gate** (`typecheck` now includes `tsc -p e2e`; lint covers `e2e/`). **Commit.** Message: `test: Playwright setup and failure-state journeys`.

### Task 12: Live journey test

**Files:**
- Create: `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: `expectNoAxeViolations` (Task 11).

**One test, `TESTING_QA.md` §7 steps 1–12, with `test.step` per step, against real Open-Meteo and Supabase:**
1. Open `/app`.
2. Search "Pune", pick "Pune, Maharashtra".
3. Check:
   - "Model forecast";
   - "Official CPCB observation unavailable";
   - a "Retrieved …" line;
   - the chart image;
   - a summary that starts "PM2.5 ranges from".
4. Answer "Do you exercise outdoors?" Yes and "Do you have an air purifier?" Yes.
5. Build. Check:
   - the made-by line matches `/^Made (by our rules|with AI)/`;
   - the "Air notice" section has at least one card;
   - the model-forecast line shows.
6. Open the first "Why?" and check that "Reason" shows.
7. Check the "Indoor air" heading and at least one card or the empty-topic line.
8. Check the "Sustainable swaps" heading the same way.
9. If "Saving isn't set up on this site." is visible, `test.skip(true, 'Supabase settings missing in client/.env: save steps 9–12 skipped.')`. Otherwise save, and check the save-success copy.
10. Reload. "Saved plans" lists exactly 1 row containing "Pune, Maharashtra".
11. Second context (`browser.newContext` with the project's device settings), as user B:
    - open the same URL, build, save;
    - B's "Saved plans" lists exactly 1 row;
    - B uses "Delete my saved data" → "Delete everything" and sees "Deleted. Nothing is saved now.";
    - close it.
12. User A: "Delete my saved data" → "Delete everything", then reload. There is no "Saved plans" heading.

End with `expectNoAxeViolations(page)`.

**Cleanup:**
- A `try/finally` per context deletes any account left behind if a step fails:
  1. read the access token from `localStorage` (key matching `/^sb-.*-auth-token$/`);
  2. call `page.request.delete('/api/v1/account', { headers: { Authorization: 'Bearer …' } })`.
- The token is never logged or attached.
- Each run creates 4 anonymous accounts (2 per project) and deletes all of them.
- Each run makes 8 plan requests (A build and save, B build and save, per project), under the 10-per-minute plan limit.
- Each run makes 4 anonymous sign-ins, under Supabase's 30 per hour. Note both limits in a comment.

- [ ] **Step 1: Write `journey.spec.ts`.**
- [ ] **Step 2: Run it.** Run `npm run e2e -- journey.spec.ts`. Expected: 2 passed (desktop and phone), or 2 skipped with the step-9 reason when Supabase isn't configured. Record which.
- [ ] **Step 3: Check that nothing leaked.** Wait at least one minute after Step 2 (the plan limit), then run `npm run e2e` (the whole suite, once). Expected: 12 passed. Then ask the owner to look at Supabase → Authentication → Users and confirm it is empty. The executor does not open the Supabase dashboard itself.
- [ ] **Step 4: Gate and commit.** Message: `test: live end-to-end journey with UI isolation check`.

### Task 13: Docs

**Files:**
- Modify: `USER_GUIDE.md`, `CHANGELOG.md`, `docs/IMPLEMENTATION_PLAN.md` (Phase 7 "As built"), `TESTING_QA.md` §7, `SETUP.md`

- [ ] **Step 1: Write the docs.**
  - `USER_GUIDE.md`: the plan (building, "Why?", topics, "Your day"), saving and reopening plans, the snapshot banner, stale messages, the privacy page.
  - `TESTING_QA.md` §7: `npm run e2e`, what it needs (network, `server/.env`, `client/.env`), the skip rule, and the two rate limits.
  - `SETUP.md`: `npx playwright install chromium` in §4, and `npm run e2e` in §8.
  - `docs/IMPLEMENTATION_PLAN.md` Phase 7 "As built":
    - the files;
    - the real Vitest counts (from the last `npm test`) and the real Playwright result from Task 12;
    - the deferred items (landing chapters follow-up; Playwright in CI is Phase 8's decision).
  - `CHANGELOG.md`: a Phase 7 entry.
- [ ] **Step 2: Check.** Run `npm run format:check` (Markdown is ignored, so also re-read each changed section). Check that each command quoted in the docs exists in `package.json`.
- [ ] **Step 3: Commit.** Message: `docs: phase 7 plan screen as built`.
