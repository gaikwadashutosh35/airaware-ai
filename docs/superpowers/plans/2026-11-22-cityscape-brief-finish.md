# Cityscape: Finishing the Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backdrop city with variant B ("Mixed street"), fade the air look over 700 ms, and keep an overcast "within" sky distinct from "above".

**Architecture:** A new `skylineGeometry.ts` holds variant B's data and builders, ported from the comparison sheet, and exports path strings once. `CitySkyline.tsx` draws them in its existing layer groups. The fade is CSS transitions under `motion-safe:` on the sky stops, glow and veils; the glow and middle veil stay mounted at opacity 0 when off.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4, inline SVG, Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-22-cityscape-brief-finish-design.md` (approved 22 Nov 2026). Source of the geometry: the inline `<script>` headed "Variant B: Mixed street" in `docs/superpowers/specs/2026-11-22-cityscape-variants.html`.

## Global Constraints

- No new dependency, image, font or request (brief §7.8, §9).
- The look comes only from `airCheck.level`; no thresholds, no AQI, no new data fields.
- No user-visible text changes; the backdrop stays `aria-hidden`, with nothing focusable, `forced-colors:hidden`.
- Motion is CSS only, under `motion-safe:`, and stops within 5 s. The fade is 700 ms, ease-out.
- Geometry limits (viewBox `0 0 800 160`, ground y = 160): top y far ≥ 65, middle ≥ 80, near and tanks ≥ 105; every x within −10…810.
- Unchanged: band heights, the 24rem rule, cloud drift (4.8 s once), rain, weather mapping, the footer note.
- Checks: `npm test`, `npm run typecheck`, `npm run lint` (oxlint `--type-aware --deny-warnings`), `npm run format:check`, `npm run build`, `npm run e2e`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never commit `AirAware_AI_Adaptive_Cityscape_Background_Spec.md`, `docs/SKILL.md` or `docs/MODEL_ROUTING.md`. No push without the owner's yes.

## Review Focus

1. **The fade in a real browser.** jsdom cannot show that Chromium transitions an SVG `stop-color` set by a class. Expected: the sky stop's computed `transition-duration` is 0.7 s with motion allowed and near 0 under reduced motion. Pinned by Task 3's e2e test.
2. **Wide screens crop the band's top.** At 1920 px only about y ≥ 87 shows (the band is capped at 176 px). Today's drawing crops the same way. Expected: tall towers lose their tops but nothing looks broken. Checked by Task 4's 1920 × 1080 screenshot.
3. **The port drifts from the sheet.** A retyped number would silently change the approved drawing. Expected: the module's output matches the sheet's variant B subpath for subpath. Pinned by Task 1's one-time comparison script.
4. **The loading silhouette.** It must still read as a city, with tanks and without details. Pinned by Task 2's test.
5. **A landmark creeps back.** The arch and dome were the only curved shapes. Expected: no arc command in any city path. Pinned by Task 2's test.

---

### Task 1: The geometry module

**Files:**
- Create: `client/src/features/air-quality/skylineGeometry.ts`
- Test: `client/src/features/air-quality/skylineGeometry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SkylinePaths {
    far: string;
    mid: string[];
    midDetail: string[];
    near: string[];
    tanks: string[];
    nearDetail: string[];
  }
  export const SKYLINE: SkylinePaths;
  ```
  - `far` is one outline;
  - `mid` has one entry per building (20); `midDetail` has one per non-bare building;
  - `near` has one entry per building (15), without its tanks;
  - `tanks` has one entry per near building that carries tanks (9 entries, 10 tanks);
  - `nearDetail` has one entry per building with a facade.

