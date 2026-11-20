# Cityscape Backdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The adaptive cityscape becomes one fixed backdrop behind every `/app/*` page, with solid section panels, a dark title block on the sky, and no grey flash on the hourly reload.

**Architecture:**
- `CitySkyline` keeps its name and its scene, but draws a fixed, full-screen backdrop instead of a band.
- `AppShell` renders it once and feeds it from the forecast it already holds. `useRequest` exposes the previous data while the same key reloads.
- Pages put each section on a solid panel, and an e2e check proves no text outside the title block rests on the scene.

**Tech Stack:** React 19, Tailwind v4 (`@theme static` tokens in `client/src/index.css`), inline SVG, Vitest + Testing Library (jsdom), Playwright (`desktop` and `phone` projects).

**Spec:** `docs/superpowers/specs/2026-11-20-cityscape-backdrop-design.md` (approved). The looks, thresholds and motion come from `2026-11-20-adaptive-cityscape-design.md` and `client/src/features/air-quality/scene.ts`, which do not change.

## Global Constraints

- **Scene rules:** `sceneFromConditions` and every threshold in `scene.ts` stay as they are. No new data, requests, looks or colours.
- **Backdrop:** `aria-hidden`, never focusable, `pointer-events: none`, fixed, takes no layout space.
- **Motion:** the drift (4.8 s, once) and the rain (4.8 s) are unchanged and stay off under reduced motion. Neither replays on page changes or the hourly reload.
- **Words on the sky:** only the title block, all in `text-dark`:
  - Today's greeting and `h1`;
  - Ask's `h1` and "Using:" line;
  - Welcome's "Step N of 3" and `h1`;
  - the `h1` on My Home, Better Habits and My Profile.
- **Panels:** every other text in `main` sits on a solid panel (`bg-surface-light`). The footer is solid too.
- **Footer line** (exact copy):
  - with a forecast: `Background: model forecast for {place.label}.`;
  - for the "near you" place: `Background: model forecast near you (approximate).`;
  - when stale, followed by ` Not current.`;
  - with no forecast shown, no line.
- **City band height:** `min(8rem, 20vh)`, and `min(11rem, 20vh)` from `sm`.
  - Under `md`, its bottom sits at `3.5rem + env(safe-area-inset-bottom)`.
  - From `md`, at 0.
- **Process:** test-first. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nothing is pushed.

## Review Focus

1. **A short landscape phone (640×320):** the `h1` must end above the city band's top. Pinned in Task 5.
2. **A place change mid-session (Pune, then Delhi):** never draw Pune's look under Delhi; show the silhouette, then Delhi's look. Pinned in Task 1 (`useRequest`: a new key has no `previous`).
3. **The hourly reload fails:** the backdrop turns neutral and the footer line goes, with no stale look left behind. Pinned in Task 1 (`backdropScene`).
4. **A 70-character place name:** the footer line wraps at 320 px with no sideways scroll. Pinned in Task 6.
5. **Rain in every air look behind the title block:** the contrast must hold for within, above and unknown, each with rain, overcast and glow where they can occur. Pinned in Task 5.

---

### Task 1: What the backdrop shows, and the previous forecast

**Files:**
- Modify: `client/src/features/air-quality/useRequest.ts`
- Modify: `client/src/features/air-quality/scene.ts`
- Test (create): `client/src/features/air-quality/useRequest.test.ts`
- Test (modify): `client/src/features/air-quality/scene.test.ts`

**Interfaces:**
- Produces:
  - `useRequest` returns `{ state, retry, previous: T | null }`. `previous` is the last ready data for the same key while a retry for that key loads, and `null` otherwise.
  - `NEUTRAL: Scene` = `{ air: 'unknown', clouds: 0, rain: false, heat: false, fog: false, glow: false }`.
  - `backdropScene(shown: ForecastData | null, loading: boolean): Scene | null` (`ForecastData` from `shared/contracts.ts`, the type `TodayLead` takes):
    - `null` when `loading` and nothing is shown (the silhouette);
    - `NEUTRAL` when nothing is shown and it isn't loading (no place, or an error);
    - otherwise `sceneFromConditions(shown.airCheck, shown.weather)`.
  - `backdropNote(placeLabel: string, stale: boolean): string`. The exact copy is in Global Constraints.

- [ ] **Step 1: Write the failing tests**

