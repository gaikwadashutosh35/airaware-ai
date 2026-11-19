# Redesign Phase A: Dashboard and Live Skyline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/app` the Stitch look, with a hazy city skyline driven by the server's 24-hour air check. Every number and label stays real.

**Architecture:**
- The forecast API returns the server's existing `assessAir()` result as `airCheck`.
- The client turns it into a haze level for an inline-SVG `CitySkyline`.
- A new `AirReadout` card leads the dashboard.
- The "next two days" chart and a pollutant table follow.
- The plan column, the plan cards and the saved list are restyled.
- The layout becomes two columns at `lg` and stays one column below it.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (tokens in `client/src/index.css`), Vitest and Testing Library, Playwright, Express 5, Zod 4.

**Spec:** `docs/superpowers/specs/2026-11-19-stitch-redesign-design.md` (Phase A and "The hazy skyline").

## Global Constraints

- **Workflow:** follow `.claude/skills/airaware-ui/SKILL.md` for every task (read the rules, `modern-web-guidance`, see the screen first, fix test-first, prove it).
- **Styling:**
  - Only the `client/src/index.css` tokens. No new package, and no icon font, CDN or external font.
  - Icons are small inline SVG components with `aria-hidden="true"`.
  - The app stays light. Tap targets are at least 44 px (`min-h-11`), and nothing scrolls sideways at 320 px.
- **Content:**
  - No AQI.
  - No per-pollutant "Good" or "Moderate", and no clock times in plan cards.
  - No "safe", "healthy" or "clean air".
  - The rules' advice text is unchanged.
  - The chart keeps **no** 60 µg/m³ line.
- **The e2e tests depend on these names, which must keep their accessible names:**
  - headings "Model forecast" and "Saved plans";
  - the text "Official CPCB observation unavailable" and `/Retrieved /`;
  - `img` "PM2.5 and PM10 forecast chart" and its summary `/^PM2\.5 ranges from/`;
  - regions "Your day" and "Air notice" (with an `article`), and level-4 headings in "Your day";
  - the household select labels;
  - the buttons "Build my daily plan", "Save plan", "Delete my saved data" and "Delete everything".
- **Git:** one branch `main`. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push and deploy only with the owner's yes.

## Review Focus

1. **The forecast lacks this hour's PM2.5** (`hourForNow` is undefined, or the value is null). Expected: the readout says "No value", no invented figure appears, and the skyline still follows the 24-hour check. Task 3 test: `shows No value when this hour has no PM2.5`.
2. **PM2.5 is above the limit but PM10 is unknown.** Expected: level `elevated`, haze level 3 or more from PM2.5 alone, and PM10 worded as not checkable. Tests: Task 2 `uses the known ratio when one check is unknown`, and Task 3 `words an unknown PM10 check`.
3. **An average of exactly 60 µg/m³.** The status is "within" (above only when greater than the limit). Expected: haze level 2, never 3, so the picture agrees with the words. Task 2 test: `an average equal to the limit stays at level 2`.
4. **A stale forecast.** Expected: the stale sentence shows next to the skyline, and the haze still matches the data shown. Task 3 test: `keeps the stale sentence with the skyline`.
5. **A long place label at 320 px.** Expected: it wraps, and nothing overflows the place bar. Checked in Task 6 with `break-ui` worst-case data: a label of 120 characters.

---

### Task 1: `airCheck` in the forecast response

**Files:**
- Modify:
  - `shared/contracts.ts` (add `ForecastData`);
  - `server/src/routes/airQuality.ts` (the forecast handler);
  - `client/src/services/api.ts` (the `getForecast` return type);
  - `client/src/test/fixtures.ts` (`forecastFixture` gains `airCheck`);
  - `API.md` (the forecast response).
- Test: `server/src/routes/airQuality.test.ts`

**Interfaces:**
- Produces: `export interface ForecastData extends ForecastSeries { airCheck: AirAssessment }` in `shared/contracts.ts`.
- Produces: `getForecast(latitude, longitude, signal?): Promise<ForecastData>`.