- [ ] **Step 1: Write the failing test** `skylineGeometry.test.ts`, with a small test-only path-bounds helper for the commands the builders emit (`M` x y, `h`, `v`, `H`, `V`, `z`):
  ```ts
  it('stays inside the band limits', () => {
    const top = (ds: string[]) => Math.min(...ds.map((d) => bounds(d).minY));
    expect(top([SKYLINE.far])).toBeGreaterThanOrEqual(65);
    expect(top(SKYLINE.mid)).toBeGreaterThanOrEqual(80);
    expect(top([...SKYLINE.near, ...SKYLINE.tanks])).toBeGreaterThanOrEqual(105);
    for (const d of Object.values(SKYLINE).flat()) {
      const b = bounds(d);
      expect(b.minX).toBeGreaterThanOrEqual(-10);
      expect(b.maxX).toBeLessThanOrEqual(810);
      expect(b.maxY).toBeLessThanOrEqual(160);
    }
  });
  it('the far row covers the width with no gap', () => {
    expect(SKYLINE.far.startsWith('M-10 160')).toBe(true);
    expect(SKYLINE.far.endsWith('H810V160z')).toBe(true);
    expect(SKYLINE.far.match(/V160/g)).toHaveLength(1);
  });
  it('variant B: 20 middle and 15 near buildings, 10 tanks on 9', () => {
    expect(SKYLINE.mid).toHaveLength(20);
    expect(SKYLINE.near).toHaveLength(15);
    expect(SKYLINE.tanks).toHaveLength(9);
    // A tank is four subpaths: drum, platform, two legs.
    expect(SKYLINE.tanks.join('').match(/M/g)).toHaveLength(40);
  });
  ```

- [ ] **Step 2: Run it to see it fail.**
  Run: `cd client && npx vitest run src/features/air-quality/skylineGeometry.test.ts`
  Expected: FAIL, the module does not exist.

- [ ] **Step 3: Write `skylineGeometry.ts`.** Port the sheet's variant B script with the same data and the same numbers. Add types, and keep the helpers `R`, `tank`, `tower`, the far-outline loop, and the middle and near builders. The one structural change: tank subpaths (from `t` and from `mt`) go into a separate string per building, pushed to `tanks` when non-empty. Everything else stays in that building's `near` string. Export plain `d` strings, not markup. Compute once at module load.

- [ ] **Step 4: Run the test and see it pass.** Same command. Expected: PASS.

- [ ] **Step 5: One-time port check** (a scratch script, not committed). Evaluate the sheet's variant B script with a stub `window.VARIANTS`, and extract every `d`. Then assert:
  - `far`, `mid`, `midDetail` and `nearDetail` equal the module's, string for string;
  - the multiset of the sheet's near subpaths (split on `M`) equals that of the module's `near` plus `tanks`.

  Expected: all equal. A mismatch means a porting error; fix the port, not the check.

- [ ] **Step 6: Commit.**
  ```bash
  git add client/src/features/air-quality/skylineGeometry.ts client/src/features/air-quality/skylineGeometry.test.ts
  git commit -m "feat(scene): variant B's skyline as path data"
  ```

### Task 2: Draw the new city

**Files:**
- Modify: `client/src/features/air-quality/CitySkyline.tsx` (lines 1–116: remove `FAR`, `MID`, `NEAR`, `shifted`, the `*_ALL` lists, `rects`, `tank`; lines 151–166: the silhouette; lines 255–326: the rows, dome, arch, tanks, windows)
- Test: `client/src/features/air-quality/CitySkyline.test.tsx`

**Interfaces:**
- Consumes: `SKYLINE` from Task 1.
- Produces: city groups with `data-part` set to `far`, `mid`, `mid-detail`, `near`, `tanks` and `windows`, each holding one `<path d>` per entry. Fills and opacities:
  - `far`, `mid` and `near`: as today;
  - `mid-detail`: `fill-surface-light`, opacity 0.28, in the middle row's svg after `mid`;
  - `tanks`: same as `near`;
  - `windows`: holds `nearDetail`, `fill-surface-light`, opacity 0.5, `max-sm:hidden`.

  The `${id}-windows` pattern goes.

- [ ] **Step 1: Measure the bundle before the change.**
  Run: `npm run build -w client`, then sum the gzipped sizes of `client/dist/assets/*.js`. Record the result in the ledger.