`useRequest.test.ts` (use `renderHook` from `@testing-library/react`, with a load function the test resolves):
- `'a retry for the same key keeps the previous data while it loads'`: ready with `'A'`, call `retry()`. Expect `state.status === 'loading'` and `previous === 'A'`. Resolve with `'B'`. Expect `state` ready with `'B'` and `previous === null`.
- `'a new key has no previous data'`: ready on key `k1`, rerender with key `k2`. Expect `state.status === 'loading'` and `previous === null`.
- `'a failed retry has no previous data'`: ready, then retry and reject. Expect `state.status === 'error'` and `previous === null`.

`scene.test.ts`:
- `'backdrop: the silhouette only while a first forecast loads'`: `backdropScene(null, true)` is `null`.
- `'backdrop: neutral with no forecast or on error'`: `backdropScene(null, false)` equals `NEUTRAL`.
- `'backdrop: a shown forecast draws its scene, even while reloading'`: for a series `s`, both `backdropScene(s, false)` and `backdropScene(s, true)` equal `sceneFromConditions(s.airCheck, s.weather)`.
- `'backdrop note'`:
  - `backdropNote('Pune, Maharashtra', false)` is `'Background: model forecast for Pune, Maharashtra.'`;
  - the stale version ends with `' Not current.'`;
  - `backdropNote(NEAR_YOU, false)` is `'Background: model forecast near you (approximate).'`.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run --root client src/features/air-quality/useRequest.test.ts src/features/air-quality/scene.test.ts`
Expected: FAIL. `previous` is undefined, and `backdropScene`, `NEUTRAL` and `backdropNote` are not exported.

- [ ] **Step 3: Implement**

- **`previous`:** derive it from `settled`. It is the settled data when `settled.state` is ready, its token's key part (before the last `#`) equals `key`, and the current state is loading.
- **`backdropScene` and `backdropNote`:** add them to `scene.ts`, importing `NEAR_YOU` from `../location/place.ts`.

- [ ] **Step 4: Run them to make sure they pass, then run the client suite**

Run: `npx vitest run --root client src/features/air-quality` then `npm test -w client`
Expected: all pass.

- [ ] **Step 5: Commit** `feat(scene): what the app backdrop shows, and a request's previous data`

---

### Task 2: `CitySkyline` draws a full-screen backdrop

**Files:**
- Modify: `client/src/features/air-quality/CitySkyline.tsx`
- Test: `client/src/features/air-quality/CitySkyline.test.tsx`

**Interfaces:**
- Consumes: `Scene` (unchanged).
- Produces: `CitySkyline({ scene }: { scene: Scene | null })`. Its root is a `div` with:
  - `aria-hidden="true"`;
  - `data-air` (`within | above | unknown | loading`);
  - `data-clouds` (absent while loading);
  - the classes `pointer-events-none fixed inset-0 -z-10 overflow-hidden`.

**Layers** (each an absolutely placed `svg` inside the root, ids from the existing cleaned `useId`). All `data-part` names stay:
1. **Sky:** `viewBox="0 0 1 1"`, `preserveAspectRatio="none"`, `inset-0 size-full`. A `rect data-part="sky"` with today's sky gradient.
2. **Upper sky:** `viewBox="0 0 800 160"`, `preserveAspectRatio="xMidYMin slice"`, `top-16 inset-x-0 h-40 sm:h-56`, so it sits under the 64 px header. It holds the glow, cloud deck and clouds at today's coordinates. The `clouds` group keeps `motion-safe:animate-drift`.
3. **City:** `viewBox="0 0 800 160"`, `preserveAspectRatio="xMidYMax slice"`, with the band height and bottom offset from Global Constraints.
   - It holds the far row, the veils, the mid and near rows, tanks, windows (`max-sm:hidden`), fog and shimmer, with no sky rect.
   - `veil-far`, `veil-mid` and `fog` are filled with a vertical gradient that fades from opacity 0 at the band's top to today's opacity at 60 % of its height. That way the band has no hard top edge over the sky.
   - The above-limit look's muted sky comes from `SKY.above`. **Decision:** ruling 11's veil over the upper sky is gone. Cost if wrong: the above look is a little less muted near the clouds.
4. **Rain:** shown when `scene.rain`. A full-screen `svg` (no viewBox) with a `pattern`.
   - The tile is 24×64 and holds the existing grid's two rows: one streak at x 0, and one at x 12 a row lower.
   - The streak class and opacity are unchanged.
   - It fills `rect data-part="rain"` with `x="-24" y="-64" width="110%" height="110%"` and `motion-safe:animate-rain`. The existing `rain-fall` keyframes (−12 px, 32 px) map the tile onto itself.

