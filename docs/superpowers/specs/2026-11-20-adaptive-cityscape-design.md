# Adaptive Cityscape: Phase 1 Inspection and Proposal

**Status:** approved by the owner on 20 Nov 2026, "Approve as recommended". That covers D1 (a), D2 (a), D3 (a), including the one nullable `weather.isDay` field, D4 (a) and the calls below.
**Brief:** `AirAware_AI_Adaptive_Cityscape_Background_Spec.md` (repo root).
**Comparison sheet:** `docs/superpowers/specs/2026-11-20-cityscape-states.html` (open it in a browser). It draws every state from the same geometry.
**Amended (backdrop, 20 Nov 2026, `2026-11-20-cityscape-backdrop-design.md`):** the scene is now a fixed backdrop behind every app page, not a band in Today's card. The looks, thresholds and motion here are unchanged. §3's rejection of "the scene behind the text" is replaced by solid panels and a checked title block.

## 1. What exists today (verified in code)

| Item | Where | What it does |
|---|---|---|
| `CitySkyline` | `client/src/features/air-quality/CitySkyline.tsx` | Inline SVG, `viewBox 0 0 800 160`, `xMidYMax slice`, `aria-hidden`. Draws a far row (22 buildings plus a domed hall) and a near row (18 plus an arch), flat token fills, a sun disc, up to 3 clouds, two haze veils, and optional smog, fog, rain and heat bands. |
| Where it renders | `client/src/features/today/TodayLead.tsx` | The band at the top of Today's lead card, above the weather line and the verdict. **Not inside `AirReadout`** any more: it moved in Phase 6. |
| Band size | `h-32 sm:h-44` | 128 px below 640 px wide, 176 px from 640 px. Measured: 286 × 128 at 320 px, 356 × 128 at 390 px, 719 × 176 at 768 px, about 650 × 176 at 1280 px. |
| Air input | `shared/contracts.ts` `AirAssessment.level` | `'not_elevated' \| 'elevated' \| 'unknown'`. The server (`airCheck.ts`) sets `elevated` when any pollutant's 24-hour average is above its limit, `not_elevated` only when both are within, and `unknown` otherwise. Tags: "Within the limit", "Above the limit", "No data". |
| Haze today | `client/src/features/air-quality/haze.ts` | **A client-side 5-level classification** from average ÷ limit (≤ 0.5, ≤ 1, ≤ 1.5, ≤ 2, more), plus a smog band at level 5. It was owner-approved on 19 Nov (Stitch Phase A) with "the sky is never fully clear". |
| Weather input | `WeatherNow` (Open-Meteo forecast, this hour) | `temperatureC`, `precipitationMm`, `precipitationProbability`, `cloudCoverPercent`, `visibilityM`, each nullable; `weather` is `null` when the call fails. **There is no weather code and no day/night field.** |
| Weather mapping | `client/src/features/air-quality/scene.ts` | Clouds 0/1/2/3 at 20/50/80 % cover; rain at ≥ 0.2 mm **or ≥ 60 % chance**; heat ≥ 35 °C; fog below 1,000 m. Approved 19 Nov (weather-scene design). |
| Stale | `TodayLead` `stale` prop | Retrieved over 60 minutes ago by the running clock. The scene keeps the last-known state, and the HTML `StaleBanner` reads "Not current: retrieved more than an hour ago. Reload for the latest forecast." |
| Loading | `components/States.tsx` `Loading band` | A grey `animate-pulse` band at the same height (still under reduced motion). |
| Error | `AppShell` | `ErrorState` replaces the whole lead card, with no scene. |
| Motion | `index.css` `--animate-rain` | Rain falls for 4.8 s and then rests. DESIGN.md §9 makes "decorative motion stops within 5 seconds" a rule (WCAG 2.2.2). |
| Tests | `CitySkyline.test.tsx`, `scene.test.ts`, `haze.test.ts`, `TodayLead.test.tsx`, `States.test.tsx` | They check `data-haze-level` and `data-part` hooks. No e2e test depends on the scene. |

## 2. Conflicts between the brief and the code

1. **The brief says** state must come from the server's level, with no new classification. **The code** grades haze in 5 client-side ratio bands, and smog at the worst band.
2. **The brief wants** a "clear, bright blue sky" for a forecast within the limit. **The 19 Nov design said** "the sky is never fully clear".
3. **The brief wants** clouds drifting continuously on a 35–60 s loop. **DESIGN.md §9 and WCAG 2.2.2** say decorative motion that runs over 5 s needs a pause control, or it must stop.
4. **The brief allows** rain "only when the weather data explicitly supports it". **The code** also shows rain on a 60 % chance with 0 mm.
5. **The brief says** "sun or daylight glow where appropriate". **The code** draws the sun at any hour, because there is no day/night data.
6. **The brief points to** `AirReadout`. **The scene now lives** in `TodayLead`.
7. **The brief targets** 150–220 px on phones. **At 320 × 640**, the verdict title ends 20 px above the bottom bar, so a taller phone band pushes it under the bar.

## 3. Proposal

**Approach:** keep the band and its geometry, and change the treatment.

Alternatives considered:
- **The scene behind the text:** rejected. It breaks the 19 Nov anti-goal "text placed on top of the scene" and makes contrast vary by state.
- **A new full-width hero:** rejected. The brief says the scene must not dominate Today.