- [ ] **Step 2: Write the failing tests** in `CitySkyline.test.tsx`:
  ```ts
  // Variant B: 10 tanks on 9 near buildings.
  it('rooftop tanks sit on the near row', () => {
    expect(part(draw(), 'tanks')?.children).toHaveLength(9);
  });
  it('the middle row carries its details at every width', () => {
    const detail = part(draw(), 'mid-detail');
    expect(detail?.children.length).toBeGreaterThan(0);
    expect(detail?.getAttribute('class') ?? '').not.toContain('hidden');
  });
  // Brief §3.2: no landmark. The old arch and dome were the only arcs.
  it('no curved landmark shapes in the city', () => {
    const city = draw().querySelector('[data-layer="city"]')!;
    for (const path of city.querySelectorAll('path')) {
      expect(path.getAttribute('d')).not.toMatch(/[Aa]/);
    }
  });
  it('the silhouette is the same city, with tanks and no details', () => {
    const city = draw(null).querySelector('[data-layer="city"]')!;
    expect(city.querySelectorAll('path')).toHaveLength(
      1 + SKYLINE.near.length + SKYLINE.tanks.length,
    );
    expect(part(draw(null), 'mid-detail')).toBeNull();
  });
  ```
  Keep "the same buildings in every air state", and keep "windows are hidden on phones" unchanged.

- [ ] **Step 3: Run them and see them fail.**
  Run: `cd client && npx vitest run src/features/air-quality/CitySkyline.test.tsx`
  Expected: the four new or changed tests fail: the tanks are 6, there is no `mid-detail`, the arcs are present, and the silhouette counts differ.

- [ ] **Step 4: Change `CitySkyline.tsx`** to draw `SKYLINE` as described in Interfaces. The silhouette draws `far` (opacity 0.7), `near` and `tanks` in `fill-rule`, with no details. Update the component comments that mention the arch, the dome or the 18 buildings.

- [ ] **Step 5: Run the file and see it pass.** Same command. Expected: all pass.

- [ ] **Step 6: Commit.**
  ```bash
  git add client/src/features/air-quality/CitySkyline.tsx client/src/features/air-quality/CitySkyline.test.tsx
  git commit -m "feat(scene): the mixed-street city, with no landmark"
  ```

### Task 3: The fade and the overcast colour

**Files:**
- Modify: `client/src/features/air-quality/CitySkyline.tsx` (`SKY.within.overcast`; the sky stops; the glow; `veil-far`; `veil-mid`)
- Test: `client/src/features/air-quality/CitySkyline.test.tsx`, `e2e/scene.spec.ts`

**Interfaces:**
- Produces: one class constant, `FADE = 'motion-safe:transition-[stop-color,opacity,background-color] motion-safe:duration-700 motion-safe:ease-out'`. It goes on both sky stops, the glow, `veil-far` and `veil-mid`.
  - The glow is always rendered, with `style={{ opacity: scene.glow ? GLOW[scene.air] : 0 }}` instead of the `opacity` attribute.
  - `veil-mid` is always rendered, with `style={{ opacity: scene.air === 'above' ? 0.2 : 0 }}`.