**Loading (`scene === null`):** the same root with `data-air="loading"`:
- a sky layer filled `fill-surface-light`;
- a city layer with today's still silhouette (far rows `fill-rule` at 0.7, near rows `fill-rule`);
- no motion.

- [ ] **Step 1: Rewrite the tests first**
  - **Keep:** every behaviour test in `CitySkyline.test.tsx`: the sky classes per look, the veils by look, the glow, clouds and deck, the drift and rain timings, the same buildings in every look, no smog, windows hidden on phones, 6 tanks, own ids, and the heat band staying still.
  - **Selectors:** query the root by `[data-air]` and the parts by `[data-part=…]`.
  - **Replace** `'the rain loop is seamless'` with `'the rain tile repeats under its loop'`. The pattern is 24 wide and 64 tall, its two streaks sit 12 apart in x and 32 apart in y, and the keyframes still read `translate(-12px, 32px)`.
  - **Add:**
    - `'a fixed backdrop that takes no clicks'`: the root has `fixed`, `inset-0`, `-z-10` and `pointer-events-none`, and contains no focusable element.
    - `'the city sits above the phone bar and never over a fifth of the screen'`: the city svg's classes contain `h-[min(8rem,20vh)]`, `sm:h-[min(11rem,20vh)]`, `bottom-[calc(3.5rem+env(safe-area-inset-bottom))]` and `md:bottom-0`.
    - `'veils and fog fade in from the band top'`: each fill references a gradient whose first stop has `stop-opacity` 0.
- [ ] **Step 2: Run them to make sure they fail**
  Run: `npx vitest run --root client src/features/air-quality/CitySkyline.test.tsx`
  Expected: FAIL on the new structure tests.
- [ ] **Step 3: Implement the layers above**
- [ ] **Step 4: Run the file, then the client suite**
  Expected: the file passes. In the suite, `TodayLead`'s and `States`' scene tests are still green (their own tests change in Task 3).
- [ ] **Step 5: Commit** `feat(scene): the skyline becomes a full-screen backdrop`

---

### Task 3: The shell draws the backdrop; the band leaves Today

**Files:**
- Modify: `client/src/pages/AppShell.tsx`
- Modify: `client/src/features/today/TodayLead.tsx`
- Modify: `client/src/components/States.tsx`
- Tests: `client/src/pages/AppShell.test.tsx`, `client/src/features/today/TodayLead.test.tsx`, `client/src/components/States.test.tsx`

**Interfaces:**
- Consumes:
  - `forecast.previous` (Task 1);
  - `backdropScene` and `backdropNote` (Task 1);
  - `CitySkyline` (Task 2).
- Produces: in `AppShell`:
  - `const shown = forecast.state.status === 'ready' ? forecast.state.data.series : (forecast.previous?.series ?? null)`;
  - `<CitySkyline scene={backdropScene(shown, forecast.state.status === 'loading')} />` as the fragment's first child;
  - the footer line when `shown && place`, stale by `isOlderThan(shown.retrievedAt, now, 60)`.

- [ ] **Step 1: Write the failing tests**
  - `AppShell.test.tsx`:
    - `'the backdrop is neutral before a place is chosen'`: render Welcome. Expect `[data-air="unknown"]` and no footer line starting with "Background:".
    - `'the backdrop follows the forecast on every page'`: render with the place fixture. Expect `[data-air]` to match the fixture's look and the footer to read `Background: model forecast for Pune, Maharashtra.`. Navigate to `/app/habits`; the same root element is still in the document.
    - `'the hourly reload keeps the backdrop and its note'`: extend the existing reload test. While the reload is pending, expect `[data-air]` is not `loading`, and the footer line ends with `Not current.`.
    - `'a failed forecast leaves a neutral backdrop'`: the forecast rejects. Expect `[data-air="unknown"]` and no "Background:" line.
  - `TodayLead.test.tsx`:
    - **Delete** `'the scene follows the weather'` and `'the scene follows the air check'` (the backdrop owns them now).
    - **Add** `'the lead card draws no scene'`: `container.querySelector('svg')` is `null`, and the weather line is the card's first row.
  - `States.test.tsx`:
    - **Delete** `'the forecast band is a still skyline silhouette'`.
    - **Add** `'loading has no scene band'`: no `[data-part="skeleton-band"]` and no `svg`.
