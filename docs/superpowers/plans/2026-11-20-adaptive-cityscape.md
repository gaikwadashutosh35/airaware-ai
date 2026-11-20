# Adaptive Cityscape, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Today's skyline band becomes a layered city (sky gradient, daylight glow, soft clouds, far, middle and near rows with rooftop tanks and windows). Its look follows only `airCheck.level`; its clouds, rain, fog, heat and glow follow only `weather`.

**Architecture:**
- **Server:** the weather call asks Open-Meteo for one more variable, `is_day`, and the contract gains `weather.isDay: boolean | null`.
- **Client state:** `scene.ts` maps the existing data to a small `Scene`. Five ratio bands and `haze.ts` give way to three air states.
- **Drawing:** `CitySkyline` draws the layers from token colours. `Loading` reuses the same geometry as a still silhouette.
- **Unchanged:** the band's place, its heights and the words beside it.

**Tech stack:** React 19, Tailwind v4 tokens, inline SVG and CSS; Express 5 and Zod 4; Vitest, Testing Library and Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-20-adaptive-cityscape-design.md`, approved 20 Nov 2026 "as recommended" (D1 a, D2 a, D3 a, D4 a). Visual reference: `docs/superpowers/specs/2026-11-20-cityscape-states.html`, whose `scene()` function is the drawing to port. Brief: `AirAware_AI_Adaptive_Cityscape_Background_Spec.md`.

## Global constraints

- **Start after Phase 4:** begin only once the Phase 4 hand-off session has committed its final review fixes. It edits CHANGELOG.md, DESIGN.md and `index.css`.
- **Air look:** comes only from `airCheck.level`: `not_elevated` → `within`, `elevated` → `above`, `unknown` → `unknown`.
  - No ratios, averages or new thresholds.
  - No AQI.
  - No smog band.
- **Weather layers:** come only from `weather`:
  - **Clouds:** 0 below 20 %, 1 from 20 %, 2 from 50 %, 3 from 80 % cover (unchanged).
  - **Rain:** only when `precipitationMm ≥ 0.2`.
  - **Heat:** at 35 °C or more, when there is no rain (unchanged).
  - **Fog:** below 1,000 m visibility (unchanged).
  - **Glow:** only when `weather.isDay === true`, the air is known, there is no rain and clouds are below 3.
- **Colours:** tokens only, through `var(--color-*)` and `color-mix(in oklab, …)`, with the design's values.
  - **Sky:**
    - within: `secondary` 46 % into `surface-light`, down to `surface-light`;
    - above: `secondary` 14 % into `rule`, down to `rule` 45 % into `surface-light`;
    - unknown: `rule` down to `surface-light`;
    - with 3 clouds, the top mixes 45 % into `rule`.
  - **Glow:** opacity 0.6 when within, 0.22 when above.
  - **Far veil:** 0.05 within, 0.42 above, 0 unknown. **Middle veil:** 0.2, above only.
  - **Buildings:** far row in `text-dark-muted` at 0.42; middle row in `text-dark-muted` 55 % into `text-dark` at 0.62; near row in `text-dark` at 0.9.
- **Words:** none on the artwork. The weather line, verdict, tag, "Model forecast · Open-Meteo · updated {time}" and the "Not current" banner stay exactly as they are.
- **Motion:**
  - Transform only.
  - Clouds drift 16 px over 4.8 s once, then rest.
  - Only `motion-safe:`.
  - The rain is unchanged.
  - Nothing moves for more than 5 s.
- **Accessibility:**
  - The SVG is `aria-hidden`, with no text and nothing focusable.
  - Band heights stay `h-32 sm:h-44`.
  - Windows are `max-sm:hidden`.
- **API:** the only change is the nullable `weather.isDay`.
- **Process:** follow `.claude/skills/airaware-ui/SKILL.md`; test-first; no push. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## My calls (for your review)

1. **`isDay` is read from this hour's row.** `is_day` is a point value, unlike the precipitation sums, which come from the next row. Cost if wrong: the glow switches an hour early or late at dawn and dusk.
2. **A weather object without `isDay` counts as unknown,** for example one cached before the deploy, so no glow. Cost if wrong: no glow for up to 10 minutes after a deploy.
3. **`Loading band` draws `<CitySkyline scene={null} />`,** so the placeholder is the same geometry: a generic component imports a feature one. Cost if wrong: one import going the other way.
4. **Gradient and pattern ids come from `useId()` with anything but letters, digits, `_` and `-` removed,** so `url(#…)` always resolves. Cost if wrong: none.
5. **Heat keeps its shimmer band and makes the glow larger** (radius 62 → 76), as the 19 Nov design's "larger, brighter sun" did. Cost if wrong: none.
6. **The test hooks change:** `data-haze-level` becomes `data-air` (`within`, `above`, `unknown`, or `loading`) and `data-clouds`. Cost if wrong: none.
7. **The client fixture gets `isDay: false`,** because its hour, 17:00 UTC, is 22:30 in Pune. Cost if wrong: none.

## Review focus

1. **Weather leaking into the air look, or air into the weather.** Overcast must not add a veil; above-the-limit must not add clouds. Tests: Task 2 `air and weather never change each other`, and `veils follow the air state only`.
2. **A glow at night,** or with unknown weather, unknown air, rain or overcast. Tests: Task 2 `the glow needs daylight and known weather`, and `a weather object without isDay draws no glow`.
3. **The provider omitting `is_day`, or the weather call failing.** Expected: `isDay` null and no glow; the air forecast unaffected. Test: Task 1 `reads day and night for the hour`.
4. **Motion past 5 s, or under reduced motion.** Tests: Task 2 `clouds drift once, within five seconds`, and the Task 3 e2e checks.
5. **Two skylines on one page sharing gradient ids** (the loading band and the ready band during a swap), and the 320 px fold. Tests: Task 2 `each skyline uses its own ids`; Task 4 screenshots at 320 × 640 with the verdict title above the bottom bar.

---

### Task 1: Day or night in the weather

**Files:**
- Modify `shared/contracts.ts` (`WeatherNow`), `server/src/services/air-data/openMeteoWeather.ts` and its test, `server/src/services/air-data/cachedWeather.test.ts`, `client/src/test/fixtures.ts`, `client/src/features/air-quality/scene.test.ts` (its `weather()` helper), API.md (the `WeatherNow` block and its prose line), and INTEGRATIONS.md (its list of weather variables gains `is_day`).

**Interfaces (produces):**
- `WeatherNow.isDay: boolean | null`: true for 1, false for 0, null when missing.

- [ ] **Step 1: Write the failing tests** in `openMeteoWeather.test.ts`:
  - `asks the fixed host for this hour's variables`: `hourly` becomes `'temperature_2m,precipitation,precipitation_probability,cloud_cover,visibility,is_day'`.
  - `reads day and night for the hour`:
    - `body(T10, { is_day: [1, 0, 0] })` gives `isDay: true`;
    - `[0, 1, 1]` gives `false`;
    - `body()` without `is_day` gives `null`.
- [ ] **Step 2:** Run `npm test -w server -- openMeteoWeather`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add `'is_day'` to `VARIABLES` and as a schema column.
  - Return `isDay: at('is_day') === null ? null : at('is_day') === 1`, from row `i`.
  - Add `isDay` to the contract and to every `WeatherNow` literal that `npm run typecheck` names. Use `isDay: false` in the client fixture (My call 7).
  - In API.md, add `isDay: boolean | null; // Open-Meteo is_day for this hour`.
- [ ] **Step 4:** Run `npm test -w server` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit, `feat(weather): day or night for this hour`.

### Task 2: The scene's state and the new drawing

**Files:**
- Modify `client/src/features/air-quality/scene.ts`, `scene.test.ts`, `CitySkyline.tsx` and `CitySkyline.test.tsx`; `client/src/features/today/TodayLead.test.tsx`; and `client/src/index.css` (a drift token).
- Delete `client/src/features/air-quality/haze.ts` and `haze.test.ts`.

**Interfaces:**
- Consumes `WeatherNow.isDay` from Task 1.
- Produces:
  - `export type SceneAir = 'within' | 'above' | 'unknown';`
  - `export interface Scene { air: SceneAir; clouds: 0 | 1 | 2 | 3; rain: boolean; heat: boolean; fog: boolean; glow: boolean }`
  - `sceneFromConditions(air: AirAssessment, weather: WeatherNow | null): Scene`
  - `CitySkyline({ scene }: { scene: Scene | null })`: `null` draws the loading silhouette.
  - The SVG carries `data-air` (`within`, `above`, `unknown` or `loading`) and `data-clouds`.
  - `data-part` hooks: `sky`, `glow`, `clouds` (a group, always present when `scene` is set), `cloud`, `cloud-deck`, `far`, `veil-far`, `mid`, `veil-mid`, `near`, `tanks`, `windows`, `fog`, `rain` and `shimmer`.
  - CSS token `--animate-drift`, with keyframes `cloud-drift`.

- [ ] **Step 1: Write the failing scene tests** (rewrite `scene.test.ts`; keep its clouds, heat, fog and unknown-fields tests):
  - `air state comes from the server level only`:
    - `not_elevated` gives `within`, `elevated` gives `above`, `unknown` gives `unknown`;
    - two `elevated` checks with averages 61 and 200 both give `above`.
  - `no weather adds no weather layers and no glow`: `sceneFromConditions(within, null)` equals `{ air: 'within', clouds: 0, rain: false, heat: false, fog: false, glow: false }`.
  - `rain only from a forecast amount`:
    - `precipitationMm` 0.2 gives `true`;
    - 0.19 gives `false`;
    - 0 with probability 90 gives `false`;
    - `null` with probability 90 gives `false`.
  - `the glow needs daylight and known weather`:
    - `isDay` true and clear gives `true`;
    - `isDay` false gives `false`;
    - `isDay` null gives `false`;
    - cover 80 gives `false`;
    - rain gives `false`;
    - air `unknown` gives `false`.
  - `a weather object without isDay draws no glow`: a `WeatherNow` with `isDay` deleted gives `glow: false`.
  - `air and weather never change each other`:
    - For every level against clear, overcast, rain and null weather, `air` depends only on the level.
    - `clouds`, `rain`, `heat` and `fog` depend only on the weather.
- [ ] **Step 2: Write the failing skyline tests** (rewrite `CitySkyline.test.tsx`; keep `the rain stops within five seconds`, `the rain loop is seamless`, `the heat band stays still` and `animations only run when motion is welcome`):
  - `is decorative and carries its state`: `aria-hidden="true"`, `data-air`, `data-clouds`, no `<text>`, no `[tabindex]` and no `<a>`.
  - `the sky follows the air state`:
    - The `sky` gradient's top stop style contains `var(--color-secondary) 46%` (within), `var(--color-secondary) 14%` (above), or `var(--color-rule)` with no `secondary` (unknown).
    - With 3 clouds, the top mixes into `var(--color-rule)`.
  - `veils follow the air state only`:
    - `veil-far` opacity is 0.05, 0.42 and 0;
    - `veil-mid` exists only for `above`, at 0.2;
    - for the same air, 0 and 3 clouds give the same veils.
  - `the glow follows the scene`: present only when `glow` is true. Opacity is lower above than within, and the radius is larger with heat.
  - `clouds by count, with a deck when overcast`: `cloud` counts 0 to 3; `cloud-deck` appears only at 3.
  - `clouds drift once, within five seconds`:
    - The `clouds` group's class has `motion-safe:animate-drift` and no bare `animate-`.
    - `--animate-drift` is not `infinite`, and duration × runs is 5 s or less.
  - `the same buildings in every air state`: the `far`, `mid` and `near` groups' markup is identical for within, above and unknown.
  - `no smog in any state`: no `[data-part="smog"]`.
  - `windows are hidden on phones`: the `windows` group's class contains `max-sm:hidden`.
  - `rooftop tanks sit on the near row`: the `tanks` group exists, with one tank per third near building.
  - `loading draws a still, neutral silhouette`: `scene={null}` gives `data-air="loading"`, with no `glow`, `cloud`, `veil-far`, `rain` or `[class*="animate-"]`.
  - `each skyline uses its own ids`: two skylines rendered together have different `linearGradient` ids, and each `url(#…)` points to an id in its own SVG.
  - In `TodayLead.test.tsx`, the haze tests become `the scene follows the air check`: an elevated check gives `data-air="above"`, and the fixture gives `unknown`. `the scene follows the weather` asserts `data-air`, not `data-haze-level`.
- [ ] **Step 3:** Run `npm test -w client -- scene CitySkyline TodayLead`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - **`scene.ts`:** the mapping in Global constraints. Delete `haze.ts` and `haze.test.ts`.
  - **`CitySkyline.tsx`:** port the sheet's `scene()`. Keep the existing `FAR`, `NEAR`, `shifted`, dome, arch, `CLOUDS` and `RAIN` geometry. Add `MID = [[12,30,66],[50,24,52],[86,32,74],[132,20,58],[226,28,68],[262,22,56],[296,34,78],[338,26,62],[374,22,50]]` and `MID_ALL = [...MID, ...shifted(MID, 5)]`.
    - **Clouds:** `surface-light` with a `rule` shade.
    - **Deck:** an ellipse at (400, −6), 520 × 30, `rule` at 0.85.
    - **Tanks:** every third near building, `i % 3 === 1`.
    - **Windows:** a 7 × 9 pattern of 3 × 4 `surface-light` panes at 0.5.
    - **Glow:** a radial gradient on the `warning` token, centred (560, 58), r 62, or 76 with heat.
    - **Fog, rain and shimmer:** as today.
    - Colours go in `style`, with `var(--color-*)` and `color-mix`. Ids follow My call 4.
  - **`index.css`:** beside `--animate-rain`, add `--animate-drift: cloud-drift 4.8s cubic-bezier(0.23, 1, 0.32, 1) 1 both;`, with `@keyframes cloud-drift { from { transform: translateX(-16px); } to { transform: translateX(0); } }`.
- [ ] **Step 5:** Run `npm test -w client` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6:** Commit, `feat(scene): a layered city whose look follows the air check and weather`.

### Task 3: A still silhouette while loading, and motion in a real browser

**Files:**
- Modify `client/src/components/States.tsx` and `States.test.tsx`.
- Create `e2e/scene.spec.ts`.

**Interfaces:** consumes `CitySkyline({ scene: null })` from Task 2.

- [ ] **Step 1: Write the failing tests:**
  - `States.test.tsx`, `the forecast band is a still skyline silhouette`: in `<Loading label="Loading forecast" band />`, `[data-part="skeleton-band"]` holds `svg[data-air="loading"]`, sits inside `aria-hidden`, and has no `animate-` class. The text lines still pulse only under `motion-safe` (the existing test, unchanged).
  - `e2e/scene.spec.ts` uses `routeApi(page, { forecast: { data: forecastAt(new Date()) } })` and `PUNE` from `e2e/routes.ts`:
    - `clouds drift then rest`: `[data-part="clouds"]` has computed `animation-name` `cloud-drift`, and after 5.5 s its computed `transform` is `none` or the identity matrix.
    - `no drift under reduced motion`: after `page.emulateMedia({ reducedMotion: 'reduce' })`, `animation-name` is `none`.
- [ ] **Step 2:** Run `npm test -w client -- States` and `npx playwright test -c e2e/playwright.config.ts scene`. Expected: the unit test FAILS. The e2e tests pass already (Task 2 built the drift), so prove they bite: remove `motion-safe:` from the clouds class, watch `no drift under reduced motion` fail, then restore it, and ledger it.
- [ ] **Step 3: Implement:** `Loading`'s band renders `<CitySkyline scene={null} />` at the band's size, without `animate-pulse`.
- [ ] **Step 4:** Run `npm test -w client` and `npm run e2e`. Expected: PASS.
- [ ] **Step 5:** Commit, `feat(scene): a still skyline while the forecast loads`.

### Task 4: Docs and proof

**Files:**
- `DESIGN.md`: the §8 `TodayLead` line, and the §9 motion lines (the drift; the scene's look and its sources).
- CHANGELOG.md.
- `docs/superpowers/specs/2026-11-19-weather-scene-design.md`: an "*Amended (cityscape, 20 Nov 2026)*" note for the rain rule, the smog removal and the glow.
- `docs/superpowers/specs/2026-11-19-stitch-redesign-design.md`: an "*Amended*" note on the haze table.

- [ ] **Step 1: Docs** as listed above.
- [ ] **Step 2: Screenshots of the five states.**
  - Use a scratch Playwright script against the dev servers, never committed.
  - Stub the forecast with `page.route`, using the fixture with:
    - `airCheck.level` `not_elevated` and both checks within;
    - `elevated`;
    - `unknown`;
    - `retrievedAt` 2 hours ago, for stale;
    - a request that never answers, for loading.
  - Set `weather.isDay: true` with 30 % cover.
  - Capture each at 320 × 640, 390 × 844, 768 × 1024 and 1280 × 720 into `.playwright-mcp/`, and look at every one.
  - Expected:
    - no sideways scroll;
    - at 320 × 640 the verdict title ends above the bottom bar;
    - the "Not current" banner shows for stale;
    - the five states read as in the comparison sheet.
- [ ] **Step 3: The gate.**
  - Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run e2e`.
  - Keyboard pass on Today: Tab order and focus unchanged, and the scene takes no focus.
- [ ] **Step 4:** Commit, `docs: the adaptive cityscape as built`. Don't push.
  - The landing's `today-phone.jpg` now shows the old scene. Recapturing it is a follow-up for the owner to decide.