- [ ] **Step 1: Write the failing tests** in the forecast `describe`, using the file's existing Open-Meteo stub and `vi.setSystemTime(NOW)`:
  - `returns the 24-hour air check for the same forecast`: `res.body.data.airCheck` deep-equals `assessAir(<the series in res.body.data, without airCheck/freshness>, NOW)`, and `res.body.data.airCheck.checks.map(c => c.pollutant)` is `['PM2_5', 'PM10']`.
  - `a forecast too short for a 24-hour window checks as unknown`: given a stub with fewer than 24 hours, `airCheck.level` is `'unknown'` and both `average24h` are `null`.
- [ ] **Step 2:** Run `npx vitest run src/routes/airQuality.test.ts` (in `server/`). Expected: the 2 new tests FAIL (`airCheck` is undefined).
- [ ] **Step 3: Implement.**
  - The handler takes `const now = new Date()` once and passes it to both `forecast(...)` and `assessAir(series, now)`.
  - It returns `{ ...series, freshness: 'unknown', airCheck }`.
  - Update `getForecast`'s type, `forecastFixture` (add the `airCheck` that `assessAir` gives for it, written as a literal), and the `API.md` forecast example with a one-line description.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck` at the root. Expected: everything passes.
- [ ] **Step 5: Commit**, `feat(api): forecast returns the server's 24-hour air check`.

### Task 2: Haze level and `CitySkyline`

**Files:**
- Create:
  - `client/src/features/air-quality/haze.ts`
  - `client/src/features/air-quality/CitySkyline.tsx`
- Test:
  - `client/src/features/air-quality/haze.test.ts`
  - `client/src/features/air-quality/CitySkyline.test.tsx`

**Interfaces:**
- Consumes: `AirAssessment` (`shared/contracts.ts`).
- Produces:
  - `export type HazeLevel = 0 | 1 | 2 | 3 | 4 | 5` (0 = neutral, no data);
  - `export function hazeLevel(check: AirAssessment): HazeLevel`;
  - `export function CitySkyline({ level }: { level: HazeLevel }): JSX.Element`.

- [ ] **Step 1: Write the failing tests.**
  - **`haze.test.ts`**, with `ratio = average24h / limit` and the maximum taken over the checks whose average is not null:

    | Test | Input | Expected level |
    |---|---|---|
    | `unknown air is level 0` | `level 'unknown'` | 0 |
    | `bands by the larger ratio` | PM2.5 20/60 and PM10 30/100 | 1 |
    | | PM2.5 45/60 | 2 |
    | | PM2.5 72/60 | 3 |
    | | PM2.5 100/60 | 4 |
    | | PM2.5 130/60 | 5 |
    | | PM10 160/100 with PM2.5 20/60 | 4 |
    | `an average equal to the limit stays at level 2` | 60/60 (`within_limit`) | 2 |
    | | 30/60 | 1 (upper bounds are inclusive: ≤0.5→1, ≤1→2, ≤1.5→3, ≤2→4, else 5) |
    | `uses the known ratio when one check is unknown` | `level 'elevated'`, PM2.5 72/60, PM10 `average24h: null` | 3 |
    | `the sky is never clear` | every non-unknown input | 1 or more |
    | `level 3 or more exactly when a check is above the limit` | a few cases | as stated |
  - **`CitySkyline.test.tsx`:**
    - the root `svg` has `aria-hidden="true"` and `data-haze-level` equal to the level;
    - `level 0` renders no element with `data-part="sun"`;
    - the `data-part="haze-front"` opacity at level 5 is greater than at level 1;
    - the SVG contains no `<text>` (it is decorative).
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality/haze.test.ts src/features/air-quality/CitySkyline.test.tsx` (in `client/`). Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement.**
  - `hazeLevel` follows the table.
  - `CitySkyline` is a static inline SVG with:
    - `viewBox="0 0 400 160"` and `preserveAspectRatio="xMidYMax slice"`;
    - a flat sky (`--color-surface-light` mixed toward grey as the level rises);
    - a sun disc `data-part="sun"`, whose opacity falls with the level and which is absent at 0;
    - a far building row, a near building row in `--color-text-dark-muted` and `--color-text-dark`, with a nod to an Indian skyline (one domed or arched silhouette);
    - two haze bands, `haze-mid` between the rows and `haze-front` in front, whose opacity comes from a per-level table.
  - Level 0 is flat grey with no sun.
  - No animation, no blur filter and no gradient.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): city skyline whose haze follows the 24-hour air check`.

### Task 3: `AirReadout` card

**Files:**
- Create: `client/src/features/air-quality/AirReadout.tsx`
- Test: `client/src/features/air-quality/AirReadout.test.tsx`