- [ ] **Step 2: Run them to make sure they fail**
  Run: `npx vitest run --root client src/pages/AppShell.test.tsx src/features/today/TodayLead.test.tsx src/components/States.test.tsx`
- [ ] **Step 3: Implement**
  - Remove `CitySkyline` and `sceneFromConditions` from `TodayLead`.
  - Remove the `band` prop from `Loading` and its call site (`<Loading label="Loading forecast" />`).
  - Render the backdrop and the footer line in `AppShell`. The line goes first in the footer, `text-sm text-text-dark-muted` (the footer is solid from Task 4).
- [ ] **Step 4: Run them, then `npm test`, `npm run typecheck` and `npm run lint`.** All green.
- [ ] **Step 5: Commit** `feat(shell): one backdrop behind every app page; the band leaves Today`

---

### Task 4: Solid panels and a dark title block

**Files:**
- Modify:
  - `client/src/pages/AppShell.tsx`: Today's title block, the invite, the footer, and the end space;
  - `client/src/components/States.tsx`: `Loading` and `ErrorState` roots;
  - `client/src/features/today/TodayLead.tsx`, `HelpChoices.tsx`, `AskBox.tsx` and `AirDetails.tsx`;
  - `client/src/features/daily-plan/DailyPlanSection.tsx`;
  - `client/src/pages/Ask.tsx` and `client/src/features/ask/AskEntry.tsx`;
  - `client/src/pages/MyHome.tsx`, `BetterHabits.tsx`, `Profile.tsx` and `Welcome.tsx`;
  - `client/src/features/daily-plan/HouseholdPreferencesForm.tsx`;
  - the `LocationSearch` block wrappers on Ask and Welcome.
- Test (create): `e2e/backdrop.spec.ts`

**The rule** (spec §5.3):
- **Panel classes:** each section gets `rounded-lg border border-rule bg-surface-light p-5 sm:p-6`. Sections that already have a border and padding just add `bg-surface-light`.
- **What counts as a section:**
  - **Today:** `TodayLead`, `DailyPlanSection`, the invite row, `HelpChoices`, `AskBox` and `AirDetails`'s `details`.
  - **Ask:**
    - the topic chips, starters and form share one panel;
    - each `AskEntry` `article` is its own panel (drop its `border-t pt-6`);
    - with no place, the search block is one panel.
  - **Welcome:** each step's body below the title block.
  - **My Home:** each of its two sections.
  - **Better Habits:** one panel around `GuideGroups`. **Decision:** the safety note belongs to every group, so they share one panel. Cost if wrong: no sky between Habits' groups.
  - **My Profile:** the preferences form, the remembered-place section, the saved-plan banner, and the saved-plans list.
  - **Everywhere:** `Loading` and `ErrorState`.
- **The title block:**
  - Mark it with `data-part="title-block"`, on the existing wrapper div (Today, Ask, Welcome) or on the `h1` itself (My Home, Better Habits, My Profile).
  - Change its `text-text-dark-muted` lines to `text-text-dark`: Today's greeting, Ask's "Using:" line, and Welcome's "Step N of 3".
- **The footer:** give it `bg-surface-light`. After it, add an `aria-hidden` spacer as tall as the city band, plus `3.5rem + env(safe-area-inset-bottom)` under `md`, so the page ends on the whole city. The footer's own `pb-24` becomes `pb-8`.