- [ ] **Step 1: Write the failing tests.** Change and add these in `CitySkyline.test.tsx`:
  ```ts
  // in 'the sky follows the air state': overcast keeps the within hue
  expect(topStop(draw({ air: 'within', clouds: 3 }))).toMatch(
    /_75%,var\(--color-rule\)\)\]/,
  );
  // in 'veils follow the air state only': always mounted, 0 when off
  expect(veils('within', 0)).toEqual([0.05, 0]);
  expect(veils('above', 0)).toEqual([0.42, 0.2]);
  expect(veils('unknown', 0)).toEqual([0, 0]);
  // in 'the glow follows the scene': present at 0 when off
  expect(opacityOf(draw({ glow: false }), 'glow')).toBe(0);
  // new
  it('the air look fades, only when motion is welcome', () => {
    const container = draw({ air: 'above', glow: true });
    const faded = [
      ...container.querySelectorAll('linearGradient stop'),
      part(container, 'glow')!,
      part(container, 'veil-far')!,
      part(container, 'veil-mid')!,
    ];
    for (const el of faded) {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).toContain('motion-safe:duration-700');
      expect(cls).not.toMatch(/(^|\s)(transition|duration)-/);
    }
  });
  ```
  In `veils()`, read `veil-mid` with `opacityOf` directly, since the part is always there now. Add to `e2e/scene.spec.ts`:
  ```ts
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`the air look fades in 0.7 s: ${reducedMotion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      // the same stubbed forecast as the drift tests in this file
      const stop = page.locator('[data-part="sky"]').locator('xpath=..').locator('stop').first();
      const duration = await stop.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
      if (reducedMotion === 'reduce') expect(duration).toBeLessThan(0.001);
      else expect(duration).toBeCloseTo(0.7);
    });
  }
  ```
  The implementer resolves the gradient's stops through the sky's `fill` reference, as `e2e/backdrop.spec.ts`'s `gradientStops` already does. Reuse that helper rather than the XPath sketch above.

- [ ] **Step 2: Run them and see them fail.**
  Run: `cd client && npx vitest run src/features/air-quality/CitySkyline.test.tsx`
  Expected: the overcast, veil, glow and fade tests fail.
  Run: `npx playwright test --config e2e/playwright.config.ts e2e/scene.spec.ts`
  Expected: the new test fails (duration 0) on the no-preference case.

- [ ] **Step 3: Change `CitySkyline.tsx`.**
  - `SKY.within.overcast` mixes the within top at `75%` into `var(--color-rule)` (was `45%`).
  - Add `FADE` and the always-mounted glow and middle veil from Interfaces.
  - Keep the glow's `r` (heat) as today.

- [ ] **Step 4: Run both and see them pass.** Same commands. Expected: PASS, on the desktop and phone projects.

- [ ] **Step 5: Commit.**
  ```bash
  git add client/src/features/air-quality/CitySkyline.tsx client/src/features/air-quality/CitySkyline.test.tsx e2e/scene.spec.ts
  git commit -m "feat(scene): the air look fades over 700 ms; overcast keeps the within hue"
  ```

### Task 4: Docs, screenshots and the full gate

**Files:**
- Modify: `DESIGN.md` (the backdrop bullets: layers, air look, motion), `CHANGELOG.md` (CRLF: use an editor, not string replacement)

- [ ] **Step 1: Update `DESIGN.md`.**
  - **Layers:** far towers; middle flats, society blocks and glass offices with their details; near shop-houses with tanks and, from 640 px, windows and shutters; no landmark.
  - **Air look:** the overcast "within" sky keeps its hue.
  - **Motion:** the air look fades over 700 ms, under `motion-safe:` only.

  Add a CHANGELOG entry under "Cityscape backdrop (22 Nov)".

- [ ] **Step 2: Measure the bundle after the change.** Same method as Task 2, step 1. Record before and after in the ledger and the report.

- [ ] **Step 3: Screenshots** with a temporary e2e spec, deleted afterwards. Take the within, above and loading states at 320 × 640, 390 × 844, 768 × 1024 and 1280 × 720, plus within at 1920 × 1080 (Review Focus 2). Look at each one.
  Expected: no landmark, three planes, nothing past the screen edge, titles readable.

- [ ] **Step 4: Run the full gate.**
  Run: `npm test -w server; npm test -w client; npm run typecheck; npm run lint; npm run format:check; npm run build; npm run e2e`, in the background, one `STEP` line per check. First check that port 8090 is free.
  Expected: every step exits 0. The e2e counts are 305 passed plus the new fade tests (two per project, unless a project skips them), with 83 skipped.

- [ ] **Step 5: Commit.**
  ```bash
  git add DESIGN.md CHANGELOG.md
  git commit -m "docs: the mixed-street city and the fade"
  ```
