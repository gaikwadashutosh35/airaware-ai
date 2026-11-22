# Cityscape: Finishing the Brief (design)

**Status:** approved by the owner on 22 Nov 2026 ("Approve"), with the calls marked "my call".
**Brief:** `AirAware_AI_Adaptive_Cityscape_Background_Spec.md` (repo root, the owner's file).
**Builds on:** `2026-11-20-adaptive-cityscape-design.md` (looks, weather rules, motion) and `2026-11-20-cityscape-backdrop-design.md` (one backdrop behind every app page). Everything there stands unless this document changes it.
**Comparison sheet:** `docs/superpowers/specs/2026-11-22-cityscape-variants.html` (open it in a browser). It draws today's city and three variants in the app's real states, at the brief's test sizes.

## 1. Why

The 20 Nov build met most of the brief. A read-only review on 22 Nov found four brief items still open:

1. **No fade.** The brief asks for gentle 500–900 ms changes when the air look changes (§5.2). Today the sky snaps, and the sun glow and the middle haze pop in and out.
2. **Plain boxes.** The brief asks for varied rooflines and recognisable homes and offices in the middle row (§3.1, §3.2). Every building is a flat-topped rectangle, and the middle row has no detail.
3. **A landmark.** The brief says not to imply a real skyline (§3.2). The near row's memorial arch reads as India Gate, so every place gets a Delhi landmark; the far row's domed hall has the same risk.
4. **Overcast changes the air look.** The brief keeps weather and air apart (§4.3, §11). On an overcast day the "within the limit" sky turns almost the same colour as "above the limit".

The two live problems found in the same review (My Home's sky, the footer's level words) were fixed and released separately on 22 Nov (`868e945`).

## 2. The owner's decisions (22 Nov 2026)

- "Fix the two live problems first", then "Now do the remaining cityscape brief items".
- Landmarks: **"Everyday Indian city"**. No landmark. The Indian feel comes from forms every Indian city has.
- Skyline: **variant B, "Mixed street"**, from the comparison sheet.

Item 4 (overcast) was my proposal in the same message; it is part of this design for the owner to approve.

## 3. Goals, non-goals, anti-goals

**Goals**

- G1. The city is variant B: shop-houses in front, offices and flats behind, soft towers far away, with no landmark.
- G2. The air look fades over 700 ms when it changes, and does not fade under reduced motion.
- G3. An overcast "within" sky stays clearly bluer than any "above" sky.
- G4. Every check in the brief (§11) still holds at 320 × 640, 390 × 844, 768 × 1024 and 1280 × 720.

**Non-goals (unchanged on purpose)**

- Where the scene sits (the backdrop behind every app page), the band heights, the 24rem rule, forced colours.
- The cloud drift (one 4.8 s settle, owner's D2a) and the rain (4.8 s).
- Which weather draws what, the thresholds, the data fields, the footer note.
- The Landing page's dated screenshots (20 Nov). They may show the old drawing; refreshing them is a separate task.

**Anti-goals (a failure even if it works)**

- Anything that could read as a landmark or a specific city: arches, domes, spires, minarets, clock towers, gateways, famous towers.
- Smoke, chimneys, cranes, signage, text, people, vehicles.
- Motion that runs past 5 seconds, or any motion under reduced motion.
- Weather changing the air look, or the air look changing the weather layers.
- A new dependency, image or request.

## 4. Approaches

**The skyline.** A design workflow drew three variants from one shared contract (same states, same limits, no landmarks); an independent checker tested each against the brief, and each designer fixed what it found.

| Variant | What it is | Trade-off |
|---|---|---|
| A. Housing society | Apartment blocks with balcony bands and stair cores topped by tanks, plus glass offices | The most detail; the front row is a thin dark strip and the loading outline is faint |
| **B. Mixed street (picked)** | Shop-houses standing apart in front, glass offices and balconied flats behind, soft towers far away | The clearest three planes; reads on a 390 px phone; the loading outline still reads as a city |
| C. Quiet skyline | Fewest shapes, horizontal balcony bands, varied rooflines | The calmest; the front row is one continuous strip and the loading outline is low |

Keeping today's drawing was also offered and not chosen.

**Bringing B into the app (my call: a).**

- (a) A new module holds B's data and its small builders, run once when the module loads. The numbers stay readable and tunable. *Picked.*
- (b) Paste the generated path strings as constants. Smallest runtime, but nobody can read or adjust them.
- (c) Put the data and builders inside `CitySkyline.tsx`. One file fewer, but it grows past 550 lines and mixes geometry with state treatment.

**The fade (my call: CSS transitions).** CSS transitions on the layers that already exist, under `motion-safe:`. A JavaScript animation was ruled out: the brief asks for CSS-only, low-cost motion (§5.2, §9).

## 5. Design

### 5.1 The city (variant B)

The geometry is exactly the sheet's variant B. All of it sits in the existing `viewBox 0 0 800 160`, on the ground line y = 160.

- **Far row:** one outline path over 29 low blocks and 18 soft towers (flat, one-sided setback or low roof box). Tallest 88 (top y 72).
- **Middle row:** 20 buildings of three kinds:
  - older flats with sunshades (chhajjas), some with a raised half;
  - society blocks with balcony slabs and a stair/lift core above the roof;
  - glass offices with vertical fins, some with a plant room or a setback top.
  Tallest 78. Their light details (railings, window squares, fins) show at every width.
- **Near row:** 15 shop-houses and walk-ups of 1–4 storeys, spaced so the middle row shows between them, with parapets, awnings, sunshades, stair rooms and water tanks on legs. Tallest 52. Their light details (windows, balcony lines, stair openings, rolling shutters) show from 640 px only, as the windows do today.
- **Tanks:** 10 tanks on 9 near buildings. They are built with the near row but kept in their own `data-part="tanks"` group with the same fill, so the tanks stay a checkable part.
- **Removed:** the domed hall, the memorial arch, the three rectangle lists and the mirrored right half.
- **Loading silhouette:** the far and near rows (with tanks) in the flat light grey, as today.
- **Limits, pinned by a unit test:**
  - top y: far ≥ 65, middle ≥ 80, near ≥ 105, since wide screens crop the band's top;
  - every x within −10…810;
  - the far row covers 0–800 with no gap.

**Where it lives:** `client/src/features/air-quality/skylineGeometry.ts` (new) keeps B's data and builders with the same numbers. It exports the path data once:

- one string for the far row;
- lists of strings for middle buildings, middle details, near buildings, near tanks and near details.

`CitySkyline.tsx` draws one `<path>` per string inside today's layer groups (`far`, `mid`, a new `mid-detail`, `near`, `tanks`, `windows`).

### 5.2 The fade

- **Duration:** 700 ms, ease-out (my call, inside the brief's 500–900 ms).
- **Faded layers:** the sky gradient's two stops (colour), the glow (opacity), the far veil (opacity and colour) and the middle veil (opacity).
- **Always mounted:** the glow and the middle veil now stay in place, at opacity 0 when off, so they fade in and out instead of popping.
- **Reduced motion:** the transitions apply only under `motion-safe:`, so the change is instant. The global reduced-motion rule in `index.css` caps transitions too.
- **Not faded:** clouds, the overcast deck, rain, fog and heat appear as today. The buildings never change. A place's first scene (after the silhouette) appears without a fade, because it is drawn fresh.
- **So, in use:** the fade shows when a same-place hourly reload brings a different level, or fails and the sky turns to the neutral look. Opening the app or switching places still goes through the grey silhouette and then appears at once: the old place's look never shows under a new place (backdrop final review). A cross-fade from the silhouette would need both drawings mounted at once, a different structure, and is not part of this design.
- DESIGN.md §9's "decorative motion stops within 5 seconds" holds.

### 5.3 Overcast "within"

- The overcast top of the "within" sky becomes `color-mix(in oklab, <within top> 75%, var(--color-rule))` (today 45 %).
- "Above" and "unknown" are unchanged.
- The sheet's "Overcast" section shows today's colour, the proposal, and the two "above" skies.
- The page titles stay far above 4.5:1 on it. The e2e contrast test checks every sky stop.

### 5.4 Data integrity, accessibility, performance

- **Data:** the look still comes only from the server's `airCheck.level`. No thresholds, no new data, no AQI.
- **Accessibility:** the backdrop stays `aria-hidden`, with no text and nothing focusable; it still steps aside in forced colours.
- **Size:** about 70 paths, against about 110 elements today, and about 8 KB of path data before compression. The built bundle size is measured before and after and recorded in the report (brief §9).
- **Dependencies:** no new dependency, image or request.

## 6. Tests

- **`skylineGeometry.test.ts` (new):** the limits in §5.1, and the tank count.
- **`CitySkyline.test.tsx`:**
  - kept: the same buildings in every air state; details hidden on phones;
  - changed: the tank count becomes 9 groups; the glow and middle veil are present at opacity 0 when off, instead of absent; the overcast stop expects 75 %;
  - new: fade classes only under `motion-safe:`; the middle details are drawn.
- **e2e:**
  - the backdrop and scene specs should pass unchanged, and the full suite runs;
  - screenshots at the brief's four sizes, in the within, above and loading states, go in the report.

## 7. Files

- New: `client/src/features/air-quality/skylineGeometry.ts` and its test.
- Changed: `CitySkyline.tsx`, `CitySkyline.test.tsx`, `DESIGN.md` (backdrop layers and motion), `CHANGELOG.md`.
- Added: the comparison sheet `docs/superpowers/specs/2026-11-22-cityscape-variants.html`, and this document.

## 8. Left to the builder

- The exact Tailwind classes for the transitions.
- Helper names inside `skylineGeometry.ts`.
- Whether the far row stays one path or one per block, as long as it looks the same.

## 9. Not in this change

These deferred minors from the 22 Nov backdrop review stay as they are:

- low-visibility fog can look like haze;
- the weather hour's own age is not marked;
- rain replays when an hourly reload turns it on;
- missing cloud cover draws a clear sky;
- after an answer change, My Home's plan can briefly differ from its sky.

**Amended (22 Nov 2026):** all five were then settled. The owner's calls: the fog band is removed; missing cloud cover keeps no clouds and no glow; the "No data" tag stays, partial check included. The builder's calls: weather counts for an hour after its own hour, then the scene draws none; the rain layer stays mounted, hidden when dry, so it never replays at the hourly reload; on My Home, a plan rebuilt on a forecast over a minute newer than the backdrop's reloads the backdrop once.