- [ ] **Step 1: Write the failing e2e test** in `e2e/backdrop.spec.ts`. Stub the forecast and plan with `routeApi`, `forecastAt` and `planAt` (as `e2e/scene.spec.ts` does).
  - `'no text outside the title block rests on the scene'`. For each of `/app`, `/app/ask`, `/app/home`, `/app/habits` and `/app/profile` (from `PUNE`'s query), plus `/app/welcome` in a fresh context (step 1):
    1. Expand every `details` element.
    2. In `page.evaluate`, collect every text node in `main` with visible, non-empty text that is not inside `[data-part="title-block"]` or `.sr-only`.
    3. For each, walk up from its parent to `main`, and require an element whose computed `background-color` has alpha 1.
    4. Return the offenders' text (first 40 characters).

    Expect `[]`.
- [ ] **Step 2: Run it to make sure it fails**
  Run: `npx playwright test --config e2e/playwright.config.ts e2e/backdrop.spec.ts`
  Expected: FAIL, listing headings such as "What would you like help with?".
- [ ] **Step 3: Add the panels and title-block changes above**, page by page, until the list is empty. Update any unit test that asserts the classes you change.
- [ ] **Step 4: Run the e2e file, then `npm test`, `npm run typecheck`, `npm run lint` and `npm run format:check`.** All green.
- [ ] **Step 5: Commit** `feat(ui): solid panels over the backdrop, a dark title block`

---

### Task 5: The backdrop in a real browser

**Files:**
- Test: `e2e/backdrop.spec.ts` (add tests)
- Modify: `e2e/scene.spec.ts` (selectors only, if needed)

- [ ] **Step 1: Write the failing tests**
  - `'the backdrop stays put between pages'`:
    1. Load `/app` stubbed, wait out the drift (5.5 s), then click "Ask" and "Habits" in the nav.
    2. Expect one `[data-air]` element throughout, with the same `data-air`.
    3. Expect the `clouds` group's computed transform to stay at rest. A remount would restart the drift, and a sample taken 200 ms after navigating would show `translateX` < 0.
  - `'the title block reads against every sky'`. For each look (stub `airCheck.level` as `not_elevated`, `elevated` and `unknown`):
    - **Weather:** `{ precipitationMm: 1, cloudCoverPercent: 30, isDay: true }`, plus a run with `cloudCoverPercent: 90` for the deck.
    - **Read in the page:**
      - the title block's computed `color`;
      - the computed `stop-color` of each sky stop;
      - the cloud and deck fills;
      - the glow's centre `stop-color`;
      - the rain stroke;
      - each one's opacity.
    - **Convert** every CSS colour to sRGB through a 1×1 canvas.
    - **Composite** each translucent layer over the sky top colour.
    - **Assert** the WCAG contrast of the title colour against each is `>= 4.5`.
  - `'a short landscape phone keeps the title off the city'`: viewport 640×320. Expect the `h1`'s bottom is less than the city svg's top.
  - `'axe passes over every look'`: for each look, run `expectNoAxeViolations` on `/app`, `/app/ask` and `/app/habits`.
- [ ] **Step 2: Run them to make sure they fail.**
  Expected: the stays-put test fails only if Task 3 regressed. The contrast test is new and should pass if Task 4 is right. If it passes on the first run, prove it with a mutation (temporarily set the greeting back to `text-text-dark-muted`; it must fail). Record that in the ledger.
- [ ] **Step 3: Fix any failure at its cause.**
- [ ] **Step 4: Run the full e2e suite.**
  Run: `npm run e2e`
  Expected: every test passes.
- [ ] **Step 5: Commit** `test(e2e): the backdrop across pages, contrast over every sky`

---

### Task 6: Proof, docs and the landing shot

**Files:**
- Modify:
  - `DESIGN.md`: the §8 `CitySkyline` bullet becomes the backdrop, and §9 notes that motion doesn't replay on navigation;
  - `ACCESSIBILITY.md`: the backdrop is decorative, the title block is checked for contrast, and panels sit everywhere else;
  - `CHANGELOG.md`;
  - an amendment note in `docs/superpowers/specs/2026-11-20-adaptive-cityscape-design.md` and in `2026-11-19-weather-scene-design.md`'s anti-goal;
  - `client/src/assets/today-phone.jpg`, recaptured.

- [ ] **Step 1: Screenshots.**
  - **Pages:** every app page at 320×640, 390×844, 768×1024 and 1280×800, in the within look.
  - **Today in every state:** within, above, unknown, stale and loading.
  - **Extra cases:** a 640×320 landscape phone, and a 70-character place label (`?place=` with that label).
  - **Script:** use the scratchpad `band.mjs` pattern, never committed.
  - **Expected:**
    - `scrollWidth - innerWidth` is 0 everywhere;
    - at 320×640, the verdict title's bottom is higher than before (it was 0 px from the bar);
    - no text rests on the city.
- [ ] **Step 2: Update the docs listed above.**
- [ ] **Step 3: Recapture `today-phone.jpg`** with the scratchpad `capture.cjs phone 80` against live data.
  - Check the caption date in `Landing.tsx` and `Landing.test.tsx`, and change both together if the day has changed.
  - Check the alt text still matches.
- [ ] **Step 4: Full gate.**
  Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run e2e`
  Expected: all green.
- [ ] **Step 5: Commit** `docs: the backdrop in DESIGN, ACCESSIBILITY and CHANGELOG; recapture the landing shot`