**Interfaces:**
- Consumes: `ForecastData` (Task 1); `hazeLevel` and `CitySkyline` (Task 2); `hourForNow` and `formatTime` (`forecast.ts`).
- Produces: `export function AirReadout({ data, now, stale }: { data: ForecastData; now: Date; stale: boolean }): JSX.Element`.

- [ ] **Step 1: Write the failing tests**, using `forecastFixture` and variants. Every test also runs `expectNoAxeViolations`.

  | Test | Expected |
  |---|---|
  | `leads with this hour's PM2.5` | h3 "Model forecast"; the PM2.5 value for `hourForNow` with `series.units.PM2_5`; the words "Values for <time>" |
  | `shows No value when this hour has no PM2.5` | the text "No value" |
  | `states the 24-hour check in words` | the above-limit fixture reads "PM2.5 24-hour average 72.4 μg/m³, above the 60 μg/m³ limit"; the PM10 line reads similarly for its own status |
  | `words an unknown PM10 check` | "PM10: not enough forecast hours for a 24-hour check" |
  | `says when air information is unavailable` | `level 'unknown'` shows "Air information unavailable", and the skyline has `data-haze-level="0"` |
  | `keeps the source line` | text matching `/Retrieved /` and the provider/model line |
  | `keeps the stale sentence with the skyline` | `stale` shows "Retrieved more than an hour ago. Reload for the latest forecast." and the skyline is still present |
  | `never says AQI, safe or healthy` | the rendered text matches none of `/\bAQI\b/i`, `/\bsafe/i`, `/healthy/i` |

  The unit comes from the series, and the limit's unit matches it, using the μ already in the data. Never retype "µ".
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality/AirReadout.test.tsx`. Expected: FAIL, because the module is missing.
- [ ] **Step 3: Implement `AirReadout`.**
  - A card: `rounded-lg border border-rule`, padding 20–32 px, and `CitySkyline` as a band across the top, about 96–128 px tall.
  - Then the h3 and the big figure (`text-5xl` / `text-6xl`, `tabular-nums`).
  - The status lines each carry an inline warning or info icon and the words.
  - Then the source and stale lines.
  - Copy the existing wording from `ForecastPanel` where it exists.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): air readout card with the 24-hour check in words`.

### Task 4: "Your city, the next two days" (chart and pollutant table)

**Files:**
- Modify:
  - `client/src/features/air-quality/ForecastPanel.tsx` (becomes this section; the headline moves to `AirReadout`);
  - `client/src/features/air-quality/ForecastChart.tsx` (styling only).