**Layers, back to front:**
1. **Sky gradient.** From `airCheck.level`. Its top mutes when the weather is overcast.
2. **Daylight glow.** Its strength comes from `airCheck.level`. It needs known weather, and overcast or rain hides it. See D3 for night.
3. **Clouds.** From `cloudCoverPercent` (the existing 20/50/80 % steps). They become softer shapes, and 80 % or more adds a high cloud deck.
4. **Far row and dome.** The existing geometry.
5. **Far veil.** From `airCheck.level`.
6. **Middle row (new).** 18 offices and flats between the far and near rows.
7. **Middle veil.** For an elevated forecast only.
8. **Near row and arch.** The existing geometry, plus rooftop water tanks on every third building and lit windows (a pattern fill, from 640 px only).
9. **Weather bands.** Fog and heat as today. Rain per D4.

**Mapping.** All colours are DESIGN.md tokens mixed with `color-mix`; there are no new hex values.

| State | Exact input | Sky | Glow | Veil | Buildings |
|---|---|---|---|---|---|
| Within | `level === 'not_elevated'` | `secondary` 46 % into `surface-light` | strong | minimal on the far row | clear |
| Above | `level === 'elevated'` | `secondary` 14 % into `rule`, a muted blue-grey | faint | far and middle rows softened | near row clear |
| Unknown | `level === 'unknown'` | `rule` to `surface-light`, no blue | none | none | normal contrast |
| Stale | `stale === true` | the last-known state, unchanged | | | the HTML banner stays |
| Loading | forecast not ready | flat `surface-light` | none | none | a static silhouette in `rule`, replacing the pulse |

**Kept as they are:**
- The band heights.
- Phones show the centre of the scene through `slice`, so the right-hand clouds and the glow stay in view at 320 px.
- No words on the artwork.
- `aria-hidden`, with no focusable parts.
- The weather line and the verdict stay in HTML.

## 4. Decisions needed (my recommendation first)

- **D1. Air treatment.**
  - **(a) Recommended:** three states from `airCheck.level`. This deletes `haze.ts` and the smog band.
  - (b) Keep the five ratio bands, the 19 Nov design.
  - *Cost of (a):* "just above" and "twice the limit" look the same, so the words carry the difference.
- **D2. Cloud motion.**
  - **(a) Recommended:** clouds drift about 16 px over 4.8 s, then rest. This keeps the 5-second rule.
  - (b) A continuous 45 s drift with a visible "Pause motion" button on the band.
  - (c) Static clouds.
  - All three stay still under reduced motion.
- **D3. Day and night.**
  - **(a) Recommended:** add Open-Meteo's `is_day` to the same weather request, as `weather.isDay: boolean | null`. The glow shows only by day. *Cost:* one nullable field added to the forecast contract. That is an API change, so it needs your yes.
  - (b) No day/night: drop the glow entirely.
  - (c) Keep today's behaviour, a sun at any hour.
- **D4. Rain.**
  - **(a) Recommended:** rain only from a forecast amount (≥ 0.2 mm). A high chance alone shows clouds by cover, and the weather line still says "rain likely".
  - (b) Keep the chance rule.
  - Fog and heat stay as approved on 19 Nov in both cases.

**My calls (you can override):**
- Heights unchanged, because of the fold measurement above.
- Windows only from 640 px.
- The within state keeps a minimal veil rather than none, matching the caveat "Being within the national limit does not mean the air is clean".
- The loading band becomes a static silhouette.
- Missing weather shows no clouds, rain or glow.
- The middle row's geometry is new (`MID` in the sheet).
- No new dependency or image file.

## 5. Files Phase 2 would change

- `client/src/features/air-quality/CitySkyline.tsx`: the layers above.
- `client/src/features/air-quality/scene.ts`: `Scene.air: 'within' | 'above' | 'unknown'` from `level`; rain per D4; `isDay` per D3.
- `client/src/features/air-quality/haze.ts` and `haze.test.ts`: deleted (D1a).
- `client/src/components/States.tsx`: the loading band becomes the static silhouette.
- `client/src/index.css`: cloud drift keyframes (D2).
- Tests: `CitySkyline.test.tsx`, `scene.test.ts`, `TodayLead.test.tsx`, `States.test.tsx`. `data-haze-level` becomes `data-air` and `data-clouds`.
- D3a only:
  - `server/src/services/air-data/openMeteoWeather.ts` and its test fixture;
  - `shared/contracts.ts`;
  - API.md.
- Docs: DESIGN.md §8–9, CHANGELOG, and an amendment note in `2026-11-19-weather-scene-design.md`.
- Afterwards, the landing's phone screenshot (`today-phone.jpg`) shows the old scene. Recapturing it is a follow-up.

## 6. Risks and checks

- **Accessibility:** the art stays decorative and outside the text, so text contrast doesn't change by state. Status stays in words and the tag. Motion follows D2, and nothing moves under reduced motion.
- **Performance:** about 70 shapes plus one pattern, against roughly 50 today (the 238 rain lines only when raining). No blur filters, and only `transform` animates. `color-mix` in SVG `stop-color` is Baseline 2023. The fixed band height means no layout shift, and the loading band has the same height.
- **Tests:**
  - jsdom can't see colours, so the unit tests assert `data-*` hooks per state and weather combination (the brief's 10 scenarios).
  - One e2e check: the drift's computed `animation-name` is `none` under reduced motion.
  - Screenshots at 320, 390, 768 and 1280.
- **Order:** the Phase 4 hand-off session is still finishing in this folder, and it touches CHANGELOG and DESIGN.md. Phase 2 starts after it ends.
- **Dimensional drawing:** the installed `dimensional-drawing` skill makes monochrome anatomy sheets with coded dimensions. That suits documenting the band's geometry after approval, not the colour-state comparison. Not run.