- Test: `client/src/features/air-quality/ForecastPanel.test.tsx` (existing file, or create it if it doesn't exist)

**Interfaces:**
- Consumes: `ForecastData` (Task 1).
- Produces: `ForecastPanel({ data, now }: { data: ForecastData; now: Date })`: an h3 "Your city, the next two days", the chart, a pollutant table, and the existing "Hourly forecast" details.

- [ ] **Step 1: Write the failing tests.**
  - `the pollutant table has a 24-hour check only for PM2.5 and PM10`. There are 6 rows (one per pollutant with a unit), each showing this hour's value and unit. The "24-hour check" cell reads:
    - "Above the limit" or "Within the limit" for PM2.5 and PM10, following `airCheck`;
    - "Not enough data" for an unknown check;
    - "Not assessed" for the other four.
  - `no category labels`: the text has no `/\b(Good|Moderate|Poor|Severe)\b/`.
  - `keeps the chart's accessible name and summary`: `img` named "PM2.5 and PM10 forecast chart", and text matching `/^PM2\.5 ranges from/`.
  - `keeps the chart free of a limit line`: no element with `data-part="limit-line"`, and the text has no `/60 μg\/m³ standard/i`.
- [ ] **Step 2:** Run `npx vitest run src/features/air-quality`. Expected: the new table tests FAIL; the older chart tests pass.
- [ ] **Step 3: Implement.**
  - Build the table with `<th scope>`, inside a horizontally scrollable focusable region like the existing hourly table.
  - Restyle the chart: an area fill under the PM2.5 line using `--color-primary` at low opacity, lighter grid lines, and the existing legend.
  - Remove the old value grid from this component (now in `AirReadout`).
- [ ] **Step 4:** Run the whole client suite with `npm test -w client`. Expected: PASS. Old tests that asserted the moved value grid are updated to assert it in `AirReadout` (this is a moved behaviour, not a weakened one; record a ledger ruling).
- [ ] **Step 5: Commit**, `feat(ui): next-two-days section with a pollutant table`.

### Task 5: Dashboard layout and place bar

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`
- Test: `client/src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `AirReadout` (Task 3), the new `ForecastPanel` (Task 4), `LocationSearch` and `UseMyLocation` (unchanged).

- [ ] **Step 1: Write the failing tests.**
  - `the Change button moves focus to the place search`: with a place chosen, clicking the button named "Change place" focuses the search `combobox`.
  - `air comes before the plan in reading order`: the readout's "Model forecast" heading precedes the "Your daily plan" heading (`compareDocumentPosition`).
  - `the readout shows before the next-two-days section`: the order is "Model forecast" heading, then "Your city, the next two days" heading.
  - The existing dashboard tests still pass, unchanged except where visible text moved (one ledger ruling per change).
- [ ] **Step 2:** Run `npx vitest run src/pages/Dashboard.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `main` widens to `max-w-6xl`.
  - The search row (search and "Use my location") stays visible at the top.
  - Below it, a grid `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6`:
    - Left column: a place bar card (`place.label`, wrapping, plus a "Change place" text button) → `AirReadout` → `ForecastPanel` → `ObservationPanel`.
    - Right column: `HouseholdPreferencesForm` → `DailyPlanSection` → `SavedPlansList` → `SourcesPanel`.
  - The empty and loading/error states sit in the left column.
  - The focus target `h2` "Air quality: <label>" stays.
  - **`ObservationPanel`** (`client/src/features/air-quality/ObservationPanel.tsx`) becomes a card with an inline info icon. Its wording stays the server's limitation text.
- [ ] **Step 4:** Run `npm test -w client`. Expected: PASS.
- [ ] **Step 5: Commit**, `feat(ui): two-column dashboard with a place bar`.

### Task 6: Plan column restyle and proof

**Files:**
- Modify:
  - `client/src/features/daily-plan/PlanView.tsx`
  - `client/src/features/daily-plan/PlanCard.tsx`
  - `client/src/features/daily-plan/SavedPlansList.tsx`
  - `client/src/features/daily-plan/DailyPlanSection.tsx` (buttons only)
  - `CHANGELOG.md`
- Test: `PlanView.test.tsx` and `PlanCard.test.tsx` (existing)

**Interfaces:**
- Consumes: `PERIODS` (`planDisplay.ts`).

- [ ] **Step 1: Write the failing tests.**
  - `the Air notice carries a word tag`: the tag reads "Above the limit" for `air.level 'elevated'`, "Within the limit" for `'not_elevated'`, and "No data" for `'unknown'`, inside the "Air notice" region.
  - `Your day cards show their period as a chip`: an AI plan's featured `home` item shows the chip text "At home".
  - `plan cards show no clock times`: the rendered "Your day" region text has no `/\b\d{1,2}:\d{2}\b/`.
- [ ] **Step 2:** Run `npx vitest run src/features/daily-plan`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - The summary card holds the made-by line.
  - The tag is a small bordered label with its words.
  - The chips use `PERIODS` labels.
  - Cards are `rounded-lg border border-rule p-5`.
  - "Save plan" is primary: `bg-primary text-text-dark`, 44 px tall. "Delete my saved data" stays an outlined button.
  - Saved plans become a list with dividers.
  - Headings, regions and the article roles keep their names.
- [ ] **Step 4: The gate**, every item and its real output:
  - `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`;
  - `npm run e2e` locally (all 16, desktop and phone).
- [ ] **Step 5: See it.**
  - Start the `api` and `web` servers from `.claude/launch.json`.
  - Screenshot `/app?place=Pune%2C%20Maharashtra&lat=18.52&lon=73.86` at 320 px and 1280 px, before and after.
  - Run `break-ui` with a 120-character place label: there's no horizontal scroll, and tap targets are 44 px.
  - Use the keyboard to Tab through the search, the place bar, the plan form and the cards.
- [ ] **Step 6: Commit**, `feat(ui): plan cards, chips and tags in the Stitch style`, with a CHANGELOG line. Show the owner the screenshots and ask before pushing.
